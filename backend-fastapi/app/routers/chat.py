from fastapi import APIRouter

from app.core.configuracion import configuracion
from app.crud import chat as crud_chat
from app.dependencias import SesionDep, UsuarioOpcional
from app.errores import ConflictoDeNegocio
from app.schemas.chat import EstadoAsistente, MensajeChat, RespuestaChat
from app.schemas.error import RESPUESTAS_API
from app.services import asistente

router = APIRouter(prefix="/api/chat", tags=["Chatbot"], responses=RESPUESTAS_API)


@router.get(
    "/estado",
    response_model=EstadoAsistente,
    summary="Si el asistente está activo y si usa IA",
    description="No expone la clave: solo dice si hay una configurada, para "
    "que la web pueda anunciar si las respuestas las genera un modelo.",
)
def estado():
    return EstadoAsistente(
        disponible=True,
        con_ia=configuracion.ia_configurada,
        proveedor=configuracion.proveedor_ia or None,
    )


@router.post(
    "",
    response_model=RespuestaChat,
    summary="Hablar con el asistente",
    description="Funciona con y sin sesión iniciada. En el primer mensaje se "
    "envía «conversacion» vacío y la respuesta trae la clave del hilo, que el "
    "navegador guarda para los siguientes.",
)
async def conversar(sesion: SesionDep, usuario: UsuarioOpcional, datos: MensajeChat):
    conversacion = await crud_chat.obtener_o_crear(sesion, datos.conversacion, usuario)

    if await crud_chat.alcanzo_el_tope(sesion, conversacion):
        raise ConflictoDeNegocio(
            "Esta conversación ya es muy larga. Recárgala para empezar otra."
        )

    historial = await crud_chat.historial(sesion, conversacion)
    catalogo = await asistente.contexto_del_catalogo(sesion)

    respuesta, origen = await asistente.responder(datos.mensaje, historial, catalogo)

    hilo = await crud_chat.anotar(sesion, conversacion, datos.mensaje, respuesta)

    return RespuestaChat(
        conversacion=conversacion.clave,
        respuesta=respuesta,
        origen=origen,
        historial=hilo,
    )
