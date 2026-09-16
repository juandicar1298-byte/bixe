from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status

from app.crud import pqr as crud_pqr
from app.dependencias import (
    PaginacionDep,
    Personal,
    SesionDep,
    UsuarioActual,
    UsuarioOpcional,
)
from app.schemas.error import RESPUESTAS_API
from app.schemas.pqr import (
    EstadoPqr,
    PaginaDeMisPqr,
    PaginaDePqr,
    PqrCambiarEstado,
    PqrCrear,
    PqrDetalle,
    PqrResponder,
    TipoPqr,
)

router = APIRouter(prefix="/api/pqr", tags=["PQR"], responses=RESPUESTAS_API)


class FiltrosDePqr:
    def __init__(
        self,
        estado: Annotated[EstadoPqr | None, Query()] = None,
        tipo: Annotated[TipoPqr | None, Query()] = None,
        desde: Annotated[date | None, Query(description="Incluye ese día.")] = None,
        hasta: Annotated[date | None, Query(description="Incluye ese día.")] = None,
        texto: Annotated[
            str | None, Query(max_length=60, description="Radicado, asunto o contacto.")
        ] = None,
    ):
        self.valores = {
            "estado": estado,
            "tipo": tipo,
            "desde": desde,
            "hasta": hasta,
            "texto": texto,
        }


@router.post(
    "",
    response_model=PqrDetalle,
    status_code=status.HTTP_201_CREATED,
    summary="Radicar una PQR",
    description="Puede radicar tanto un cliente con sesión iniciada como "
    "alguien que llega desde el chatbot sin cuenta; en ese segundo caso hay "
    "que enviar nombre y correo de contacto.",
)
async def radicar(sesion: SesionDep, usuario: UsuarioOpcional, datos: PqrCrear):
    return await crud_pqr.radicar(sesion, datos, usuario)


@router.get(
    "/mias",
    response_model=PaginaDeMisPqr,
    summary="Mis solicitudes",
    description="Las PQR del usuario que consulta, con su estado y su respuesta.",
)
async def mias(
    sesion: SesionDep,
    usuario: UsuarioActual,
    paginacion: PaginacionDep,
    filtros: Annotated[FiltrosDePqr, Depends()],
):
    solicitudes, total = await crud_pqr.listar(
        sesion,
        limite=paginacion.limite,
        desplazamiento=paginacion.desplazamiento,
        usuario_id=usuario.id,
        **filtros.valores,
    )
    return {"total": total, "pqr": solicitudes}


@router.get(
    "/radicado/{radicado}",
    response_model=PqrDetalle,
    summary="Consultar por número de radicado",
    description="Pensado para quien radicó sin cuenta: con el número puede "
    "seguir el estado de su solicitud.",
)
async def por_radicado(
    sesion: SesionDep, radicado: Annotated[str, Path(min_length=5, max_length=20)]
):
    return await crud_pqr.buscar_por_radicado(sesion, radicado)


@router.get(
    "",
    response_model=PaginaDePqr,
    summary="Bandeja de PQR",
    description="Todas las solicitudes, con filtros. Reservado al personal.",
)
async def bandeja(
    sesion: SesionDep,
    _: Personal,
    paginacion: PaginacionDep,
    filtros: Annotated[FiltrosDePqr, Depends()],
):
    solicitudes, total = await crud_pqr.listar(
        sesion,
        limite=paginacion.limite,
        desplazamiento=paginacion.desplazamiento,
        **filtros.valores,
    )
    return {"total": total, "pqr": solicitudes}


@router.get(
    "/{pqr_id}",
    response_model=PqrDetalle,
    summary="Detalle de una solicitud",
    description="El personal ve cualquiera; un cliente, solo las suyas.",
)
async def detalle(
    sesion: SesionDep, usuario: UsuarioActual, pqr_id: Annotated[int, Path(ge=1)]
):
    return await crud_pqr.obtener_para(sesion, pqr_id, usuario)


@router.put(
    "/{pqr_id}/respuesta",
    response_model=PqrDetalle,
    summary="Responder una PQR",
)
async def responder(
    sesion: SesionDep,
    personal: Personal,
    pqr_id: Annotated[int, Path(ge=1)],
    datos: PqrResponder,
):
    return await crud_pqr.responder(
        sesion, pqr_id, datos.respuesta, datos.estado, personal
    )


@router.patch(
    "/{pqr_id}/estado",
    response_model=PqrDetalle,
    summary="Cambiar el estado de una PQR",
    description="Una solicitud cerrada no se reabre: si el cliente insiste, "
    "radica una nueva y queda el rastro de las dos.",
)
async def cambiar_estado(
    sesion: SesionDep,
    _: Personal,
    pqr_id: Annotated[int, Path(ge=1)],
    datos: PqrCambiarEstado,
):
    return await crud_pqr.cambiar_estado(sesion, pqr_id, datos.estado)
