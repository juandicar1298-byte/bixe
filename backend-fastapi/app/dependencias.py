from typing import Annotated

import jwt
from fastapi import Depends, Path, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base_datos import obtener_sesion
from app.core.seguridad import decodificar_token
from app.errores import NoAutenticado, PermisoDenegado, RecursoNoEncontrado
from app.models.bixe import Pedido, Producto, Servicio, Usuario

SesionDep = Annotated[AsyncSession, Depends(obtener_sesion)]

ROL_ADMINISTRADOR = 1
ROL_EMPLEADO = 2
ROL_CLIENTE = 3


class Paginacion:
    """Parámetros comunes a todos los listados. Se reutiliza en cada router."""

    def __init__(
        self,
        limite: Annotated[int, Query(ge=1, le=100, description="Cuántos traer.")] = 50,
        desplazamiento: Annotated[int, Query(ge=0, description="Cuántos saltar.")] = 0,
    ):
        self.limite = limite
        self.desplazamiento = desplazamiento


PaginacionDep = Annotated[Paginacion, Depends()]


# tokenUrl no se usa en el código: le indica a /docs dónde pedir el token,
# lo que activa el botón «Authorize» de Swagger UI.
#
# auto_error=False para que la falta de token no dispare el HTTPException
# propio de FastAPI: así el 401 sale con el mismo formato que el resto de
# errores de la API en lugar de con {"detail": "Not authenticated"}.
esquema_oauth2 = OAuth2PasswordBearer(tokenUrl="api/auth/token", auto_error=False)


async def usuario_actual(
    sesion: SesionDep,
    token: Annotated[str | None, Depends(esquema_oauth2)],
) -> Usuario:
    """Valida el token y devuelve el usuario al que pertenece.

    A diferencia de un simple jwt.verify, aquí se relee el usuario de la base
    de datos: si el administrador lo desactivó o le cambió el rol, el cambio
    tiene efecto en la siguiente petición y no cuando expire el token.
    """
    if not token:
        raise NoAutenticado("Falta la cabecera Authorization con el token.")

    try:
        carga = decodificar_token(token)
    except jwt.ExpiredSignatureError:
        raise NoAutenticado("La sesión expiró. Inicia sesión de nuevo.")
    except jwt.InvalidTokenError:
        raise NoAutenticado("El token no es válido.")

    identificador = carga.get("sub")
    if identificador is None:
        raise NoAutenticado("El token no identifica a ningún usuario.")

    try:
        usuario_id = int(identificador)
    except (TypeError, ValueError):
        raise NoAutenticado("El token no identifica a un usuario válido.")

    usuario = await sesion.get(Usuario, usuario_id)
    if usuario is None:
        raise NoAutenticado("La cuenta ya no existe.")
    if not usuario.activo:
        raise NoAutenticado("Tu cuenta está inactiva. Contacta al administrador.")

    return usuario


UsuarioActual = Annotated[Usuario, Depends(usuario_actual)]


async def usuario_opcional(
    sesion: SesionDep,
    token: Annotated[str | None, Depends(esquema_oauth2)],
) -> Usuario | None:
    """El usuario si hay sesión válida, y None si no la hay.

    Para lo que funciona con y sin cuenta: radicar una PQR o hablar con el
    chatbot. Un token caducado o roto se trata como si no hubiera ninguno; no
    tiene sentido cerrarle la puerta a un visitante por eso.
    """
    if not token:
        return None
    try:
        return await usuario_actual(sesion, token)
    except NoAutenticado:
        return None


UsuarioOpcional = Annotated[Usuario | None, Depends(usuario_opcional)]


class ExigirPermiso:
    """Autorización basada en la tabla «permisos», no en ids de rol quemados.

    Se apoya en roles_permisos, de modo que cambiar quién puede hacer qué es
    cuestión de tocar la base de datos y no el código.
    """

    def __init__(self, permiso: str):
        self.permiso = permiso

    async def __call__(self, usuario: UsuarioActual) -> Usuario:
        concedidos = {p.nombre for p in usuario.rol.permisos}
        if self.permiso not in concedidos:
            raise PermisoDenegado(
                f"Tu rol ({usuario.rol.nombre}) no tiene el permiso «{self.permiso}»."
            )
        return usuario


class ExigirRol:
    """Autorización por rol, para lo que no está cubierto por un permiso."""

    def __init__(self, *roles: int):
        self.roles = roles

    async def __call__(self, usuario: UsuarioActual) -> Usuario:
        if usuario.rol_id not in self.roles:
            raise PermisoDenegado(
                "Esta operación está reservada a otro rol de la aplicación."
            )
        return usuario


# Puertas de acceso listas para usar en los routers
GestorDeUsuarios = Annotated[Usuario, Depends(ExigirPermiso("gestionar_usuarios"))]
GestorDeProductos = Annotated[Usuario, Depends(ExigirPermiso("gestionar_productos"))]
GestorDeServicios = Annotated[Usuario, Depends(ExigirPermiso("gestionar_servicios"))]

# Las bajas definitivas quedan reservadas al administrador: no existe un
# permiso propio para «eliminar», así que aquí sí se decide por rol.
Administrador = Annotated[Usuario, Depends(ExigirRol(ROL_ADMINISTRADOR))]
Personal = Annotated[Usuario, Depends(ExigirRol(ROL_ADMINISTRADOR, ROL_EMPLEADO))]


async def resolver_usuario(
    sesion: SesionDep, usuario_id: Annotated[int, Path(ge=1)]
) -> Usuario:
    usuario = await sesion.get(Usuario, usuario_id)
    if usuario is None:
        raise RecursoNoEncontrado("un usuario", usuario_id)
    return usuario


async def resolver_producto(
    sesion: SesionDep, producto_id: Annotated[int, Path(ge=1)]
) -> Producto:
    producto = await sesion.get(Producto, producto_id)
    if producto is None:
        raise RecursoNoEncontrado("un producto", producto_id)
    return producto


async def resolver_servicio(
    sesion: SesionDep, servicio_id: Annotated[int, Path(ge=1)]
) -> Servicio:
    servicio = await sesion.get(Servicio, servicio_id)
    if servicio is None:
        raise RecursoNoEncontrado("un servicio", servicio_id)
    return servicio


async def resolver_pedido(
    sesion: SesionDep, pedido_id: Annotated[int, Path(ge=1)]
) -> Pedido:
    pedido = await sesion.get(Pedido, pedido_id)
    if pedido is None:
        raise RecursoNoEncontrado("un pedido", pedido_id)
    return pedido


UsuarioExistente = Annotated[Usuario, Depends(resolver_usuario)]
ProductoExistente = Annotated[Producto, Depends(resolver_producto)]
ServicioExistente = Annotated[Servicio, Depends(resolver_servicio)]
PedidoExistente = Annotated[Pedido, Depends(resolver_pedido)]
