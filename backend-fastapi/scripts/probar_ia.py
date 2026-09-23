"""Comprueba la configuración del chatbot con Inteligencia Artificial.

Sin argumentos lista los modelos que tu clave puede usar y hace una pregunta
de prueba. Con un texto entre comillas, pregunta eso.

Uso, desde backend-fastapi/:
    .venv/Scripts/python.exe scripts/probar_ia.py
    .venv/Scripts/python.exe scripts/probar_ia.py "que motos tienen?"

La clave no se imprime nunca: solo se dice cuántos caracteres tiene y cómo
empieza, que es lo único que hace falta para ver si se pegó la del proveedor
equivocado.
"""

import asyncio
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# El script vive en scripts/, así que la raíz del proyecto no está en el path.
sys.path.insert(0, str(RAIZ))

import httpx  # noqa: E402

from app.core.configuracion import configuracion  # noqa: E402
from app.services import asistente  # noqa: E402

PREGUNTA_POR_DEFECTO = "Hola, ¿qué servicios tiene el taller y cuánto valen?"

# Cómo empieza la clave de cada proveedor. Sirve para avisar cuando se pegó la
# de otro sitio, que es un error fácil de cometer y difícil de ver.
PREFIJOS = {
    "groq": "gsk_",
    "openai": "sk-",
    "anthropic": "sk-ant-",
}

DONDE_SACARLA = {
    "groq": "https://console.groq.com/keys",
    "openai": "https://platform.openai.com/api-keys",
    "anthropic": "https://console.anthropic.com/settings/keys",
}


def proveedor_de_la_clave(clave: str) -> str | None:
    """De quién parece ser la clave, por su prefijo.

    Se comprueban de más largo a más corto: «sk-ant-» también empieza por
    «sk-», así que mirándolos en cualquier orden una clave de Anthropic se
    confundiría con una de OpenAI.
    """
    for proveedor, prefijo in sorted(
        PREFIJOS.items(), key=lambda par: len(par[1]), reverse=True
    ):
        if clave.startswith(prefijo):
            return proveedor
    return None


# Los que no sirven para conversar: transcripción de audio y clasificadores
# de seguridad. Salen en la lista del proveedor, pero elegir uno de estos da
# un error que no se entiende.
NO_SON_DE_CHAT = ("whisper", "tts", "guard", "orpheus")


def son_de_chat(modelos: list[str]) -> list[str]:
    return [m for m in modelos if not any(p in m.lower() for p in NO_SON_DE_CHAT)]


def rotulo(texto: str) -> None:
    print(f"\n{texto}\n{'-' * len(texto)}")


def revisar() -> bool:
    rotulo("Lo que hay en .env")

    proveedor = configuracion.proveedor_ia
    clave = configuracion.ia_api_key

    modelo = configuracion.ia_modelo or "(el que trae por defecto)"
    print(f"  PROVEEDOR_IA   {proveedor or '(vacío)'}")
    print(f"  IA_MODELO      {modelo}")
    if clave:
        print(f"  IA_API_KEY     {clave[:4]}…{'*' * 8} ({len(clave)} caracteres)")
    else:
        print("  IA_API_KEY     (vacío)")

    if not proveedor and not clave:
        print(
            "\n  El chatbot está en modo básico: responde con el catálogo real en\n"
            "  lugar de generar las respuestas. Para activar la IA hay que poner\n"
            "  PROVEEDOR_IA e IA_API_KEY en backend-fastapi/.env"
        )
        return False

    if proveedor not in asistente.PROVEEDORES:
        print(
            f"\n  «{proveedor}» no es un proveedor conocido. Los que admite son: "
            + ", ".join(sorted(asistente.PROVEEDORES))
        )
        return False

    if not clave:
        print(
            f"\n  Falta IA_API_KEY. La de {proveedor} se saca en:\n"
            f"    {DONDE_SACARLA[proveedor]}"
        )
        return False

    esperado = PREFIJOS.get(proveedor)
    if esperado and not clave.startswith(esperado):
        de_quien = proveedor_de_la_clave(clave)
        rotulo("Aviso")
        print(
            f"  Las claves de {proveedor} empiezan por «{esperado}» y esta no."
            + (f"\n  Parece de {de_quien}." if de_quien else "")
        )

    return True


async def listar_modelos() -> list[str]:
    """Los modelos que acepta la clave. Solo en los compatibles con OpenAI."""
    if configuracion.proveedor_ia not in asistente.COMPATIBLES_OPENAI:
        return []

    base, _ = asistente.COMPATIBLES_OPENAI[configuracion.proveedor_ia]
    async with httpx.AsyncClient(timeout=20) as cliente:
        respuesta = await cliente.get(
            f"{base}/models",
            headers={"Authorization": f"Bearer {configuracion.ia_api_key}"},
        )
    respuesta.raise_for_status()
    return sorted(m["id"] for m in respuesta.json().get("data", []))


def explicar(error: Exception) -> str:
    proveedor = configuracion.proveedor_ia

    if isinstance(error, httpx.HTTPStatusError):
        codigo = error.response.status_code
        if codigo in (401, 403):
            return (
                "El proveedor rechazó la clave.\n"
                f"  Revisa que sea una de {proveedor}, que esté completa y que no\n"
                f"  esté revocada: {DONDE_SACARLA.get(proveedor, '')}"
            )
        # Un modelo retirado llega como 400 en unos proveedores y como 404 en
        # otros, así que se mira el cuerpo en lugar de fiarse solo del código.
        if codigo in (400, 404) and "model" in error.response.text.lower():
            usado = configuracion.ia_modelo or "el que trae por defecto"
            return (
                f"{proveedor} no reconoce el modelo «{usado}».\n"
                "  Los proveedores retiran modelos cada cierto tiempo; arriba\n"
                "  tienes los que sí acepta tu clave."
            )
        if codigo == 429:
            return (
                "Demasiadas peticiones o cupo agotado por ahora.\n"
                "  Espera un momento y vuelve a intentarlo."
            )
        return f"El proveedor respondió {codigo}."

    if isinstance(error, httpx.ConnectError):
        return "No se pudo conectar. Revisa la conexión a internet."

    if isinstance(error, httpx.TimeoutException):
        return (
            f"El proveedor no respondió en {asistente.TIEMPO_LIMITE} segundos.\n"
            "  Puede ser la red o que el modelo elegido sea muy lento."
        )

    return f"{type(error).__name__}: {error}"


async def preguntar(texto: str) -> int:
    modelos = []
    try:
        modelos = await listar_modelos()
    except (httpx.HTTPError, KeyError, ValueError) as error:
        rotulo("No se pudieron listar los modelos")
        print(f"  {explicar(error)}")
        return 1

    utiles = son_de_chat(modelos)
    if modelos:
        rotulo(f"Modelos para conversar ({len(utiles)} de {len(modelos)})")
        for nombre in utiles:
            marca = " <- el configurado" if nombre == configuracion.ia_modelo else ""
            print(f"  {nombre}{marca}")

    rotulo("Pregunta de prueba")
    print(f"  {texto}\n")

    # Se llama al proveedor directamente y no a asistente.responder(), que
    # atrapa el error y contesta con el catálogo: eso está bien para un cliente
    # del chat, pero aquí taparía justo lo que se quiere ver.
    #
    # El catálogo va vacío a propósito: esto comprueba la conexión con el
    # proveedor, no lo que el modelo sabe del negocio. Con la base de datos de
    # por medio, un fallo de MySQL parecería un fallo de la IA.
    preguntar_al_modelo = asistente.PROVEEDORES[configuracion.proveedor_ia]
    sistema = (
        f"{asistente.PERSONALIDAD}\n\n(Catálogo no cargado: esto es una prueba.)"
    )

    try:
        respuesta = await preguntar_al_modelo(
            sistema, [{"role": "user", "content": texto}]
        )
    except (httpx.HTTPError, KeyError, ValueError) as error:
        rotulo("No funcionó")
        print(f"  {explicar(error)}")

        if _es_problema_de_modelo(error) and utiles:
            print("\n  Pon esta línea en backend-fastapi/.env y vuelve a probar:")
            print(f"\n    IA_MODELO={utiles[0]}")
        return 1

    if not respuesta:
        rotulo("No funcionó")
        print("  El proveedor respondió, pero sin texto.")
        return 1

    rotulo("Respondió el modelo")
    print(f"  {respuesta}")

    rotulo("Todo correcto")
    print("  El chatbot de la web ya responde con IA.")
    return 0


def _es_problema_de_modelo(error: Exception) -> bool:
    """Si el fallo apunta al nombre del modelo y no a la clave o a la red."""
    if not isinstance(error, httpx.HTTPStatusError):
        return False
    if error.response.status_code in (400, 404):
        return "model" in error.response.text.lower()
    return False


def main() -> int:
    if not revisar():
        return 1

    texto = " ".join(sys.argv[1:]) or PREGUNTA_POR_DEFECTO
    return asyncio.run(preguntar(texto))


if __name__ == "__main__":
    raise SystemExit(main())
