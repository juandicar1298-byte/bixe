"""Adapta la cadena de conexión de PostgreSQL al driver que usa el proyecto.

Neon, Render y compañía entregan la cadena pensando en `psql` y en `psycopg`.
Aquí se usa **asyncpg**, que quiere otro prefijo y no entiende varios de los
parámetros que esas cadenas traen: si se le cuela uno, no falla con un aviso
claro sino con un TypeError sobre un argumento desconocido.

Las tres correcciones son siempre las mismas, así que se hacen aquí en vez de
pedirle a quien despliega que se acuerde de hacerlas a mano.
"""

from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

# Lo único que asyncpg acepta en la parte de la consulta. Todo lo demás es de
# psql o de libpq y hay que quitarlo.
PARAMETROS_VALIDOS = {"ssl"}


def adaptar_a_asyncpg(url: str, avisar=None) -> str:
    """Devuelve la cadena lista para SQLAlchemy + asyncpg.

    `avisar` recibe un texto por cada cambio hecho; sirve para que los guiones
    cuenten qué tocaron sin tener que imprimir la cadena entera, que lleva la
    contraseña dentro.
    """
    def contar(mensaje: str) -> None:
        if avisar is not None:
            avisar(f"  ({mensaje})")

    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        contar("ajustado a postgresql+asyncpg://")

    if not url.startswith("postgresql+asyncpg://"):
        return url

    partes = urlsplit(url)
    consulta = dict(parse_qsl(partes.query, keep_blank_values=True))

    # sslmode es el nombre de libpq; en asyncpg se llama ssl.
    if "sslmode" in consulta:
        consulta["ssl"] = consulta.pop("sslmode")
        contar("ajustado sslmode= a ssl=")

    sobran = sorted(set(consulta) - PARAMETROS_VALIDOS)
    for parametro in sobran:
        consulta.pop(parametro)
    if sobran:
        contar(f"quitado {', '.join(sobran)}, que asyncpg no entiende")

    return urlunsplit(
        (partes.scheme, partes.netloc, partes.path, urlencode(consulta), partes.fragment)
    )
