from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.schemas.comunes import (
    ESTADOS,
    TIPOS_DOCUMENTO,
    Contrasena,
    NumeroDocumento,
    Telefono,
    limpiar_espacios,
    validar_contrasena,
)


class RolResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str


class PermisoResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None = None


class _DatosPersonales(BaseModel):
    """Campos comunes al registro público y al alta desde el panel."""

    nombre: str = Field(min_length=2, max_length=30)
    apellido: str = Field(min_length=2, max_length=30)
    tipo_documento: Literal[TIPOS_DOCUMENTO] = "CC"
    numero_documento: NumeroDocumento
    direccion: str = Field(min_length=5, max_length=60)
    telefono: Telefono
    email: EmailStr = Field(max_length=100)

    @field_validator("nombre", "apellido", "direccion")
    @classmethod
    def sin_espacios_sobrantes(cls, valor: str) -> str:
        return limpiar_espacios(valor)


class UsuarioRegistro(_DatosPersonales):
    """Registro público: el rol lo decide el servidor, nunca el cliente."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "nombre": "Ana",
                "apellido": "Ruiz",
                "tipo_documento": "CC",
                "numero_documento": "1036425871",
                "direccion": "Carrera 43A #1-50",
                "telefono": "3001234567",
                "email": "ana.ruiz@ejemplo.com",
                "contrasena": "Bixe2026*",
                "confirmar_contrasena": "Bixe2026*",
            }
        }
    )

    contrasena: Contrasena
    confirmar_contrasena: str = Field(description="Debe coincidir con la contraseña.")

    @field_validator("contrasena")
    @classmethod
    def contrasena_segura(cls, valor: str) -> str:
        return validar_contrasena(valor)

    @model_validator(mode="after")
    def contrasenas_coinciden(self) -> "UsuarioRegistro":
        if self.contrasena != self.confirmar_contrasena:
            raise ValueError("Las contraseñas no coinciden.")
        return self


class UsuarioCrear(_DatosPersonales):
    """Alta desde el panel de administración: aquí sí se elige el rol."""

    contrasena: Contrasena
    rol_id: int = Field(ge=1, le=3, description="1 Administrador, 2 Empleado, 3 Cliente")
    estado: Literal[ESTADOS] = "activo"

    @field_validator("contrasena")
    @classmethod
    def contrasena_segura(cls, valor: str) -> str:
        return validar_contrasena(valor)


class UsuarioActualizar(BaseModel):
    """PATCH: todos los campos son opcionales y solo se aplica lo enviado."""

    nombre: str | None = Field(default=None, min_length=2, max_length=30)
    apellido: str | None = Field(default=None, min_length=2, max_length=30)
    direccion: str | None = Field(default=None, min_length=5, max_length=60)
    telefono: Telefono | None = None
    rol_id: int | None = Field(default=None, ge=1, le=3)
    estado: Literal[ESTADOS] | None = None

    @field_validator("nombre", "apellido", "direccion")
    @classmethod
    def sin_espacios_sobrantes(cls, valor: str | None) -> str | None:
        return limpiar_espacios(valor) if valor else valor


class PerfilActualizar(BaseModel):
    """Lo que un usuario puede cambiar de su propia cuenta."""

    nombre: str = Field(min_length=2, max_length=30)
    apellido: str = Field(min_length=2, max_length=30)
    direccion: str = Field(min_length=5, max_length=60)
    telefono: Telefono

    @field_validator("nombre", "apellido", "direccion")
    @classmethod
    def sin_espacios_sobrantes(cls, valor: str) -> str:
        return limpiar_espacios(valor)


class CambiarEstado(BaseModel):
    estado: Literal[ESTADOS]


class CambiarContrasena(BaseModel):
    contrasena_actual: str = Field(min_length=1)
    contrasena_nueva: Contrasena
    confirmar_contrasena: str

    @field_validator("contrasena_nueva")
    @classmethod
    def contrasena_segura(cls, valor: str) -> str:
        return validar_contrasena(valor)

    @model_validator(mode="after")
    def contrasenas_coinciden(self) -> "CambiarContrasena":
        if self.contrasena_nueva != self.confirmar_contrasena:
            raise ValueError("Las contraseñas nuevas no coinciden.")
        if self.contrasena_nueva == self.contrasena_actual:
            raise ValueError("La contraseña nueva debe ser distinta de la actual.")
        return self


class UsuarioRespuesta(BaseModel):
    """Salida: nunca incluye el hash de la contraseña."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    apellido: str
    tipo_documento: str
    numero_documento: str
    direccion: str
    telefono: str
    email: EmailStr
    estado: str
    fecha_creacion: datetime
    rol: RolResumen
