"""CRUD compartido por productos y servicios.

Las dos entidades se gestionan igual (listar, publicar, ocultar, editar,
eliminar), así que la lógica vive una sola vez y se parametriza con el modelo.
"""

from typing import TypeVar

from sqlalchemy import case, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.errores import ConflictoDeNegocio, RecursoNoEncontrado
from app.models.bixe import Producto, Servicio

ModeloCatalogo = TypeVar("ModeloCatalogo", Producto, Servicio)

NOMBRE_LEGIBLE = {Producto: "un producto", Servicio: "un servicio"}


async def listar(
    sesion: AsyncSession,
    modelo: type[ModeloCatalogo],
    categoria: str | None = None,
    estado: str | None = "activo",
    buscar: str | None = None,
    precio_max: float | None = None,
    limite: int = 50,
    desplazamiento: int = 0,
) -> list[ModeloCatalogo]:
    consulta = select(modelo)

    if estado is not None:
        consulta = consulta.where(modelo.estado == estado)
    if categoria is not None:
        consulta = consulta.where(modelo.categoria == categoria)
    if precio_max is not None:
        consulta = consulta.where(modelo.precio <= precio_max)
    if buscar is not None:
        patron = f"%{buscar}%"
        consulta = consulta.where(
            or_(modelo.nombre.ilike(patron), modelo.descripcion.ilike(patron))
        )

    consulta = consulta.order_by(modelo.id.desc()).offset(desplazamiento).limit(limite)
    resultado = await sesion.scalars(consulta)
    return list(resultado.unique())


async def obtener_o_fallar(
    sesion: AsyncSession, modelo: type[ModeloCatalogo], registro_id: int
) -> ModeloCatalogo:
    registro = await sesion.get(modelo, registro_id)
    if registro is None:
        raise RecursoNoEncontrado(NOMBRE_LEGIBLE[modelo], registro_id)
    return registro


async def crear(
    sesion: AsyncSession, modelo: type[ModeloCatalogo], datos: dict
) -> ModeloCatalogo:
    registro = modelo(**datos, estado="activo")
    sesion.add(registro)

    try:
        await sesion.commit()
    except IntegrityError:
        await sesion.rollback()
        raise ConflictoDeNegocio(f"Ya existe un registro con el nombre «{datos['nombre']}».")

    await sesion.refresh(registro)
    return registro


async def actualizar(
    sesion: AsyncSession, registro: ModeloCatalogo, cambios: dict
) -> ModeloCatalogo:
    for campo, valor in cambios.items():
        setattr(registro, campo, valor)

    try:
        await sesion.commit()
    except IntegrityError:
        await sesion.rollback()
        raise ConflictoDeNegocio("Ya existe otro registro con ese nombre.")

    await sesion.refresh(registro)
    return registro


async def eliminar(sesion: AsyncSession, registro: ModeloCatalogo) -> None:
    await sesion.delete(registro)
    await sesion.commit()


async def resumen(sesion: AsyncSession, modelo: type[ModeloCatalogo]) -> dict:
    """Totales calculados en la base de datos, no en Python."""
    fila = (
        await sesion.execute(
            select(
                func.count().label("total"),
                func.sum(case((modelo.estado == "activo", 1), else_=0)).label("activos"),
            ).select_from(modelo)
        )
    ).one()

    return {"total": fila.total or 0, "activos": int(fila.activos or 0)}
