from typing import Annotated, Literal

from fastapi import APIRouter, Path, Query, Response, status

from app.crud import catalogo as crud_catalogo
from app.crud import imagenes as crud_imagenes
from app.dependencias import (
    Administrador,
    GestorDeProductos,
    PaginacionDep,
    ProductoExistente,
    SesionDep,
)
from app.models.bixe import Producto
from app.schemas.catalogo import (
    CambiarEstadoCatalogo,
    ProductoActualizar,
    ProductoCrear,
    ProductoRespuesta,
)
from app.schemas.error import RESPUESTAS_API
from app.schemas.imagen import ImagenActualizar, ImagenCrear, ImagenRespuesta

router = APIRouter(prefix="/api/productos", tags=["Productos"], responses=RESPUESTAS_API)


@router.get(
    "",
    response_model=list[ProductoRespuesta],
    summary="Listar el catálogo público",
    description="Devuelve solo los productos publicados. Admite paginación y "
    "filtros por categoría, precio máximo y texto libre.",
)
async def listar_productos(
    sesion: SesionDep,
    paginacion: PaginacionDep,
    categoria: Annotated[Literal["moto", "auto"] | None, Query()] = None,
    precio_max: Annotated[float | None, Query(ge=0)] = None,
    buscar: Annotated[str | None, Query(min_length=2, max_length=80)] = None,
):
    return await crud_catalogo.listar(
        sesion,
        Producto,
        categoria=categoria,
        estado="activo",
        buscar=buscar,
        precio_max=precio_max,
        limite=paginacion.limite,
        desplazamiento=paginacion.desplazamiento,
    )


@router.get(
    "/gestion",
    response_model=list[ProductoRespuesta],
    summary="Listar todos los productos",
    description="Incluye los ocultos. Reservado al personal que gestiona el catálogo.",
)
async def listar_para_gestion(
    sesion: SesionDep, gestor: GestorDeProductos, paginacion: PaginacionDep
):
    return await crud_catalogo.listar(
        sesion,
        Producto,
        estado=None,
        limite=paginacion.limite,
        desplazamiento=paginacion.desplazamiento,
    )


@router.get(
    "/{producto_id}", response_model=ProductoRespuesta, summary="Consultar un producto"
)
async def obtener_producto(producto: ProductoExistente):
    return producto


@router.post(
    "",
    response_model=ProductoRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un producto",
)
async def crear_producto(
    sesion: SesionDep, gestor: GestorDeProductos, datos: ProductoCrear
):
    return await crud_catalogo.crear(sesion, Producto, datos.model_dump())


@router.patch(
    "/{producto_id}",
    response_model=ProductoRespuesta,
    summary="Actualizar parcialmente un producto",
)
async def actualizar_producto(
    sesion: SesionDep,
    producto: ProductoExistente,
    gestor: GestorDeProductos,
    datos: ProductoActualizar,
):
    return await crud_catalogo.actualizar(
        sesion, producto, datos.model_dump(exclude_unset=True)
    )


@router.patch(
    "/{producto_id}/estado",
    response_model=ProductoRespuesta,
    summary="Publicar u ocultar un producto",
)
async def cambiar_estado(
    sesion: SesionDep,
    producto: ProductoExistente,
    gestor: GestorDeProductos,
    datos: CambiarEstadoCatalogo,
):
    return await crud_catalogo.actualizar(sesion, producto, {"estado": datos.estado})


@router.delete(
    "/{producto_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un producto definitivamente",
)
async def eliminar_producto(
    sesion: SesionDep, producto: ProductoExistente, administrador: Administrador
):
    await crud_catalogo.eliminar(sesion, producto)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --------------------------- Galería del producto ---------------------------
# Las fotos se suben primero con POST /api/uploads y aquí se asocian al
# producto. imagen_url sigue siendo la portada; esto son las adicionales.


@router.get(
    "/{producto_id}/imagenes",
    response_model=list[ImagenRespuesta],
    summary="Listar las fotos de un producto",
)
async def listar_imagenes(sesion: SesionDep, producto: ProductoExistente):
    return await crud_imagenes.listar(sesion, producto.id)


@router.post(
    "/{producto_id}/imagenes",
    response_model=ImagenRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar una foto a la galería",
)
async def agregar_imagen(
    sesion: SesionDep,
    producto: ProductoExistente,
    gestor: GestorDeProductos,
    datos: ImagenCrear,
):
    return await crud_imagenes.agregar(sesion, producto, datos.url, datos.descripcion)


@router.patch(
    "/{producto_id}/imagenes/{imagen_id}",
    response_model=ImagenRespuesta,
    summary="Editar el texto o el orden de una foto",
)
async def actualizar_imagen(
    sesion: SesionDep,
    producto: ProductoExistente,
    gestor: GestorDeProductos,
    imagen_id: Annotated[int, Path(ge=1)],
    datos: ImagenActualizar,
):
    imagen = await crud_imagenes.obtener_o_fallar(sesion, producto.id, imagen_id)
    return await crud_imagenes.actualizar(
        sesion, imagen, datos.model_dump(exclude_unset=True)
    )


@router.delete(
    "/{producto_id}/imagenes/{imagen_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Quitar una foto de la galería",
)
async def eliminar_imagen(
    sesion: SesionDep,
    producto: ProductoExistente,
    gestor: GestorDeProductos,
    imagen_id: Annotated[int, Path(ge=1)],
):
    imagen = await crud_imagenes.obtener_o_fallar(sesion, producto.id, imagen_id)
    await crud_imagenes.eliminar(sesion, imagen)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
