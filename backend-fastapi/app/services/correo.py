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


# Las plantillas van con estilos en linea y maquetadas con tablas: los
# clientes de correo ignoran las hojas de estilo y muchos no entienden flex ni
# grid. Tampoco se cargan tipografias de internet, asi que se usa la pila del
# sistema. Nada de esto es como se escribiria una pagina hoy; es como hay que
# escribir un correo para que se vea igual en Gmail, Outlook y el movil.

TIPOGRAFIA = (
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
)

PLANTILLA_HTML = """<body style="margin:0;padding:0;background:#eef0f4">
  <!-- Linea de vista previa: se lee en la bandeja de entrada, no en el correo -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">
    Tu codigo de verificacion es {codigo}. Caduca en {minutos} minutos.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background:#eef0f4;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;
                      overflow:hidden;box-shadow:0 12px 32px rgba(13,15,19,.10)">

          <!-- Cabecera -->
          <tr>
            <td style="background:#0d0f13;padding:26px 36px">
              <span style="font-family:{tipografia};font-size:17px;font-weight:700;
                           letter-spacing:.34em;color:#ffffff">BIXE</span><span
                    style="font-family:{tipografia};font-size:17px;font-weight:700;
                           color:#3fa9f5">.</span>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding:36px 36px 8px">
              <p style="margin:0;font-family:{tipografia};font-size:11px;font-weight:700;
                        letter-spacing:.2em;text-transform:uppercase;color:#858d99">
                Recuperaci&oacute;n de contrase&ntilde;a
              </p>
              <h1 style="margin:10px 0 0;font-family:{tipografia};font-size:26px;
                         line-height:1.2;color:#0d0f13">
                Hola {nombre}
              </h1>
              <p style="margin:14px 0 0;font-family:{tipografia};font-size:15px;
                        line-height:1.65;color:#4b525c">
                Pediste cambiar la contrase&ntilde;a de tu cuenta. Escribe este
                c&oacute;digo en la pantalla de BIXE para continuar:
              </p>
            </td>
          </tr>

          <!-- El codigo -->
          <tr>
            <td style="padding:24px 36px 4px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f4f9fe;border:1px solid #bfe2fb;border-radius:14px">
                <tr>
                  <td align="center" style="padding:22px 16px 18px">
                    <div style="font-family:{tipografia};font-size:34px;font-weight:700;
                                letter-spacing:.32em;color:#0d0f13;margin-left:.32em">
                      {codigo}
                    </div>
                    <div style="margin-top:10px;font-family:{tipografia};font-size:12px;
                                color:#0b7cc4">
                      Caduca en {minutos} minutos
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Enlace directo -->
          <tr>
            <td align="center" style="padding:22px 36px 4px">
              <p style="margin:0 0 16px;font-family:{tipografia};font-size:13px;
                        color:#858d99">
                O si lo prefieres, entra directamente:
              </p>
              <a href="{enlace}"
                 style="display:inline-block;background:#0d0f13;color:#ffffff;
                        text-decoration:none;padding:14px 30px;border-radius:999px;
                        font-family:{tipografia};font-size:12px;font-weight:700;
                        letter-spacing:.1em;text-transform:uppercase">
                Cambiar mi contrase&ntilde;a
              </a>
            </td>
          </tr>

          <!-- Aviso -->
          <tr>
            <td style="padding:28px 36px 32px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="border-top:1px solid #e7e9ee;padding-top:20px">
                  <p style="margin:0;font-family:{tipografia};font-size:13px;
                            line-height:1.6;color:#858d99">
                    Si no fuiste t&uacute;, ignora este mensaje: tu contrase&ntilde;a
                    seguir&aacute; siendo la misma y nadie podr&aacute; cambiarla sin
                    este c&oacute;digo.
                  </p>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- Pie -->
          <tr>
            <td style="background:#fafbfc;border-top:1px solid #e7e9ee;padding:20px 36px">
              <p style="margin:0;font-family:{tipografia};font-size:11px;
                        letter-spacing:.06em;color:#b3bac4">
                BIXE &middot; Motos y autos de alto rendimiento<br>
                Este es un correo autom&aacute;tico, no hace falta responderlo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
"""

PLANTILLA_TEXTO = """BIXE - Recuperacion de contrasena

Hola {nombre},

Pediste cambiar la contrasena de tu cuenta. Tu codigo de verificacion es:

    {codigo}

Escribelo en la pantalla de BIXE. Caduca en {minutos} minutos.

Tambien puedes entrar directamente desde este enlace:
{enlace}

Si no fuiste tu, ignora este mensaje: tu contrasena seguira siendo la misma.

-- 
BIXE - Motos y autos de alto rendimiento
Este es un correo automatico, no hace falta responderlo.
"""


async def enviar_recuperacion(
    destinatario: str, nombre: str, codigo: str, enlace: str
) -> bool:
    """Envía el correo con el código de verificación.

    Devuelve True si se envió de verdad y False si el correo no está
    configurado. En ese segundo caso el código y el enlace quedan escritos en
    el log, para poder probar el flujo completo sin un servidor SMTP.
    """
    minutos = configuracion.minutos_expiracion_recuperacion

    if not configuracion.correo_configurado:
        logger.warning(
            "SMTP sin configurar. Código de recuperación para %s: %s (enlace: %s)",
            destinatario,
            codigo,
            enlace,
        )
        return False

    campos = {
        "nombre": nombre,
        "codigo": codigo,
        "enlace": enlace,
        "minutos": minutos,
        "tipografia": TIPOGRAFIA,
    }

    mensaje = _construir_mensaje(
        destinatario,
        # El código en el asunto se ve en la notificación del móvil, así que
        # muchas veces no hace falta ni abrir el correo.
        f"{codigo} es tu código para recuperar tu contraseña de BIXE",
        PLANTILLA_TEXTO.format(**campos),
        PLANTILLA_HTML.format(**campos),
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
