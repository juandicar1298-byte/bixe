from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.usuario import RolResumen


class ItemCarrito(BaseModel):
    """Lo que el navegador envía. Ojo: no incluye precio.

    El precio siempre lo relee el servidor de la base de datos, para que nadie
    pueda confirmar un pedido con un importe manipulado desde el frontend.
    """

    tipo: Literal["producto", "servicio"]
    id: int = Field(ge=1)
    cantidad: int = Field(default=1, ge=1, le=99)


class PedidoCrear(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "items": [
                    {"tipo": "servicio", "id": 1, "cantidad": 2},
                    {"tipo": "producto", "id": 1, "cantidad": 1},
                ],
                "notas": "Prefiero que me llamen en la tarde.",
            }
        }
    )

    items: list[ItemCarrito] = Field(min_length=1, max_length=50)
    notas: str | None = Field(default=None, max_length=255)

    @field_validator("items")
    @classmethod
    def sin_articulos_repetidos(cls, items: list[ItemCarrito]) -> list[ItemCarrito]:
        """Regla del dominio: cada artículo aparece una sola vez, con su cantidad."""
        claves = [(item.tipo, item.id) for item in items]
        if len(claves) != len(set(claves)):
            raise ValueError(
                "Hay artículos repetidos en el carrito; usa el campo cantidad."
            )
        return items


class CambiarEstadoPedido(BaseModel):
    estado: Literal["pendiente", "confirmado", "completado", "cancelado"]


class ItemRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo: str
    referencia_id: int
    nombre: str
    precio_unitario: float
    cantidad: int


class ClienteResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    apellido: str
    email: str
    telefono: str
    rol: RolResumen


class PedidoResumen(BaseModel):
    """Fila de listado: sin el detalle, para no traer de más."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    total: float
    estado: str
    notas: str | None
    fecha_creacion: datetime
    usuario: ClienteResumen


class PedidoRespuesta(PedidoResumen):
    """Detalle completo del pedido, con sus artículos."""

    items: list[ItemRespuesta]
