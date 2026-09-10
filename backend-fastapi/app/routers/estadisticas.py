from fastapi import APIRouter

from app.crud import estadisticas as crud_estadisticas
from app.dependencias import Personal, SesionDep
from app.schemas.error import RESPUESTAS_API
from app.schemas.estadistica import Estadisticas

router = APIRouter(
    prefix="/api/estadisticas",
    tags=["Estadísticas"],
    responses=RESPUESTAS_API,
)


@router.get(
    "",
    response_model=Estadisticas,
    summary="Cifras del panel",
    description="Alimenta las tarjetas y la gráfica de los paneles de "
    "Administrador y Empleado. Todos los conteos se calculan en la base de datos.",
)
async def obtener_estadisticas(sesion: SesionDep, personal: Personal):
    return await crud_estadisticas.obtener(sesion)
