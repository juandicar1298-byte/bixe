from typing import Annotated, Literal

from fastapi import APIRouter, Query, Response, status

from app.crud import catalogo as crud_catalogo
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
