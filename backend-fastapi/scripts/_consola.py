"""Leer secretos por teclado, sin que se vean.

Lo usan los tres guiones que piden una credencial: el del correo, el de la IA
y el que prepara la base de datos. Está aquí y no copiado en cada uno porque
tiene un detalle que es fácil olvidar y deja el guion colgado para siempre.
"""

import getpass
import sys


def leer_secreto(etiqueta: str = "Contraseña: ") -> str | None:
    """Pide algo sin mostrarlo. Devuelve None si no llega nada.

    En Windows, getpass lee del teclado de la consola y no de la entrada
    estándar. Si el guion se lanza desde un botón de otra herramienta, donde no
    hay consola, se quedaría esperando una tecla que no va a llegar nunca. Por
    eso se comprueba antes si hay terminal de verdad.
    """
    try:
        if sys.stdin.isatty():
            valor = getpass.getpass(etiqueta)
        else:
            print(etiqueta, end="", flush=True)
            valor = sys.stdin.readline()
    except (EOFError, KeyboardInterrupt):
        return None

    return valor.strip() or None


def preguntar(etiqueta: str, por_defecto: str = "") -> str:
    """Una pregunta normal, con respuesta visible y valor por omisión."""
    sufijo = f" [{por_defecto}]" if por_defecto else ""
    try:
        respuesta = input(f"{etiqueta}{sufijo}: ").strip()
    except (EOFError, KeyboardInterrupt):
        return por_defecto
    return respuesta or por_defecto
