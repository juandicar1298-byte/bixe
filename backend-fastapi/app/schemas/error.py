from pydantic import BaseModel, Field


class DetalleDeError(BaseModel):
    """Formato único de error de la API de BIXE."""

    codigo: str = Field(description="Identificador estable del tipo de error.")
    mensaje: str = Field(description="Explicación legible para una persona.")
    ruta: str
    detalles: list[dict] | None = Field(default=None, description="Errores por campo.")


RESPUESTAS_API = {
    400: {"model": DetalleDeError, "description": "Petición inválida."},
    401: {"model": DetalleDeError, "description": "No autenticado."},
    403: {"model": DetalleDeError, "description": "Permiso insuficiente."},
    404: {"model": DetalleDeError, "description": "Recurso no encontrado."},
    409: {"model": DetalleDeError, "description": "Conflicto de negocio."},
    422: {"model": DetalleDeError, "description": "Datos inválidos."},
    500: {"model": DetalleDeError, "description": "Error interno."},
}
