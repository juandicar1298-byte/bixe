from typing import Annotated, Literal

from fastapi import APIRouter, Path, Query, Response, status

from app.crud import pedidos as crud_pedidos
from app.dependencias import (
    Administrador,
    PaginacionDep,
    PedidoExistente,
    Personal,
    SesionDep,
    UsuarioActual,
)
from app.schemas.error import RESPUESTAS_API
from app.schemas.pedido import (
    CambiarEstadoPedido,
    PedidoCrear,
    PedidoRespuesta,
    PedidoResumen,
)

router = APIRouter(prefix="/api/pedidos", tags=["Pedidos"], responses=RESPUESTAS_API)


@router.post(
    "",
    response_model=PedidoRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Confirmar el carrito",
    description="Registra el pedido y su detalle. Los precios se releen de la "
    "base de datos: el carrito solo indica qué se pide y cuánto.",
)
async def crear_pedido(sesion: SesionDep, usuario: UsuarioActual, datos: PedidoCrear):
    return await crud_pedidos.crear(
        sesion,
        usuario,
        [item.model_dump() for item in datos.items],
        datos.notas,
    )


# "/mis" va antes de "/{pedido_id}" para que no se lea como un identificador.
@router.get(
    "/mis",
    response_model=list[PedidoResumen],
    summary="Mi historial de pedidos",
)
async def mis_pedidos(
    sesion: SesionDep, usuario: UsuarioActual, paginacion: PaginacionDep
):
    return await crud_pedidos.listar(
        sesion,
        usuario_id=usuario.id,
        limite=paginacion.limite,
        desplazamiento=paginacion.desplazamiento,
    )


@router.get(
    "",
    response_model=list[PedidoResumen],
    summary="Listar todos los pedidos",
    description="Reservado al personal. Admite paginación y filtro por estado.",
)
async def listar_pedidos(
    sesion: SesionDep,
    personal: Personal,
    paginacion: PaginacionDep,
    estado: Annotated[
        Literal["pendiente", "confirmado", "completado", "cancelado"] | None, Query()
    ] = None,
):
    return await crud_pedidos.listar(
        sesion,
        estado=estado,
        limite=paginacion.limite,
        desplazamiento=paginacion.desplazamiento,
    )


@router.get(
    "/{pedido_id}",
    response_model=PedidoRespuesta,
    summary="Consultar un pedido con su detalle",
    description="El personal puede abrir cualquier pedido; un cliente, solo los suyos.",
)
async def obtener_pedido(
    sesion: SesionDep,
    usuario: UsuarioActual,
    pedido_id: Annotated[int, Path(ge=1)],
):
    return await crud_pedidos.obtener_para(sesion, pedido_id, usuario)


@router.patch(
    "/{pedido_id}/estado",
    response_model=PedidoRespuesta,
    summary="Cambiar el estado de un pedido",
)
async def cambiar_estado(
    sesion: SesionDep,
    pedido: PedidoExistente,
    personal: Personal,
    datos: CambiarEstadoPedido,
):
    return await crud_pedidos.cambiar_estado(sesion, pedido, datos.estado)


@router.patch(
    "/{pedido_id}/cancelacion",
    response_model=PedidoRespuesta,
    summary="Cancelar mi pedido",
    description="La cancelación se modela como sub-recurso propio: solo el "
    "dueño del pedido puede hacerlo y solo mientras siga pendiente.",
)
async def cancelar_pedido(
    sesion: SesionDep, pedido: PedidoExistente, usuario: UsuarioActual
):
    return await crud_pedidos.cancelar_como_cliente(sesion, pedido, usuario)


@router.delete(
    "/{pedido_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un pedido definitivamente",
)
async def eliminar_pedido(
    sesion: SesionDep, pedido: PedidoExistente, administrador: Administrador
):
    await crud_pedidos.eliminar(sesion, pedido)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
