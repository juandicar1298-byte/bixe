from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.crud import catalogo as crud_catalogo
from app.dependencias import (
    Administrador,
    GestorDeServicios,
    PaginacionDep,
    ServicioExistente,
    SesionDep,
)
from app.models.bixe import Servicio
from app.schemas.catalogo import (
    CambiarEstadoCatalogo,
    ServicioActualizar,
    ServicioCrear,
    ServicioRespuesta,
)
from app.schemas.error import RESPUESTAS_API

router = APIRouter(prefix="/api/servicios", tags=["Servicios"], responses=RESPUESTAS_API)


@router.get(
    "",
    response_model=list[ServicioRespuesta],
    summary="Listar los servicios publicados",
    description="Catálogo del taller que ve cualquier visitante. Admite "
    "paginación y filtros por categoría, precio máximo y texto libre.",
)
async def listar_servicios(
    sesion: SesionDep,
    paginacion: PaginacionDep,
    categoria: Annotated[str | None, Query(min_length=3, max_length=60)] = None,
    precio_max: Annotated[float | None, Query(ge=0)] = None,
    buscar: Annotated[str | None, Query(min_length=2, max_length=80)] = None,
):
    return await crud_catalogo.listar(
        sesion,
        Servicio,
        categoria=categoria,
        estado="activo",
        buscar=buscar,
        precio_max=precio_max,
        limite=paginacion.limite,
        desplazamiento=paginacion.desplazamiento,
    )


@router.get(
    "/gestion",
    response_model=list[ServicioRespuesta],
    summary="Listar todos los servicios",
    description="Incluye los ocultos. Reservado al personal del taller.",
)
async def listar_para_gestion(
    sesion: SesionDep, gestor: GestorDeServicios, paginacion: PaginacionDep
):
    return await crud_catalogo.listar(
        sesion,
        Servicio,
        estado=None,
        limite=paginacion.limite,
        desplazamiento=paginacion.desplazamiento,
    )


@router.get(
    "/{servicio_id}", response_model=ServicioRespuesta, summary="Consultar un servicio"
)
async def obtener_servicio(servicio: ServicioExistente):
    return servicio


@router.post(
    "",
    response_model=ServicioRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un servicio",
)
async def crear_servicio(
    sesion: SesionDep, gestor: GestorDeServicios, datos: ServicioCrear
):
    return await crud_catalogo.crear(sesion, Servicio, datos.model_dump())


@router.patch(
    "/{servicio_id}",
    response_model=ServicioRespuesta,
    summary="Actualizar parcialmente un servicio",
)
async def actualizar_servicio(
    sesion: SesionDep,
    servicio: ServicioExistente,
    gestor: GestorDeServicios,
    datos: ServicioActualizar,
):
    return await crud_catalogo.actualizar(
        sesion, servicio, datos.model_dump(exclude_unset=True)
    )


@router.patch(
    "/{servicio_id}/estado",
    response_model=ServicioRespuesta,
    summary="Publicar u ocultar un servicio",
)
async def cambiar_estado(
    sesion: SesionDep,
    servicio: ServicioExistente,
    gestor: GestorDeServicios,
    datos: CambiarEstadoCatalogo,
):
    return await crud_catalogo.actualizar(sesion, servicio, {"estado": datos.estado})


@router.delete(
    "/{servicio_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un servicio definitivamente",
)
async def eliminar_servicio(
    sesion: SesionDep, servicio: ServicioExistente, administrador: Administrador
):
    await crud_catalogo.eliminar(sesion, servicio)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
