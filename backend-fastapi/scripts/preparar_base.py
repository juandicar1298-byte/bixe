"""Deja una base de datos recién creada lista para usar.

Crea las tablas si faltan y siembra lo mínimo para que la aplicación arranque:
los tres roles, los cuatro permisos, qué puede hacer cada rol y una cuenta de
administrador con la que entrar la primera vez.

Sirve igual para MySQL en local que para PostgreSQL en la nube: lo que decide
es URL_BASE_DATOS, no el script.

Uso, desde backend-fastapi/:
    .venv/Scripts/python.exe scripts/preparar_base.py

Es idempotente: ejecutarlo dos veces no duplica nada ni pisa lo que ya haya.
La contraseña del administrador se pide por teclado y no se ve en pantalla.
"""

import asyncio
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# El script vive en scripts/, así que la raíz del proyecto no está en el path.
sys.path.insert(0, str(RAIZ))

from _consola import leer_secreto, preguntar  # noqa: E402
from sqlalchemy import select  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402

from app.core.base_datos import Base  # noqa: E402
from app.core.configuracion import configuracion  # noqa: E402
from app.core.seguridad import hashear_contrasena  # noqa: E402
from app.models.bixe import Permiso, Rol, Usuario, roles_permisos  # noqa: E402
from app.schemas.comunes import validar_contrasena  # noqa: E402

ROLES = [
    (1, "Administrador"),
    (2, "Empleado"),
    (3, "Cliente"),
]

PERMISOS = [
    (1, "gestionar_usuarios", "Crear, editar, eliminar usuarios"),
    (2, "gestionar_productos", "Crear, editar, eliminar productos"),
    (3, "gestionar_servicios", "Crear, editar, eliminar servicios"),
    (4, "ver_panel_cliente", "Acceso al panel de cliente"),
]

# Qué puede hacer cada rol. La autorización de la API se resuelve leyendo esta
# tabla, no con identificadores escritos en el código, así que cambiar aquí los
# permisos cambia de verdad quién puede hacer qué.
ROLES_PERMISOS = [
    (1, 1), (1, 2), (1, 3), (1, 4),   # Administrador: todo
    (2, 2), (2, 3),                   # Empleado: catálogo
    (3, 4),                           # Cliente: su panel
]


async def sembrar_catalogos(sesion) -> None:
    """Roles, permisos y la relación entre ambos."""
    existentes = set(await sesion.scalars(select(Rol.id)))
    nuevos = [Rol(id=i, nombre=n) for i, n in ROLES if i not in existentes]
    sesion.add_all(nuevos)
    print(f"  Roles: {len(nuevos)} creados, {len(existentes)} ya estaban.")

    existentes = set(await sesion.scalars(select(Permiso.id)))
    nuevos = [
        Permiso(id=i, nombre=n, descripcion=d)
        for i, n, d in PERMISOS
        if i not in existentes
    ]
    sesion.add_all(nuevos)
    print(f"  Permisos: {len(nuevos)} creados, {len(existentes)} ya estaban.")

    await sesion.flush()

    filas = set(
        (f.id_rol, f.id_permiso)
        for f in (await sesion.execute(select(roles_permisos))).all()
    )
    faltan = [
        {"id_rol": rol, "id_permiso": permiso}
        for rol, permiso in ROLES_PERMISOS
        if (rol, permiso) not in filas
    ]
    if faltan:
        await sesion.execute(roles_permisos.insert(), faltan)
    print(f"  Permisos por rol: {len(faltan)} creados, {len(filas)} ya estaban.")


async def crear_administrador(sesion) -> None:
    """La cuenta con la que entrar por primera vez."""
    cuantos = len(list(await sesion.scalars(select(Usuario.id).where(Usuario.rol_id == 1))))
    if cuantos:
        print(f"  Ya hay {cuantos} administrador(es). No se crea ninguno más.")
        return

    print("\n  No hay ningún administrador todavía. Vamos a crear el primero.")

    nombre = preguntar("  Nombre", "Admin")
    apellido = preguntar("  Apellido", "BIXE")
    email = preguntar("  Correo")
    if not email:
        raise SystemExit("\n  Sin correo no se puede crear la cuenta.")

    documento = preguntar("  Número de documento", "1000000000")

    print("\n  La contraseña no se verá mientras la escribes.")
    print(f"  {validar_contrasena.__doc__ or ''}".rstrip())

    contrasena = leer_secreto("  Contraseña: ")
    if contrasena is None:
        raise SystemExit("\n  Sin contraseña no se puede crear la cuenta.")

    try:
        validar_contrasena(contrasena)
    except ValueError as error:
        raise SystemExit(f"\n  {error}")

    if contrasena != leer_secreto("  Repítela: "):
        raise SystemExit("\n  No coinciden.")

    sesion.add(
        Usuario(
            nombre=nombre,
            apellido=apellido,
            tipo_documento="CC",
            numero_documento=documento,
            direccion="Por definir",
            telefono="3000000000",
            email=email,
            contrasena_hash=hashear_contrasena(contrasena),
            rol_id=1,
            estado="activo",
        )
    )
    print(f"\n  Administrador creado: {email}")


async def principal() -> int:
    motor = create_async_engine(configuracion.url_base_datos)
    destino = configuracion.url_base_datos.split("@")[-1]

    print("Preparar la base de datos de BIXE")
    print("=" * 33)
    print(f"\nDestino: {destino}")

    try:
        async with motor.begin() as conexion:
            # create_all no toca las tablas que ya existan: solo crea las que
            # falten. En una base nueva, las crea todas.
            await conexion.run_sync(Base.metadata.create_all)
        print(f"\n  Tablas verificadas: {len(Base.metadata.sorted_tables)}")
    except Exception as error:
        print(f"\n  No se pudo conectar: {type(error).__name__}")
        print(f"  {error}"[:300])
        await motor.dispose()
        return 1

    fabrica = async_sessionmaker(motor, expire_on_commit=False)
    try:
        async with fabrica() as sesion:
            await sembrar_catalogos(sesion)
            await crear_administrador(sesion)
            await sesion.commit()
    finally:
        await motor.dispose()

    print("\nListo. Ya puedes iniciar sesión en la web con esa cuenta.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(principal()))
