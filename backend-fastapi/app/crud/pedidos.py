from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.errores import (
    ArticuloNoDisponible,
    ConflictoDeNegocio,
    PedidoNoCancelable,
    PermisoDenegado,
    RecursoNoEncontrado,
)
from app.models.bixe import Pedido, PedidoItem, Producto, Servicio, Usuario

# El tipo de artículo se resuelve con este mapa, nunca concatenando el texto
# que llega del navegador dentro de una consulta.
MODELO_POR_TIPO = {"producto": Producto, "servicio": Servicio}

ROLES_DEL_PERSONAL = (1, 2)  # Administrador y Empleado


async def crear(
    sesion: AsyncSession, usuario: Usuario, items: list[dict], notas: str | None
) -> Pedido:
    """Registra el pedido y su detalle en una única transacción.

    Los precios se releen de la base de datos: el carrito del navegador solo
    dice QUÉ se pide y CUÁNTO, nunca a qué precio.
    """
    pedido = Pedido(usuario_id=usuario.id, total=0, estado="pendiente", notas=notas)
    sesion.add(pedido)
    await sesion.flush()  # asigna el id del pedido sin cerrar la transacción

    total = Decimal("0")

    for item in items:
        modelo = MODELO_POR_TIPO[item["tipo"]]
        articulo = await sesion.get(modelo, item["id"])

        if articulo is None or articulo.estado != "activo":
            await sesion.rollback()
            raise ArticuloNoDisponible(item["tipo"], item["id"])

        cantidad = item["cantidad"]
        precio = Decimal(str(articulo.precio))
        total += precio * cantidad

        sesion.add(
            PedidoItem(
                pedido_id=pedido.id,
                tipo=item["tipo"],
                referencia_id=articulo.id,
                nombre=articulo.nombre,
                imagen_url=articulo.imagen_url,
                precio_unitario=precio,
                cantidad=cantidad,
            )
        )

    pedido.total = total

    try:
        await sesion.commit()
    except IntegrityError:
        await sesion.rollback()
        raise ConflictoDeNegocio("No se pudo registrar el pedido. Inténtalo de nuevo.")

    await sesion.refresh(pedido)
    return pedido


async def listar(
    sesion: AsyncSession,
    usuario_id: int | None = None,
    estado: str | None = None,
    limite: int = 50,
    desplazamiento: int = 0,
) -> list[Pedido]:
    consulta = select(Pedido)

    if usuario_id is not None:
        consulta = consulta.where(Pedido.usuario_id == usuario_id)
    if estado is not None:
        consulta = consulta.where(Pedido.estado == estado)

    consulta = (
        consulta.order_by(Pedido.fecha_creacion.desc())
        .offset(desplazamiento)
        .limit(limite)
    )
    resultado = await sesion.scalars(consulta)
    return list(resultado.unique())


async def obtener_o_fallar(sesion: AsyncSession, pedido_id: int) -> Pedido:
    pedido = await sesion.get(Pedido, pedido_id)
    if pedido is None:
        raise RecursoNoEncontrado("un pedido", pedido_id)
    return pedido


async def obtener_para(
    sesion: AsyncSession, pedido_id: int, solicitante: Usuario
) -> Pedido:
    """El personal ve cualquier pedido; un cliente solo los suyos."""
    pedido = await obtener_o_fallar(sesion, pedido_id)

    es_personal = solicitante.rol_id in ROLES_DEL_PERSONAL
    if not es_personal and pedido.usuario_id != solicitante.id:
        raise PermisoDenegado("Este pedido pertenece a otro cliente.")

    return pedido


async def cambiar_estado(sesion: AsyncSession, pedido: Pedido, estado: str) -> Pedido:
    pedido.estado = estado
    await sesion.commit()
    await sesion.refresh(pedido)
    return pedido


async def cancelar_como_cliente(
    sesion: AsyncSession, pedido: Pedido, cliente: Usuario
) -> Pedido:
    """Un cliente solo puede cancelar su propio pedido, y solo si sigue pendiente."""
    if pedido.usuario_id != cliente.id:
        raise PermisoDenegado("Este pedido pertenece a otro cliente.")
    if pedido.estado != "pendiente":
        raise PedidoNoCancelable(pedido.id, pedido.estado)

    return await cambiar_estado(sesion, pedido, "cancelado")


async def eliminar(sesion: AsyncSession, pedido: Pedido) -> None:
    # pedido_items se borra en cascada desde la relación del modelo.
    await sesion.delete(pedido)
    await sesion.commit()
