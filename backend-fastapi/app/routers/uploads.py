import re
import time
from pathlib import Path as RutaSistema

from fastapi import APIRouter, File, UploadFile, status

from app.core.configuracion import configuracion
from app.dependencias import Personal
from app.errores import ImagenInvalida
from app.schemas.catalogo import ImagenSubida
from app.schemas.error import RESPUESTAS_API

router = APIRouter(prefix="/api/uploads", tags=["Archivos"], responses=RESPUESTAS_API)

CARPETA = RutaSistema(configuracion.carpeta_uploads)
CARPETA.mkdir(parents=True, exist_ok=True)

EXTENSION_POR_TIPO = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/avif": ".avif",
    "image/gif": ".gif",
}


def _nombre_seguro(nombre_original: str, tipo: str) -> str:
    """Limpia el nombre y le antepone la fecha para que dos archivos no se pisen.

    La extensión se deduce del tipo declarado, nunca del nombre que envía el
    cliente: así no se puede colar un «.php» disfrazado de imagen.
    """
    base = RutaSistema(nombre_original).stem.lower()
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")[:40] or "imagen"
    return f"{int(time.time() * 1000)}-{base}{EXTENSION_POR_TIPO[tipo]}"


@router.post(
    "",
    response_model=ImagenSubida,
    status_code=status.HTTP_201_CREATED,
    summary="Subir una imagen del catálogo",
    description="Recibe el archivo elegido desde el panel y devuelve la ruta "
    "relativa que se guarda en imagen_url. Máximo 3 MB.",
)
async def subir_imagen(
    personal: Personal,
    imagen: UploadFile = File(description="Archivo JPG, PNG, WEBP, AVIF o GIF."),
):
    if imagen.content_type not in configuracion.tipos_imagen_permitidos:
        raise ImagenInvalida(
            "Formato no permitido. Usa JPG, PNG, WEBP, AVIF o GIF."
        )

    contenido = await imagen.read()

    if len(contenido) == 0:
        raise ImagenInvalida("El archivo está vacío.")
    if len(contenido) > configuracion.tamano_maximo_imagen:
        limite_mb = configuracion.tamano_maximo_imagen // (1024 * 1024)
        raise ImagenInvalida(f"La imagen no puede pesar más de {limite_mb} MB.")

    nombre = _nombre_seguro(imagen.filename or "imagen", imagen.content_type)
    (CARPETA / nombre).write_bytes(contenido)

    return ImagenSubida(
        url=f"/uploads/{nombre}",
        nombre=imagen.filename or nombre,
        tamano=len(contenido),
    )
