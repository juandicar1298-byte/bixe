from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

ESTADOS_VENTA = ("completada", "anulada")
CANALES = ("web", "mostrador")


class LineaVentaCrear(BaseModel):
    """Una línea de una venta registrada a mano.

    No lleva precio: igual que en los pedidos, el precio lo relee el servidor
    del catálogo. Lo único que decide quien registra la venta es qué, cuánto y
    cuánto descuento aplica.
    """

    tipo: Literal["producto", "servicio"]
    id: int = Field(ge=1)
    cantidad: int = Field(default=1, ge=1, le=99)
    descuento: float = Field(default=0, ge=0, description="Sobre la línea completa.")


class VentaManualCrear(BaseModel):
    """Venta de mostrador: la registra un empleado o el administrador."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "cliente_id": 3,
                "items": [{"tipo": "servicio", "id": 1, "cantidad": 2, "descuento": 20000}],
                "notas": "Pagó en efectivo en el taller.",
            }
        }
    )

    cliente_id: int = Field(ge=1)
    items: list[LineaVentaCrear] = Field(min_length=1, max_length=50)
    notas: str | None = Field(default=None, max_length=255)

    @field_validator("items")
    @classmethod
    def sin_articulos_repetidos(cls, items: list[LineaVentaCrear]) -> list[LineaVentaCrear]:
        vistos = {(i.tipo, i.id) for i in items}
        if len(vistos) != len(items):
            raise ValueError("Cada artículo debe aparecer una sola vez, con su cantidad.")
        return items


class LineaVenta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo: str
    referencia_id: int
    nombre: str
    cantidad: int
    precio_unitario: float
    descuento: float
    subtotal: float


class PersonaResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    apellido: str
    email: str


class VentaResumen(BaseModel):
    """Lo que se ve en el historial, sin bajar el detalle de cada línea."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    numero: str
    pedido_id: int | None
    canal: str
    subtotal: float
    descuento: float
    impuesto: float
    total: float
    estado: str
    fecha: datetime
    cliente: PersonaResumen
    vendedor: PersonaResumen | None = None


class VentaDetalle(VentaResumen):
    notas: str | None = None
    detalle: list[LineaVenta] = []
    factura_numero: str | None = None


class PaginaDeVentas(BaseModel):
    """El historial con su total, para poder paginar en el panel."""

    total: int
    ventas: list[VentaResumen]


class LineaReporte(BaseModel):
    numero: str
    hora: str
    cliente: str
    articulos: str
    unidades: int
    total: float
    estado: str


class ReporteDiario(BaseModel):
    """Las ventas de un día, ya resumidas para imprimir o exportar."""

    fecha: date
    generado_en: datetime
    total_ventas: int
    unidades: int
    subtotal: float
    descuento: float
    impuesto: float
    total: float
    lineas: list[LineaReporte]
