import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.configuracion import configuracion
from app.core.seguridad import crear_token, verificar_contrasena
from app.crud import usuarios as crud_usuarios
from app.dependencias import SesionDep, UsuarioActual
from app.errores import NoAutenticado
from app.schemas.auth import (
    Credenciales,
    MensajeSimple,
    RestablecerContrasena,
    SolicitudRecuperacion,
    Token,
    TokenDeRecuperacion,
    TokenOAuth2,
    UsuarioSesion,
    VerificarCodigo,
)
from app.schemas.error import RESPUESTAS_API
from app.services.correo import ErrorAlEnviarCorreo, enviar_recuperacion

logger = logging.getLogger("bixe.auth")

router = APIRouter(prefix="/api/auth", tags=["Autenticación"], responses=RESPUESTAS_API)

# Mensaje único para la recuperación: responder cosas distintas según si el
# correo existe permitiría averiguar qué cuentas están registradas.
MENSAJE_RECUPERACION = (
    "Si el correo corresponde a una cuenta activa, te enviamos un código de "
    "seis dígitos. Revisa tu bandeja de entrada."
)


async def _enviar_en_segundo_plano(
    destinatario: str, nombre: str, codigo: str, enlace: str
) -> None:
    """Envía el correo de recuperación una vez ya contestada la petición.

    Se traga cualquier fallo a propósito. Para cuando esto se ejecuta, la
    respuesta ya viajó al navegador y no hay forma de avisar al usuario; lo
    único sensato es dejarlo en el log para el operador. Y tampoco se le
    contaría: decirle «no pudimos enviarte el correo» confirmaría que esa
    dirección tiene cuenta.
    """
    try:
        await enviar_recuperacion(destinatario, nombre, codigo, enlace)
    except (ErrorAlEnviarCorreo, OSError):
        logger.exception("Falló el envío del correo de recuperación en segundo plano")


@router.post(
    "/login",
    response_model=Token,
    summary="Iniciar sesión",
    description="Valida las credenciales y devuelve el JWT junto con los datos "
    "del usuario que el frontend guarda en la sesión.",
)
async def iniciar_sesion(sesion: SesionDep, credenciales: Credenciales):
    usuario = await crud_usuarios.obtener_por_email(sesion, credenciales.email)

    # Mismo mensaje si el correo no existe o si la contraseña es incorrecta.
    if usuario is None or not verificar_contrasena(
        credenciales.contrasena, usuario.contrasena_hash
    ):
        raise NoAutenticado("Correo o contraseña incorrectos.")

    if not usuario.activo:
        raise NoAutenticado("Tu cuenta está inactiva. Contacta al administrador.")

    return Token(
        acceso=crear_token(usuario_id=usuario.id, rol=usuario.rol_id),
        expira_en_segundos=configuracion.minutos_expiracion_token * 60,
        usuario=UsuarioSesion.model_validate(usuario),
    )


@router.post(
    "/token",
    response_model=TokenOAuth2,
    summary="Obtener un token (formulario OAuth2)",
    description="Existe para que el botón «Authorize» de esta documentación "
    "funcione. El campo username es el correo del usuario.",
)
async def token_oauth2(
    sesion: SesionDep,
    formulario: Annotated[OAuth2PasswordRequestForm, Depends()],
):
    usuario = await crud_usuarios.obtener_por_email(sesion, formulario.username)

    if usuario is None or not verificar_contrasena(
        formulario.password, usuario.contrasena_hash
    ):
        raise NoAutenticado("Correo o contraseña incorrectos.")
    if not usuario.activo:
        raise NoAutenticado("Tu cuenta está inactiva.")

    return TokenOAuth2(
        access_token=crear_token(usuario_id=usuario.id, rol=usuario.rol_id)
    )


@router.get(
    "/yo",
    response_model=UsuarioSesion,
    summary="Datos del usuario autenticado",
)
async def usuario_autenticado(usuario: UsuarioActual):
    return usuario


@router.post(
    "/recuperar",
    response_model=MensajeSimple,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Solicitar recuperación de contraseña",
    description="Genera un enlace de un solo uso y lo envía al correo indicado.",
)
async def solicitar_recuperacion(
    sesion: SesionDep,
    datos: SolicitudRecuperacion,
    tareas: BackgroundTasks,
):
    usuario = await crud_usuarios.obtener_por_email(sesion, datos.email)

    if usuario is None or not usuario.activo:
        return MensajeSimple(mensaje=MENSAJE_RECUPERACION)

    emitido = await crud_usuarios.crear_codigo_recuperacion(
        sesion, usuario, configuracion.minutos_expiracion_recuperacion
    )

    # None significa que ya se le envió un código hace menos de un minuto. La
    # respuesta es la misma de siempre: quien pide dos veces seguidas ve lo
    # mismo que quien pide una, y el código que sirve es el que ya recibió.
    if emitido is None:
        return MensajeSimple(mensaje=MENSAJE_RECUPERACION)

    codigo, token = emitido
    enlace = f"{configuracion.url_frontend}/restablecer?token={token}"

    # El correo se manda en segundo plano. Hablar con Gmail tarda entre dos y
    # cinco segundos, y no hay ninguna razón para que el usuario los espere
    # mirando un botón girando: el código ya está creado y guardado, así que la
    # respuesta puede salir ya.
    #
    # BackgroundTasks ejecuta la tarea DESPUÉS de enviar la respuesta, en el
    # mismo proceso. Encaja aquí porque el envío es corto y porque, si falla,
    # no hay nada que deshacer: el usuario puede volver a pedir otro código.
    tareas.add_task(_enviar_en_segundo_plano, usuario.email, usuario.nombre, codigo, enlace)

    # Sin servidor SMTP configurado no va a llegar ningún correo, así que en
    # desarrollo se devuelven el código y el enlace para poder probar el flujo
    # igualmente. En producción esto no se expone nunca.
    if not configuracion.correo_configurado and configuracion.entorno == "desarrollo":
        return MensajeSimple(
            mensaje=MENSAJE_RECUPERACION,
            enlace_recuperacion=enlace,
            codigo_recuperacion=codigo,
        )

    return MensajeSimple(mensaje=MENSAJE_RECUPERACION)


@router.post(
    "/verificar-codigo",
    response_model=TokenDeRecuperacion,
    summary="Canjear el código de seis dígitos",
    description=(
        "Comprueba el código que llegó por correo y devuelve el token con el "
        "que se fija la contraseña nueva. A los cinco intentos fallidos el "
        "código queda inutilizado y hay que pedir otro."
    ),
)
async def verificar_codigo(sesion: SesionDep, datos: VerificarCodigo):
    token = await crud_usuarios.canjear_codigo_recuperacion(
        sesion, datos.email, datos.codigo
    )
    return TokenDeRecuperacion(token=token)


@router.post(
    "/restablecer",
    response_model=MensajeSimple,
    summary="Fijar una contraseña nueva con el token recibido",
)
async def restablecer(sesion: SesionDep, datos: RestablecerContrasena):
    usuario = await crud_usuarios.restablecer_con_token(
        sesion, datos.token, datos.contrasena_nueva
    )
    logger.info("Contraseña restablecida para el usuario %s", usuario.id)
    return MensajeSimple(
        mensaje="Tu contraseña quedó actualizada. Ya puedes iniciar sesión."
    )
