"""Registro, inicio de sesión con JWT y control de acceso por rol.

Cubre el criterio 4 de la matriz: autenticación con JWT y protección de los
endpoints según el rol del usuario.
"""

import pytest

NUEVO_CLIENTE = {
    "nombre": "Ana",
    "apellido": "Ruiz",
    "tipo_documento": "CC",
    "numero_documento": "1036425871",
    "direccion": "Carrera 43A #1-50",
    "telefono": "3001234567",
    "email": "ana.ruiz@pruebas.com",
    "contrasena": "Bixe2026*",
    "confirmar_contrasena": "Bixe2026*",
}


# ------------------------------- Registro -------------------------------


async def test_registro_publico_crea_un_cliente(cliente):
    respuesta = await cliente.post("/api/usuarios/registro", json=NUEVO_CLIENTE)

    assert respuesta.status_code == 201, respuesta.text
    creado = respuesta.json()
    assert creado["email"] == NUEVO_CLIENTE["email"]
    # El rol lo decide el servidor: quien se registra por la web es cliente.
    assert creado["rol"]["id"] == 3


async def test_el_registro_no_deja_elegir_el_rol(cliente):
    """Mandar rol_id en el cuerpo no convierte a nadie en administrador."""
    respuesta = await cliente.post(
        "/api/usuarios/registro", json={**NUEVO_CLIENTE, "rol_id": 1}
    )

    assert respuesta.status_code == 201
    assert respuesta.json()["rol"]["id"] == 3


async def test_no_se_puede_repetir_el_correo(cliente):
    await cliente.post("/api/usuarios/registro", json=NUEVO_CLIENTE)
    repetido = await cliente.post("/api/usuarios/registro", json=NUEVO_CLIENTE)

    assert repetido.status_code == 409


@pytest.mark.parametrize(
    "contrasena,motivo",
    [
        ("corta1*", "menos de 8 caracteres"),
        ("sinmayuscula1*", "no tiene mayúscula"),
        ("SINMINUSCULA1*", "no tiene minúscula"),
        ("SinNumeros**", "no tiene dígitos"),
        ("SinSimbolo123", "no tiene símbolo"),
    ],
)
async def test_el_registro_exige_una_contrasena_segura(cliente, contrasena, motivo):
    respuesta = await cliente.post(
        "/api/usuarios/registro",
        json={
            **NUEVO_CLIENTE,
            "contrasena": contrasena,
            "confirmar_contrasena": contrasena,
        },
    )

    assert respuesta.status_code == 422, f"aceptó una contraseña que {motivo}"


async def test_las_contrasenas_tienen_que_coincidir(cliente):
    respuesta = await cliente.post(
        "/api/usuarios/registro",
        json={**NUEVO_CLIENTE, "confirmar_contrasena": "Otra2026*"},
    )

    assert respuesta.status_code == 422


# ----------------------------- Inicio de sesión -----------------------------


async def test_login_correcto_devuelve_token_y_usuario(cliente):
    respuesta = await cliente.post(
        "/api/auth/login",
        json={"email": "admin@pruebas.com", "contrasena": "Bixe2026*"},
    )

    assert respuesta.status_code == 200, respuesta.text
    datos = respuesta.json()
    assert datos["tipo"] == "bearer"
    assert datos["acceso"].count(".") == 2  # cabecera.carga.firma
    assert datos["usuario"]["rol"]["id"] == 1
    # La respuesta no puede llevar el hash de la contraseña.
    assert "contrasena" not in str(datos)


async def test_login_con_contrasena_equivocada(cliente):
    respuesta = await cliente.post(
        "/api/auth/login",
        json={"email": "admin@pruebas.com", "contrasena": "NoEsLaMia1*"},
    )

    assert respuesta.status_code == 401


async def test_una_cuenta_inactiva_no_puede_entrar(cliente, como_admin):
    """El administrador desactiva una cuenta y esa cuenta deja de entrar."""
    usuarios = await cliente.get("/api/usuarios", headers=como_admin)
    victima = next(
        u for u in usuarios.json() if u["email"] == "cliente@pruebas.com"
    )

    apagada = await cliente.patch(
        f"/api/usuarios/{victima['id']}/estado",
        headers=como_admin,
        json={"estado": "inactivo"},
    )
    assert apagada.status_code == 200, apagada.text

    respuesta = await cliente.post(
        "/api/auth/login",
        json={"email": "cliente@pruebas.com", "contrasena": "Bixe2026*"},
    )
    assert respuesta.status_code == 401


# ------------------------------ Uso del token ------------------------------


async def test_el_token_identifica_al_usuario(cliente, como_cliente):
    respuesta = await cliente.get("/api/auth/yo", headers=como_cliente)

    assert respuesta.status_code == 200
    assert respuesta.json()["email"] == "cliente@pruebas.com"


async def test_sin_token_no_se_entra(cliente):
    respuesta = await cliente.get("/api/auth/yo")

    assert respuesta.status_code == 401
    assert respuesta.json()["codigo"] == "no_autenticado"


@pytest.mark.parametrize(
    "cabecera",
    [
        {"Authorization": "Bearer esto-no-es-un-jwt"},
        {"Authorization": "Bearer a.b.c"},
        {"Authorization": "Basic YWRtaW46YWRtaW4="},
        {"Authorization": ""},
    ],
)
async def test_un_token_manipulado_no_sirve(cliente, cabecera):
    respuesta = await cliente.get("/api/auth/yo", headers=cabecera)

    assert respuesta.status_code == 401


# --------------------------- Autorización por rol ---------------------------


async def test_un_cliente_no_puede_crear_productos(cliente, como_cliente):
    respuesta = await cliente.post(
        "/api/productos",
        headers=como_cliente,
        json={"nombre": "Moto pirata", "categoria": "moto", "precio": 1},
    )

    assert respuesta.status_code == 403
    assert respuesta.json()["codigo"] == "permiso_denegado"


async def test_un_empleado_si_puede_crear_productos(cliente, como_empleado):
    """El empleado tiene «gestionar_productos» según la tabla roles_permisos."""
    respuesta = await cliente.post(
        "/api/productos",
        headers=como_empleado,
        json={"nombre": "Moto Deportiva 650", "categoria": "moto", "precio": 45000000},
    )

    assert respuesta.status_code == 201, respuesta.text


async def test_un_empleado_no_puede_gestionar_usuarios(cliente, como_empleado):
    """No tiene «gestionar_usuarios», así que la lista le queda vetada."""
    respuesta = await cliente.get("/api/usuarios", headers=como_empleado)

    assert respuesta.status_code == 403


# --------------------- Recuperación de contraseña ---------------------


async def test_pedir_recuperacion_responde_sin_esperar_al_correo(cliente):
    """El envío va en BackgroundTasks: la respuesta no espera a Gmail."""
    respuesta = await cliente.post(
        "/api/auth/recuperar", json={"email": "cliente@pruebas.com"}
    )

    assert respuesta.status_code == 202, respuesta.text
    assert "código de" in respuesta.json()["mensaje"]


async def test_la_recuperacion_no_dice_si_el_correo_existe(cliente):
    """Respuesta idéntica exista la cuenta o no: si no, se podrían enumerar."""
    existe = await cliente.post(
        "/api/auth/recuperar", json={"email": "cliente@pruebas.com"}
    )
    no_existe = await cliente.post(
        "/api/auth/recuperar", json={"email": "nadie@pruebas.com"}
    )

    assert existe.status_code == no_existe.status_code == 202
    assert existe.json() == no_existe.json()


async def test_el_codigo_nunca_viaja_en_la_respuesta_fuera_de_desarrollo(cliente):
    """En pruebas y en producción, el código solo llega por correo."""
    respuesta = await cliente.post(
        "/api/auth/recuperar", json={"email": "cliente@pruebas.com"}
    )

    cuerpo = respuesta.json()
    assert cuerpo["codigo_recuperacion"] is None
    assert cuerpo["enlace_recuperacion"] is None


async def test_un_codigo_inventado_no_sirve(cliente):
    await cliente.post("/api/auth/recuperar", json={"email": "cliente@pruebas.com"})

    respuesta = await cliente.post(
        "/api/auth/verificar-codigo",
        json={"email": "cliente@pruebas.com", "codigo": "000000"},
    )

    assert respuesta.status_code == 409
    assert respuesta.json()["codigo"] == "codigo_recuperacion_invalido"


# --------------------------- Bajas de usuarios ---------------------------


async def test_solo_el_administrador_borra_usuarios(cliente, como_empleado, como_admin):
    usuarios = await cliente.get("/api/usuarios", headers=como_admin)
    victima = next(u for u in usuarios.json() if u["email"] == "otro@pruebas.com")

    del_empleado = await cliente.delete(
        f"/api/usuarios/{victima['id']}", headers=como_empleado
    )
    assert del_empleado.status_code == 403

    del_admin = await cliente.delete(
        f"/api/usuarios/{victima['id']}", headers=como_admin
    )
    assert del_admin.status_code in (200, 204)
