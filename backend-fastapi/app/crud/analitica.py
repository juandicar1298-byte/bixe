"""Las cifras de los dashboards del quinto avance.

Todo sale de la tabla de ventas, no de la de pedidos: un pedido pendiente o
cancelado no es dinero que haya entrado. Las ventas anuladas tampoco suman.

Los cálculos se hacen en la base de datos con GROUP BY, no trayéndose las
filas a Python para contarlas aquí.
"""

from datetime import date, datetime, time, timedelta

from sqlalchemy import Select, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.periodos import periodo as recortar_periodo
from app.models.bixe import (
    DetalleVenta,
    Factura,
    Pqr,
    Usuario,
    Venta,
)

# Cuántos días atrás mira la gráfica cuando no se indica un rango.
DIAS_POR_DEFECTO = 30


def rango_por_defecto() -> tuple[date, date]:
    hoy = date.today()
    return hoy - timedelta(days=DIAS_POR_DEFECTO - 1), hoy


def _acotar(consulta: Select, desde: date, hasta: date) -> Select:
    """«hasta» incluye el día entero, no solo su medianoche."""
    return consulta.where(
        Venta.fecha >= datetime.combine(desde, time.min),
        Venta.fecha < datetime.combine(hasta + timedelta(days=1), time.min),
    )


def _filtrar(
    consulta: Select,
    *,
    cliente_id: int | None = None,
    estado: str | None = None,
    canal: str | None = None,
    producto_id: int | None = None,
    servicio_id: int | None = None,
) -> Select:
    if cliente_id is not None:
        consulta = consulta.where(Venta.cliente_id == cliente_id)
    if canal:
        consulta = consulta.where(Venta.canal == canal)

    # Sin filtro explícito, las anuladas no cuentan: no son ingresos.
    consulta = (
        consulta.where(Venta.estado == estado)
        if estado
        else consulta.where(Venta.estado != "anulada")
    )

    for tipo, referencia in (("producto", producto_id), ("servicio", servicio_id)):
        if referencia is not None:
            consulta = consulta.where(
                select(DetalleVenta.id)
                .where(
                    DetalleVenta.venta_id == Venta.id,
                    DetalleVenta.tipo == tipo,
                    DetalleVenta.referencia_id == referencia,
                )
                .exists()
            )

    return consulta


def _base(desde: date, hasta: date, **filtros) -> Select:
    return _filtrar(_acotar(select(Venta), desde, hasta), **filtros)


async def resumen(sesion: AsyncSession, desde: date, hasta: date, **filtros) -> dict:
    """Las tarjetas de indicadores del periodo."""
    consulta = _base(desde, hasta, **filtros).subquery()

    fila = (
        await sesion.execute(
            select(
                func.count().label("ventas"),
                func.coalesce(func.sum(consulta.c.total), 0).label("ingresos"),
                func.coalesce(func.sum(consulta.c.impuesto), 0).label("impuesto"),
                func.coalesce(func.sum(consulta.c.descuento), 0).label("descuento"),
                func.count(func.distinct(consulta.c.id_cliente)).label("clientes"),
            ).select_from(consulta)
        )
    ).one()

    ventas = fila.ventas or 0
    ingresos = float(fila.ingresos or 0)

    return {
        "ventas": ventas,
        "ingresos": ingresos,
        "impuesto": float(fila.impuesto or 0),
        "descuento": float(fila.descuento or 0),
        "clientes": fila.clientes or 0,
        # El ticket promedio se calcula aquí y no en el frontend, para que no
        # haya dos versiones de la misma cuenta.
        "ticket_promedio": round(ingresos / ventas, 2) if ventas else 0.0,
    }


async def serie(
    sesion: AsyncSession, desde: date, hasta: date, agrupar: str = "dia", **filtros
) -> list[dict]:
    """La serie para las gráficas: por día o por mes.

    Los periodos sin ventas se rellenan con ceros. Sin eso, una gráfica lineal
    uniría el lunes con el jueves como si el martes y el miércoles no
    existieran, y se leería una tendencia que no es.
    """
    periodo = recortar_periodo(Venta.fecha, agrupar).label("periodo")

    base = _filtrar(_acotar(select(Venta), desde, hasta), **filtros)
    consulta = base.with_only_columns(
        periodo,
        func.count().label("ventas"),
        func.coalesce(func.sum(Venta.total), 0).label("ingresos"),
    ).group_by(periodo).order_by(periodo)

    filas = (await sesion.execute(consulta)).all()
    datos = {
        f.periodo: {"ventas": f.ventas, "ingresos": float(f.ingresos)} for f in filas
    }

    return [
        {"periodo": clave, **datos.get(clave, {"ventas": 0, "ingresos": 0.0})}
        for clave in _periodos(desde, hasta, agrupar)
    ]


def _periodos(desde: date, hasta: date, agrupar: str) -> list[str]:
    if agrupar == "dia":
        cuantos = (hasta - desde).days + 1
        return [(desde + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(cuantos)]

    claves, anio, mes = [], desde.year, desde.month
    while (anio, mes) <= (hasta.year, hasta.month):
        claves.append(f"{anio:04d}-{mes:02d}")
        mes += 1
        if mes > 12:
            mes, anio = 1, anio + 1
    return claves


async def top_articulos(
    sesion: AsyncSession, desde: date, hasta: date, limite: int = 5, **filtros
) -> list[dict]:
    unidades = func.sum(DetalleVenta.cantidad).label("unidades")
    monto = func.sum(DetalleVenta.subtotal).label("monto")

    base = _filtrar(_acotar(select(Venta), desde, hasta), **filtros)
    consulta = (
        base.join(DetalleVenta, DetalleVenta.venta_id == Venta.id)
        .with_only_columns(DetalleVenta.nombre, DetalleVenta.tipo, unidades, monto)
        .group_by(DetalleVenta.nombre, DetalleVenta.tipo)
        .order_by(unidades.desc())
        .limit(limite)
    )

    filas = (await sesion.execute(consulta)).all()
    return [
        {
            "nombre": f.nombre,
            "tipo": f.tipo,
            "unidades": int(f.unidades or 0),
            "monto": float(f.monto or 0),
        }
        for f in filas
    ]


async def por_canal(sesion: AsyncSession, desde: date, hasta: date, **filtros) -> list[dict]:
    base = _filtrar(_acotar(select(Venta), desde, hasta), **filtros)
    consulta = base.with_only_columns(
        Venta.canal,
        func.count().label("ventas"),
        func.coalesce(func.sum(Venta.total), 0).label("ingresos"),
    ).group_by(Venta.canal)

    filas = (await sesion.execute(consulta)).all()
    return [
        {"canal": f.canal, "ventas": f.ventas, "ingresos": float(f.ingresos)}
        for f in filas
    ]


async def ultimas_ventas(
    sesion: AsyncSession, desde: date, hasta: date, limite: int = 6, **filtros
) -> list[dict]:
    base = _filtrar(_acotar(select(Venta), desde, hasta), **filtros)
    consulta = (
        base.join(Usuario, Usuario.id == Venta.cliente_id)
        .with_only_columns(
            Venta.id,
            Venta.numero,
            Venta.total,
            Venta.estado,
            Venta.canal,
            Venta.fecha,
            func.concat(Usuario.nombre, " ", Usuario.apellido).label("cliente"),
        )
        .order_by(Venta.fecha.desc(), Venta.id.desc())
        .limit(limite)
    )

    filas = (await sesion.execute(consulta)).all()
    return [
        {
            "id": f.id,
            "numero": f.numero,
            "cliente": f.cliente,
            "total": float(f.total),
            "estado": f.estado,
            "canal": f.canal,
            "fecha": f.fecha,
        }
        for f in filas
    ]


async def resumen_pqr(sesion: AsyncSession) -> dict:
    fila = (
        await sesion.execute(
            select(
                func.count().label("total"),
                func.coalesce(
                    func.sum(
                        case((Pqr.estado.in_(("pendiente", "en_proceso")), 1), else_=0)
                    ),
                    0,
                ).label("pendientes"),
            ).select_from(Pqr)
        )
    ).one()

    filas = (
        await sesion.execute(
            select(Pqr.estado, func.count().label("total")).group_by(Pqr.estado)
        )
    ).all()

    return {
        "total": fila.total or 0,
        "pendientes": int(fila.pendientes or 0),
        "por_estado": [{"estado": f.estado, "total": f.total} for f in filas],
    }


async def resumen_facturacion(sesion: AsyncSession, desde: date, hasta: date) -> dict:
    fila = (
        await sesion.execute(
            select(
                func.count().label("total"),
                func.coalesce(func.sum(Factura.total), 0).label("facturado"),
            )
            .select_from(Factura)
            .where(
                Factura.fecha_emision >= datetime.combine(desde, time.min),
                Factura.fecha_emision
                < datetime.combine(hasta + timedelta(days=1), time.min),
            )
        )
    ).one()
    return {"total": fila.total or 0, "facturado": float(fila.facturado or 0)}


async def panel_de_ventas(
    sesion: AsyncSession,
    desde: date,
    hasta: date,
    agrupar: str = "dia",
    **filtros,
) -> dict:
    """Todo lo que pinta el dashboard de ventas, en una sola petición."""
    return {
        "desde": desde,
        "hasta": hasta,
        "agrupar": agrupar,
        "resumen": await resumen(sesion, desde, hasta, **filtros),
        "serie": await serie(sesion, desde, hasta, agrupar, **filtros),
        "top_articulos": await top_articulos(sesion, desde, hasta, **filtros),
        "por_canal": await por_canal(sesion, desde, hasta, **filtros),
        "ultimas": await ultimas_ventas(sesion, desde, hasta, **filtros),
        "facturacion": await resumen_facturacion(sesion, desde, hasta),
        "pqr": await resumen_pqr(sesion),
    }


async def panel_del_cliente(sesion: AsyncSession, usuario_id: int) -> dict:
    """El dashboard del cliente: solo lo suyo.

    No recibe filtros de cliente por parámetro a propósito: el identificador
    sale del token, nunca de la petición, para que nadie pueda pedir el
    resumen de otra persona cambiando un número en la URL.
    """
    desde, hasta = date(2000, 1, 1), date.today()

    compras = await resumen(sesion, desde, hasta, cliente_id=usuario_id)
    serie_mensual = await serie(
        sesion,
        date.today().replace(day=1) - timedelta(days=150),
        hasta,
        "mes",
        cliente_id=usuario_id,
    )

    pqr = (
        await sesion.execute(
            select(
                func.count().label("total"),
                func.coalesce(
                    func.sum(
                        case((Pqr.estado.in_(("pendiente", "en_proceso")), 1), else_=0)
                    ),
                    0,
                ).label("pendientes"),
            )
            .select_from(Pqr)
            .where(Pqr.usuario_id == usuario_id)
        )
    ).one()

    return {
        "compras": compras,
        "serie": serie_mensual,
        "top_articulos": await top_articulos(
            sesion, desde, hasta, cliente_id=usuario_id
        ),
        "ultimas": await ultimas_ventas(sesion, desde, hasta, cliente_id=usuario_id),
        "pqr": {"total": pqr.total or 0, "pendientes": int(pqr.pendientes or 0)},
    }
