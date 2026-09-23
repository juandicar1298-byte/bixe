"""El cerebro del chatbot.

Habla con un servicio de Inteligencia Artificial para responder con sus
propias palabras, y sabe apañárselas sin él: si no hay clave configurada o el
proveedor falla, contesta con respuestas preparadas a partir del catálogo real.
Así el chat nunca se queda mudo delante de un cliente.

La clave de la API sale siempre de una variable de entorno. Ni se escribe en el
código ni se devuelve en ninguna respuesta ni se escribe en el log.
"""

import logging
import unicodedata

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.configuracion import configuracion
from app.models.bixe import Producto, Servicio

logger = logging.getLogger("bixe.asistente")

TIEMPO_LIMITE = 25
MAXIMO_TOKENS = 500

# Cuántos turnos anteriores se le recuerdan al modelo. Con más, la respuesta
# no mejora y la petición se encarece.
TURNOS_DE_CONTEXTO = 10

PERSONALIDAD = """\
Eres el asistente virtual de BIXE, un concesionario y taller de motos y autos \
de alto rendimiento en Medellín, Colombia.

Tu trabajo es atender a los clientes: resolver dudas frecuentes, orientar \
sobre los modelos y los servicios del taller, explicar cómo comprar y recoger \
peticiones, quejas y reclamos.

Reglas:
- Responde en español, de tú, con frases cortas y claras. Nada de listas \
interminables ni de lenguaje comercial hueco.
- Máximo cuatro frases, salvo que te pidan un detalle concreto.
- Usa solo los precios y los datos del catálogo que tienes abajo. Si no sabes \
algo, dilo y ofrece radicar una PQR o pasar con un asesor.
- No inventes modelos, precios, plazos, descuentos ni promociones.
- Los precios están en pesos colombianos e incluyen IVA.
- Para comprar: se agrega al carrito desde la web, se confirma el pedido y se \
paga en línea; al aprobarse el pago se emite la factura, que queda descargable \
en el panel del cliente.
- Si el cliente tiene una queja o un reclamo, dile que puede radicar una PQR \
desde la sección de PQR de la web o pidiéndotelo aquí, y que recibirá un \
número de radicado para seguirla.
- Nunca pidas contraseñas, números de tarjeta ni códigos de verificación.
"""

# Lo que se contesta cuando no hay IA configurada. La clave es la intención y
# el valor, la respuesta; se escoge por las palabras que trae el mensaje.
RESPUESTAS_LOCALES = (
    (
        ("hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "saludos"),
        "¡Hola! Soy el asistente de BIXE. Puedo contarte sobre los modelos del "
        "catálogo, los servicios del taller o ayudarte a radicar una PQR. ¿Qué "
        "necesitas?",
    ),
    (
        ("horario", "hora", "abren", "cierran", "atencion"),
        "Atendemos de lunes a viernes de 8:00 a 18:00 y los sábados de 9:00 a "
        "13:00. La web está disponible a toda hora.",
    ),
    (
        ("donde", "direccion", "ubicacion", "sede", "local"),
        "Estamos en la Carrera 43A #1-50, El Poblado, Medellín.",
    ),
    (
        ("pqr", "queja", "reclamo", "peticion", "sugerencia", "inconforme"),
        "Puedes radicar tu PQR desde la sección «PQR» de la web. Te damos un "
        "número de radicado y con él consultas el estado cuando quieras.",
    ),
    (
        ("pagar", "pago", "tarjeta", "pse", "nequi", "comprar", "compra"),
        "Agregas lo que quieras al carrito, confirmas el pedido y lo pagas en "
        "línea con tarjeta, PSE o Nequi. Al aprobarse el pago te emitimos la "
        "factura y queda descargable en tu panel.",
    ),
    (
        ("factura", "facturacion", "recibo"),
        "La factura se emite automáticamente cuando el pago queda aprobado, y "
        "puedes descargarla en PDF desde tu panel de cliente.",
    ),
    (
        ("servicio", "taller", "mantenimiento", "revision", "aceite", "llanta"),
        None,  # se arma con los servicios reales del catálogo
    ),
    (
        ("moto", "auto", "carro", "modelo", "catalogo", "precio", "cuanto"),
        None,  # se arma con los productos reales del catálogo
    ),
)

RESPUESTA_POR_DEFECTO = (
    "No estoy seguro de haber entendido. Puedo ayudarte con los modelos del "
    "catálogo, los servicios del taller, cómo comprar o cómo radicar una PQR. "
    "¿Sobre cuál de esos quieres saber?"
)


def _sin_tildes(texto: str) -> str:
    descompuesto = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in descompuesto if unicodedata.category(c) != "Mn")


def _pesos(valor) -> str:
    return f"${float(valor):,.0f}".replace(",", ".")


async def contexto_del_catalogo(sesion: AsyncSession) -> dict:
    """Lo que hay publicado ahora mismo, para que el bot no se lo invente."""
    productos = list(
        await sesion.scalars(
            select(Producto).where(Producto.estado == "activo").order_by(Producto.nombre)
        )
    )
    servicios = list(
        await sesion.scalars(
            select(Servicio).where(Servicio.estado == "activo").order_by(Servicio.nombre)
        )
    )
    return {"productos": productos, "servicios": servicios}


def _resumir_catalogo(catalogo: dict) -> str:
    lineas = ["CATÁLOGO DE MODELOS:"]
    for p in catalogo["productos"]:
        ficha = ", ".join(
            filtro
            for filtro in (p.cilindraje, p.potencia, p.velocidad_maxima)
            if filtro
        )
        lineas.append(
            f"- {p.nombre} ({p.categoria}): {_pesos(p.precio)}"
            + (f" — {ficha}" if ficha else "")
        )

    lineas.append("")
    lineas.append("SERVICIOS DEL TALLER:")
    for s in catalogo["servicios"]:
        duracion = f", {s.duracion_min} min" if s.duracion_min else ""
        lineas.append(f"- {s.nombre}: {_pesos(s.precio)}{duracion}")

    return "\n".join(lineas)


# --------------------------- Respuestas locales ---------------------------


def responder_sin_ia(mensaje: str, catalogo: dict) -> str:
    """Respuesta preparada, por si no hay IA configurada o falla."""
    normalizado = _sin_tildes(mensaje)

    for palabras, respuesta in RESPUESTAS_LOCALES:
        if not any(palabra in normalizado for palabra in palabras):
            continue

        if respuesta is not None:
            return respuesta

        # Las dos entradas sin texto fijo se arman con el catálogo de verdad.
        if "servicio" in palabras:
            if not catalogo["servicios"]:
                return "Ahora mismo no tenemos servicios publicados en la web."
            listado = "; ".join(
                f"{s.nombre} desde {_pesos(s.precio)}"
                for s in catalogo["servicios"][:4]
            )
            return (
                f"En el taller hacemos: {listado}. Los agregas al carrito desde "
                "la sección Servicios y te contactamos para agendar."
            )

        if not catalogo["productos"]:
            return "Todavía no hay modelos publicados en el catálogo."
        listado = "; ".join(
            f"{p.nombre} desde {_pesos(p.precio)}" for p in catalogo["productos"][:4]
        )
        return (
            f"Algunos de nuestros modelos: {listado}. En la sección Modelos "
            "está el catálogo completo con su ficha técnica."
        )

    return RESPUESTA_POR_DEFECTO


# ------------------------------ Con el modelo ------------------------------

# Groq expone la misma API que OpenAI, solo que en otra dirección, así que las
# dos comparten código: lo único que cambia es la URL y el modelo por defecto.
COMPATIBLES_OPENAI = {
    "openai": ("https://api.openai.com/v1", "gpt-4o-mini"),
    # Groq renueva su catalogo cada cierto tiempo y retira modelos. Si este
    # deja de existir, scripts/probar_ia.py lista los que si hay y dice que
    # poner en IA_MODELO.
    "groq": ("https://api.groq.com/openai/v1", "openai/gpt-oss-120b"),
}


async def _preguntar_anthropic(sistema: str, turnos: list[dict]) -> str:
    async with httpx.AsyncClient(timeout=TIEMPO_LIMITE) as cliente:
        respuesta = await cliente.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": configuracion.ia_api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": configuracion.ia_modelo or "claude-sonnet-5",
                "max_tokens": MAXIMO_TOKENS,
                "system": sistema,
                "messages": turnos,
            },
        )
    respuesta.raise_for_status()
    partes = respuesta.json().get("content", [])
    return "".join(p.get("text", "") for p in partes).strip()


async def _preguntar_compatible(proveedor: str, sistema: str, turnos: list[dict]) -> str:
    """Para los que hablan el dialecto de OpenAI: el propio OpenAI y Groq."""
    base, modelo_por_defecto = COMPATIBLES_OPENAI[proveedor]

    async with httpx.AsyncClient(timeout=TIEMPO_LIMITE) as cliente:
        respuesta = await cliente.post(
            f"{base}/chat/completions",
            headers={
                "Authorization": f"Bearer {configuracion.ia_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": configuracion.ia_modelo or modelo_por_defecto,
                "max_tokens": MAXIMO_TOKENS,
                "messages": [{"role": "system", "content": sistema}, *turnos],
            },
        )
    respuesta.raise_for_status()
    opciones = respuesta.json().get("choices", [])
    if not opciones:
        return ""
    return (opciones[0].get("message", {}).get("content") or "").strip()


async def _preguntar_openai(sistema: str, turnos: list[dict]) -> str:
    return await _preguntar_compatible("openai", sistema, turnos)


async def _preguntar_groq(sistema: str, turnos: list[dict]) -> str:
    return await _preguntar_compatible("groq", sistema, turnos)


PROVEEDORES = {
    "anthropic": _preguntar_anthropic,
    "openai": _preguntar_openai,
    "groq": _preguntar_groq,
}


async def responder(
    mensaje: str, historial: list[dict], catalogo: dict
) -> tuple[str, str]:
    """Devuelve (respuesta, origen), donde origen es «ia» o «local»."""
    proveedor = PROVEEDORES.get(configuracion.proveedor_ia)

    if proveedor is None or not configuracion.ia_configurada:
        return responder_sin_ia(mensaje, catalogo), "local"

    sistema = f"{PERSONALIDAD}\n\n{_resumir_catalogo(catalogo)}"
    turnos = [
        {"role": "assistant" if t["rol"] == "asistente" else "user", "content": t["contenido"]}
        for t in historial[-TURNOS_DE_CONTEXTO:]
    ]
    turnos.append({"role": "user", "content": mensaje})

    try:
        texto = await proveedor(sistema, turnos)
    except (httpx.HTTPError, KeyError, ValueError) as error:
        # Se registra el tipo de fallo, nunca la clave ni el cuerpo completo,
        # que podría traerla de vuelta en un mensaje de error.
        logger.error(
            "El proveedor de IA (%s) no respondió: %s",
            configuracion.proveedor_ia,
            type(error).__name__,
        )
        return responder_sin_ia(mensaje, catalogo), "local"

    if not texto:
        return responder_sin_ia(mensaje, catalogo), "local"

    return texto, "ia"
