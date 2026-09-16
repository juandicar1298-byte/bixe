from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MensajeChat(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "mensaje": "¿Qué servicios de mantenimiento tienen y cuánto valen?",
                "conversacion": None,
            }
        }
    )

    mensaje: str = Field(min_length=1, max_length=1000)
    # La clave del hilo. En el primer mensaje va vacía y la API devuelve una.
    conversacion: str | None = Field(default=None, max_length=40)

    @field_validator("mensaje")
    @classmethod
    def no_vacio(cls, valor: str) -> str:
        limpio = valor.strip()
        if not limpio:
            raise ValueError("Escribe algo para poder responderte.")
        return limpio


class TurnoChat(BaseModel):
    rol: str
    contenido: str
    fecha: datetime


class RespuestaChat(BaseModel):
    conversacion: str
    respuesta: str
    # «ia» si contestó el modelo, «local» si respondió el catálogo de reserva.
    origen: str
    historial: list[TurnoChat] = []


class EstadoAsistente(BaseModel):
    """Para que el frontend sepa qué anunciar, sin exponer la clave."""

    disponible: bool
    con_ia: bool
    proveedor: str | None = None
