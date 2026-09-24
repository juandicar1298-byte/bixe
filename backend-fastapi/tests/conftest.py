"""Preparación común de las pruebas.

Las pruebas corren contra una base SQLite en memoria: no hace falta tener
MySQL encendido ni conexión a Neon, así que sirven igual en el portátil que
en el servidor de integración continua de GitHub.

La base se crea vacía antes de cada prueba y se destruye al terminarla. Eso
hace que el orden en que pytest las ejecute no importe: ninguna depende de lo
que haya dejado otra.
"""

import os
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

# IMPORTANTE: esto va antes de importar nada de app.
#
# La configuración se lee en el momento en que se importa app.core.configuracion,
# y el motor de base de datos se crea en ese mismo instante. Si estas variables
# se pusieran después, las pruebas acabarían escribiendo en la base de verdad.
os.environ["URL_BASE_DATOS"] = "sqlite+aiosqlite:///:memory:"
os.environ["SECRET_KEY"] = "clave-de-pruebas-no-se-usa-en-ningun-servidor"
os.environ["ENTORNO"] = "pruebas"
os.environ["SMTP_HOST"] = ""          # sin correo saliente
os.environ["PROVEEDOR_IA"] = ""       # el chatbot responde sin IA
os.environ["IA_API_KEY"] = ""

import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import insert  # noqa: E402

from app.core.base_datos import Base, FabricaDeSesiones, motor  # noqa: E402
from app.core.seguridad import hashear_contrasena  # noqa: E402
from app.main import app  # noqa: E402
from app.models.bixe import Permiso, Rol, Usuario, roles_permisos  # noqa: E402

# Los mismos datos que siembra scripts/preparar_base.py. Se repiten aquí a
# propósito: si alguien cambia los permisos de un rol y se le olvida mirar las
# consecuencias, las pruebas de autorización lo cantan.
ROLES = [(1, "Administrador"), (2, "Empleado"), (3, "Cliente")]

PERMISOS = [
    (1, "gestionar_usuarios", "Crear, editar, eliminar usuarios"),
    (2, "gestionar_productos", "Crear, editar, eliminar productos"),
    (3, "gestionar_servicios", "Crear, editar, eliminar servicios"),
    (4, "ver_panel_cliente", "Acceso al panel de cliente"),
]

ROLES_PERMISOS = [(1, 1), (1, 2), (1, 3), (1, 4), (2, 2), (2, 3), (3, 4)]

CONTRASENA = "Bixe2026*"

CUENTAS = {
    # alias           rol  nombre     correo
    "admin":         (1, "Admin",    "admin@pruebas.com"),
    "empleado":      (2, "Empleado", "empleado@pruebas.com"),
    "cliente":       (3, "Cliente",  "cliente@pruebas.com"),
    "otro_cliente":  (3, "Otro",     "otro@pruebas.com"),
}


@pytest_asyncio.fixture(autouse=True)
async def base_limpia():
    """Una base vacía y sembrada para cada prueba."""
    async with motor.begin() as conexion:
        await conexion.run_sync(Base.metadata.drop_all)
        await conexion.run_sync(Base.metadata.create_all)

    async with FabricaDeSesiones() as sesion:
        sesion.add_all([Rol(id=i, nombre=n) for i, n in ROLES])
        sesion.add_all(
            [Permiso(id=i, nombre=n, descripcion=d) for i, n, d in PERMISOS]
        )
        await sesion.flush()
        await sesion.execute(
            insert(roles_permisos),
            [{"id_rol": r, "id_permiso": p} for r, p in ROLES_PERMISOS],
        )

        # El hash de bcrypt tarda, así que se calcula una sola vez para las
        # cuatro cuentas: todas comparten la misma contraseña.
        hash_comun = hashear_contrasena(CONTRASENA)
        for numero, (alias, (rol, nombre, correo)) in enumerate(CUENTAS.items()):
            sesion.add(
                Usuario(
                    nombre=nombre,
                    apellido="Pruebas",
                    tipo_documento="CC",
                    numero_documento=f"90000000{numero}",
                    direccion="Calle de pruebas 1-23",
                    telefono="3001234567",
                    email=correo,
                    contrasena_hash=hash_comun,
                    rol_id=rol,
                    estado="activo",
                )
            )
        await sesion.commit()

    yield

    async with motor.begin() as conexion:
        await conexion.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def cliente():
    """Cliente HTTP que habla con la aplicación sin levantar un servidor."""
    transporte = ASGITransport(app=app)
    async with AsyncClient(transport=transporte, base_url="http://pruebas") as http:
        yield http


async def _entrar(http: AsyncClient, alias: str) -> dict:
    """Inicia sesión y devuelve la cabecera Authorization lista para usar."""
    _, _, correo = CUENTAS[alias]
    respuesta = await http.post(
        "/api/auth/login", json={"email": correo, "contrasena": CONTRASENA}
    )
    assert respuesta.status_code == 200, respuesta.text
    return {"Authorization": f"Bearer {respuesta.json()['acceso']}"}


@pytest_asyncio.fixture
async def como_admin(cliente):
    return await _entrar(cliente, "admin")


@pytest_asyncio.fixture
async def como_empleado(cliente):
    return await _entrar(cliente, "empleado")


@pytest_asyncio.fixture
async def como_cliente(cliente):
    return await _entrar(cliente, "cliente")


@pytest_asyncio.fixture
async def como_otro_cliente(cliente):
    return await _entrar(cliente, "otro_cliente")
