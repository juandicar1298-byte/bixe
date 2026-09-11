from datetime import datetime, timedelta, timezone
from secrets import compare_digest, randbelow, token_urlsafe

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.seguridad import hashear_contrasena, verificar_contrasena
from app.errores import (
    CodigoDeRecuperacionInvalido,
    ConflictoDeNegocio,
    CorreoYaRegistrado,
    DocumentoYaRegistrado,
    OperacionSobreUnoMismo,
    RecursoNoEncontrado,
    TokenDeRecuperacionInvalido,
)
from app.models.bixe import RecuperacionContrasena, Rol, Usuario

ROL_CLIENTE = 3


async def listar(
    sesion: AsyncSession,
    rol_id: int | None = None,
    estado: str | None = None,
    buscar: str | None = None,
    limite: int = 20,
    desplazamiento: int = 0,
) -> list[Usuario]:
    consulta = select(Usuario)

    if rol_id is not None:
        consulta = consulta.where(Usuario.rol_id == rol_id)
    if estado is not None:
        consulta = consulta.where(Usuario.estado == estado)
    if buscar is not None:
        patron = f"%{buscar}%"
        consulta = consulta.where(
            or_(
                Usuario.nombre.ilike(patron),
                Usuario.apellido.ilike(patron),
                Usuario.email.ilike(patron),
                Usuario.numero_documento.ilike(patron),
            )
        )

    consulta = (
        consulta.order_by(Usuario.fecha_creacion.desc())
        .offset(desplazamiento)
        .limit(limite)
    )
    resultado = await sesion.scalars(consulta)
    return list(resultado.unique())


async def obtener(sesion: AsyncSession, usuario_id: int) -> Usuario | None:
    return await sesion.get(Usuario, usuario_id)


async def obtener_o_fallar(sesion: AsyncSession, usuario_id: int) -> Usuario:
    usuario = await sesion.get(Usuario, usuario_id)
    if usuario is None:
        raise RecursoNoEncontrado("un usuario", usuario_id)
    return usuario


async def obtener_por_email(sesion: AsyncSession, email: str) -> Usuario | None:
    return await sesion.scalar(select(Usuario).where(Usuario.email == email))


async def obtener_por_documento(sesion: AsyncSession, documento: str) -> Usuario | None:
    return await sesion.scalar(
        select(Usuario).where(Usuario.numero_documento == documento)
    )


async def _verificar_disponibilidad(
    sesion: AsyncSession, email: str, documento: str
) -> None:
    if await obtener_por_email(sesion, email):
        raise CorreoYaRegistrado(email)
    if await obtener_por_documento(sesion, documento):
        raise DocumentoYaRegistrado(documento)


async def crear(
    sesion: AsyncSession,
    datos: dict,
    rol_id: int = ROL_CLIENTE,
    estado: str = "activo",
) -> Usuario:
    """Crea un usuario. La contraseña se guarda siempre hasheada."""
    await _verificar_disponibilidad(sesion, datos["email"], datos["numero_documento"])

    usuario = Usuario(
        nombre=datos["nombre"],
        apellido=datos["apellido"],
        tipo_documento=datos["tipo_documento"],
        numero_documento=datos["numero_documento"],
        direccion=datos["direccion"],
        telefono=datos["telefono"],
        email=datos["email"],
        contrasena_hash=hashear_contrasena(datos["contrasena"]),
        rol_id=rol_id,
        estado=estado,
    )
    sesion.add(usuario)

    try:
        await sesion.commit()
    except IntegrityError:
        # Segunda línea de defensa: dos peticiones simultáneas con el mismo
        # correo pasarían la comprobación de arriba, pero no el índice único.
        await sesion.rollback()
        raise ConflictoDeNegocio(
            "Ese correo o documento acaba de ser registrado por otra persona."
        )

    await sesion.refresh(usuario)
    return usuario


async def actualizar(sesion: AsyncSession, usuario: Usuario, cambios: dict) -> Usuario:
    for campo, valor in cambios.items():
        setattr(usuario, campo, valor)

    await sesion.commit()
    await sesion.refresh(usuario)
    return usuario


async def actualizar_verificando_autobloqueo(
    sesion: AsyncSession, usuario: Usuario, cambios: dict, actor_id: int
) -> Usuario:
    """Un administrador no puede quitarse a sí mismo el rol ni desactivarse."""
    if usuario.id == actor_id:
        if "rol_id" in cambios and cambios["rol_id"] != usuario.rol_id:
            raise OperacionSobreUnoMismo("No puedes cambiar tu propio rol.")
        if cambios.get("estado") == "inactivo":
            raise OperacionSobreUnoMismo("No puedes desactivar tu propia cuenta.")

    return await actualizar(sesion, usuario, cambios)


async def eliminar(sesion: AsyncSession, usuario: Usuario, actor_id: int) -> None:
    if usuario.id == actor_id:
        raise OperacionSobreUnoMismo("No puedes eliminar tu propia cuenta.")

    try:
        await sesion.delete(usuario)
        await sesion.commit()
    except IntegrityError:
        await sesion.rollback()
        raise ConflictoDeNegocio(
            "No se puede eliminar el usuario porque tiene pedidos asociados. "
            "Desactívalo en su lugar para conservar el historial."
        )


async def cambiar_contrasena(
    sesion: AsyncSession, usuario: Usuario, actual: str, nueva: str
) -> None:
    if not verificar_contrasena(actual, usuario.contrasena_hash):
        raise ConflictoDeNegocio("La contraseña actual no es correcta.")

    usuario.contrasena_hash = hashear_contrasena(nueva)
    await sesion.commit()


async def listar_roles(sesion: AsyncSession) -> list[Rol]:
    resultado = await sesion.scalars(select(Rol).order_by(Rol.id))
    return list(resultado.unique())


async def contar(sesion: AsyncSession) -> int:
    return await sesion.scalar(select(func.count()).select_from(Usuario)) or 0


# ------------------------ Recuperación de contraseña ------------------------


MAXIMO_INTENTOS = 5
SEGUNDOS_ENTRE_ENVIOS = 60


def _ahora() -> datetime:
    """UTC sin zona: las columnas DATETIME de MySQL no la guardan."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def crear_codigo_recuperacion(
    sesion: AsyncSession, usuario: Usuario, minutos_validez: int
) -> tuple[str, str] | None:
    """Invalida las recuperaciones anteriores y emite un código nuevo.

    Devuelve la pareja (código de seis dígitos, token), o None si al usuario ya
    se le envió un código hace menos de un minuto. Ese enfriamiento evita que
    alguien use el formulario para inundar de correos una bandeja ajena; se
    aplica en silencio, sin decirlo en la respuesta, porque contarlo revelaría
    que la dirección está registrada.
    """
    ahora = _ahora()

    pendientes = list(
        await sesion.scalars(
            select(RecuperacionContrasena).where(
                RecuperacionContrasena.usuario_id == usuario.id,
                RecuperacionContrasena.usado_en.is_(None),
            )
        )
    )

    # El momento de creación se deduce de expira_en y no se lee de
    # fecha_creacion: esa columna la rellena MySQL con NOW(), que va en la hora
    # local del servidor, mientras que aquí se trabaja en UTC. Restar una de
    # otra da la diferencia de zona horaria y el enfriamiento no se aplicaría
    # nunca.
    validez = timedelta(minutes=minutos_validez)
    reciente = any(
        (ahora - (pendiente.expira_en - validez)).total_seconds() < SEGUNDOS_ENTRE_ENVIOS
        for pendiente in pendientes
    )
    if reciente:
        return None

    for anterior in pendientes:
        anterior.usado_en = ahora

    # randbelow usa el generador criptográfico del sistema: los seis dígitos no
    # se pueden predecir a partir de los anteriores, como sí pasaría con random.
    codigo = f"{randbelow(1_000_000):06d}"
    token = token_urlsafe(32)[:64]

    sesion.add(
        RecuperacionContrasena(
            usuario_id=usuario.id,
            token=token,
            codigo=codigo,
            expira_en=ahora + timedelta(minutes=minutos_validez),
        )
    )
    await sesion.commit()
    return codigo, token


async def canjear_codigo_recuperacion(
    sesion: AsyncSession, email: str, codigo: str
) -> str:
    """Cambia el código de seis dígitos por el token que completa el cambio.

    Cualquier problema —correo desconocido, código equivocado, caducado o con
    los intentos agotados— sale con la misma excepción, para no ir diciendo por
    el camino qué parte era la que fallaba.
    """
    fallo = CodigoDeRecuperacionInvalido()

    usuario = await obtener_por_email(sesion, email)
    if usuario is None or not usuario.activo:
        raise fallo

    recuperacion = await sesion.scalar(
        select(RecuperacionContrasena)
        .where(
            RecuperacionContrasena.usuario_id == usuario.id,
            RecuperacionContrasena.usado_en.is_(None),
        )
        .order_by(RecuperacionContrasena.id.desc())
        .limit(1)
    )

    if recuperacion is None or recuperacion.expira_en < _ahora():
        raise fallo

    if recuperacion.intentos >= MAXIMO_INTENTOS:
        # Se cierra para que no siga contando intentos indefinidamente.
        recuperacion.usado_en = _ahora()
        await sesion.commit()
        raise fallo

    # compare_digest tarda lo mismo acierte o falle, así que el tiempo de
    # respuesta no deja adivinar cuántos dígitos iban bien.
    if not compare_digest(recuperacion.codigo, codigo):
        recuperacion.intentos += 1
        await sesion.commit()
        raise fallo

    return recuperacion.token


async def restablecer_con_token(
    sesion: AsyncSession, token: str, contrasena_nueva: str
) -> Usuario:
    """Consume el token y cambia la contraseña, todo en una sola transacción."""
    recuperacion = await sesion.scalar(
        select(RecuperacionContrasena).where(RecuperacionContrasena.token == token)
    )

    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    if (
        recuperacion is None
        or recuperacion.usado_en is not None
        or recuperacion.expira_en < ahora
    ):
        raise TokenDeRecuperacionInvalido()

    usuario = await sesion.get(Usuario, recuperacion.usuario_id)
    if usuario is None:
        raise TokenDeRecuperacionInvalido()

    usuario.contrasena_hash = hashear_contrasena(contrasena_nueva)
    recuperacion.usado_en = ahora
    await sesion.commit()
    await sesion.refresh(usuario)
    return usuario
