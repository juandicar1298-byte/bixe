"""Conversaciones del chatbot.

Cada visitante tiene una clave que guarda su navegador y reenvía en cada
mensaje; con ella se recupera el hilo aunque no haya iniciado sesión. Si la
sesión existe, la conversación queda además ligada a su cuenta.

Los mensajes se leen siempre con una consulta explícita y nunca a través de
Conversacion.mensajes. En SQLAlchemy asíncrono, tocar una colección que no
está cargada dispara E/S fuera del contexto correcto y revienta con
MissingGreenlet; con la consulta a la vista, eso no puede pasar.
"""

from datetime import datetime
from secrets import token_urlsafe

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bixe import Conversacion, Mensaje, Usuario

# Tope de mensajes por conversación. Evita que una pestaña olvidada abierta
# acabe guardando miles de filas.
MAXIMO_MENSAJES = 60


def nueva_clave() -> str:
    return token_urlsafe(24)[:40]


async def obtener_o_crear(
    sesion: AsyncSession, clave: str | None, usuario: Usuario | None
) -> Conversacion:
    conversacion = None

    if clave:
        conversacion = await sesion.scalar(
            select(Conversacion).where(Conversacion.clave == clave)
        )

    if conversacion is None:
        conversacion = Conversacion(
            clave=clave or nueva_clave(),
            usuario_id=usuario.id if usuario else None,
        )
        sesion.add(conversacion)
        await sesion.flush()
        return conversacion

    # Si el visitante inicia sesión a mitad de la charla, el hilo pasa a ser suyo.
    if usuario is not None and conversacion.usuario_id is None:
        conversacion.usuario_id = usuario.id

    return conversacion


async def historial(sesion: AsyncSession, conversacion: Conversacion) -> list[dict]:
    mensajes = await sesion.scalars(
        select(Mensaje)
        .where(Mensaje.conversacion_id == conversacion.id)
        .order_by(Mensaje.id)
    )
    return [
        {"rol": m.rol, "contenido": m.contenido, "fecha": m.fecha} for m in mensajes
    ]


async def anotar(
    sesion: AsyncSession, conversacion: Conversacion, pregunta: str, respuesta: str
) -> list[dict]:
    """Guarda el turno completo y devuelve el hilo ya actualizado."""
    sesion.add_all(
        [
            Mensaje(conversacion_id=conversacion.id, rol="usuario", contenido=pregunta),
            Mensaje(
                conversacion_id=conversacion.id, rol="asistente", contenido=respuesta
            ),
        ]
    )
    conversacion.fecha_ultimo = datetime.now()
    await sesion.commit()

    return await historial(sesion, conversacion)


async def alcanzo_el_tope(sesion: AsyncSession, conversacion: Conversacion) -> bool:
    cuantos = await sesion.scalar(
        select(func.count())
        .select_from(Mensaje)
        .where(Mensaje.conversacion_id == conversacion.id)
    )
    return (cuantos or 0) >= MAXIMO_MENSAJES
