from typing import Annotated, Literal

from fastapi import APIRouter, Query, Response, status

from app.crud import usuarios as crud_usuarios
from app.dependencias import (
    Administrador,
    GestorDeUsuarios,
    PaginacionDep,
    SesionDep,
    UsuarioActual,
    UsuarioExistente,
)
from app.schemas.error import RESPUESTAS_API
from app.schemas.usuario import (
    CambiarContrasena,
    CambiarEstado,
    PerfilActualizar,
    RolResumen,
    UsuarioActualizar,
    UsuarioCrear,
    UsuarioRegistro,
    UsuarioRespuesta,
)

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"], responses=RESPUESTAS_API)

ROL_CLIENTE = 3


# --------------------------- Registro público ---------------------------


@router.post(
    "/registro",
    response_model=UsuarioRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar una cuenta de cliente",
    description="Alta pública desde el formulario de la web. El rol lo asigna "
    "el servidor: siempre Cliente.",
)
async def registrar_cliente(sesion: SesionDep, datos: UsuarioRegistro):
    # confirmar_contrasena solo sirve para validar; no se guarda.
    valores = datos.model_dump(exclude={"confirmar_contrasena"})
    return await crud_usuarios.crear(sesion, valores, rol_id=ROL_CLIENTE)


# ------------------------------ Perfil propio ------------------------------
# Van antes de "/{usuario_id}" para que «perfil» no se lea como un id.


@router.get("/perfil", response_model=UsuarioRespuesta, summary="Ver mi perfil")
async def mi_perfil(usuario: UsuarioActual):
    return usuario


@router.put("/perfil", response_model=UsuarioRespuesta, summary="Editar mi perfil")
async def editar_mi_perfil(
    sesion: SesionDep, usuario: UsuarioActual, datos: PerfilActualizar
):
    return await crud_usuarios.actualizar(sesion, usuario, datos.model_dump())


@router.put(
    "/perfil/contrasena",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cambiar mi contraseña",
)
async def cambiar_mi_contrasena(
    sesion: SesionDep, usuario: UsuarioActual, datos: CambiarContrasena
):
    await crud_usuarios.cambiar_contrasena(
        sesion, usuario, datos.contrasena_actual, datos.contrasena_nueva
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --------------------------- Gestión (personal) ---------------------------


@router.get(
    "/roles",
    response_model=list[RolResumen],
    summary="Listar los roles disponibles",
)
async def listar_roles(sesion: SesionDep, gestor: GestorDeUsuarios):
    return await crud_usuarios.listar_roles(sesion)


@router.get(
    "",
    response_model=list[UsuarioRespuesta],
    summary="Listar usuarios",
    description="Admite paginación y filtros por rol, estado y texto libre.",
)
async def listar_usuarios(
    sesion: SesionDep,
    gestor: GestorDeUsuarios,
    paginacion: PaginacionDep,
    rol_id: Annotated[int | None, Query(ge=1, le=3)] = None,
    estado: Annotated[Literal["activo", "inactivo"] | None, Query()] = None,
    buscar: Annotated[str | None, Query(min_length=2, max_length=80)] = None,
):
    return await crud_usuarios.listar(
        sesion,
        rol_id=rol_id,
        estado=estado,
        buscar=buscar,
        limite=paginacion.limite,
        desplazamiento=paginacion.desplazamiento,
    )


@router.post(
    "",
    response_model=UsuarioRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un usuario con cualquier rol",
)
async def crear_usuario(
    sesion: SesionDep, gestor: GestorDeUsuarios, datos: UsuarioCrear
):
    valores = datos.model_dump(exclude={"rol_id", "estado"})
    return await crud_usuarios.crear(
        sesion, valores, rol_id=datos.rol_id, estado=datos.estado
    )


@router.get(
    "/{usuario_id}", response_model=UsuarioRespuesta, summary="Consultar un usuario"
)
async def obtener_usuario(usuario: UsuarioExistente, gestor: GestorDeUsuarios):
    return usuario


@router.patch(
    "/{usuario_id}",
    response_model=UsuarioRespuesta,
    summary="Actualizar parcialmente un usuario",
    description="Solo se modifican los campos enviados; los omitidos no se tocan.",
)
async def actualizar_usuario(
    sesion: SesionDep,
    usuario: UsuarioExistente,
    gestor: GestorDeUsuarios,
    datos: UsuarioActualizar,
):
    cambios = datos.model_dump(exclude_unset=True)
    return await crud_usuarios.actualizar_verificando_autobloqueo(
        sesion, usuario, cambios, actor_id=gestor.id
    )


@router.patch(
    "/{usuario_id}/estado",
    response_model=UsuarioRespuesta,
    summary="Activar o desactivar un usuario",
    description="Alternativa a eliminar: conserva el historial del usuario.",
)
async def cambiar_estado(
    sesion: SesionDep,
    usuario: UsuarioExistente,
    gestor: GestorDeUsuarios,
    datos: CambiarEstado,
):
    return await crud_usuarios.actualizar_verificando_autobloqueo(
        sesion, usuario, {"estado": datos.estado}, actor_id=gestor.id
    )


@router.delete(
    "/{usuario_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un usuario definitivamente",
)
async def eliminar_usuario(
    sesion: SesionDep, usuario: UsuarioExistente, administrador: Administrador
):
    await crud_usuarios.eliminar(sesion, usuario, actor_id=administrador.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
