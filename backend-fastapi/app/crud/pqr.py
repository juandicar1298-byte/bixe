"""Peticiones, quejas y reclamos.

Puede radicar tanto un cliente con cuenta como alguien que llega desde el
chatbot sin haber iniciado sesión; por eso el nombre y el correo de contacto
se guardan en la propia solicitud y no se leen siempre del usuario.
"""

from datetime import date, datetime, time, timedelta

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencias import ROL_ADMINISTRADOR, ROL_EMPLEADO
from app.errores import ConflictoDeNegocio, RecursoNoEncontrado
from app.models.bixe import Pqr, Usuario
from app.schemas.pqr import PqrCrear

PREFIJO = "PQR"

# De qué estados se puede pasar a cuál. Una solicitud cerrada no se reabre:
# si el cliente insiste, radica una nueva y queda el rastro de las dos.
TRANSICIONES = {
    "pendiente": {"en_proceso", "respondida", "cerrada"},
    "en_proceso": {"respondida", "cerrada"},
    "respondida": {"cerrada", "en_proceso"},
    "cerrada": set(),
}


async def _siguiente_consecutivo(sesion: AsyncSession) -> int:
    ultimo = await sesion.scalar(select(func.max(Pqr.consecutivo)))
    return (ultimo or 0) + 1


async def radicar(
    sesion: AsyncSession, datos: PqrCrear, usuario: Usuario | None
) -> Pqr:
    """Registra la solicitud y devuelve el radicado con el que se consulta."""
    if usuario is not None:
        nombre = f"{usuario.nombre} {usuario.apellido}"
        correo = usuario.email
    else:
        nombre = (datos.nombre_contacto or "").strip()
        correo = datos.email_contacto
        if not nombre or not correo:
            raise ConflictoDeNegocio(
                "Sin sesión iniciada hay que indicar un nombre y un correo de "
                "contacto para poder responder."
            )

    consecutivo = await _siguiente_consecutivo(sesion)

    solicitud = Pqr(
        radicado=f"{PREFIJO}-{consecutivo:06d}",
        consecutivo=consecutivo,
        usuario_id=usuario.id if usuario else None,
        nombre_contacto=nombre,
        email_contacto=str(correo),
        tipo=datos.tipo,
        asunto=datos.asunto,
        mensaje=datos.mensaje,
        estado="pendiente",
    )
    sesion.add(solicitud)

    try:
        await sesion.commit()
    except IntegrityError:
        await sesion.rollback()
        raise ConflictoDeNegocio(
            "No se pudo radicar la solicitud. Inténtalo de nuevo en un momento."
        )

    await sesion.refresh(solicitud)
    return solicitud


def _aplicar_filtros(
    consulta: Select,
    *,
    estado: str | None = None,
    tipo: str | None = None,
    desde: date | None = None,
    hasta: date | None = None,
    texto: str | None = None,
) -> Select:
    if estado:
        consulta = consulta.where(Pqr.estado == estado)
    if tipo:
        consulta = consulta.where(Pqr.tipo == tipo)
    if desde is not None:
        consulta = consulta.where(Pqr.fecha_creacion >= datetime.combine(desde, time.min))
    if hasta is not None:
        consulta = consulta.where(
            Pqr.fecha_creacion < datetime.combine(hasta + timedelta(days=1), time.min)
        )
    if texto:
        patron = f"%{texto.strip()}%"
        consulta = consulta.where(
            or_(
                Pqr.radicado.ilike(patron),
                Pqr.asunto.ilike(patron),
                Pqr.nombre_contacto.ilike(patron),
                Pqr.email_contacto.ilike(patron),
            )
        )
    return consulta


async def listar(
    sesion: AsyncSession,
    *,
    limite: int = 50,
    desplazamiento: int = 0,
    usuario_id: int | None = None,
    **filtros,
) -> tuple[list[Pqr], int]:
    """Listado paginado. Con usuario_id, solo las de esa persona."""
    base = _aplicar_filtros(select(Pqr), **filtros)
    if usuario_id is not None:
        base = base.where(Pqr.usuario_id == usuario_id)

    total = await sesion.scalar(select(func.count()).select_from(base.subquery()))

    solicitudes = list(
        await sesion.scalars(
            base.order_by(Pqr.fecha_creacion.desc(), Pqr.id.desc())
            .limit(limite)
            .offset(desplazamiento)
        )
    )
    return solicitudes, total or 0


async def obtener(sesion: AsyncSession, pqr_id: int) -> Pqr:
    solicitud = await sesion.get(Pqr, pqr_id)
    if solicitud is None:
        raise RecursoNoEncontrado("una PQR", pqr_id)
    return solicitud


async def obtener_para(sesion: AsyncSession, pqr_id: int, usuario: Usuario) -> Pqr:
    """La solicitud, comprobando que el cliente solo vea las suyas."""
    solicitud = await obtener(sesion, pqr_id)

    es_personal = usuario.rol_id in (ROL_ADMINISTRADOR, ROL_EMPLEADO)
    if not es_personal and solicitud.usuario_id != usuario.id:
        # Mismo mensaje que si no existiera: así nadie averigua qué radicados
        # hay probando números.
        raise RecursoNoEncontrado("una PQR", pqr_id)

    return solicitud


async def buscar_por_radicado(sesion: AsyncSession, radicado: str) -> Pqr:
    solicitud = await sesion.scalar(
        select(Pqr).where(Pqr.radicado == radicado.strip().upper())
    )
    if solicitud is None:
        raise RecursoNoEncontrado("una PQR con radicado", radicado)
    return solicitud


def _validar_transicion(actual: str, nuevo: str) -> None:
    if nuevo == actual:
        return
    if nuevo not in TRANSICIONES.get(actual, set()):
        raise ConflictoDeNegocio(
            f"Una PQR en estado «{actual}» no puede pasar a «{nuevo}»."
        )


async def responder(
    sesion: AsyncSession, pqr_id: int, respuesta: str, estado: str, atendido_por: Usuario
) -> Pqr:
    solicitud = await obtener(sesion, pqr_id)
    _validar_transicion(solicitud.estado, estado)

    solicitud.respuesta = respuesta.strip()
    solicitud.estado = estado
    solicitud.atendido_por_id = atendido_por.id
    solicitud.fecha_respuesta = datetime.now()

    await sesion.commit()
    await sesion.refresh(solicitud)
    return solicitud


async def cambiar_estado(sesion: AsyncSession, pqr_id: int, estado: str) -> Pqr:
    solicitud = await obtener(sesion, pqr_id)
    _validar_transicion(solicitud.estado, estado)

    if estado in ("respondida", "cerrada") and not solicitud.respuesta:
        raise ConflictoDeNegocio(
            "No se puede dar por respondida una PQR que todavía no tiene respuesta."
        )

    solicitud.estado = estado
    await sesion.commit()
    await sesion.refresh(solicitud)
    return solicitud


async def resumen_por_estado(sesion: AsyncSession) -> list[dict]:
    filas = (
        await sesion.execute(
            select(Pqr.estado, func.count().label("total")).group_by(Pqr.estado)
        )
    ).all()
    return [{"estado": f.estado, "total": f.total} for f in filas]
