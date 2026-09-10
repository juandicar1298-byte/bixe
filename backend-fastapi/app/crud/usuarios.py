from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.seguridad import hashear_contrasena, verificar_contrasena
from app.errores import (
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


async def crear_token_recuperacion(
    sesion: AsyncSession, usuario: Usuario, minutos_validez: int
) -> str:
    """Invalida los tokens anteriores del usuario y emite uno nuevo."""
    pendientes = await sesion.scalars(
        select(RecuperacionContrasena).where(
            RecuperacionContrasena.usuario_id == usuario.id,
            RecuperacionContrasena.usado_en.is_(None),
        )
    )
    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    for anterior in pendientes:
        anterior.usado_en = ahora

    token = token_urlsafe(32)[:64]
    sesion.add(
        RecuperacionContrasena(
            usuario_id=usuario.id,
            token=token,
            expira_en=ahora + timedelta(minutes=minutos_validez),
        )
    )
    await sesion.commit()
    return token


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
