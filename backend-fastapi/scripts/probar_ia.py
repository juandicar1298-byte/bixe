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
        de_quien = next(
            (p for p, pre in PREFIJOS.items() if p != proveedor and clave.startswith(pre)),
            None,
        )
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
        if codigo == 404:
            return (
                f"No existe el modelo «{configuracion.ia_modelo}» en {proveedor}.\n"
                "  Arriba tienes la lista de los que sí; copia uno en IA_MODELO."
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

    if modelos:
        rotulo(f"Modelos disponibles ({len(modelos)})")
        for nombre in modelos:
            marca = " <- el configurado" if nombre == configuracion.ia_modelo else ""
            print(f"  {nombre}{marca}")

    rotulo("Pregunta de prueba")
    print(f"  {texto}\n")

    # Se le pasa el catálogo vacío a propósito: esto comprueba la conexión con
    # el proveedor, no lo que el modelo sabe del negocio. Con la base de datos
    # de por medio, un fallo de MySQL parecería un fallo de la IA.
    respuesta, origen = await asistente.responder(
        texto, [], {"productos": [], "servicios": []}
    )

    if origen == "local":
        rotulo("No funcionó")
        print(
            "  Contestó el modo básico, no el modelo. El detalle del fallo está\n"
            "  en el log de la API, en la línea de «bixe.asistente»."
        )
        return 1

    rotulo("Respondió el modelo")
    print(f"  {respuesta}")

    rotulo("Todo correcto")
    print("  El chatbot de la web ya responde con IA.")
    return 0


def main() -> int:
    if not revisar():
        return 1

    texto = " ".join(sys.argv[1:]) or PREGUNTA_POR_DEFECTO
    return asyncio.run(preguntar(texto))


if __name__ == "__main__":
    raise SystemExit(main())
