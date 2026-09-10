"""Galería de fotos, compartida por productos y servicios.

Las dos entidades funcionan igual, así que la lógica vive una sola vez y se
parametriza con el modelo de la imagen y el nombre de su columna de enlace.
"""

from typing import TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errores import ConflictoDeNegocio, RecursoNoEncontrado
from app.models.bixe import Producto, ProductoImagen, Servicio, ServicioImagen

MAXIMO_POR_REGISTRO = 8

ModeloImagen = TypeVar("ModeloImagen", ProductoImagen, ServicioImagen)

# A qué modelo de imagen corresponde cada entidad del catálogo.
IMAGEN_DE = {
    Producto: (ProductoImagen, "producto_id", "un producto"),
    Servicio: (ServicioImagen, "servicio_id", "un servicio"),
}


def _configuracion(registro):
    """Devuelve (modelo de imagen, nombre de la columna, etiqueta legible)."""
    return IMAGEN_DE[type(registro)]


async def listar(sesion: AsyncSession, registro) -> list[ModeloImagen]:
    modelo, columna, _ = _configuracion(registro)
    resultado = await sesion.scalars(
        select(modelo)
        .where(getattr(modelo, columna) == registro.id)
        .order_by(modelo.orden, modelo.id)
    )
    return list(resultado)


async def obtener_o_fallar(sesion: AsyncSession, registro, imagen_id: int):
    modelo, columna, etiqueta = _configuracion(registro)

    imagen = await sesion.get(modelo, imagen_id)
    if imagen is None or getattr(imagen, columna) != registro.id:
        raise RecursoNoEncontrado(f"una imagen de {etiqueta}", imagen_id)
    return imagen


async def agregar(
    sesion: AsyncSession, registro, url: str, descripcion: str | None
):
    modelo, columna, _ = _configuracion(registro)

    cuantas = await sesion.scalar(
        select(func.count())
        .select_from(modelo)
        .where(getattr(modelo, columna) == registro.id)
    )
    if cuantas >= MAXIMO_POR_REGISTRO:
        raise ConflictoDeNegocio(
            f"La galería admite como máximo {MAXIMO_POR_REGISTRO} fotos."
        )

    imagen = modelo(
        **{columna: registro.id},
        url=url,
        descripcion=descripcion,
        orden=cuantas,
    )
    sesion.add(imagen)
    await sesion.commit()
    await sesion.refresh(imagen)
    return imagen


async def actualizar(sesion: AsyncSession, imagen, cambios: dict):
    for campo, valor in cambios.items():
        setattr(imagen, campo, valor)
    await sesion.commit()
    await sesion.refresh(imagen)
    return imagen


async def eliminar(sesion: AsyncSession, imagen) -> None:
    await sesion.delete(imagen)
    await sesion.commit()
