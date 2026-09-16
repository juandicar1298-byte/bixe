from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.errores import (
    ConflictoDeNegocio,
    PedidoYaPagado,
    PermisoDenegado,
    RecursoNoEncontrado,
)
from app.crud import ventas as crud_ventas
from app.models.bixe import Factura, Pago, Pedido
from app.services import pasarela
from app.services.factura import calcular_impuesto

PORCENTAJE_IVA = Decimal("19")
PREFIJO_FACTURA = "BIXE"


async def _siguiente_consecutivo(sesion: AsyncSession) -> int:
    ultimo = await sesion.scalar(select(func.max(Factura.consecutivo)))
    return (ultimo or 0) + 1


async def obtener_pago(sesion: AsyncSession, pedido_id: int) -> Pago | None:
    """El último intento de cobro del pedido."""
    return await sesion.scalar(
        select(Pago).where(Pago.pedido_id == pedido_id).order_by(Pago.id.desc()).limit(1)
    )


async def obtener_factura(sesion: AsyncSession, pedido_id: int) -> Factura | None:
    return await sesion.scalar(select(Factura).where(Factura.pedido_id == pedido_id))


async def obtener_factura_o_fallar(sesion: AsyncSession, pedido_id: int) -> Factura:
    factura = await obtener_factura(sesion, pedido_id)
    if factura is None:
        raise RecursoNoEncontrado("una factura para el pedido", pedido_id)
    return factura


async def cobrar(
    sesion: AsyncSession, pedido: Pedido, datos: dict, solicitante_id: int
) -> tuple[Pago, Factura | None]:
    """Cobra el pedido y, si la pasarela aprueba, emite la factura.

    Pago, factura y actualización del pedido ocurren en la misma transacción:
    o queda todo registrado, o no queda nada a medias.
    """
    if pedido.usuario_id != solicitante_id:
        raise PermisoDenegado("Este pedido pertenece a otro cliente.")

    if pedido.estado_pago == "pagado":
        raise PedidoYaPagado(pedido.id)

    if pedido.estado == "cancelado":
        raise ConflictoDeNegocio("No se puede pagar un pedido cancelado.")

    # El monto es el del pedido, no uno que venga del navegador.
    monto = Decimal(str(pedido.total))

    resultado = pasarela.procesar(datos)

    pago = Pago(
        pedido_id=pedido.id,
        referencia=resultado.referencia,
        metodo=resultado.metodo,
        marca=resultado.entidad,
        ultimos_cuatro=resultado.ultimos_cuatro,
        titular=resultado.titular,
        monto=monto,
        estado="aprobado" if resultado.aprobado else "rechazado",
        motivo_rechazo=resultado.motivo,
    )
    sesion.add(pago)

    factura = None

    if resultado.aprobado:
        base, iva = calcular_impuesto(monto, PORCENTAJE_IVA)
        consecutivo = await _siguiente_consecutivo(sesion)

        factura = Factura(
            numero=f"{PREFIJO_FACTURA}-{consecutivo:06d}",
            consecutivo=consecutivo,
            pedido_id=pedido.id,
            base_gravable=base,
            porcentaje_iva=PORCENTAJE_IVA,
            valor_iva=iva,
            total=monto,
        )
        sesion.add(factura)

        # La venta entra en el mismo commit que el pago y la factura: si algo
        # falla, no queda un cobro registrado sin su venta correspondiente.
        await crud_ventas.registrar_desde_pedido(sesion, pedido)

        pedido.estado_pago = "pagado"
        # Un pedido pagado deja de estar «pendiente» para el taller.
        if pedido.estado == "pendiente":
            pedido.estado = "confirmado"
    else:
        pedido.estado_pago = "rechazado"

    try:
        await sesion.commit()
    except IntegrityError:
        await sesion.rollback()
        # Dos intentos simultáneos podrían pedir el mismo consecutivo; el
        # índice único lo impide y aquí se avisa en lugar de romper.
        raise ConflictoDeNegocio(
            "No se pudo registrar el pago. Inténtalo de nuevo en un momento."
        )

    await sesion.refresh(pago)
    if factura is not None:
        await sesion.refresh(factura)

    return pago, factura
