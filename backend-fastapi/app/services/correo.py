import logging
import smtplib
from email.message import EmailMessage

from fastapi.concurrency import run_in_threadpool

from app.core.configuracion import configuracion

logger = logging.getLogger("bixe.correo")

TIEMPO_LIMITE = 15


class ErrorAlEnviarCorreo(Exception):
    """El servidor SMTP rechazó el mensaje o no respondió."""


def abrir_conexion() -> smtplib.SMTP:
    """Abre la conexión con el servidor de correo, ya cifrada.

    El puerto 465 habla TLS desde el primer byte y el 587 empieza en claro y
    sube a TLS con STARTTLS. Equivocar ese par puerto/modo es el tropiezo más
    común al configurar esto, así que se decide aquí a partir del puerto en
    lugar de pedirle al usuario que lo acierte en el .env.

    La usa también scripts/probar_correo.py, para que la comprobación se haga
    exactamente por el mismo camino que el envío de verdad.
    """
    if configuracion.smtp_puerto == 465:
        return smtplib.SMTP_SSL(configuracion.smtp_host, 465, timeout=TIEMPO_LIMITE)

    servidor = smtplib.SMTP(
        configuracion.smtp_host, configuracion.smtp_puerto, timeout=TIEMPO_LIMITE
    )
    if configuracion.smtp_tls:
        servidor.starttls()
    return servidor


def _construir_mensaje(destinatario: str, asunto: str, texto: str, html: str) -> EmailMessage:
    mensaje = EmailMessage()
    mensaje["From"] = configuracion.remitente_efectivo
    mensaje["To"] = destinatario
    mensaje["Subject"] = asunto
    mensaje.set_content(texto)
    mensaje.add_alternative(html, subtype="html")
    return mensaje


def _enviar_sincrono(mensaje: EmailMessage) -> None:
    """smtplib bloquea, así que esta función se ejecuta en un hilo aparte."""
    with abrir_conexion() as servidor:
        servidor.login(configuracion.smtp_usuario, configuracion.smtp_password)
        servidor.send_message(mensaje)


PLANTILLA_HTML = """\
<div style="font-family:Inter,Arial,sans-serif;background:#f5f6f8;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e7e9ee;
              border-radius:20px;padding:36px">
    <p style="margin:0;font-size:12px;letter-spacing:.22em;text-transform:uppercase;
              color:#858d99">BIXE</p>
    <h1 style="margin:8px 0 0;font-size:28px;color:#0d0f13">Recupera tu contraseña</h1>
    <p style="color:#4b525c;line-height:1.6">
      Hola {nombre}, recibimos una solicitud para restablecer la contraseña de tu
      cuenta. Pulsa el botón para elegir una nueva. El enlace caduca en
      {minutos} minutos.
    </p>
    <p style="margin:28px 0">
      <a href="{enlace}"
         style="display:inline-block;background:#0d0f13;color:#fff;text-decoration:none;
                padding:14px 28px;border-radius:999px;font-size:13px;font-weight:700;
                letter-spacing:.1em;text-transform:uppercase">Cambiar mi contraseña</a>
    </p>
    <p style="color:#858d99;font-size:13px;line-height:1.6">
      Si no fuiste tú, puedes ignorar este mensaje: tu contraseña seguirá igual.
    </p>
    <p style="color:#b3bac4;font-size:12px;word-break:break-all">{enlace}</p>
  </div>
</div>
"""

PLANTILLA_TEXTO = """\
Hola {nombre},

Recibimos una solicitud para restablecer la contraseña de tu cuenta BIXE.
Abre este enlace para elegir una nueva (caduca en {minutos} minutos):

{enlace}

Si no fuiste tú, ignora este mensaje: tu contraseña seguirá igual.

— Equipo BIXE
"""


async def enviar_recuperacion(destinatario: str, nombre: str, enlace: str) -> bool:
    """Envía el correo de recuperación.

    Devuelve True si se envió de verdad y False si el correo no está
    configurado. En ese segundo caso el enlace queda escrito en el log, para
    poder probar el flujo completo sin un servidor SMTP.
    """
    minutos = configuracion.minutos_expiracion_recuperacion

    if not configuracion.correo_configurado:
        logger.warning(
            "SMTP sin configurar. Enlace de recuperación para %s: %s",
            destinatario,
            enlace,
        )
        return False

    mensaje = _construir_mensaje(
        destinatario,
        "Recupera tu contraseña de BIXE",
        PLANTILLA_TEXTO.format(nombre=nombre, enlace=enlace, minutos=minutos),
        PLANTILLA_HTML.format(nombre=nombre, enlace=enlace, minutos=minutos),
    )

    try:
        await run_in_threadpool(_enviar_sincrono, mensaje)
    except (smtplib.SMTPException, OSError) as exc:
        # No se le cuenta al usuario que el correo falló: eso revelaría qué
        # direcciones están registradas. Queda registrado para el operador.
        logger.error("No se pudo enviar el correo a %s: %s", destinatario, exc)
        raise ErrorAlEnviarCorreo(str(exc)) from exc

    logger.info("Correo de recuperación enviado a %s", destinatario)
    return True
