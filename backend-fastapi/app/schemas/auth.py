from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.schemas.comunes import Contrasena, validar_contrasena
from app.schemas.usuario import RolResumen


class Credenciales(BaseModel):
    """Login desde el formulario de React (JSON)."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"email": "admin@bixe.com", "contrasena": "Bixe2026*"}
        }
    )

    email: EmailStr
    contrasena: str = Field(min_length=1, max_length=20)


class UsuarioSesion(BaseModel):
    """Datos del usuario que el frontend guarda tras iniciar sesión."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    apellido: str
    email: EmailStr
    estado: str
    rol: RolResumen


class Token(BaseModel):
    acceso: str = Field(description="JWT que se envía como «Authorization: Bearer».")
    tipo: str = "bearer"
    expira_en_segundos: int
    usuario: UsuarioSesion


class TokenOAuth2(BaseModel):
    """Respuesta con los nombres que espera el botón «Authorize» de Swagger."""

    access_token: str
    token_type: str = "bearer"


class SolicitudRecuperacion(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={"example": {"email": "ana.ruiz@ejemplo.com"}}
    )

    email: EmailStr


class RestablecerContrasena(BaseModel):
    token: str = Field(min_length=32, max_length=64)
    contrasena_nueva: Contrasena
    confirmar_contrasena: str

    @field_validator("contrasena_nueva")
    @classmethod
    def contrasena_segura(cls, valor: str) -> str:
        return validar_contrasena(valor)

    @model_validator(mode="after")
    def contrasenas_coinciden(self) -> "RestablecerContrasena":
        if self.contrasena_nueva != self.confirmar_contrasena:
            raise ValueError("Las contraseñas no coinciden.")
        return self


class MensajeSimple(BaseModel):
    mensaje: str
    # Solo se rellena en desarrollo cuando el correo no está configurado:
    # permite probar el flujo sin servidor SMTP.
    enlace_recuperacion: str | None = None
