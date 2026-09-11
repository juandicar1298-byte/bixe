"""Diligencia la lista de chequeo del cuarto avance con sus evidencias.

Toma el archivo en blanco que entregó el instructor, marca el estado de cada
requerimiento, escribe la observación y pega la captura que le corresponde en
la columna de evidencias.

El original no se toca: el resultado se guarda al lado, con «_DILIGENCIADA»
en el nombre.

Uso, desde la raíz del proyecto:
    backend-fastapi/.venv/Scripts/python.exe evidencias/llenar_excel.py
"""

import sys
from pathlib import Path

import openpyxl
from openpyxl.drawing.image import Image as ImagenExcel
from openpyxl.styles import Alignment, Font
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
IMAGENES = RAIZ / "evidencias" / "imagenes"

ORIGEN = Path(r"D:\Lista_Chequeo_Cuarto_Avance_REACT_FASTAPI.xlsx")
DESTINO = ORIGEN.with_name(f"{ORIGEN.stem}_DILIGENCIADA.xlsx")

# La primera fila de requerimientos. REQ-01 va en la 14 y hay 26 seguidos.
PRIMERA_FILA = 14

# Cuánto se reduce cada captura para caber en la celda, en píxeles.
ANCHO_MAXIMO = 680
ALTO_MAXIMO = 620

# Excel mide el alto en puntos (1 px = 0.75 pt) y el ancho en caracteres.
PUNTOS_POR_PIXEL = 0.75
ANCHO_COLUMNA_E = 98

# (imagen, observación) en el orden REQ-01 … REQ-26.
EVIDENCIAS = [
    (
        "cod-api-fetch.png",
        "React 19 + Vite consume la API de FastAPI con fetch, centralizado en "
        "frontend/src/services/api.js. La API se conecta a MariaDB con "
        "SQLAlchemy 2.0 asíncrono y aiomysql. Ver también web-modelos.png: el "
        "catálogo que se ve en pantalla sale de la base de datos.",
    ),
    (
        "con-estructura.png",
        "Frontend y backend en carpetas separadas. backend-fastapi/app/ está "
        "dividida en core, models, schemas, crud, routers y services, cada una "
        "con una responsabilidad.",
    ),
    (
        "cod-requirements.png",
        "Entorno virtual en backend-fastapi/.venv. Las dependencias van fijadas "
        "por versión en requirements.txt: fastapi, uvicorn, sqlalchemy, "
        "aiomysql, pydantic, pyjwt y pwdlib, entre otras.",
    ),
    (
        "con-tablas.png",
        "Base bixe_db con 13 tablas. Están las cinco que pide el requerimiento "
        "(usuarios, roles, permisos, productos y servicios) más las de pedidos, "
        "pagos, facturas, galerías y recuperaciones.",
    ),
    (
        "con-tabla-usuarios.png",
        "La tabla tiene los nueve campos pedidos: nombre, apellido, tipo y "
        "número de documento, dirección, teléfono, correo, contraseña, rol y "
        "estado. La contraseña vive en la columna password y siempre hasheada.",
    ),
    (
        "cod-esquemas.png",
        "Modelos SQLAlchemy en app/models/bixe.py y esquemas Pydantic v2 en "
        "app/schemas/, separados. Los esquemas validan tipo, obligatoriedad, "
        "longitud mínima y máxima, y formato de correo y contraseña.",
    ),
    (
        "cod-conexion-db.png",
        "La conexión se arma con URL_BASE_DATOS leída del .env. No hay ninguna "
        "credencial escrita en el código y el .env está en .gitignore.",
    ),
    (
        "con-revalidacion.png",
        "El formulario de React valida antes de enviar, pero la API vuelve a "
        "validar por su cuenta: mandando datos inválidos directo al endpoint, "
        "sin pasar por el navegador, responde 422 con el detalle campo por campo.",
    ),
    (
        "web-registro.png",
        "Registro conectado a POST /api/usuarios/registro. Valida los datos, "
        "comprueba que no se repitan ni el correo ni el documento, hashea la "
        "contraseña y guarda al usuario con el rol Cliente.",
    ),
    (
        "web-login.png",
        "Login conectado a POST /api/auth/login. Si las credenciales son "
        "correctas, FastAPI devuelve un JWT que el frontend guarda y envía en "
        "las peticiones siguientes.",
    ),
    (
        "cod-dependencias.png",
        "React manda el token en la cabecera Authorization: Bearer. FastAPI "
        "verifica la firma y la expiración, y además vuelve a consultar el "
        "usuario en la base: desactivar a alguien tiene efecto de inmediato, "
        "sin esperar a que caduque su sesión.",
    ),
    (
        "con-permisos.png",
        "Tres roles: Administrador, Empleado y Cliente. La autorización se "
        "resuelve leyendo la tabla roles_permisos, no con ids de rol escritos "
        "en el código, así que cambiar quién puede hacer qué es tocar la base.",
    ),
    (
        "cod-hooks.png",
        "Se usan useState, useEffect, useMemo, useCallback, useRef y useContext, "
        "más dos hooks propios: useAuth para la sesión y useCarrito para el "
        "carrito de servicios.",
    ),
    (
        "con-endpoints.png",
        "38 rutas publicadas, agrupadas por recurso: usuarios, productos, "
        "servicios, pedidos, pagos y autenticación. Un APIRouter por entidad, "
        "con su prefijo y su etiqueta.",
    ),
    (
        "web-recuperar-codigo.png",
        "Recuperación en tres pasos: correo, código de seis dígitos que llega "
        "por Gmail y contraseña nueva. El código caduca a los 30 minutos, se "
        "invalida a los cinco intentos fallidos y solo sirve una vez.",
    ),
    (
        "web-crud-usuarios.png",
        "CRUD completo: consultar con filtros, crear, editar, cambiar estado "
        "entre activo e inactivo y eliminar. El cambio de estado es el que se "
        "usa normalmente, para no perder el histórico de pedidos.",
    ),
    (
        "web-panel-admin.png",
        "Panel de administrador con resumen de indicadores, usuarios, "
        "productos, servicios y pedidos. Protegido en el frontend por "
        "RutaProtegida y en el backend por permisos.",
    ),
    (
        "web-panel-empleado.png",
        "El empleado solo ve productos, servicios y pedidos: la sección de "
        "usuarios no le aparece. Aunque llamara al endpoint a mano, el backend "
        "se lo negaría con 403.",
    ),
    (
        "web-panel-cliente.png",
        "El cliente ve sus propios pedidos y facturas. El sistema sabe quién es "
        "por el campo «sub» del JWT, no por un dato que mande el navegador.",
    ),
    (
        "web-navbar-usuario.png",
        "Tras iniciar sesión el Navbar muestra «Bienvenido, <nombre>» con las "
        "iniciales del usuario y la opción de cerrar sesión. Al salir vuelve a "
        "mostrar «Iniciar sesión».",
    ),
    (
        "web-validaciones.png",
        "Validación mientras se escribe: campos obligatorios, longitudes, "
        "formato de correo con expresión regular, teléfono de 10 dígitos y "
        "contraseña de 8 a 20 con mayúscula, minúscula, número y símbolo. La "
        "misma regla está repetida en Pydantic (ver con-revalidacion.png).",
    ),
    (
        "con-bcrypt.png",
        "Hash con bcrypt a través de pwdlib. En la base solo hay hashes con "
        "prefijo $2b$, ninguno en texto plano, y la API nunca los devuelve en "
        "sus respuestas. En la captura el hash sale recortado a propósito.",
    ),
    (
        "cod-env.png",
        "Todo lo sensible va en el .env: URL_BASE_DATOS, SECRET_KEY, "
        "ORIGENES_PERMITIDOS y las credenciales de correo. Al repositorio solo "
        "sube .env.example, con los nombres de las variables y sin valores.",
    ),
    (
        "cod-whatsapp.png",
        "Se conserva WhatsAppButton.jsx como componente reutilizable, con "
        "posición fija, número y mensaje configurables por props. No depende "
        "del backend: funciona aunque la API esté caída.",
    ),
    (
        "api-swagger.png",
        "Swagger UI activo en http://127.0.0.1:8000/docs, con las rutas "
        "agrupadas por etiquetas, los esquemas de entrada y salida y los "
        "códigos de error documentados.",
    ),
    (
        "con-postman.png",
        "Colección de 57 peticiones en backend-fastapi/postman/, repartidas en "
        "10 carpetas y cubriendo GET, POST, PUT, PATCH y DELETE, incluidos los "
        "casos de error. En con-http.png están los cinco verbos ejecutados "
        "contra la API con su código de respuesta real.",
    ),
]


def escalar(ruta: Path) -> tuple[int, int]:
    """Tamaño al que se pega la imagen, respetando su proporción."""
    with Image.open(ruta) as imagen:
        ancho, alto = imagen.size

    factor = min(ANCHO_MAXIMO / ancho, ALTO_MAXIMO / alto, 1)
    return int(ancho * factor), int(alto * factor)


def main() -> int:
    if not ORIGEN.exists():
        print(f"No encuentro {ORIGEN}")
        return 1

    faltan = [nombre for nombre, _ in EVIDENCIAS if not (IMAGENES / nombre).exists()]
    if faltan:
        print("Faltan imágenes; ejecuta antes generar.py y consola.py:")
        for nombre in faltan:
            print(f"  {nombre}")
        return 1

    libro = openpyxl.load_workbook(ORIGEN)
    hoja = libro.active

    # --- Datos del aprendiz que sí se conocen ---
    hoja["F5"] = "11 de septiembre de 2026"
    hoja["F6"] = "3406211"
    hoja["F7"] = "03 / Desarrollo de Software"
    hoja["D40"] = "Repositorio local Git (rama master). Pendiente publicar en GitHub."

    for celda in ("C5", "C6"):
        hoja[celda] = "«DILIGENCIAR»"
        hoja[celda].font = Font(bold=True, color="B00000")

    # --- La columna de evidencias tiene que dar cabida a las capturas ---
    hoja.column_dimensions["E"].width = ANCHO_COLUMNA_E

    for indice, (nombre_imagen, observacion) in enumerate(EVIDENCIAS):
        fila = PRIMERA_FILA + indice

        hoja[f"D{fila}"] = "Cumple"
        hoja[f"D{fila}"].alignment = Alignment(horizontal="center", vertical="center")

        # Se borra el marcador «[Pegar Captura de Pantalla Aquí]».
        hoja[f"E{fila}"] = None

        hoja[f"F{fila}"] = observacion
        hoja[f"F{fila}"].alignment = Alignment(
            wrap_text=True, vertical="top", horizontal="left"
        )

        ruta = IMAGENES / nombre_imagen
        imagen = ImagenExcel(ruta)
        imagen.width, imagen.height = escalar(ruta)
        imagen.anchor = f"E{fila}"
        hoja.add_image(imagen)

        # Un respiro de 6 px arriba y abajo para que no quede pegada al borde.
        hoja.row_dimensions[fila].height = (imagen.height + 12) * PUNTOS_POR_PIXEL

        print(f"  REQ-{indice + 1:02d}  {nombre_imagen}")

    libro.save(DESTINO)
    print(f"\nGuardado en {DESTINO}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
