from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query

from app.crud import analitica as crud_analitica
from app.crud import estadisticas as crud_estadisticas
from app.dependencias import Personal, SesionDep, UsuarioActual
from app.errores import ConflictoDeNegocio
from app.schemas.error import RESPUESTAS_API
from app.schemas.estadistica import Estadisticas, PanelDelCliente, PanelDeVentas

router = APIRouter(
    prefix="/api/estadisticas",
    tags=["Estadísticas"],
    responses=RESPUESTAS_API,
)

# Cuánto es lo máximo que se puede pedir de una vez agrupado por día. Con más,
# la gráfica se vuelve ilegible y la consulta, cara para nada.
DIAS_MAXIMOS = 370


class FiltrosDePanel:
    """Los filtros del dashboard. Los comparten todas las gráficas y tarjetas."""

    def __init__(
        self,
        desde: Annotated[date | None, Query(description="Incluye ese día.")] = None,
        hasta: Annotated[date | None, Query(description="Incluye ese día.")] = None,
        agrupar: Annotated[Literal["dia", "mes"], Query()] = "dia",
        cliente_id: Annotated[int | None, Query(ge=1)] = None,
        producto_id: Annotated[int | None, Query(ge=1)] = None,
        servicio_id: Annotated[int | None, Query(ge=1)] = None,
        estado: Annotated[Literal["completada", "anulada"] | None, Query()] = None,
        canal: Annotated[Literal["web", "mostrador"] | None, Query()] = None,
    ):
        predeterminado_desde, predeterminado_hasta = crud_analitica.rango_por_defecto()
        self.desde = desde or predeterminado_desde
        self.hasta = hasta or predeterminado_hasta

        if self.desde > self.hasta:
            raise ConflictoDeNegocio(
                "La fecha inicial no puede ser posterior a la final."
            )
        if agrupar == "dia" and (self.hasta - self.desde).days > DIAS_MAXIMOS:
            raise ConflictoDeNegocio(
                f"Agrupado por día el rango no puede pasar de {DIAS_MAXIMOS} días. "
                "Para periodos más largos, agrupa por mes."
            )

        self.agrupar = agrupar
        self.valores = {
            "cliente_id": cliente_id,
            "producto_id": producto_id,
            "servicio_id": servicio_id,
            "estado": estado,
            "canal": canal,
        }


@router.get(
    "",
    response_model=Estadisticas,
    summary="Cifras del panel",
    description="Alimenta las tarjetas y la gráfica de los paneles de "
    "Administrador y Empleado. Todos los conteos se calculan en la base de datos.",
)
async def obtener_estadisticas(sesion: SesionDep, personal: Personal):
    return await crud_estadisticas.obtener(sesion)


@router.get(
    "/ventas",
    response_model=PanelDeVentas,
    summary="Dashboard de ventas",
    description="Indicadores, serie para las gráficas, artículos más vendidos, "
    "reparto por canal, facturación y PQR. Todo con los mismos filtros: rango "
    "de fechas, cliente, producto, servicio, estado y canal.",
)
async def panel_de_ventas(
    sesion: SesionDep,
    _: Personal,
    filtros: Annotated[FiltrosDePanel, Depends()],
):
    return await crud_analitica.panel_de_ventas(
        sesion, filtros.desde, filtros.hasta, filtros.agrupar, **filtros.valores
    )


@router.get(
    "/mi-panel",
    response_model=PanelDelCliente,
    summary="Dashboard del cliente",
    description="Las cifras del propio usuario. El identificador sale del "
    "token, nunca de la petición, así que nadie puede consultar las de otro.",
)
async def panel_del_cliente(sesion: SesionDep, usuario: UsuarioActual):
    return await crud_analitica.panel_del_cliente(sesion, usuario.id)
