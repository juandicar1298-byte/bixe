from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

TIPOS = ("peticion", "queja", "reclamo", "sugerencia")
ESTADOS = ("pendiente", "en_proceso", "respondida", "cerrada")

TipoPqr = Literal["peticion", "queja", "reclamo", "sugerencia"]
EstadoPqr = Literal["pendiente", "en_proceso", "respondida", "cerrada"]


class PqrCrear(BaseModel):
    """Lo que radica el cliente.

    El nombre y el correo solo hacen falta cuando quien escribe no tiene
    sesión iniciada; si la tiene, se toman de su cuenta y se ignora lo que
    venga en el cuerpo, para que nadie radique a nombre de otro.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "tipo": "reclamo",
                "asunto": "El mantenimiento quedó incompleto",
                "mensaje": "Llevé la moto el martes y no revisaron los frenos.",
                "nombre_contacto": "Ana Ruiz",
                "email_contacto": "ana.ruiz@ejemplo.com",
            }
        }
    )

    tipo: TipoPqr
    asunto: str = Field(min_length=5, max_length=120)
    mensaje: str = Field(min_length=15, max_length=2000)
    nombre_contacto: str | None = Field(default=None, min_length=3, max_length=80)
    email_contacto: EmailStr | None = None

    @field_validator("asunto", "mensaje")
    @classmethod
    def sin_espacios_de_relleno(cls, valor: str) -> str:
        limpio = valor.strip()
        if not limpio:
            raise ValueError("No puede quedar vacío.")
        return limpio


class PqrResponder(BaseModel):
    """La respuesta del taller, con el estado en el que queda la solicitud."""

    respuesta: str = Field(min_length=5, max_length=2000)
    estado: EstadoPqr = "respondida"


class PqrCambiarEstado(BaseModel):
    estado: EstadoPqr


class AutorResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    apellido: str


class PqrResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    radicado: str
    tipo: str
    asunto: str
    estado: str
    nombre_contacto: str
    email_contacto: str
    fecha_creacion: datetime
    fecha_respuesta: datetime | None = None


class PqrDetalle(PqrResumen):
    mensaje: str
    respuesta: str | None = None
    usuario: AutorResumen | None = None
    atendido_por: AutorResumen | None = None


class PaginaDePqr(BaseModel):
    """La bandeja del personal: lo justo para pintar la tabla."""

    total: int
    pqr: list[PqrResumen]


class PaginaDeMisPqr(BaseModel):
    """Las del propio cliente, con el mensaje y la respuesta.

    Va con el detalle completo porque quien radicó quiere leer justamente
    eso: qué contestó el taller, sin tener que abrir cada una.
    """

    total: int
    pqr: list[PqrDetalle]


class ConteoPqr(BaseModel):
    estado: str
    total: int


class FiltroFechas(BaseModel):
    desde: date | None = None
    hasta: date | None = None
