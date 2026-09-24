"""Pruebas de defensa contra inyección SQL.

La inyección SQL ocurre cuando lo que escribe el usuario deja de tratarse
como un dato y pasa a formar parte de la instrucción que ejecuta la base de
datos. El ejemplo de manual es el login:

    "SELECT * FROM usuarios WHERE email = '" + email + "' AND clave = '" + clave + "'"

Si alguien escribe  ' OR '1'='1' --  en el correo, la instrucción que llega a
la base queda así:

    SELECT * FROM usuarios WHERE email = '' OR '1'='1' --' AND clave = '...'

El  --  comenta el resto, el  OR '1'='1'  siempre es cierto y la consulta
devuelve el primer usuario de la tabla: sesión abierta sin saber ninguna
contraseña.

BIXE lo evita por dos caminos, y aquí se comprueban los dos:

FORMA 1 — Login escalonado (se reparte en dos pasos)
    La aplicación nunca pregunta «¿hay alguien con este correo Y esta
    contraseña?». Primero busca al usuario por el correo y después compara el
    hash de la contraseña en Python, fuera de la base de datos. La contraseña
    no aparece en ninguna consulta, así que por ese campo no hay nada que
    inyectar. El formulario de React refleja lo mismo en dos pantallas.

FORMA 2 — Consulta preparada (prepared statement)
    Lo que escribe el usuario viaja aparte de la instrucción, como parámetro.
    La base recibe  WHERE email = ?  y el valor por separado, de modo que
    nunca lo interpreta como código. SQLAlchemy lo hace siempre: en todo el
    proyecto no se concatena ni una sola consulta a mano.
"""

from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.dialects import mysql, postgresql, sqlite

from app.models.bixe import Usuario

RAIZ = Path(__file__).resolve().parent.parent

# Las cargas clásicas, las que aparecen en cualquier manual de OWASP.
CARGAS_CLASICAS = [
    "' OR '1'='1",
    "' OR 1=1 --",
    "admin' --",
    "admin'/*",
    "') OR ('1'='1",
    "' UNION SELECT 1,2,3 --",
    "'; DROP TABLE usuarios; --",
    "' OR ''='",
]


# --------------------------------------------------------------------------
# FORMA 2 — la consulta viaja preparada
# --------------------------------------------------------------------------


@pytest.mark.parametrize("dialecto", [sqlite.dialect(), mysql.dialect(), postgresql.dialect()])
def test_la_consulta_del_login_viaja_parametrizada(dialecto):
    """El valor no se pega en la instrucción: va aparte, como parámetro.

    Es exactamente el  WHERE email = ?  del que habla la teoría. Se comprueba
    contra los tres motores porque el proyecto corre sobre MySQL en local y
    sobre PostgreSQL en la nube.
    """
    carga = "' OR '1'='1"

    consulta = select(Usuario).where(Usuario.email == carga)
    compilada = consulta.compile(dialect=dialecto)

    instruccion = str(compilada)
    valores = list(compilada.params.values())

    # La instrucción lleva un hueco, no el texto del atacante.
    assert "OR" not in instruccion.upper().split("WHERE")[1]
    assert carga not in instruccion

    # Y el texto del atacante está donde tiene que estar: entre los valores.
    assert carga in valores


async def test_el_texto_del_atacante_se_guarda_tal_cual_no_se_ejecuta(cliente, como_admin):
    """Un nombre con SQL dentro se guarda como texto y la tabla sigue viva.

    Es la demostración práctica de la consulta preparada: si el valor se
    interpretara como código, este producto no existiría y la tabla estaría
    borrada.
    """
    nombre_envenenado = "'; DROP TABLE productos; --"

    creado = await cliente.post(
        "/api/productos",
        headers=como_admin,
        json={"nombre": nombre_envenenado, "categoria": "moto", "precio": 1000000},
    )
    assert creado.status_code == 201, creado.text

    # La tabla sigue existiendo y el valor se guardó literal, como cualquier
    # otro texto.
    listado = await cliente.get("/api/productos")
    assert listado.status_code == 200
    assert [p["nombre"] for p in listado.json()] == [nombre_envenenado]


async def test_buscar_con_sql_dentro_no_rompe_ni_borra_nada(cliente, como_admin):
    """El buscador usa ilike() del ORM, así que también va parametrizado."""
    await cliente.post(
        "/api/productos",
        headers=como_admin,
        json={"nombre": "Moto Deportiva 650", "categoria": "moto", "precio": 45000000},
    )

    for carga in CARGAS_CLASICAS:
        respuesta = await cliente.get("/api/productos", params={"buscar": carga})
        # Ni error 500 ni resultados: es una búsqueda de texto que no encuentra
        # nada, que es justo lo que debe pasar.
        assert respuesta.status_code in (200, 422), f"{carga} -> {respuesta.text}"
        if respuesta.status_code == 200:
            assert respuesta.json() == []

    # Después de intentarlo ocho veces, el producto sigue ahí.
    quedan = await cliente.get("/api/productos")
    assert len(quedan.json()) == 1


# --------------------------------------------------------------------------
# FORMA 1 — login escalonado
# --------------------------------------------------------------------------


@pytest.mark.parametrize("carga", CARGAS_CLASICAS)
async def test_ninguna_carga_clasica_abre_sesion(cliente, carga):
    """Ninguna de las cargas de manual devuelve un token."""
    respuesta = await cliente.post(
        "/api/auth/login", json={"email": carga, "contrasena": carga[:20]}
    )

    # 422 si Pydantic lo rechaza por no ser un correo (la primera barrera),
    # 401 si llega a consultarse y no existe. Nunca 200.
    assert respuesta.status_code in (401, 422), respuesta.text
    assert "acceso" not in respuesta.json()


@pytest.mark.parametrize("carga", CARGAS_CLASICAS)
async def test_la_carga_en_la_contrasena_tampoco_abre_sesion(cliente, carga):
    """Con un correo que sí existe, la inyección va en la contraseña."""
    respuesta = await cliente.post(
        "/api/auth/login",
        json={"email": "admin@pruebas.com", "contrasena": carga[:20]},
    )

    assert respuesta.status_code in (401, 422), respuesta.text
    assert "acceso" not in respuesta.json()


async def test_la_contrasena_no_entra_en_ninguna_consulta():
    """El paso 2 del login no toca la base de datos.

    Es lo que hace imposible inyectar por el campo de la contraseña: no hay
    ninguna consulta donde meterla. Se comprueba leyendo el código del CRUD de
    usuarios, que es el único sitio desde donde el login consulta.
    """
    codigo = (RAIZ / "app" / "crud" / "usuarios.py").read_text(encoding="utf-8")

    # La función que usa el login busca solo por correo.
    assert "select(Usuario).where(Usuario.email == email)" in codigo

    # Y en ninguna consulta del módulo aparece la contraseña como filtro.
    assert "contrasena_hash ==" not in codigo
    assert "where(Usuario.contrasena" not in codigo


async def test_el_mensaje_de_error_no_revela_si_el_correo_existe(cliente):
    """Correo inexistente y contraseña mala dan el mismo error.

    Si fueran distintos, se podría averiguar qué correos están registrados
    probando uno por uno.
    """
    inexistente = await cliente.post(
        "/api/auth/login",
        json={"email": "nadie@pruebas.com", "contrasena": "LoQueSea1*"},
    )
    existente = await cliente.post(
        "/api/auth/login",
        json={"email": "admin@pruebas.com", "contrasena": "LoQueSea1*"},
    )

    assert inexistente.status_code == existente.status_code == 401
    assert inexistente.json()["mensaje"] == existente.json()["mensaje"]


# --------------------------------------------------------------------------
# Que no se cuele SQL a mano en el futuro
# --------------------------------------------------------------------------


def test_no_hay_ni_una_consulta_escrita_a_mano_en_toda_la_aplicacion():
    """Guardia permanente: si alguien concatena SQL, esta prueba falla.

    Las dos formas anteriores protegen el código que hay hoy. Esta protege el
    de mañana, que es donde suelen entrar los fallos.
    """
    sospechosos = {
        "text(": "SQL en texto plano; usa select() del ORM",
        "execute(f": "consulta construida con f-string",
        'execute("': "consulta escrita a mano",
        "executescript": "varias instrucciones en una sola llamada",
    }

    hallazgos = []
    for archivo in (RAIZ / "app").rglob("*.py"):
        for numero, linea in enumerate(
            archivo.read_text(encoding="utf-8").splitlines(), 1
        ):
            desnuda = linea.strip()
            if desnuda.startswith("#"):
                continue
            for patron, motivo in sospechosos.items():
                if patron in desnuda:
                    relativa = archivo.relative_to(RAIZ)
                    hallazgos.append(f"{relativa}:{numero} — {motivo}: {desnuda[:70]}")

    assert not hallazgos, "SQL sin parametrizar:\n" + "\n".join(hallazgos)
