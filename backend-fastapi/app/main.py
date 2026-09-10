import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as HTTPExceptionStarlette
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.base_datos import Base, motor
from app.core.configuracion import configuracion
from app.errores import (
    ConflictoDeNegocio,
    ErrorDeDominio,
    ImagenInvalida,
    NoAutenticado,
    PermisoDenegado,
    RecursoNoEncontrado,
)
from app.middlewares import cabeceras_de_seguridad, registrar_peticion
from app.models import bixe  # noqa: F401 — registra los modelos en Base
from app.routers import auth, estadisticas, pedidos, productos, servicios, uploads, usuarios

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s | %(message)s",
)
logger = logging.getLogger("bixe")

TAGS = [
    {"name": "Autenticación", "description": "Login, token JWT y recuperación de contraseña."},
    {"name": "Usuarios", "description": "Registro de clientes, perfil propio y gestión de cuentas."},
    {"name": "Productos", "description": "Catálogo de motos y autos."},
    {"name": "Servicios", "description": "Servicios del taller que el cliente puede pedir."},
    {"name": "Pedidos", "description": "Confirmación del carrito y seguimiento de los pedidos."},
    {"name": "Archivos", "description": "Subida de las imágenes del catálogo."},
    {"name": "Estadísticas", "description": "Cifras que alimentan los paneles."},
    {"name": "Sistema", "description": "Estado del servicio."},
]


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    """Se ejecuta una vez al arrancar y una vez al apagar la aplicación."""
    logger.info("Verificando las tablas de la base de datos…")
    async with motor.begin() as conexion:
        # create_all no toca las tablas que ya existen: solo crea las que falten
        # (en este proyecto, la de recuperación de contraseña).
        await conexion.run_sync(Base.metadata.create_all)

    if not configuracion.correo_configurado:
        logger.warning(
            "SMTP sin configurar: la recuperación de contraseña mostrará el "
            "enlace en este log en lugar de enviarlo por correo."
        )

    yield

    logger.info("Cerrando el motor de base de datos…")
    await motor.dispose()


app = FastAPI(
    title=configuracion.nombre_app,
    description=(
        "API de BIXE: catálogo de motos y autos, servicios de taller y pedidos.\n\n"
        "Cuarto avance del proyecto — Tecnólogo en Análisis y Desarrollo de "
        "Software, SENA, Centro de Servicios y Gestión Empresarial."
    ),
    version="1.0.0",
    openapi_tags=TAGS,
    lifespan=ciclo_de_vida,
    license_info={"name": "Uso académico"},
    docs_url="/docs" if configuracion.depuracion else None,
    redoc_url="/redoc" if configuracion.depuracion else None,
)

# El orden importa: el último registrado es el primero en ver la petición.
app.middleware("http")(cabeceras_de_seguridad)
app.middleware("http")(registrar_peticion)

# CORS con lista explícita de orígenes, nunca con comodín.
app.add_middleware(
    CORSMiddleware,
    allow_origins=configuracion.origenes_permitidos,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["X-Peticion-Id", "X-Tiempo-Respuesta-ms"],
    max_age=600,
)

# Las imágenes subidas desde el panel se sirven como archivos estáticos.
Path(configuracion.carpeta_uploads).mkdir(parents=True, exist_ok=True)
app.mount(
    "/uploads",
    StaticFiles(directory=configuracion.carpeta_uploads),
    name="uploads",
)

app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(productos.router)
app.include_router(servicios.router)
app.include_router(pedidos.router)
app.include_router(uploads.router)
app.include_router(estadisticas.router)


@app.get("/", tags=["Sistema"], summary="Información del servicio")
def raiz():
    return {
        "servicio": configuracion.nombre_app,
        "version": app.version,
        "entorno": configuracion.entorno,
        "documentacion": "/docs",
    }


@app.get("/salud", tags=["Sistema"], summary="Estado del servicio")
def estado_del_servicio():
    return {"estado": "ok"}


def _respuesta_error(
    peticion: Request,
    estado: int,
    codigo: str,
    mensaje: str,
    detalles: list[dict] | None = None,
) -> JSONResponse:
    """Todas las respuestas de error de la API salen con esta misma forma."""
    return JSONResponse(
        status_code=estado,
        content={
            "codigo": codigo,
            "mensaje": mensaje,
            "ruta": peticion.url.path,
            "detalles": detalles,
        },
    )


@app.exception_handler(RecursoNoEncontrado)
def manejar_no_encontrado(peticion: Request, exc: RecursoNoEncontrado):
    return _respuesta_error(peticion, status.HTTP_404_NOT_FOUND, exc.codigo, exc.mensaje)


@app.exception_handler(ConflictoDeNegocio)
def manejar_conflicto(peticion: Request, exc: ConflictoDeNegocio):
    return _respuesta_error(peticion, status.HTTP_409_CONFLICT, exc.codigo, exc.mensaje)


@app.exception_handler(NoAutenticado)
def manejar_no_autenticado(peticion: Request, exc: NoAutenticado):
    respuesta = _respuesta_error(
        peticion, status.HTTP_401_UNAUTHORIZED, exc.codigo, exc.mensaje
    )
    # Cabecera exigida por la especificación de HTTP para el 401
    respuesta.headers["WWW-Authenticate"] = "Bearer"
    return respuesta


@app.exception_handler(PermisoDenegado)
def manejar_permiso_denegado(peticion: Request, exc: PermisoDenegado):
    return _respuesta_error(peticion, status.HTTP_403_FORBIDDEN, exc.codigo, exc.mensaje)


@app.exception_handler(ImagenInvalida)
def manejar_imagen_invalida(peticion: Request, exc: ImagenInvalida):
    return _respuesta_error(peticion, status.HTTP_400_BAD_REQUEST, exc.codigo, exc.mensaje)


@app.exception_handler(ErrorDeDominio)
def manejar_error_de_dominio(peticion: Request, exc: ErrorDeDominio):
    """Red de seguridad para las subclases que no tengan manejador propio."""
    return _respuesta_error(peticion, status.HTTP_400_BAD_REQUEST, exc.codigo, exc.mensaje)


@app.exception_handler(RequestValidationError)
def manejar_validacion(peticion: Request, exc: RequestValidationError):
    """Reescribe el 422 de Pydantic con el formato de error de la API."""
    detalles = [
        {
            "campo": ".".join(str(p) for p in error["loc"][1:]),
            "problema": error["msg"],
        }
        for error in exc.errors()
    ]
    return _respuesta_error(
        peticion,
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        "datos_invalidos",
        "Los datos enviados no cumplen el formato esperado.",
        detalles,
    )


@app.exception_handler(HTTPExceptionStarlette)
def manejar_http(peticion: Request, exc: HTTPExceptionStarlette):
    """Traduce los errores que levanta el propio framework (404 de ruta, 405…)
    al mismo formato de cuerpo que usan los errores del dominio."""
    respuesta = _respuesta_error(
        peticion, exc.status_code, f"http_{exc.status_code}", str(exc.detail)
    )
    if exc.status_code == status.HTTP_401_UNAUTHORIZED:
        respuesta.headers["WWW-Authenticate"] = "Bearer"
    return respuesta


@app.exception_handler(Exception)
def manejar_error_inesperado(peticion: Request, exc: Exception):
    """Último recurso: se registra la traza y se responde algo genérico."""
    logger.exception("Error no controlado en %s", peticion.url.path)
    return _respuesta_error(
        peticion,
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "error_interno",
        "Ocurrió un error inesperado. Intenta de nuevo más tarde.",
    )
