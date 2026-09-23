"""Guarda la clave del chatbot en el .env y comprueba que funciona.

Pide la clave sin que se vea en pantalla, la escribe en la línea IA_API_KEY
del .env sin tocar nada más del archivo y a continuación pregunta algo al
modelo para confirmar que responde.

Uso, desde backend-fastapi/:
    .venv/Scripts/python.exe scripts/configurar_ia.py
    .venv/Scripts/python.exe scripts/configurar_ia.py openai

La clave no se imprime en ningún momento ni queda en el historial de la
consola: se escribe directamente en el archivo.
"""

import getpass
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# El script vive en scripts/, así que la raíz del proyecto no está en el path.
sys.path.insert(0, str(RAIZ))

from probar_ia import DONDE_SACARLA, PREFIJOS, proveedor_de_la_clave  # noqa: E402

ARCHIVO = RAIZ / ".env"
EJEMPLO = RAIZ / ".env.example"

POR_DEFECTO = "groq"


def leer_clave(proveedor: str) -> str | None:
    print(f"\nPega la clave de {proveedor} y pulsa Enter.")
    print("No se verá nada mientras la pegas: es a propósito, no está colgado.\n")

    try:
        if sys.stdin.isatty():
            valor = getpass.getpass("Clave: ")
        else:
            # Sin terminal de verdad, getpass se quedaría esperando al teclado
            # para siempre. Mejor leer de la entrada estándar y avisar si no
            # llega nada, que dejar el script colgado.
            valor = sys.stdin.readline()
    except (EOFError, KeyboardInterrupt):
        print("\nCancelado.")
        return None

    limpia = valor.strip()

    if not limpia:
        print("\nNo escribiste nada. No se ha tocado el .env.")
        return None

    esperado = PREFIJOS.get(proveedor)
    if esperado and not limpia.startswith(esperado):
        de_quien = proveedor_de_la_clave(limpia)
        print(
            f"\n  Aviso: las claves de {proveedor} empiezan por «{esperado}» y "
            "esta no."
            + (f"\n  Parece de {de_quien}." if de_quien else "")
        )
        try:
            respuesta = input("\n  ¿La guardo igual? (s/n): ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            respuesta = "n"

        if respuesta not in ("s", "si", "sí"):
            print("\n  No se ha tocado el .env.")
            return None

    return limpia


def guardar(clave: str, proveedor: str) -> None:
    """Reemplaza solo IA_API_KEY y PROVEEDOR_IA, dejando el resto igual."""
    if not ARCHIVO.exists():
        raise SystemExit(
            f"No existe {ARCHIVO}.\n"
            f"Créalo copiando {EJEMPLO.name} y vuelve a ejecutar este script."
        )

    # newline="" en los dos sentidos: así los finales de línea del archivo
    # quedan exactamente como estaban, sin convertir CRLF a LF ni al revés.
    with open(ARCHIVO, encoding="utf-8", newline="") as archivo:
        texto = archivo.read()

    for variable, valor in (("PROVEEDOR_IA", proveedor), ("IA_API_KEY", clave)):
        texto, cambios = re.subn(
            rf"(?m)^{variable}=[^\r\n]*", f"{variable}={valor}", texto
        )
        if cambios == 0:
            separador = "" if texto.endswith(("\n", "\r")) else "\n"
            texto = f"{texto}{separador}{variable}={valor}\n"
            print(f"\n  La línea {variable} no estaba; se añadió al final.")
        elif cambios > 1:
            raise SystemExit(
                f"Hay {cambios} líneas {variable} en el .env. Deja solo una y "
                "vuelve a ejecutar este script."
            )

    with open(ARCHIVO, "w", encoding="utf-8", newline="") as archivo:
        archivo.write(texto)

    print(f"\n  Guardada en {ARCHIVO}")


def main() -> int:
    proveedor = (sys.argv[1] if len(sys.argv) > 1 else POR_DEFECTO).lower()

    if proveedor not in PREFIJOS:
        print(f"«{proveedor}» no se reconoce. Usa: " + ", ".join(sorted(PREFIJOS)))
        return 1

    print("Configurar el chatbot con Inteligencia Artificial de BIXE")
    print("=" * 56)
    print(f"\nProveedor: {proveedor}")
    print(f"La clave se saca en:\n  {DONDE_SACARLA[proveedor]}")

    clave = leer_clave(proveedor)
    if clave is None:
        return 1

    guardar(clave, proveedor)

    # La configuración se leyó del .env al importar probar_ia, es decir antes
    # de escribir la clave, así que en memoria sigue vacía. Se pone al día a
    # mano; releer el archivo entero solo para esto sería dar un rodeo.
    from app.core.configuracion import configuracion  # noqa: PLC0415

    configuracion.proveedor_ia = proveedor
    configuracion.ia_api_key = clave

    print("\nComprobando contra el proveedor…")
    from probar_ia import main as comprobar  # noqa: PLC0415

    # Sin argumentos: usa la pregunta de prueba que trae por defecto.
    sys.argv = sys.argv[:1]
    return comprobar()


if __name__ == "__main__":
    raise SystemExit(main())
