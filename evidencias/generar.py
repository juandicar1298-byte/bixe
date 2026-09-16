"""Genera las capturas de evidencia de la lista de chequeo del cuarto avance.

Produce dos clases de imagen en evidencias/imagenes/:

  * Capturas reales del navegador (Playwright) sobre la aplicación en marcha.
  * Imágenes del código, dibujadas a partir de los archivos del repositorio.

Para poder fotografiar los tres paneles hace falta entrar con un usuario de
cada rol, así que el script crea tres cuentas temporales al empezar y las
borra al terminar, pase lo que pase. Son las unicas con correo @bixe.com y se
borran por nombre exacto, asi que no hay riesgo para las cuentas reales.

Antes de ejecutarlo tienen que estar arriba MySQL, la API (:8000) y la web
(:5173).

Uso, desde la raíz del proyecto:
    backend-fastapi/.venv/Scripts/python.exe evidencias/generar.py
"""

import sys
from contextlib import contextmanager
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "backend-fastapi"))
sys.path.insert(0, str(RAIZ / "evidencias"))

from playwright.sync_api import sync_playwright  # noqa: E402

from imagen_codigo import dibujar_codigo  # noqa: E402

WEB = "http://localhost:5173"
API = "http://127.0.0.1:8000"
SALIDA = RAIZ / "evidencias" / "imagenes"

# Ventana amplia: así el menú de escritorio sale desplegado y los paneles no
# aparecen en su versión de móvil.
VENTANA = {"width": 1440, "height": 900}

CONTRASENA = "Evidencia2026*"

# Cuentas de demostración, una por rol. Llevan nombres normales porque salen
# en las capturas del panel; el correo @bixe.com es lo que las distingue de
# las cuentas reales a la hora de borrarlas.
CUENTAS = {
    "admin": (1, "Ana", "Gómez", "ana.gomez@bixe.com", "9000000001"),
    "empleado": (2, "Luis", "Peña", "luis.pena@bixe.com", "9000000002"),
    "cliente": (3, "Sara", "Ríos", "sara.rios@bixe.com", "9000000003"),
}

# El registro por API de la prueba de métodos HTTP crea esta cuarta.
CORREO_DE_PRUEBA = "nuevo.aprendiz@bixe.com"

# Se borran por nombre exacto, no por patrón: así no hay forma de llevarse por
# delante una cuenta de verdad que algún día use ese dominio.
CORREOS_TEMPORALES = [datos[3] for datos in CUENTAS.values()] + [CORREO_DE_PRUEBA]


# --------------------------- Cuentas temporales ---------------------------


@contextmanager
def cuentas_temporales():
    """Crea las tres cuentas y las borra al salir, aunque haya una excepción."""
    import asyncio
    import os

    # La configuración busca el .env en la carpeta de trabajo, así que hay que
    # situarse en backend-fastapi antes de importar nada de la aplicación.
    os.chdir(RAIZ / "backend-fastapi")

    from sqlalchemy import delete, select
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.core.configuracion import configuracion
    from app.core.seguridad import hashear_contrasena
    from app.models.bixe import (
        Conversacion,
        Pedido,
        Pqr,
        RecuperacionContrasena,
        Usuario,
        Venta,
    )

    async def con_sesion(trabajo):
        """Ejecuta *trabajo* con un motor recién creado y lo cierra al acabar.

        Un motor asíncrono queda atado al bucle de eventos donde se usó por
        primera vez, así que compartirlo entre dos asyncio.run() distintos
        falla al cerrar la sesión. Crear uno por llamada cuesta nada.
        """
        motor = create_async_engine(configuracion.url_base_datos)
        try:
            fabrica = async_sessionmaker(motor, expire_on_commit=False)
            async with fabrica() as sesion:
                return await trabajo(sesion)
        finally:
            await motor.dispose()

    async def crear(sesion):
        for rol_id, nombre, apellido, email, documento in CUENTAS.values():
            if await sesion.scalar(select(Usuario).where(Usuario.email == email)):
                continue
            sesion.add(
                Usuario(
                    nombre=nombre,
                    apellido=apellido,
                    tipo_documento="CC",
                    numero_documento=documento,
                    direccion="Calle 10 #20-30",
                    telefono="3000000000",
                    email=email,
                    contrasena_hash=hashear_contrasena(CONTRASENA),
                    rol_id=rol_id,
                    estado="activo",
                )
            )
        await sesion.commit()

    async def borrar(sesion):
        usuarios = list(
            await sesion.scalars(
                select(Usuario).where(Usuario.email.in_(CORREOS_TEMPORALES))
            )
        )
        for usuario in usuarios:
            # Todo lo que apunta al usuario se va primero: la base tiene claves
            # foráneas que, con razón, no dejan borrar a alguien que tenga
            # ventas o pedidos a su nombre.
            for modelo, columna in (
                (RecuperacionContrasena, RecuperacionContrasena.usuario_id),
                (Venta, Venta.cliente_id),
                (Pedido, Pedido.usuario_id),
                (Pqr, Pqr.usuario_id),
                (Conversacion, Conversacion.usuario_id),
            ):
                await sesion.execute(delete(modelo).where(columna == usuario.id))

            await sesion.delete(usuario)
        await sesion.commit()
        return len(usuarios)

    asyncio.run(con_sesion(crear))
    print("  Cuentas temporales creadas.")
    try:
        yield
    finally:
        borradas = asyncio.run(con_sesion(borrar))
        print(f"  Cuentas temporales borradas: {borradas}")


# ------------------------------- Navegador -------------------------------


def entrar(pagina, rol: str) -> None:
    """Inicia sesión por el formulario de verdad, no inyectando el token."""
    email = CUENTAS[rol][3]
    pagina.goto(f"{WEB}/login", wait_until="networkidle")
    pagina.fill('input[name="email"]', email)
    pagina.fill('input[name="contrasena"]', CONTRASENA)
    pagina.click('button[type="submit"]')

    # React Router cambia de vista sin recargar, así que esperar a un evento de
    # navegación no sirve: la señal de que el login funcionó es que el token ya
    # esté guardado.
    pagina.wait_for_function(
        "() => localStorage.getItem('bixe_token') !== null", timeout=15000
    )
    pagina.wait_for_load_state("networkidle")


def salir(pagina) -> None:
    pagina.evaluate(
        "localStorage.removeItem('bixe_token');"
        "localStorage.removeItem('bixe_usuario')"
    )


def foto(pagina, destino: Path, alto_completo: bool = False) -> Path:
    destino.parent.mkdir(parents=True, exist_ok=True)
    pagina.wait_for_timeout(900)
    pagina.screenshot(path=str(destino), full_page=alto_completo)
    print(f"  {destino.name}")
    return destino


def sin_cortina(pagina) -> None:
    """La cortina de entrada tapa la primera pantalla; se da por vista."""
    pagina.evaluate("sessionStorage.setItem('bixe:cortina-vista','1')")


# ------------------------------- Capturas -------------------------------


def capturas_web(navegador) -> None:
    contexto = navegador.new_context(viewport=VENTANA, device_scale_factor=1)
    pagina = contexto.new_page()

    pagina.goto(WEB, wait_until="domcontentloaded")
    sin_cortina(pagina)

    # --- Páginas públicas ---
    pagina.goto(WEB, wait_until="networkidle")
    foto(pagina, SALIDA / "web-portada.png")

    pagina.goto(f"{WEB}/modelos", wait_until="networkidle")
    foto(pagina, SALIDA / "web-modelos.png")

    pagina.goto(f"{WEB}/servicios", wait_until="networkidle")
    foto(pagina, SALIDA / "web-servicios.png")

    pagina.goto(f"{WEB}/login", wait_until="networkidle")
    foto(pagina, SALIDA / "web-login.png")

    # --- Formulario de registro, bien diligenciado ---
    pagina.goto(f"{WEB}/login", wait_until="networkidle")
    # En escritorio el cambio a registro está en el panel de la derecha.
    pagina.get_by_role("button", name="Registrarse").first.click()
    pagina.wait_for_timeout(900)
    for campo, valor in (
        ('input[name="nombre"]', "Camila"),
        ('input[name="apellido"]', "Restrepo"),
        ('input[name="numero_documento"]', "1036425871"),
        ('input[name="direccion"]', "Carrera 45 #12-30"),
        ('input[name="telefono"]', "3012345678"),
        ('input[name="email"]', "camila.restrepo@ejemplo.com"),
        ('input[name="contrasena"]', "Bixe2026*"),
        ('input[name="confirmar_contrasena"]', "Bixe2026*"),
    ):
        if pagina.locator(campo).count():
            pagina.fill(campo, valor)
    pagina.wait_for_timeout(600)
    foto(pagina, SALIDA / "web-registro.png")

    # --- Validaciones en tiempo real: ahora se escribe mal a propósito ---
    for campo, valor in (
        ('input[name="email"]', "correo-sin-arroba"),
        ('input[name="telefono"]', "12"),
        ('input[name="contrasena"]', "abc"),
    ):
        if pagina.locator(campo).count():
            pagina.fill(campo, valor)
            pagina.locator(campo).blur()
    pagina.wait_for_timeout(600)
    foto(pagina, SALIDA / "web-validaciones.png")

    # --- Recuperación: primero el correo, después la pantalla del código ---
    pagina.goto(f"{WEB}/login", wait_until="networkidle")
    pagina.get_by_text("¿Olvidaste tu contraseña?").first.click()
    pagina.wait_for_timeout(900)
    foto(pagina, SALIDA / "web-recuperar.png")

    # Se pide el código para una cuenta temporal, así se ve el segundo paso.
    pagina.fill('input[name="email"]', CUENTAS["cliente"][3])
    pagina.get_by_role("button", name="Enviar código").first.click()
    pagina.wait_for_timeout(2500)
    foto(pagina, SALIDA / "web-recuperar-codigo.png")

    # --- Paneles, uno por rol ---
    for rol, ruta, archivo in (
        ("admin", "/admin", "web-panel-admin.png"),
        ("empleado", "/empleado", "web-panel-empleado.png"),
        ("cliente", "/cliente", "web-panel-cliente.png"),
    ):
        entrar(pagina, rol)
        sin_cortina(pagina)
        pagina.goto(f"{WEB}{ruta}", wait_until="networkidle")
        foto(pagina, SALIDA / archivo)

        if rol == "admin":
            # El CRUD de usuarios.
            if pagina.locator("text=Usuarios").count():
                pagina.click("text=Usuarios")
                pagina.wait_for_timeout(1200)
            foto(pagina, SALIDA / "web-crud-usuarios.png")

            # El saludo del Navbar está en la cabecera del sitio público, no
            # en el panel: el panel tiene su propia barra lateral.
            pagina.goto(WEB, wait_until="networkidle")
            sin_cortina(pagina)
            pagina.wait_for_timeout(1200)
            pagina.screenshot(
                path=str(SALIDA / "web-navbar-usuario.png"),
                clip={"x": 520, "y": 0, "width": 920, "height": 80},
            )
            print("  web-navbar-usuario.png")

        salir(pagina)

    # --- Documentación de la API ---
    pagina.goto(f"{API}/docs", wait_until="networkidle")
    pagina.wait_for_timeout(1500)
    foto(pagina, SALIDA / "api-swagger.png")

    contexto.close()


# ------------------------------ Código ------------------------------

# (archivo, desde, hasta, nombre de salida)
# Los recortes son cortos a propósito: una imagen de 45 líneas, al reducirla
# para que quepa en una celda de Excel, no hay quien la lea.
FRAGMENTOS = [
    ("frontend/src/services/api.js", 1, 28, "cod-api-fetch"),
    ("backend-fastapi/requirements.txt", 1, 40, "cod-requirements"),
    ("backend-fastapi/app/models/bixe.py", 44, 74, "cod-modelo-usuario"),
    ("backend-fastapi/app/schemas/usuario.py", 1, 30, "cod-esquemas"),
    ("backend-fastapi/app/core/base_datos.py", 1, 28, "cod-conexion-db"),
    ("backend-fastapi/.env.example", 1, 26, "cod-env"),
    ("backend-fastapi/app/core/seguridad.py", 1, 26, "cod-bcrypt-jwt"),
    ("backend-fastapi/app/dependencias.py", 1, 30, "cod-dependencias"),
    ("frontend/src/hooks/useAuth.js", 1, 28, "cod-hooks"),
    ("frontend/src/context/CarritoContext.jsx", 1, 28, "cod-contexto"),
    ("backend-fastapi/app/routers/usuarios.py", 1, 30, "cod-router-usuarios"),
    ("backend-fastapi/app/crud/usuarios.py", 182, 212, "cod-codigo-recuperacion"),
    ("backend-fastapi/app/services/correo.py", 57, 84, "cod-correo"),
    ("frontend/src/utils/validacion.js", 1, 28, "cod-validacion"),
    ("frontend/src/components/WhatsAppButton.jsx", 1, 28, "cod-whatsapp"),
    ("frontend/src/components/RutaProtegida.jsx", 1, 28, "cod-ruta-protegida"),
    ("backend-fastapi/app/main.py", 1, 28, "cod-main"),
    (".gitignore", 1, 20, "cod-gitignore"),
]


def capturas_codigo() -> None:
    for relativa, desde, hasta, nombre in FRAGMENTOS:
        archivo = RAIZ / relativa
        if not archivo.exists():
            print(f"  (falta {relativa})")
            continue
        dibujar_codigo(
            archivo,
            SALIDA / f"{nombre}.png",
            desde=desde,
            hasta=hasta,
            titulo=relativa,
        )
        print(f"  {nombre}.png")


def main() -> int:
    SALIDA.mkdir(parents=True, exist_ok=True)

    print("Imágenes de código")
    capturas_codigo()

    print("\nCapturas del navegador")
    with cuentas_temporales(), sync_playwright() as p:
        navegador = p.chromium.launch()
        try:
            capturas_web(navegador)
        finally:
            navegador.close()

    print(f"\nTodo en {SALIDA}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
