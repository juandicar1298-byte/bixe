from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class DatosDeTarjeta(BaseModel):
    """Lo que envía el formulario de pago.

    Nada de esto se guarda: el backend valida, cobra y solo persiste la marca
    y los cuatro últimos dígitos. El CVV no se almacena en ningún caso.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "numero": "4242 4242 4242 4242",
                "titular": "LAURA GOMEZ",
                "mes": 12,
                "anio": 2030,
                "cvv": "123",
            }
        }
    )

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
    def tarjeta_vigente(self) -> "DatosDeTarjeta":
        """Regla de negocio: la tarjeta no puede estar vencida."""
        hoy = date.today()
        if (self.anio, self.mes) < (hoy.year, hoy.month):
            raise ValueError("La tarjeta está vencida.")
        return self


class PagoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pedido_id: int
    referencia: str
    metodo: str
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
