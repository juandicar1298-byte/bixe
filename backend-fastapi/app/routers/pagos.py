from fastapi import APIRouter, status
from fastapi.responses import Response

from app.crud import pagos as crud_pagos
from app.crud import pedidos as crud_pedidos
from app.dependencias import PedidoExistente, SesionDep, UsuarioActual
from app.errores import RecursoNoEncontrado
from app.schemas.error import RESPUESTAS_API
from app.schemas.pago import (
    BancoDisponible,
    DatosDePago,
    FacturaRespuesta,
    MetodoDisponible,
    PagoRespuesta,
    ResultadoDelPago,
)
from app.services import pasarela
from app.services.factura import generar_pdf

router = APIRouter(prefix="/api", tags=["Pagos"], responses=RESPUESTAS_API)


@router.get(
    "/pagos/metodos",
    response_model=list[MetodoDisponible],
    summary="Medios de pago disponibles",
    description="Los que muestra la página de pago. PSE trae además la lista "
    "de bancos.",
)
async def listar_metodos():
    return [
        MetodoDisponible(
            codigo=codigo,
            nombre=nombre,
            bancos=(
                [
                    BancoDisponible(codigo=c, nombre=n)
                    for c, n in pasarela.BANCOS_PSE.items()
                ]
                if codigo == "pse"
                else []
            ),
        )
        for codigo, nombre in pasarela.METODOS.items()
    ]


@router.post(
    "/pedidos/{pedido_id}/pago",
    response_model=ResultadoDelPago,
    status_code=status.HTTP_201_CREATED,
    summary="Pagar un pedido",
    description=(
        "Cobra el pedido con la pasarela. Si aprueba, emite la factura y deja "
        "el pedido como pagado.\n\n"
        "**Es una pasarela simulada**: no mueve dinero real. Tarjetas de "
        "prueba — `4242 4242 4242 4242` aprueba, `4000 0000 0000 0002` la "
        "rechaza el banco y `4000 0000 0000 9995` no tiene fondos.\n\n"
        "Del número de tarjeta solo se guardan la marca y los cuatro últimos "
        "dígitos; el CVV no se almacena nunca."
    ),
)
async def pagar_pedido(
    sesion: SesionDep,
    pedido: PedidoExistente,
    usuario: UsuarioActual,
    datos: DatosDePago,
):
    pago, factura = await crud_pagos.cobrar(
        sesion, pedido, datos.model_dump(), solicitante_id=usuario.id
    )

    # Un rechazo no es un error del sistema: se responde 201 con el detalle
    # de por qué no pasó, igual que haría una pasarela de verdad.
    mensaje = (
        f"Pago aprobado. Se emitió la factura {factura.numero}."
        if pago.estado == "aprobado"
        else pago.motivo_rechazo or "El pago fue rechazado."
    )

    return ResultadoDelPago(
        aprobado=pago.estado == "aprobado",
        mensaje=mensaje,
        pago=PagoRespuesta.model_validate(pago),
        factura=FacturaRespuesta.model_validate(factura) if factura else None,
    )


@router.get(
    "/pedidos/{pedido_id}/pago",
    response_model=PagoRespuesta,
    summary="Consultar el pago de un pedido",
)
async def consultar_pago(
    sesion: SesionDep, pedido: PedidoExistente, usuario: UsuarioActual
):
    # Reutiliza la comprobación de propiedad: el personal ve cualquiera,
    # el cliente solo los suyos.
    await crud_pedidos.obtener_para(sesion, pedido.id, usuario)

    pago = await crud_pagos.obtener_pago(sesion, pedido.id)
    if pago is None:
        raise RecursoNoEncontrado("un pago para el pedido", pedido.id)
    return pago


@router.get(
    "/pedidos/{pedido_id}/factura",
    response_model=FacturaRespuesta,
    summary="Consultar la factura de un pedido",
)
async def consultar_factura(
    sesion: SesionDep, pedido: PedidoExistente, usuario: UsuarioActual
):
    await crud_pedidos.obtener_para(sesion, pedido.id, usuario)
    return await crud_pagos.obtener_factura_o_fallar(sesion, pedido.id)


@router.get(
    "/pedidos/{pedido_id}/factura.pdf",
    summary="Descargar la factura en PDF",
    description="Devuelve el PDF de la factura. Solo el dueño del pedido o el "
    "personal pueden descargarlo.",
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "La factura en PDF.",
        },
        **RESPUESTAS_API,
    },
)
async def descargar_factura(
    sesion: SesionDep, pedido: PedidoExistente, usuario: UsuarioActual
):
    completo = await crud_pedidos.obtener_para(sesion, pedido.id, usuario)
    factura = await crud_pagos.obtener_factura_o_fallar(sesion, pedido.id)
    pago = await crud_pagos.obtener_pago(sesion, pedido.id)

    pdf = generar_pdf(
        factura=factura,
        pedido=completo,
        cliente=completo.usuario,
        items=completo.items,
        pago=pago,
    )

    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{factura.numero}.pdf"',
            # El PDF lo pide el navegador con el token en la cabecera, así que
            # no debe quedarse cacheado en un equipo compartido.
            "Cache-Control": "no-store",
        },
    )
