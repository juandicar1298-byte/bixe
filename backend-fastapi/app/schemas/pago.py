from datetime import date, datetime
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class _PagoBase(BaseModel):
    """Nada de lo que llega aquí se guarda tal cual.

    El backend valida, cobra y solo persiste la entidad (marca o banco) y los
    cuatro últimos dígitos del identificador. El CVV no se almacena nunca.
    """


class PagoConTarjeta(_PagoBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "metodo": "tarjeta",
                "numero": "4242 4242 4242 4242",
                "titular": "LAURA GOMEZ",
                "mes": 12,
                "anio": 2030,
                "cvv": "123",
            }
        }
    )

    metodo: Literal["tarjeta"]
    numero: str = Field(min_length=13, max_length=23, description="Con o sin espacios.")
    titular: str = Field(min_length=3, max_length=60)
    mes: int = Field(ge=1, le=12)
    anio: int = Field(ge=2000, le=2099)
    cvv: str = Field(min_length=3, max_length=4, pattern=r"^\d{3,4}$")

    @field_validator("numero")
    @classmethod
    def solo_digitos_y_espacios(cls, valor: str) -> str:
        limpio = valor.replace(" ", "").replace("-", "")
        if not limpio.isdigit():
            raise ValueError("El número de tarjeta solo admite dígitos.")
        return limpio

    @field_validator("titular")
    @classmethod
    def titular_en_mayusculas(cls, valor: str) -> str:
        return " ".join(valor.split()).upper()

    @model_validator(mode="after")
    def tarjeta_vigente(self) -> "PagoConTarjeta":
        """Regla de negocio: la tarjeta no puede estar vencida."""
        hoy = date.today()
        if (self.anio, self.mes) < (hoy.year, hoy.month):
            raise ValueError("La tarjeta está vencida.")
        return self


class PagoConPse(_PagoBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "metodo": "pse",
                "banco": "bancolombia",
                "tipo_persona": "natural",
                "tipo_documento": "CC",
                "numero_documento": "1036425871",
            }
        }
    )

    metodo: Literal["pse"]
    banco: str = Field(min_length=2, max_length=30)
    tipo_persona: Literal["natural", "juridica"] = "natural"
    tipo_documento: Literal["CC", "CE", "NIT"] = "CC"
    numero_documento: str = Field(min_length=6, max_length=15, pattern=r"^\d{6,15}$")


class PagoConNequi(_PagoBase):
    model_config = ConfigDict(
        json_schema_extra={"example": {"metodo": "nequi", "celular": "3001234567"}}
    )

    metodo: Literal["nequi"]
    celular: str = Field(
        min_length=10,
        max_length=10,
        pattern=r"^3\d{9}$",
        description="Diez dígitos, empezando por 3.",
    )


# La unión discriminada hace que FastAPI elija el esquema según "metodo" y
# que Swagger muestre los tres formularios por separado.
DatosDePago = Annotated[
    Union[PagoConTarjeta, PagoConPse, PagoConNequi],
    Field(discriminator="metodo"),
]


class BancoDisponible(BaseModel):
    codigo: str
    nombre: str


class MetodoDisponible(BaseModel):
    codigo: str
    nombre: str
    bancos: list[BancoDisponible] = []


class PagoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pedido_id: int
    referencia: str
    metodo: str
    # marca guarda la entidad: la marca de la tarjeta, el banco de PSE o "nequi".
    marca: str | None
    ultimos_cuatro: str | None
    titular: str | None
    monto: float
    estado: str
    motivo_rechazo: str | None
    fecha_creacion: datetime


class FacturaRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero: str
    pedido_id: int
    base_gravable: float
    porcentaje_iva: float
    valor_iva: float
    total: float
    fecha_emision: datetime


class ResultadoDelPago(BaseModel):
    """Lo que ve el cliente al terminar el checkout."""

    aprobado: bool
    mensaje: str
    pago: PagoRespuesta
    factura: FacturaRespuesta | None = None
