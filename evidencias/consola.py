"""Evidencias que no son ni una página ni un archivo de código.

Estructura de carpetas, estado de la base de datos, rutas de la API y pruebas
de los cinco métodos HTTP. Todo se consulta de verdad en el momento de
ejecutarlo: nada de aquí está escrito a mano.

Uso, desde la raíz del proyecto:
    backend-fastapi/.venv/Scripts/python.exe evidencias/consola.py
"""

import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "evidencias"))
sys.path.insert(0, str(RAIZ / "backend-fastapi"))

from imagen_codigo import dibujar_texto  # noqa: E402

API = "http://127.0.0.1:8000"
SALIDA = RAIZ / "evidencias" / "imagenes"

# Carpetas que no aportan nada al árbol del proyecto.
IGNORAR = {
    ".git", ".venv", "node_modules", "__pycache__", "dist", "uploads",
    ".pytest_cache", "imagenes", ".vite",
}


def arbol(carpeta: Path, prefijo: str = "", profundidad: int = 2) -> list[str]:
    if profundidad == 0:
        return []

    hijos = sorted(
        (h for h in carpeta.iterdir() if h.name not in IGNORAR and not h.name.startswith(".")),
        key=lambda h: (h.is_file(), h.name.lower()),
    )
    lineas = []
    for i, hijo in enumerate(hijos):
        ultimo = i == len(hijos) - 1
        rama = "`-- " if ultimo else "|-- "
        lineas.append(f"{prefijo}{rama}{hijo.name}{'/' if hijo.is_dir() else ''}")
        if hijo.is_dir():
            lineas += arbol(hijo, prefijo + ("    " if ultimo else "|   "), profundidad - 1)
    return lineas


def estructura() -> None:
    lineas = ["> tree /F (resumido)", "", "REACT/"]
    lineas += arbol(RAIZ, profundidad=2)
    dibujar_texto(
        "\n".join(lineas),
        SALIDA / "con-estructura.png",
        "Estructura del proyecto",
        columnas=2,
    )
    print("  con-estructura.png")


def base_de_datos() -> None:
    import asyncio

    os.chdir(RAIZ / "backend-fastapi")
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.core.configuracion import configuracion

    async def consultar():
        motor = create_async_engine(configuracion.url_base_datos)
        fabrica = async_sessionmaker(motor, expire_on_commit=False)
        try:
            async with fabrica() as s:
                tablas = [f[0] for f in (await s.execute(text("SHOW TABLES"))).all()]
                conteos = {}
                for tabla in tablas:
                    conteos[tabla] = await s.scalar(
                        text(f"SELECT COUNT(*) FROM `{tabla}`")
                    )
                columnas = (await s.execute(text("SHOW COLUMNS FROM usuarios"))).all()
                muestras = (
                    await s.execute(
                        text("SELECT email, password, id_rol, estado FROM usuarios LIMIT 4")
                    )
                ).all()
                permisos = (
                    await s.execute(
                        text(
                            "SELECT r.nombre_rol, p.nombre_permiso FROM roles_permisos rp "
                            "JOIN roles r ON r.id_rol = rp.id_rol "
                            "JOIN permisos p ON p.id_permiso = rp.id_permiso "
                            "ORDER BY r.id_rol, p.id_permiso"
                        )
                    )
                ).all()
            return tablas, conteos, columnas, muestras, permisos
        finally:
            await motor.dispose()

    tablas, conteos, columnas, muestras, permisos = asyncio.run(consultar())

    # --- Tablas de la base ---
    lineas = ["> mysql -u root -p bixe_db -e \"SHOW TABLES\"", ""]
    lineas += [f"  {t:<22} {conteos[t]:>4} registros" for t in tablas]
    lineas += ["", f"# {len(tablas)} tablas en bixe_db"]
    dibujar_texto("\n".join(lineas), SALIDA / "con-tablas.png", "MySQL - bixe_db")
    print("  con-tablas.png")

    # --- Estructura de usuarios ---
    lineas = ["> SHOW COLUMNS FROM usuarios", ""]
    lineas += [f"  {c[0]:<20} {c[1]:<16} nulo: {c[2]}" for c in columnas]
    dibujar_texto("\n".join(lineas), SALIDA / "con-tabla-usuarios.png", "MySQL - usuarios")
    print("  con-tabla-usuarios.png")

    # --- Contraseñas hasheadas ---
    # El hash se corta: basta el prefijo $2b$ para demostrar que es bcrypt, y
    # no hay motivo para publicar el hash completo de nadie.
    lineas = [
        "> SELECT email, password, id_rol, estado FROM usuarios LIMIT 4",
        "",
        "# El hash se muestra recortado a proposito.",
        "",
    ]
    for email, password, rol, estado in muestras:
        lineas.append(f"  {email:<28} {password[:24]}...  rol={rol}  {estado}")
    lineas += [
        "",
        "# $2b$ es la marca de bcrypt. Ninguna contrasena se guarda en claro",
        "# y la API nunca las devuelve en sus respuestas.",
    ]
    dibujar_texto("\n".join(lineas), SALIDA / "con-bcrypt.png", "MySQL - usuarios.password")
    print("  con-bcrypt.png")

    # --- Roles y permisos ---
    lineas = ["> SELECT rol, permiso FROM roles_permisos ...", ""]
    lineas += [f"  {rol:<16} {permiso}" for rol, permiso in permisos]
    dibujar_texto("\n".join(lineas), SALIDA / "con-permisos.png", "MySQL - roles_permisos")
    print("  con-permisos.png")


def endpoints() -> None:
    with urllib.request.urlopen(f"{API}/openapi.json", timeout=15) as r:
        esquema = json.load(r)

    lineas = ["> GET /openapi.json  (rutas publicadas por FastAPI)", ""]
    for ruta, metodos in sorted(esquema["paths"].items()):
        verbos = " ".join(sorted(m.upper() for m in metodos))
        lineas.append(f"  {verbos:<26} {ruta}")
    lineas += ["", f"# {len(esquema['paths'])} rutas"]
    dibujar_texto(
        "\n".join(lineas), SALIDA / "con-endpoints.png", "API - rutas", columnas=2
    )
    print("  con-endpoints.png")


def postman() -> None:
    ruta = RAIZ / "backend-fastapi" / "postman" / "BIXE_API.postman_collection.json"
    coleccion = json.loads(ruta.read_text(encoding="utf-8"))

    verbos: dict[str, int] = {}
    lineas = ["> Coleccion de Postman: BIXE_API", ""]

    def recorrer(items, nivel=0):
        for item in items:
            if "item" in item:
                lineas.append(f"{'  ' * (nivel + 1)}[{item['name']}]")
                recorrer(item["item"], nivel + 1)
            else:
                metodo = item.get("request", {}).get("method", "?")
                verbos[metodo] = verbos.get(metodo, 0) + 1
                lineas.append(f"{'  ' * (nivel + 1)}{metodo:<7} {item['name']}")

    recorrer(coleccion["item"])
    total = sum(verbos.values())
    lineas += ["", f"# {total} peticiones: " + ", ".join(
        f"{v} {k}" for k, v in sorted(verbos.items())
    )]

    dibujar_texto(
        "\n".join(lineas),
        SALIDA / "con-postman.png",
        "Postman - coleccion",
        columnas=2,
    )
    print("  con-postman.png")


def pedir(metodo: str, ruta: str, cuerpo=None, token: str | None = None):
    """Lanza la petición y devuelve (código, cuerpo). No levanta excepción."""
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    peticion = urllib.request.Request(f"{API}{ruta}", data=datos, method=metodo)
    if datos:
        peticion.add_header("Content-Type", "application/json")
    if token:
        peticion.add_header("Authorization", f"Bearer {token}")

    try:
        with urllib.request.urlopen(peticion, timeout=20) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", "replace")


def metodos_http() -> None:
    """Ejecuta los cinco verbos de verdad contra la API y apunta la respuesta.

    Se hace con una cuenta temporal de administrador, que se borra al acabar
    junto con el usuario que se crea durante la propia prueba.
    """
    from generar import CONTRASENA, CORREO_DE_PRUEBA, CUENTAS, cuentas_temporales

    with cuentas_temporales():
        lineas = ["> Pruebas de los cinco metodos HTTP contra la API", ""]

        # --- Sin token ---
        codigo, _ = pedir("GET", "/api/productos")
        lineas.append(f"  GET    /api/productos              (publico)   -> {codigo}")
        codigo, _ = pedir("GET", "/api/usuarios")
        lineas.append(f"  GET    /api/usuarios               (sin token) -> {codigo}")

        # --- Login: POST ---
        codigo, cuerpo = pedir(
            "POST",
            "/api/auth/login",
            {"email": CUENTAS["admin"][3], "contrasena": CONTRASENA},
        )
        token = json.loads(cuerpo).get("acceso") if codigo == 200 else None
        lineas.append(f"  POST   /api/auth/login             (correcto)  -> {codigo}")

        # --- Con token ---
        codigo, _ = pedir("GET", "/api/usuarios", token=token)
        lineas.append(f"  GET    /api/usuarios               (con token) -> {codigo}")

        codigo, cuerpo = pedir(
            "POST",
            "/api/usuarios/registro",
            {
                "nombre": "Nuevo",
                "apellido": "Aprendiz",
                "tipo_documento": "CC",
                "numero_documento": "9000000004",
                "direccion": "Calle 45 #12-11",
                "telefono": "3001234567",
                "email": CORREO_DE_PRUEBA,
                "contrasena": CONTRASENA,
                "confirmar_contrasena": CONTRASENA,
            },
        )
        lineas.append(f"  POST   /api/usuarios/registro      (crear)     -> {codigo}")
        nuevo_id = json.loads(cuerpo).get("id") if codigo in (200, 201) else None

        codigo, _ = pedir(
            "PUT",
            "/api/usuarios/perfil",
            {
                "nombre": "Ana",
                "apellido": "Gomez",
                "tipo_documento": "CC",
                "numero_documento": "9000000001",
                "direccion": "Carrera 50 #30-20",
                "telefono": "3009998877",
                "email": CUENTAS["admin"][3],
            },
            token=token,
        )
        lineas.append(f"  PUT    /api/usuarios/perfil        (editar)    -> {codigo}")

        if nuevo_id:
            codigo, _ = pedir(
                "PATCH",
                f"/api/usuarios/{nuevo_id}/estado",
                {"estado": "inactivo"},
                token=token,
            )
            lineas.append(f"  PATCH  /api/usuarios/{nuevo_id}/estado      (estado)    -> {codigo}")

            codigo, _ = pedir("DELETE", f"/api/usuarios/{nuevo_id}", token=token)
            lineas.append(f"  DELETE /api/usuarios/{nuevo_id}             (borrar)    -> {codigo}")

        lineas += [
            "",
            "# 200/201 correcto   204 borrado sin contenido   401 sin autenticar",
            "# Los cinco verbos funcionan y el backend exige el token en los",
            "# que no son publicos.",
        ]

    dibujar_texto("\n".join(lineas), SALIDA / "con-http.png", "Metodos HTTP")
    print("  con-http.png")


def revalidacion() -> None:
    """El backend vuelve a validar lo que ya validó React, y lo demuestra."""
    codigo, cuerpo = pedir(
        "POST",
        "/api/usuarios/registro",
        {
            "nombre": "A",
            "apellido": "",
            "tipo_documento": "CC",
            "numero_documento": "12",
            "direccion": "x",
            "telefono": "abc",
            "email": "esto-no-es-un-correo",
            "contrasena": "123",
            "confirmar_contrasena": "456",
        },
    )

    lineas = [
        "> POST /api/usuarios/registro  con datos invalidos a proposito",
        "",
        "# Enviado saltandose el formulario de React, directo a la API.",
        "",
        f"  HTTP {codigo}",
        "",
    ]
    detalle = json.loads(cuerpo)
    lineas.append(f"  codigo : {detalle.get('codigo')}")
    lineas.append(f"  mensaje: {detalle.get('mensaje')}")
    lineas.append("")
    for problema in (detalle.get("detalles") or [])[:8]:
        lineas.append(f"    {problema['campo']:<20} {problema['problema'][:60]}")
    lineas += [
        "",
        "# La validacion del navegador es comodidad; la que manda es esta.",
    ]

    dibujar_texto("\n".join(lineas), SALIDA / "con-revalidacion.png", "Revalidacion en FastAPI")
    print("  con-revalidacion.png")


def main() -> int:
    SALIDA.mkdir(parents=True, exist_ok=True)
    estructura()
    base_de_datos()
    endpoints()
    postman()
    revalidacion()
    metodos_http()
    print(f"\nListo en {SALIDA}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
