from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.comunes import Precio, limpiar_espacios

# ----------------------------- Productos -----------------------------


class ProductoCrear(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "nombre": "Moto Deportiva 650",
                "categoria": "moto",
                "cilindraje": "650",
                "potencia": "76 HP",
                "precio": 45000000,
                "descripcion": "Alto cilindraje, pura adrenalina.",
            }
        }
    )

    nombre: str = Field(min_length=2, max_length=60)
    categoria: Literal["moto", "auto"] = "moto"
    cilindraje: str | None = Field(default=None, max_length=20)
    potencia: str | None = Field(default=None, max_length=30)
    torque: str | None = Field(default=None, max_length=30)
    velocidad_maxima: str | None = Field(default=None, max_length=20)
    peso: str | None = Field(default=None, max_length=20)
    transmision: str | None = Field(default=None, max_length=30)
    combustible: str | None = Field(default=None, max_length=30)
    descripcion: str | None = Field(default=None, max_length=255)
    descripcion_larga: str | None = None
    precio: Precio
    imagen_url: str | None = Field(default=None, max_length=255)

    @field_validator("nombre")
    @classmethod
    def sin_espacios_sobrantes(cls, valor: str) -> str:
        return limpiar_espacios(valor)


class ProductoActualizar(BaseModel):
    """PATCH: solo se escriben los campos que vengan en el cuerpo."""

    nombre: str | None = Field(default=None, min_length=2, max_length=60)
    categoria: Literal["moto", "auto"] | None = None
    cilindraje: str | None = Field(default=None, max_length=20)
    potencia: str | None = Field(default=None, max_length=30)
    torque: str | None = Field(default=None, max_length=30)
    velocidad_maxima: str | None = Field(default=None, max_length=20)
    peso: str | None = Field(default=None, max_length=20)
    transmision: str | None = Field(default=None, max_length=30)
    combustible: str | None = Field(default=None, max_length=30)
    descripcion: str | None = Field(default=None, max_length=255)
    descripcion_larga: str | None = None
    precio: Precio | None = None
    imagen_url: str | None = Field(default=None, max_length=255)
    estado: Literal["activo", "inactivo"] | None = None


class ProductoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    categoria: str
    cilindraje: str | None
    potencia: str | None
    torque: str | None
    velocidad_maxima: str | None
    peso: str | None
    transmision: str | None
    combustible: str | None
    descripcion: str | None
    descripcion_larga: str | None
    precio: float
    imagen_url: str | None
    estado: str
    fecha_creacion: datetime


# ----------------------------- Servicios -----------------------------


class ServicioCrear(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "nombre": "Mantenimiento preventivo",
                "categoria": "mantenimiento",
                "descripcion": "Revisión completa de los 20 puntos críticos.",
                "duracion_min": 90,
                "precio": 180000,
            }
        }
    )

    nombre: str = Field(min_length=3, max_length=120)
    categoria: str = Field(default="mantenimiento", min_length=3, max_length=60)
    descripcion: str | None = Field(default=None, max_length=255)
    descripcion_larga: str | None = None
    duracion_min: int | None = Field(default=None, ge=5, le=1440)
    precio: Precio
    imagen_url: str | None = Field(default=None, max_length=255)

    @field_validator("nombre", "categoria")
    @classmethod
    def sin_espacios_sobrantes(cls, valor: str) -> str:
        return limpiar_espacios(valor)

    @field_validator("categoria")
    @classmethod
    def categoria_en_minusculas(cls, valor: str) -> str:
        return valor.lower()


class ServicioActualizar(BaseModel):
    nombre: str | None = Field(default=None, min_length=3, max_length=120)
    categoria: str | None = Field(default=None, min_length=3, max_length=60)
    descripcion: str | None = Field(default=None, max_length=255)
    descripcion_larga: str | None = None
    duracion_min: int | None = Field(default=None, ge=5, le=1440)
    precio: Precio | None = None
    imagen_url: str | None = Field(default=None, max_length=255)
    estado: Literal["activo", "inactivo"] | None = None


class ServicioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    categoria: str
    descripcion: str | None
    descripcion_larga: str | None
    duracion_min: int | None
    precio: float
    imagen_url: str | None
    estado: str
    fecha_creacion: datetime


class CambiarEstadoCatalogo(BaseModel):
    estado: Literal["activo", "inactivo"]


class ImagenSubida(BaseModel):
    url: str = Field(description="Ruta relativa que se guarda en imagen_url.")
    nombre: str
    tamano: int
