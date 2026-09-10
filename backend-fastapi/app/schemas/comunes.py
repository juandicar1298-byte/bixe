"""Reglas de validación compartidas por todos los esquemas."""

import re
from typing import Annotated

from pydantic import BeforeValidator, Field

# Una sola definición de «contraseña válida» para todo el proyecto: registro,
# alta desde el panel y cambio de contraseña. El frontend valida exactamente
# lo mismo en tiempo real.
LONGITUD_MINIMA_CONTRASENA = 8
LONGITUD_MAXIMA_CONTRASENA = 20

PATRON_CONTRASENA = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?\":{}|<>_\-]).+$"
)

MENSAJE_CONTRASENA = (
    "La contraseña debe tener entre 8 y 20 caracteres e incluir al menos una "
    "minúscula, una mayúscula, un número y un símbolo."
)

TIPOS_DOCUMENTO = ("CC", "CE")
ESTADOS = ("activo", "inactivo")
CATEGORIAS_PRODUCTO = ("moto", "auto")
ESTADOS_PEDIDO = ("pendiente", "confirmado", "completado", "cancelado")
TIPOS_ITEM = ("producto", "servicio")

# Anotaciones reutilizables
Contrasena = Annotated[
    str,
    Field(
        min_length=LONGITUD_MINIMA_CONTRASENA,
        max_length=LONGITUD_MAXIMA_CONTRASENA,
        description=MENSAJE_CONTRASENA,
    ),
]

Telefono = Annotated[
    str,
    Field(min_length=7, max_length=10, pattern=r"^\d{7,10}$"),
]

NumeroDocumento = Annotated[
    str,
    Field(min_length=6, max_length=12, pattern=r"^\d{6,12}$"),
]

Precio = Annotated[float, Field(ge=0, le=99_999_999_99)]


def validar_contrasena(valor: str) -> str:
    """Regla de negocio del dominio: complejidad mínima de la contraseña."""
    if not PATRON_CONTRASENA.match(valor):
        raise ValueError(MENSAJE_CONTRASENA)
    return valor


def limpiar_espacios(valor: str) -> str:
    """Colapsa espacios repetidos y recorta los de los extremos."""
    return " ".join(valor.split())


def _a_texto(valor):
    """Acepta un número donde se espera texto libre.

    Los campos técnicos de la ficha (cilindraje, potencia, torque...) son
    VARCHAR porque admiten cosas como «650 cc» o «76 HP». Pero es razonable
    que alguien mande 650 desde un formulario o desde Postman, así que se
    convierte en lugar de rechazarlo.
    """
    if valor is None or isinstance(valor, str):
        return valor
    if isinstance(valor, bool):
        return str(valor)
    if isinstance(valor, int):
        return str(valor)
    if isinstance(valor, float):
        # 650.0 -> "650", 6.5 -> "6.5"
        return str(int(valor)) if valor.is_integer() else str(valor)
    return valor


TextoTecnico = Annotated[str, BeforeValidator(_a_texto)]
