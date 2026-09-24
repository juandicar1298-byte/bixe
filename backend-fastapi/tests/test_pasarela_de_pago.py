"""Pasarela de pago, facturación y protección de los datos de la tarjeta.

La pasarela es simulada: no mueve dinero ni habla con ningún banco. Lo que sí
es real es todo lo demás — la validación del número con el algoritmo de Luhn,
el control de vigencia, la emisión de la factura con el IVA discriminado y,
sobre todo, la regla de que el número completo de la tarjeta y el CVV no se
guardan en ninguna parte.
"""

import pytest

from app.services import pasarela

MOTO = {"nombre": "Moto Deportiva 650", "categoria": "moto", "precio": 45000000}

TARJETA_BUENA = {
    "metodo": "tarjeta",
    "numero": "4242 4242 4242 4242",
    "titular": "Laura Gomez",
    "mes": 12,
    "anio": 2035,
    "cvv": "123",
}


async def _pedido_de_prueba(cliente, como_admin, como_cliente) -> int:
    """Deja un pedido listo para pagar y devuelve su id."""
    producto = await cliente.post("/api/productos", headers=como_admin, json=MOTO)
    assert producto.status_code == 201, producto.text

    pedido = await cliente.post(
        "/api/pedidos",
        headers=como_cliente,
        json={"items": [{"tipo": "producto", "id": producto.json()["id"], "cantidad": 1}]},
    )
    assert pedido.status_code == 201, pedido.text
    return pedido.json()["id"]


# --------------------------- El algoritmo de Luhn ---------------------------


@pytest.mark.parametrize(
    "numero",
    ["4242424242424242", "5555555555554444", "4000000000000002"],
)
def test_las_tarjetas_de_prueba_pasan_luhn(numero):
    assert pasarela.pasa_luhn(numero)


@pytest.mark.parametrize(
    "numero",
    ["4242424242424243", "1234567812345678", "4000000000000001"],
)
def test_un_numero_inventado_no_pasa_luhn(numero):
    assert not pasarela.pasa_luhn(numero)


@pytest.mark.parametrize(
    "numero,marca",
    [
        ("4242424242424242", "visa"),
        ("5555555555554444", "mastercard"),
        ("378282246310005", "amex"),
        ("36227206271667", "diners"),
        ("9999999999999999", "desconocida"),
    ],
)
def test_la_marca_se_deduce_del_prefijo(numero, marca):
    assert pasarela.detectar_marca(numero) == marca


# ------------------------------ Camino feliz ------------------------------


async def test_un_pago_aprobado_emite_la_factura(cliente, como_admin, como_cliente):
    pedido_id = await _pedido_de_prueba(cliente, como_admin, como_cliente)

    respuesta = await cliente.post(
        f"/api/pedidos/{pedido_id}/pago", headers=como_cliente, json=TARJETA_BUENA
    )

    assert respuesta.status_code == 201, respuesta.text
    resultado = respuesta.json()
    assert resultado["aprobado"] is True
    assert resultado["pago"]["estado"] == "aprobado"
    assert resultado["factura"] is not None
    # Numeración consecutiva, como exige una factura.
    assert resultado["factura"]["numero"] == "BIXE-000001"


async def test_la_factura_discrimina_el_iva_sin_sumarlo(
    cliente, como_admin, como_cliente
):
    """Los precios del catálogo ya llevan IVA: la factura lo separa, no lo suma."""
    pedido_id = await _pedido_de_prueba(cliente, como_admin, como_cliente)

    pago = await cliente.post(
        f"/api/pedidos/{pedido_id}/pago", headers=como_cliente, json=TARJETA_BUENA
    )
    factura = pago.json()["factura"]

    assert factura["total"] == MOTO["precio"]
    assert round(factura["base_gravable"] + factura["valor_iva"], 2) == factura["total"]
    # 19 % contenido: base = total / 1,19
    assert round(factura["base_gravable"], 0) == round(MOTO["precio"] / 1.19, 0)


async def test_la_factura_se_descarga_en_pdf(cliente, como_admin, como_cliente):
    pedido_id = await _pedido_de_prueba(cliente, como_admin, como_cliente)
    await cliente.post(
        f"/api/pedidos/{pedido_id}/pago", headers=como_cliente, json=TARJETA_BUENA
    )

    pdf = await cliente.get(
        f"/api/pedidos/{pedido_id}/factura.pdf", headers=como_cliente
    )

    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
    assert pdf.content.startswith(b"%PDF")
    # No debe quedar cacheada en un equipo compartido.
    assert pdf.headers["cache-control"] == "no-store"


# --------------------- Protección de los datos sensibles ---------------------


async def test_del_numero_de_tarjeta_solo_quedan_cuatro_digitos(
    cliente, como_admin, como_cliente
):
    pedido_id = await _pedido_de_prueba(cliente, como_admin, como_cliente)

    respuesta = await cliente.post(
        f"/api/pedidos/{pedido_id}/pago", headers=como_cliente, json=TARJETA_BUENA
    )
    pago = respuesta.json()["pago"]

    assert pago["ultimos_cuatro"] == "4242"
    assert pago["marca"] == "visa"

    # Ni el número completo ni el CVV aparecen en la respuesta.
    texto = respuesta.text
    assert "4242424242424242" not in texto
    assert "123" not in texto.replace(pago["referencia"], "")


async def test_el_cvv_no_se_guarda_en_la_base_de_datos():
    """La tabla de pagos ni siquiera tiene una columna donde meterlo."""
    from app.models.bixe import Pago

    columnas = set(Pago.__table__.columns.keys())

    assert "cvv" not in columnas
    assert "numero" not in columnas
    assert columnas & {"marca", "ultimos_cuatro"} == {"marca", "ultimos_cuatro"}


def test_la_pasarela_no_devuelve_el_numero_completo():
    resultado = pasarela.procesar(
        {
            "metodo": "tarjeta",
            "numero": "4242424242424242",
            "titular": "LAURA GOMEZ",
            "mes": 12,
            "anio": 2035,
            "cvv": "123",
        }
    )

    assert resultado.aprobado
    assert resultado.ultimos_cuatro == "4242"
    assert "4242424242424242" not in str(resultado)


# ------------------------------- Rechazos -------------------------------


@pytest.mark.parametrize(
    "numero,motivo",
    [
        ("4000000000000002", "rechazada por el banco"),
        ("4000000000009995", "Fondos insuficientes"),
        ("4000000000000127", "código de seguridad"),
    ],
)
async def test_las_tarjetas_de_rechazo_no_emiten_factura(
    cliente, como_admin, como_cliente, numero, motivo
):
    pedido_id = await _pedido_de_prueba(cliente, como_admin, como_cliente)

    respuesta = await cliente.post(
        f"/api/pedidos/{pedido_id}/pago",
        headers=como_cliente,
        json={**TARJETA_BUENA, "numero": numero},
    )

    # Un rechazo no es un error del sistema: la pasarela respondió bien.
    assert respuesta.status_code == 201, respuesta.text
    resultado = respuesta.json()
    assert resultado["aprobado"] is False
    assert resultado["factura"] is None
    assert motivo.lower() in resultado["mensaje"].lower()


async def test_una_tarjeta_vencida_se_rechaza_antes_de_cobrar(
    cliente, como_admin, como_cliente
):
    pedido_id = await _pedido_de_prueba(cliente, como_admin, como_cliente)

    respuesta = await cliente.post(
        f"/api/pedidos/{pedido_id}/pago",
        headers=como_cliente,
        json={**TARJETA_BUENA, "mes": 1, "anio": 2020},
    )

    # La detiene el esquema de Pydantic, antes de llegar a la pasarela.
    assert respuesta.status_code == 422


# ------------------------------ Otros medios ------------------------------


async def test_pago_con_pse(cliente, como_admin, como_cliente):
    pedido_id = await _pedido_de_prueba(cliente, como_admin, como_cliente)

    respuesta = await cliente.post(
        f"/api/pedidos/{pedido_id}/pago",
        headers=como_cliente,
        json={
            "metodo": "pse",
            "banco": "bancolombia",
            "tipo_persona": "natural",
            "tipo_documento": "CC",
            "numero_documento": "1036425871",
        },
    )

    assert respuesta.json()["aprobado"] is True
    assert respuesta.json()["pago"]["marca"] == "bancolombia"


async def test_pago_con_nequi(cliente, como_admin, como_cliente):
    pedido_id = await _pedido_de_prueba(cliente, como_admin, como_cliente)

    respuesta = await cliente.post(
        f"/api/pedidos/{pedido_id}/pago",
        headers=como_cliente,
        json={"metodo": "nequi", "celular": "3109876543"},
    )

    assert respuesta.json()["aprobado"] is True
    assert respuesta.json()["pago"]["ultimos_cuatro"] == "6543"


async def test_un_medio_de_pago_inventado_se_rechaza(
    cliente, como_admin, como_cliente
):
    pedido_id = await _pedido_de_prueba(cliente, como_admin, como_cliente)

    respuesta = await cliente.post(
        f"/api/pedidos/{pedido_id}/pago",
        headers=como_cliente,
        json={"metodo": "criptomonedas", "numero": "1"},
    )

    assert respuesta.status_code == 422


async def test_los_metodos_disponibles_traen_los_bancos_de_pse(cliente):
    respuesta = await cliente.get("/api/pagos/metodos")

    assert respuesta.status_code == 200
    metodos = {m["codigo"]: m for m in respuesta.json()}
    assert set(metodos) == {"tarjeta", "pse", "nequi"}
    assert len(metodos["pse"]["bancos"]) >= 5
    assert metodos["tarjeta"]["bancos"] == []


# --------------------------- Quién puede pagar qué ---------------------------


async def test_un_cliente_no_puede_pagar_el_pedido_de_otro(
    cliente, como_admin, como_cliente, como_otro_cliente
):
    pedido_id = await _pedido_de_prueba(cliente, como_admin, como_cliente)

    respuesta = await cliente.get(
        f"/api/pedidos/{pedido_id}", headers=como_otro_cliente
    )

    assert respuesta.status_code == 403
    assert respuesta.json()["codigo"] == "permiso_denegado"
    # No se filtra nada del pedido ajeno: solo que no es suyo.
    assert "producto" not in respuesta.text.lower()


async def test_sin_sesion_no_se_paga(cliente, como_admin, como_cliente):
    pedido_id = await _pedido_de_prueba(cliente, como_admin, como_cliente)

    respuesta = await cliente.post(
        f"/api/pedidos/{pedido_id}/pago", json=TARJETA_BUENA
    )

    assert respuesta.status_code == 401
