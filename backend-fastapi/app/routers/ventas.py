from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Path, Query, Response, status

from app.crud import ventas as crud_ventas
from app.dependencias import (
    Administrador,
    PaginacionDep,
    Personal,
    SesionDep,
)
from app.schemas.error import RESPUESTAS_API
from app.schemas.venta import (
    PaginaDeVentas,
    ReporteDiario,
    VentaDetalle,
    VentaManualCrear,
)
from app.services import reportes

router = APIRouter(prefix="/api/ventas", tags=["Ventas"], responses=RESPUESTAS_API)


class FiltrosDeVentas:
    """Los criterios del historial, en un solo sitio.

    Van como clase y no sueltos en cada firma porque los comparten el listado y
    las dos exportaciones, y así no hay que repetirlos tres veces.
    """

    def __init__(
        self,
        desde: Annotated[date | None, Query(description="Incluye ese día.")] = None,
        hasta: Annotated[date | None, Query(description="Incluye ese día.")] = None,
        cliente_id: Annotated[int | None, Query(ge=1)] = None,
        estado: Annotated[Literal["completada", "anulada"] | None, Query()] = None,
        canal: Annotated[Literal["web", "mostrador"] | None, Query()] = None,
        producto_id: Annotated[int | None, Query(ge=1)] = None,
        servicio_id: Annotated[int | None, Query(ge=1)] = None,
        monto_minimo: Annotated[float | None, Query(ge=0)] = None,
        monto_maximo: Annotated[float | None, Query(ge=0)] = None,
        texto: Annotated[
            str | None,
            Query(max_length=60, description="N.º de venta, nombre, documento o correo."),
        ] = None,
    ):
        self.valores = {
            "desde": desde,
            "hasta": hasta,
            "cliente_id": cliente_id,
            "estado": estado,
            "canal": canal,
            "producto_id": producto_id,
            "servicio_id": servicio_id,
            "monto_minimo": monto_minimo,
            "monto_maximo": monto_maximo,
            "texto": texto,
        }


@router.get(
    "",
    response_model=PaginaDeVentas,
    summary="Historial de ventas",
    description="Listado con filtros por fecha, cliente, artículo, estado, "
    "canal y rango de valor. Reservado al personal del taller.",
)
async def historial(
    sesion: SesionDep,
    _: Personal,
    paginacion: PaginacionDep,
    filtros: Annotated[FiltrosDeVentas, Depends()],
):
    ventas, total = await crud_ventas.listar(
        sesion,
        limite=paginacion.limite,
        desplazamiento=paginacion.desplazamiento,
        **filtros.valores,
    )
    return {"total": total, "ventas": ventas}


@router.post(
    "",
    response_model=VentaDetalle,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar una venta de mostrador",
    description="Para las ventas que no vienen de la web. Los precios se "
    "releen del catálogo; quien registra solo indica qué, cuánto y el descuento.",
)
async def registrar(sesion: SesionDep, personal: Personal, datos: VentaManualCrear):
    venta = await crud_ventas.registrar_manual(sesion, datos, personal.id)
    return await _con_factura(sesion, venta)


@router.get(
    "/reporte-diario",
    response_model=ReporteDiario,
    summary="Reporte diario de ventas",
    description="Las ventas de una fecha, ya sumadas. Si no se indica fecha, la de hoy.",
)
async def reporte(
    sesion: SesionDep,
    _: Personal,
    fecha: Annotated[date | None, Query(description="Por omisión, hoy.")] = None,
):
    return await crud_ventas.reporte_diario(sesion, fecha or date.today())


@router.get(
    "/reporte-diario.pdf",
    summary="Descargar el reporte diario en PDF",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}}},
)
async def reporte_pdf(
    sesion: SesionDep,
    _: Personal,
    fecha: Annotated[date | None, Query()] = None,
):
    dia = fecha or date.today()
    datos = await crud_ventas.reporte_diario(sesion, dia)
    return Response(
        content=reportes.generar_pdf(datos),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="ventas-{dia:%Y-%m-%d}.pdf"'
        },
    )


@router.get(
    "/reporte-diario.xlsx",
    summary="Descargar el reporte diario en Excel",
    response_class=Response,
    responses={
        200: {
            "content": {
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {}
            }
        }
    },
)
async def reporte_excel(
    sesion: SesionDep,
    _: Personal,
    fecha: Annotated[date | None, Query()] = None,
):
    dia = fecha or date.today()
    datos = await crud_ventas.reporte_diario(sesion, dia)
    return Response(
        content=reportes.generar_excel(datos),
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f'attachment; filename="ventas-{dia:%Y-%m-%d}.xlsx"'
        },
    )


@router.get(
    "/{venta_id}",
    response_model=VentaDetalle,
    summary="Detalle de una venta",
)
async def detalle(
    sesion: SesionDep,
    _: Personal,
    venta_id: Annotated[int, Path(ge=1)],
):
    venta = await crud_ventas.obtener(sesion, venta_id)
    return await _con_factura(sesion, venta)


@router.patch(
    "/{venta_id}/anulacion",
    response_model=VentaDetalle,
    summary="Anular una venta",
    description="La venta no se borra: queda marcada como anulada y deja de "
    "sumar en los reportes. Solo el administrador puede hacerlo.",
)
async def anular(
    sesion: SesionDep,
    _: Administrador,
    venta_id: Annotated[int, Path(ge=1)],
):
    venta = await crud_ventas.anular(sesion, venta_id)
    return await _con_factura(sesion, venta)


async def _con_factura(sesion, venta):
    """Añade el número de factura, que vive en otra tabla."""
    datos = VentaDetalle.model_validate(venta)
    datos.factura_numero = await crud_ventas.numero_de_factura(sesion, venta)
    return datos
