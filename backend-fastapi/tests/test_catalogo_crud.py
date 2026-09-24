"""CRUD completo del catálogo y validación de los esquemas Pydantic.

Cubre los criterios 1, 2 y 3 de la matriz: diseño REST (recurso, verbo, ruta y
código de respuesta), esquemas de entrada y salida separados, y persistencia
real contra una base de datos.
"""

import pytest

MOTO = {
    "nombre": "Moto Deportiva 650",
    "categoria": "moto",
    "cilindraje": "650",
    "potencia": "76 HP",
    "precio": 45000000,
    "descripcion": "Alto cilindraje, pura adrenalina.",
}

SERVICIO = {
    "nombre": "Mantenimiento preventivo",
    "categoria": "mantenimiento",
    "descripcion": "Revisión de los 20 puntos críticos.",
    "duracion_min": 90,
    "precio": 180000,
}


# ------------------------------ Ciclo completo ------------------------------


async def test_ciclo_de_vida_completo_de_un_producto(cliente, como_admin):
    """Crear, listar, consultar, actualizar y eliminar."""
    # POST /api/productos -> 201
    creado = await cliente.post("/api/productos", headers=como_admin, json=MOTO)
    assert creado.status_code == 201, creado.text
    producto = creado.json()
    identificador = producto["id"]
    assert producto["nombre"] == MOTO["nombre"]
    assert producto["estado"] == "activo"

    # GET /api/productos -> 200, lo devuelve en la lista
    listado = await cliente.get("/api/productos")
    assert listado.status_code == 200
    assert [p["id"] for p in listado.json()] == [identificador]

    # GET /api/productos/{id} -> 200
    consulta = await cliente.get(f"/api/productos/{identificador}")
    assert consulta.status_code == 200
    assert consulta.json()["cilindraje"] == "650"

    # PATCH /api/productos/{id} -> 200, solo toca lo que se envía
    editado = await cliente.patch(
        f"/api/productos/{identificador}",
        headers=como_admin,
        json={"precio": 42000000},
    )
    assert editado.status_code == 200
    assert editado.json()["precio"] == 42000000
    assert editado.json()["nombre"] == MOTO["nombre"]  # lo demás sigue igual

    # DELETE /api/productos/{id}
    borrado = await cliente.delete(
        f"/api/productos/{identificador}", headers=como_admin
    )
    assert borrado.status_code in (200, 204)

    # Y ya no está
    assert (await cliente.get(f"/api/productos/{identificador}")).status_code == 404


async def test_ciclo_de_vida_completo_de_un_servicio(cliente, como_admin):
    creado = await cliente.post("/api/servicios", headers=como_admin, json=SERVICIO)
    assert creado.status_code == 201, creado.text
    identificador = creado.json()["id"]

    assert (await cliente.get("/api/servicios")).json()[0]["id"] == identificador

    editado = await cliente.patch(
        f"/api/servicios/{identificador}",
        headers=como_admin,
        json={"duracion_min": 120},
    )
    assert editado.status_code == 200
    assert editado.json()["duracion_min"] == 120

    borrado = await cliente.delete(
        f"/api/servicios/{identificador}", headers=como_admin
    )
    assert borrado.status_code in (200, 204)


async def test_pedir_algo_que_no_existe_da_404(cliente):
    respuesta = await cliente.get("/api/productos/9999")

    assert respuesta.status_code == 404
    cuerpo = respuesta.json()
    assert cuerpo["codigo"] == "recurso_no_encontrado"
    assert cuerpo["ruta"] == "/api/productos/9999"


# ------------------------- Validación de los esquemas -------------------------


@pytest.mark.parametrize(
    "cambio,motivo",
    [
        ({"nombre": "A"}, "nombre de un solo carácter"),
        ({"categoria": "camion"}, "categoría fuera de moto|auto"),
        ({"precio": -1}, "precio negativo"),
        ({"precio": "gratis"}, "precio que no es un número"),
        ({"nombre": "x" * 61}, "nombre más largo que el límite"),
    ],
)
async def test_el_esquema_rechaza_los_datos_invalidos(
    cliente, como_admin, cambio, motivo
):
    respuesta = await cliente.post(
        "/api/productos", headers=como_admin, json={**MOTO, **cambio}
    )

    assert respuesta.status_code == 422, f"aceptó un {motivo}"
    assert respuesta.json()["detalles"], "el 422 no explica qué campo falló"


async def test_los_campos_tecnicos_admiten_numeros(cliente, como_admin):
    """650 y «650» valen lo mismo: el esquema lo convierte."""
    respuesta = await cliente.post(
        "/api/productos", headers=como_admin, json={**MOTO, "cilindraje": 650}
    )

    assert respuesta.status_code == 201
    assert respuesta.json()["cilindraje"] == "650"


async def test_el_nombre_se_limpia_de_espacios_sobrantes(cliente, como_admin):
    respuesta = await cliente.post(
        "/api/productos",
        headers=como_admin,
        json={**MOTO, "nombre": "  Moto   Deportiva   650  "},
    )

    assert respuesta.json()["nombre"] == "Moto Deportiva 650"


# ------------------------- Filtros y parámetros de consulta -------------------------


async def test_los_filtros_de_consulta_funcionan(cliente, como_admin):
    await cliente.post("/api/productos", headers=como_admin, json=MOTO)
    await cliente.post(
        "/api/productos",
        headers=como_admin,
        json={**MOTO, "nombre": "Auto Familiar", "categoria": "auto", "precio": 90000000},
    )

    solo_motos = await cliente.get("/api/productos", params={"categoria": "moto"})
    assert [p["categoria"] for p in solo_motos.json()] == ["moto"]

    baratos = await cliente.get("/api/productos", params={"precio_max": 50000000})
    assert len(baratos.json()) == 1

    buscados = await cliente.get("/api/productos", params={"buscar": "familiar"})
    assert buscados.json()[0]["nombre"] == "Auto Familiar"


@pytest.mark.parametrize(
    "parametros",
    [
        {"categoria": "camion"},   # fuera del Literal
        {"precio_max": -5},        # ge=0
        {"buscar": "x"},           # min_length=2
        {"limite": 0},             # ge=1
        {"limite": 500},           # le=100
        {"desplazamiento": -1},    # ge=0
    ],
)
async def test_los_parametros_de_consulta_se_validan(cliente, parametros):
    respuesta = await cliente.get("/api/productos", params=parametros)

    assert respuesta.status_code == 422


async def test_la_paginacion_reparte_los_resultados(cliente, como_admin):
    for numero in range(5):
        await cliente.post(
            "/api/productos",
            headers=como_admin,
            json={**MOTO, "nombre": f"Moto número {numero}"},
        )

    primera = await cliente.get("/api/productos", params={"limite": 2})
    segunda = await cliente.get(
        "/api/productos", params={"limite": 2, "desplazamiento": 2}
    )

    assert len(primera.json()) == 2
    assert len(segunda.json()) == 2
    assert {p["id"] for p in primera.json()} & {p["id"] for p in segunda.json()} == set()


# ------------------------------ Persistencia ------------------------------


async def test_lo_creado_sobrevive_a_una_peticion_nueva(cliente, como_admin):
    """No es un CRUD en memoria: el dato viaja a la base y vuelve de ella."""
    creado = await cliente.post("/api/productos", headers=como_admin, json=MOTO)
    identificador = creado.json()["id"]

    # Petición independiente, con su propia sesión de base de datos.
    recuperado = await cliente.get(f"/api/productos/{identificador}")

    assert recuperado.status_code == 200
    assert recuperado.json()["fecha_creacion"], "no se guardó la marca de tiempo"
