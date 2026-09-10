from datetime import date

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import catalogo as crud_catalogo
from app.models.bixe import Pedido, PedidoItem, Producto, Rol, Servicio, Usuario

MESES_DE_HISTORIA = 6


def _primer_dia_del_periodo() -> date:
    """Primer día del mes con el que empieza la ventana de la gráfica."""
    hoy = date.today()
    mes = hoy.month - (MESES_DE_HISTORIA - 1)
    anio = hoy.year
    while mes <= 0:
        mes += 12
        anio -= 1
    return date(anio, mes, 1)


async def _resumen_usuarios(sesion: AsyncSession) -> dict:
    fila = (
        await sesion.execute(
            select(
                func.count().label("total"),
                func.sum(case((Usuario.estado == "activo", 1), else_=0)).label("activos"),
            ).select_from(Usuario)
        )
    ).one()
    return {"total": fila.total or 0, "activos": int(fila.activos or 0)}


async def _usuarios_por_rol(sesion: AsyncSession) -> list[dict]:
    filas = (
        await sesion.execute(
            select(Rol.id, Rol.nombre, func.count(Usuario.id).label("total"))
            .select_from(Rol)
            .outerjoin(Usuario, Usuario.rol_id == Rol.id)
            .group_by(Rol.id, Rol.nombre)
            .order_by(Rol.id)
        )
    ).all()
    return [{"rol_id": f.id, "rol": f.nombre, "total": f.total} for f in filas]


async def _resumen_pedidos(sesion: AsyncSession) -> dict:
    fila = (
        await sesion.execute(
            select(
                func.count().label("total"),
                func.coalesce(
                    func.sum(case((Pedido.estado != "cancelado", Pedido.total))), 0
                ).label("ingresos"),
            ).select_from(Pedido)
        )
    ).one()
    return {"total": fila.total or 0, "ingresos": float(fila.ingresos or 0)}


async def _pedidos_por_estado(sesion: AsyncSession) -> list[dict]:
    filas = (
        await sesion.execute(
            select(
                Pedido.estado,
                func.count().label("total"),
                func.coalesce(func.sum(Pedido.total), 0).label("monto"),
            ).group_by(Pedido.estado)
        )
    ).all()
    return [
        {"estado": f.estado, "total": f.total, "monto": float(f.monto)} for f in filas
    ]


async def _ventas_por_mes(sesion: AsyncSession) -> list[dict]:
    mes = func.date_format(Pedido.fecha_creacion, "%Y-%m").label("mes")
    filas = (
        await sesion.execute(
            select(
                mes,
                func.count().label("pedidos"),
                func.coalesce(
                    func.sum(case((Pedido.estado != "cancelado", Pedido.total))), 0
                ).label("ingresos"),
            )
            .where(Pedido.fecha_creacion >= _primer_dia_del_periodo())
            .group_by(mes)
            .order_by(mes)
        )
    ).all()
    return [
        {"mes": f.mes, "pedidos": f.pedidos, "ingresos": float(f.ingresos)}
        for f in filas
    ]


async def _mas_vendidos(sesion: AsyncSession, limite: int = 5) -> list[dict]:
    unidades = func.sum(PedidoItem.cantidad).label("unidades")
    monto = func.sum(PedidoItem.cantidad * PedidoItem.precio_unitario).label("monto")

    filas = (
        await sesion.execute(
            select(PedidoItem.nombre, PedidoItem.tipo, unidades, monto)
            .join(Pedido, Pedido.id == PedidoItem.pedido_id)
            .where(Pedido.estado != "cancelado")
            .group_by(PedidoItem.nombre, PedidoItem.tipo)
            .order_by(unidades.desc())
            .limit(limite)
        )
    ).all()
    return [
        {
            "nombre": f.nombre,
            "tipo": f.tipo,
            "unidades": int(f.unidades),
            "monto": float(f.monto),
        }
        for f in filas
    ]


async def _pedidos_recientes(sesion: AsyncSession, limite: int = 5) -> list[dict]:
    filas = (
        await sesion.execute(
            select(
                Pedido.id,
                Pedido.total,
                Pedido.estado,
                Pedido.fecha_creacion,
                func.concat(Usuario.nombre, " ", Usuario.apellido).label("cliente"),
            )
            .join(Usuario, Usuario.id == Pedido.usuario_id)
            .order_by(Pedido.fecha_creacion.desc())
            .limit(limite)
        )
    ).all()
    return [
        {
            "id": f.id,
            "cliente": f.cliente,
            "total": float(f.total),
            "estado": f.estado,
            "fecha_creacion": f.fecha_creacion,
        }
        for f in filas
    ]


async def obtener(sesion: AsyncSession) -> dict:
    """Todas las cifras del panel. Los conteos se hacen en la base de datos."""
    return {
        "usuarios": await _resumen_usuarios(sesion),
        "usuarios_por_rol": await _usuarios_por_rol(sesion),
        "productos": await crud_catalogo.resumen(sesion, Producto),
        "servicios": await crud_catalogo.resumen(sesion, Servicio),
        "pedidos": await _resumen_pedidos(sesion),
        "pedidos_por_estado": await _pedidos_por_estado(sesion),
        "ventas_por_mes": await _ventas_por_mes(sesion),
        "mas_vendidos": await _mas_vendidos(sesion),
        "pedidos_recientes": await _pedidos_recientes(sesion),
    }
