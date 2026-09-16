"""Ventas: registro, historial y reporte diario.

Un pedido es el carrito que confirma el cliente; una venta es la operación
comercial que queda registrada cuando ese pedido se paga, o cuando alguien del
taller la registra a mano desde el mostrador. Son cosas distintas: un pedido
puede quedarse pendiente o cancelarse y no llegar nunca a ser una venta.

Sobre las cifras: los precios del catálogo ya incluyen IVA, así que la venta no
le suma nada al total. «subtotal» es la base gravable (lo que queda al quitarle
el impuesto) e «impuesto» es el IVA que ya venía dentro. De ahí que siempre se
cumpla subtotal + impuesto = total.
"""

from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.errores import ArticuloNoDisponible, ConflictoDeNegocio, RecursoNoEncontrado
from app.models.bixe import (
    DetalleVenta,
    Factura,
    Pedido,
    Producto,
    Servicio,
    Usuario,
    Venta,
)
from app.schemas.venta import VentaManualCrear
from app.services.factura import calcular_impuesto

PREFIJO = "VTA"
PORCENTAJE_IVA = Decimal("19")

MODELO_POR_TIPO = {"producto": Producto, "servicio": Servicio}


async def _siguiente_consecutivo(sesion: AsyncSession) -> int:
    ultimo = await sesion.scalar(select(func.max(Venta.consecutivo)))
    return (ultimo or 0) + 1


def _redondear(valor: Decimal) -> Decimal:
    return Decimal(valor).quantize(Decimal("0.01"))


async def _armar_venta(
    sesion: AsyncSession,
    *,
    cliente_id: int,
    lineas: list[DetalleVenta],
    canal: str,
    pedido_id: int | None = None,
    vendedor_id: int | None = None,
    notas: str | None = None,
    fecha: datetime | None = None,
) -> Venta:
    """Crea la venta con sus totales ya calculados. No hace commit."""
    total = _redondear(sum((Decimal(str(l.subtotal)) for l in lineas), Decimal("0")))
    descuento = _redondear(sum((Decimal(str(l.descuento)) for l in lineas), Decimal("0")))
    base, impuesto = calcular_impuesto(total, PORCENTAJE_IVA)

    consecutivo = await _siguiente_consecutivo(sesion)

    venta = Venta(
        numero=f"{PREFIJO}-{consecutivo:06d}",
        consecutivo=consecutivo,
        pedido_id=pedido_id,
        cliente_id=cliente_id,
        vendedor_id=vendedor_id,
        canal=canal,
        subtotal=base,
        descuento=descuento,
        impuesto=impuesto,
        total=total,
        estado="completada",
        notas=notas,
        detalle=lineas,
    )
    if fecha is not None:
        venta.fecha = fecha

    sesion.add(venta)
    return venta


async def registrar_desde_pedido(sesion: AsyncSession, pedido: Pedido) -> Venta:
    """Deja registrada la venta del pedido que se acaba de pagar.

    No hace commit: se llama desde el cobro para que el pago, la factura y la
    venta entren en la base todos juntos o ninguno.
    """
    lineas = [
        DetalleVenta(
            tipo=item.tipo,
            referencia_id=item.referencia_id,
            nombre=item.nombre,
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            descuento=0,
            subtotal=_redondear(
                Decimal(str(item.precio_unitario)) * item.cantidad
            ),
        )
        for item in pedido.items
    ]

    return await _armar_venta(
        sesion,
        cliente_id=pedido.usuario_id,
        lineas=lineas,
        canal="web",
        pedido_id=pedido.id,
        notas=pedido.notas,
    )


async def registrar_manual(
    sesion: AsyncSession, datos: VentaManualCrear, vendedor_id: int
) -> Venta:
    """Venta de mostrador. Los precios se releen del catálogo, nunca llegan
    desde el navegador."""
    cliente = await sesion.get(Usuario, datos.cliente_id)
    if cliente is None:
        raise RecursoNoEncontrado("un usuario", datos.cliente_id)
    if not cliente.activo:
        raise ConflictoDeNegocio("No se puede facturar a un usuario inactivo.")

    lineas: list[DetalleVenta] = []
    for item in datos.items:
        articulo = await sesion.get(MODELO_POR_TIPO[item.tipo], item.id)
        if articulo is None or articulo.estado != "activo":
            raise ArticuloNoDisponible(item.tipo, item.id)

        precio = Decimal(str(articulo.precio))
        bruto = _redondear(precio * item.cantidad)
        descuento = _redondear(Decimal(str(item.descuento)))

        if descuento > bruto:
            raise ConflictoDeNegocio(
                f"El descuento de «{articulo.nombre}» supera el valor de la línea."
            )

        lineas.append(
            DetalleVenta(
                tipo=item.tipo,
                referencia_id=item.id,
                nombre=articulo.nombre,
                cantidad=item.cantidad,
                precio_unitario=precio,
                descuento=descuento,
                subtotal=bruto - descuento,
            )
        )

    venta = await _armar_venta(
        sesion,
        cliente_id=cliente.id,
        lineas=lineas,
        canal="mostrador",
        vendedor_id=vendedor_id,
        notas=datos.notas,
    )

    try:
        await sesion.commit()
    except IntegrityError:
        await sesion.rollback()
        # Dos registros a la vez podrían pedir el mismo consecutivo; el índice
        # único lo impide y aquí se avisa en lugar de reventar.
        raise ConflictoDeNegocio(
            "No se pudo registrar la venta. Inténtalo de nuevo en un momento."
        )

    await sesion.refresh(venta)
    return venta


# ------------------------------- Consultas -------------------------------


def _entre_fechas(consulta: Select, desde: date | None, hasta: date | None) -> Select:
    """Acota por día completo: «hasta» incluye todo ese día, no solo su 00:00."""
    if desde is not None:
        consulta = consulta.where(Venta.fecha >= datetime.combine(desde, time.min))
    if hasta is not None:
        consulta = consulta.where(
            Venta.fecha < datetime.combine(hasta + timedelta(days=1), time.min)
        )
    return consulta


def _aplicar_filtros(
    consulta: Select,
    *,
    desde: date | None = None,
    hasta: date | None = None,
    cliente_id: int | None = None,
    estado: str | None = None,
    canal: str | None = None,
    producto_id: int | None = None,
    servicio_id: int | None = None,
    monto_minimo: float | None = None,
    monto_maximo: float | None = None,
    texto: str | None = None,
) -> Select:
    consulta = _entre_fechas(consulta, desde, hasta)

    if cliente_id is not None:
        consulta = consulta.where(Venta.cliente_id == cliente_id)
    if estado:
        consulta = consulta.where(Venta.estado == estado)
    if canal:
        consulta = consulta.where(Venta.canal == canal)
    if monto_minimo is not None:
        consulta = consulta.where(Venta.total >= monto_minimo)
    if monto_maximo is not None:
        consulta = consulta.where(Venta.total <= monto_maximo)

    # Buscar por artículo mira dentro del detalle, así que se usa un EXISTS en
    # lugar de un JOIN: con el JOIN, una venta con dos líneas saldría repetida.
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

    if texto:
        patron = f"%{texto.strip()}%"
        consulta = consulta.join(Usuario, Usuario.id == Venta.cliente_id).where(
            or_(
                Venta.numero.ilike(patron),
                Usuario.nombre.ilike(patron),
                Usuario.apellido.ilike(patron),
                Usuario.numero_documento.ilike(patron),
                Usuario.email.ilike(patron),
            )
        )

    return consulta


async def listar(
    sesion: AsyncSession,
    *,
    limite: int = 50,
    desplazamiento: int = 0,
    **filtros,
) -> tuple[list[Venta], int]:
    """Historial paginado. Devuelve la página y cuántas hay en total."""
    base = _aplicar_filtros(select(Venta), **filtros)

    total = await sesion.scalar(
        select(func.count()).select_from(base.subquery())
    )

    ventas = list(
        await sesion.scalars(
            base.order_by(Venta.fecha.desc(), Venta.id.desc())
            .limit(limite)
            .offset(desplazamiento)
        )
    )
    return ventas, total or 0


async def obtener(sesion: AsyncSession, venta_id: int) -> Venta:
    venta = await sesion.get(Venta, venta_id)
    if venta is None:
        raise RecursoNoEncontrado("una venta", venta_id)
    return venta


async def numero_de_factura(sesion: AsyncSession, venta: Venta) -> str | None:
    """La factura cuelga del pedido, así que las ventas de mostrador no tienen."""
    if venta.pedido_id is None:
        return None
    return await sesion.scalar(
        select(Factura.numero).where(Factura.pedido_id == venta.pedido_id)
    )


async def anular(sesion: AsyncSession, venta_id: int) -> Venta:
    """Marca la venta como anulada. No se borra: el histórico no se toca."""
    venta = await obtener(sesion, venta_id)

    if venta.estado == "anulada":
        raise ConflictoDeNegocio(f"La venta {venta.numero} ya estaba anulada.")

    venta.estado = "anulada"
    await sesion.commit()
    await sesion.refresh(venta)
    return venta


# ----------------------------- Reporte diario -----------------------------


async def reporte_diario(sesion: AsyncSession, dia: date) -> dict:
    """Las ventas de un día, ya resumidas para imprimir o exportar."""
    consulta = _entre_fechas(select(Venta), dia, dia).order_by(Venta.fecha, Venta.id)
    ventas = list(await sesion.scalars(consulta))

    lineas = []
    unidades = 0
    for venta in ventas:
        articulos = ", ".join(
            f"{d.nombre} x{d.cantidad}" for d in venta.detalle
        ) or "—"
        unidades_venta = sum(d.cantidad for d in venta.detalle)
        unidades += unidades_venta

        lineas.append(
            {
                "numero": venta.numero,
                "hora": venta.fecha.strftime("%H:%M"),
                "cliente": f"{venta.cliente.nombre} {venta.cliente.apellido}",
                "articulos": articulos,
                "unidades": unidades_venta,
                "total": float(venta.total),
                "estado": venta.estado,
            }
        )

    # Las anuladas salen en el listado, para que se vea que existieron, pero no
    # suman en los totales del día.
    vigentes = [v for v in ventas if v.estado != "anulada"]

    return {
        "fecha": dia,
        "generado_en": datetime.now(),
        "total_ventas": len(ventas),
        "unidades": unidades,
        "subtotal": float(sum(Decimal(str(v.subtotal)) for v in vigentes)),
        "descuento": float(sum(Decimal(str(v.descuento)) for v in vigentes)),
        "impuesto": float(sum(Decimal(str(v.impuesto)) for v in vigentes)),
        "total": float(sum(Decimal(str(v.total)) for v in vigentes)),
        "lineas": lineas,
    }
