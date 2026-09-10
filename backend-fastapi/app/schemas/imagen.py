from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ImagenCrear(BaseModel):
    """Se registra una foto ya subida con POST /api/uploads."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "url": "/uploads/1789048064587-moto2.jpg",
                "descripcion": "Vista lateral derecha",
            }
        }
    )

    url: str = Field(min_length=3, max_length=255)
    descripcion: str | None = Field(default=None, max_length=120)


class ImagenActualizar(BaseModel):
    descripcion: str | None = Field(default=None, max_length=120)
    orden: int | None = Field(default=None, ge=0, le=99)


class ImagenRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    producto_id: int
    url: str
    descripcion: str | None
    orden: int
    fecha_creacion: datetime
