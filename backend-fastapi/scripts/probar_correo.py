"""Comprueba la configuración de correo saliente.

Sin argumentos se conecta al servidor e inicia sesión, pero no envía nada.
Con una dirección, además manda un mensaje de prueba a esa dirección.

Uso, desde backend-fastapi/:
    .venv/Scripts/python.exe scripts/probar_correo.py
    .venv/Scripts/python.exe scripts/probar_correo.py tucorreo@gmail.com

La contraseña no se imprime nunca: solo se dice cuántos caracteres tiene, que
es lo único que hace falta para detectar el error más típico (pegar la
contraseña normal de la cuenta en vez de una contraseña de aplicación).
"""

import smtplib
import socket
import ssl
import sys
from email.message import EmailMessage
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# El script vive en scripts/, así que la raíz del proyecto no está en el path.
sys.path.insert(0, str(RAIZ))

from app.core.configuracion import configuracion  # noqa: E402
from app.services.correo import TIEMPO_LIMITE, abrir_conexion  # noqa: E402

# Una contraseña de aplicación de Google son 16 letras. Suele pegarse con los
# espacios que muestra la web ("abcd efgh ijkl mnop"), y así no funciona.
LARGO_CONTRASENA_APLICACION = 16


def rotulo(texto: str) -> None:
    print(f"\n{texto}\n{'-' * len(texto)}")


def revisar_configuracion() -> bool:
    """Enseña lo que hay puesto y avisa de lo que no cuadra. True si se puede seguir."""
    rotulo("Lo que hay en .env")

    contrasena = configuracion.smtp_password
    sin_espacios = contrasena.replace(" ", "")

    oculta = (
        f"{'*' * len(sin_espacios)} ({len(sin_espacios)} caracteres)"
        if sin_espacios
        else "(vacío)"
    )

    print(f"  SMTP_HOST       {configuracion.smtp_host or '(vacío)'}")
    print(f"  SMTP_PUERTO     {configuracion.smtp_puerto}")
    print(f"  SMTP_USUARIO    {configuracion.smtp_usuario or '(vacío)'}")
    print(f"  SMTP_PASSWORD   {oculta}")
    print(f"  SMTP_TLS        {configuracion.smtp_tls}")
    print(f"  Remitente       {configuracion.remitente_efectivo or '(vacío)'}")

    if not configuracion.correo_configurado:
        faltan = [
            nombre
            for nombre, valor in (
                ("SMTP_HOST", configuracion.smtp_host),
                ("SMTP_USUARIO", configuracion.smtp_usuario),
                ("SMTP_PASSWORD", configuracion.smtp_password),
            )
            if not valor
        ]
        print(
            "\n  La API está en modo degradado: no enviará correos, escribirá el\n"
            "  enlace de recuperación en el log. Falta rellenar "
            f"{' y '.join(faltan)}\n"
            "  en backend-fastapi/.env"
        )
        return False

    avisos = []

    es_gmail = "gmail" in configuracion.smtp_host.lower()

    if es_gmail and len(sin_espacios) != LARGO_CONTRASENA_APLICACION:
        avisos.append(
            f"La contraseña tiene {len(sin_espacios)} caracteres. Las contraseñas de\n"
            f"    aplicación de Google tienen {LARGO_CONTRASENA_APLICACION}. Si ahí pusiste la\n"
            "    contraseña normal de la cuenta, Gmail la va a rechazar."
        )

    if " " in contrasena:
        avisos.append(
            "La contraseña tiene espacios. Google la muestra en grupos de cuatro\n"
            "    para que se lea mejor, pero hay que pegarla seguida, sin espacios."
        )

    destino_remitente = configuracion.remitente_efectivo
    if (
        es_gmail
        and configuracion.smtp_usuario
        and configuracion.smtp_usuario not in destino_remitente
    ):
        avisos.append(
            f"El remitente ({destino_remitente}) no es la cuenta con la que se\n"
            f"    inicia sesión ({configuracion.smtp_usuario}). Gmail exige que coincidan:\n"
            "    deja SMTP_REMITENTE vacío y se usará la cuenta automáticamente."
        )

    if configuracion.smtp_puerto == 465 and not configuracion.smtp_tls:
        avisos.append("El puerto 465 siempre va cifrado; SMTP_TLS=false ahí no tiene efecto.")

    if avisos:
        rotulo("Avisos")
        for aviso in avisos:
            print(f"  - {aviso}")

    return True


def explicar_fallo(error: Exception) -> str:
    """Traduce el error de smtplib a algo que se pueda arreglar."""
    if isinstance(error, smtplib.SMTPAuthenticationError):
        return (
            "El servidor rechazó el usuario o la contraseña.\n"
            "  Con Gmail casi siempre es una de estas tres:\n"
            "    1. Estás usando la contraseña normal de la cuenta. Hace falta una\n"
            "       contraseña de aplicación (Cuenta de Google -> Seguridad ->\n"
            "       Verificación en dos pasos -> Contraseñas de aplicación).\n"
            "    2. La pegaste con los espacios que muestra Google. Va seguida.\n"
            "    3. La cuenta no tiene activada la verificación en dos pasos, y sin\n"
            "       eso Google no deja crear contraseñas de aplicación."
        )

    if isinstance(error, smtplib.SMTPSenderRefused):
        return (
            f"El servidor no acepta enviar desde {configuracion.remitente_efectivo}.\n"
            "  Deja SMTP_REMITENTE vacío en el .env para que salga desde la misma\n"
            "  cuenta con la que se inicia sesión."
        )

    if isinstance(error, smtplib.SMTPNotSupportedError):
        return (
            "El servidor no admite STARTTLS en ese puerto.\n"
            "  Prueba con SMTP_PUERTO=587 (STARTTLS) o SMTP_PUERTO=465 (TLS directo)."
        )

    if isinstance(error, ssl.SSLError):
        return (
            "Fallo al negociar el cifrado. Suele ser el puerto equivocado:\n"
            "  el 587 usa STARTTLS y el 465 habla TLS desde el principio."
        )

    if isinstance(error, socket.gaierror):
        return (
            f"No se pudo resolver el nombre «{configuracion.smtp_host}».\n"
            "  Revisa que esté bien escrito (para Gmail es smtp.gmail.com) y que\n"
            "  tengas conexión a internet."
        )

    if isinstance(error, TimeoutError):
        return (
            f"El servidor no respondió en {TIEMPO_LIMITE} segundos.\n"
            "  Suele ser el antivirus, el firewall de Windows o la red del centro\n"
            "  bloqueando el puerto de salida. Prueba desde otra red."
        )

    if isinstance(error, ConnectionRefusedError):
        return (
            f"El puerto {configuracion.smtp_puerto} está cerrado en {configuracion.smtp_host}.\n"
            "  Para Gmail son el 587 o el 465."
        )

    return f"{type(error).__name__}: {error}"


def mensaje_de_prueba(destinatario: str) -> EmailMessage:
    mensaje = EmailMessage()
    mensaje["From"] = configuracion.remitente_efectivo
    mensaje["To"] = destinatario
    mensaje["Subject"] = "Prueba de correo de BIXE"
    mensaje.set_content(
        "Si estás leyendo esto, el correo saliente de BIXE quedó bien configurado.\n"
        "Ya funciona la recuperación de contraseña.\n\n"
        "— Enviado por scripts/probar_correo.py\n"
    )
    return mensaje


def main(destinatario: str | None = None) -> int:
    """Comprueba la configuración. Si hay destinatario, envía una prueba real.

    El destinatario llega por parámetro cuando lo llama
    scripts/configurar_correo.py, y por la línea de órdenes si se ejecuta a
    mano.
    """
    if not revisar_configuracion():
        return 1

    if destinatario is None and len(sys.argv) > 1:
        destinatario = sys.argv[1]

    rotulo("Conectando")
    print(f"  {configuracion.smtp_host}:{configuracion.smtp_puerto}…")

    try:
        with abrir_conexion() as servidor:
            print("  Conexión cifrada establecida.")
            servidor.login(configuracion.smtp_usuario, configuracion.smtp_password)
            print("  Sesión iniciada correctamente.")

            if destinatario:
                servidor.send_message(mensaje_de_prueba(destinatario))
                print(f"  Mensaje de prueba enviado a {destinatario}.")

    except (smtplib.SMTPException, OSError, ssl.SSLError) as error:
        rotulo("No funcionó")
        print(f"  {explicar_fallo(error)}")
        return 1

    rotulo("Todo correcto")
    if destinatario:
        print(f"  Revisa la bandeja de {destinatario} (mira también en Spam la primera vez).")
    else:
        print("  El servidor acepta las credenciales. Para enviar un correo de verdad:")
        print("    .venv/Scripts/python.exe scripts/probar_correo.py tucorreo@gmail.com")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
