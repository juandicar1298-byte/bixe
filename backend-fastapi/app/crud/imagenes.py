from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errores import ConflictoDeNegocio, RecursoNoEncontrado
from app.models.bixe import Producto, ProductoImagen

MAXIMO_POR_PRODUCTO = 8


async def listar(sesion: AsyncSession, producto_id: int) -> list[ProductoImagen]:
    resultado = await sesion.scalars(
        select(ProductoImagen)
        .where(ProductoImagen.producto_id == producto_id)
        .order_by(ProductoImagen.orden, ProductoImagen.id)
    )
    return list(resultado)


async def obtener_o_fallar(
    sesion: AsyncSession, producto_id: int, imagen_id: int
) -> ProductoImagen:
    imagen = await sesion.get(ProductoImagen, imagen_id)
    if imagen is None or imagen.producto_id != producto_id:
        raise RecursoNoEncontrado("una imagen del producto", imagen_id)
    return imagen


async def agregar(
    sesion: AsyncSession, producto: Producto, url: str, descripcion: str | None
) -> ProductoImagen:
    cuantas = await sesion.scalar(
        select(func.count())
        .select_from(ProductoImagen)
        .where(ProductoImagen.producto_id == producto.id)
    )
    if cuantas >= MAXIMO_POR_PRODUCTO:
        raise ConflictoDeNegocio(
            f"Un producto admite como máximo {MAXIMO_POR_PRODUCTO} fotos en la galería."
        )

    imagen = ProductoImagen(
        producto_id=producto.id,
        url=url,
        descripcion=descripcion,
        orden=cuantas,
    )
    sesion.add(imagen)
    await sesion.commit()
    await sesion.refresh(imagen)
    return imagen


async def actualizar(
    sesion: AsyncSession, imagen: ProductoImagen, cambios: dict
) -> ProductoImagen:
    for campo, valor in cambios.items():
        setattr(imagen, campo, valor)
    await sesion.commit()
    await sesion.refresh(imagen)
    return imagen


async def eliminar(sesion: AsyncSession, imagen: ProductoImagen) -> None:
    await sesion.delete(imagen)
    await sesion.commit()
