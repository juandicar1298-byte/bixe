from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.configuracion import configuracion

# El motor se crea una sola vez para todo el proceso.
motor = create_async_engine(
    configuracion.url_base_datos,
    echo=False,
    # pool_pre_ping queda desactivado a propósito: el adaptador aiomysql de
    # SQLAlchemy 2.0.36 llama a ping() sin el argumento "reconnect" que exige
    # aiomysql 0.2.0. pool_recycle cubre el mismo caso (conexiones caducadas)
    # reciclándolas cada 30 minutos, muy por debajo del wait_timeout de MySQL.
    pool_recycle=1800,
)

FabricaDeSesiones = async_sessionmaker(
    bind=motor,
    class_=AsyncSession,
    autoflush=False,
    expire_on_commit=False,  # imprescindible en async: evita E/S al leer atributos
)


class Base(DeclarativeBase):
    """Base declarativa: reúne los metadatos de todas las tablas."""


async def obtener_sesion() -> AsyncGenerator[AsyncSession, None]:
    """Dependencia asíncrona: abre la sesión, la entrega y la cierra siempre."""
    async with FabricaDeSesiones() as sesion:
        yield sesion
