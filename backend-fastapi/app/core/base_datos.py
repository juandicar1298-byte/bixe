from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.configuracion import configuracion

# El proyecto corre sobre MySQL en local (XAMPP) y sobre PostgreSQL en la nube
# (Neon). Lo único que cambia es la URL; el resto del código es el mismo.
ES_MYSQL = configuracion.url_base_datos.startswith("mysql")

# pool_pre_ping comprueba que la conexión siga viva antes de usarla.
#
# En MySQL queda desactivado a propósito: el adaptador aiomysql de SQLAlchemy
# 2.0.36 llama a ping() sin el argumento «reconnect» que exige aiomysql 0.2.0.
#
# En PostgreSQL sí se activa, y ahí hace falta de verdad: Neon suspende la base
# cuando lleva un rato sin uso y cierra las conexiones abiertas. Sin pre_ping,
# la primera petición después de un rato de silencio falla.
CONFIGURACION_DEL_POOL = (
    {"pool_recycle": 1800}
    if ES_MYSQL
    else {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        # asyncpg guarda las consultas como sentencias preparadas con un
        # nombre fijo. Neon ofrece dos cadenas de conexión y la que enseña por
        # defecto pasa por un PgBouncer que reparte cada consulta por una
        # conexión distinta, así que ese nombre no existe al reutilizarlo y
        # todo falla con «prepared statement does not exist».
        #
        # Desactivar la caché cuesta muy poco a esta escala y hace que
        # funcionen las dos cadenas, que es justo lo que no se quiere andar
        # depurando el día de la sustentación.
        "connect_args": {"statement_cache_size": 0},
    }
)

# El motor se crea una sola vez para todo el proceso.
motor = create_async_engine(
    configuracion.url_base_datos,
    echo=False,
    **CONFIGURACION_DEL_POOL,
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
