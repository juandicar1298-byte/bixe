"""Guarda la contraseña de aplicación en el .env y comprueba que funciona.

Pide la contraseña sin que se vea en pantalla, le quita los espacios (Google
la muestra en grupos de cuatro, pero va seguida), la escribe en la línea
SMTP_PASSWORD del .env sin tocar nada más del archivo y, si todo va bien,
intenta conectarse a Gmail para confirmarlo.

Uso, desde backend-fastapi/:
    .venv/Scripts/python.exe scripts/configurar_correo.py

La contraseña no se imprime en ningún momento ni queda en el historial de la
consola: se escribe directamente en el archivo.
"""

import getpass
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# El script vive en scripts/, así que la raíz del proyecto no está en el path.
sys.path.insert(0, str(RAIZ))

ARCHIVO = RAIZ / ".env"
EJEMPLO = RAIZ / ".env.example"

# Una contraseña de aplicación de Google son 16 letras minúsculas.
LARGO_ESPERADO = 16


def leer_contrasena() -> str | None:
    print("\nPega la contraseña de aplicación de Google y pulsa Enter.")
    print("No se verá nada mientras la pegas: es a propósito, no está colgado.\n")

    try:
        if sys.stdin.isatty():
            # getpass lee del teclado sin mostrar nada, que es lo que queremos.
            valor = getpass.getpass("Contraseña: ")
        else:
            # Sin terminal de verdad (por ejemplo si esto se lanza desde un
            # botón de otra herramienta) getpass se quedaría esperando para
            # siempre. Mejor leer de la entrada estándar y avisar si no llega
            # nada, que dejar el script colgado.
            valor = sys.stdin.readline()
    except (EOFError, KeyboardInterrupt):
        print("\nCancelado.")
        return None

    limpia = re.sub(r"\s", "", valor)

    if not limpia:
        print("\nNo escribiste nada. No se ha tocado el .env.")
        return None

    if len(limpia) != LARGO_ESPERADO or not limpia.isalpha():
        print(
            f"\n  Aviso: lo que pegaste tiene {len(limpia)} caracteres"
            f"{' y algún símbolo o número' if not limpia.isalpha() else ''}.\n"
            f"  Las contraseñas de aplicación de Google son {LARGO_ESPERADO} letras.\n"
            "  Si pusiste la contraseña normal de tu cuenta, Gmail la va a rechazar."
        )
        try:
            respuesta = input("\n  ¿La guardo igual? (s/n): ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            respuesta = "n"

        if respuesta not in ("s", "si", "sí"):
            print("\n  No se ha tocado el .env.")
            return None

    return limpia


def guardar(contrasena: str) -> None:
    """Reemplaza solo la línea SMTP_PASSWORD, dejando el resto igual."""
    if not ARCHIVO.exists():
        raise SystemExit(
            f"No existe {ARCHIVO}.\n"
            f"Créalo copiando {EJEMPLO.name} y vuelve a ejecutar este script."
        )

    # newline="" en los dos sentidos: así los finales de línea del archivo
    # quedan exactamente como estaban, sin convertir CRLF a LF ni al revés.
    with open(ARCHIVO, encoding="utf-8", newline="") as archivo:
        original = archivo.read()

    nuevo, cambios = re.subn(
        r"(?m)^SMTP_PASSWORD=[^\r\n]*", f"SMTP_PASSWORD={contrasena}", original
    )

    if cambios == 0:
        separador = "" if original.endswith(("\n", "\r")) else "\n"
        nuevo = f"{original}{separador}SMTP_PASSWORD={contrasena}\n"
        print("\n  La línea SMTP_PASSWORD no estaba; se añadió al final.")
    elif cambios > 1:
        raise SystemExit(
            f"Hay {cambios} líneas SMTP_PASSWORD en el .env. Deja solo una y "
            "vuelve a ejecutar este script."
        )

    with open(ARCHIVO, "w", encoding="utf-8", newline="") as archivo:
        archivo.write(nuevo)

    print(f"\n  Guardada en {ARCHIVO}")


def main() -> int:
    print("Configurar el correo saliente de BIXE")
    print("=" * 37)
    print(
        "\nAntes de seguir necesitas una contraseña de aplicación de Google:\n"
        "  https://myaccount.google.com/apppasswords\n"
        "Hace falta tener activada la verificación en dos pasos en la cuenta."
    )

    contrasena = leer_contrasena()
    if contrasena is None:
        return 1

    guardar(contrasena)

    # Se importa aquí, después de escribir, para que la configuración se lea
    # del .env ya actualizado.
    print("\nComprobando contra el servidor…")
    from app.core.configuracion import configuracion  # noqa: PLC0415
    from probar_correo import main as comprobar  # noqa: PLC0415

    # El correo de prueba va a la propia cuenta: es la que seguro puedes abrir.
    return comprobar(configuracion.smtp_usuario or None)


if __name__ == "__main__":
    raise SystemExit(main())
