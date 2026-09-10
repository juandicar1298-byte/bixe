"""Pasarela de pago simulada.

No mueve dinero real ni habla con ningún proveedor: reproduce el
comportamiento de una pasarela para poder demostrar el flujo completo de
compra. Las validaciones (Luhn, vigencia, CVV) sí son las de verdad.

El número de tarjeta y el CVV no salen nunca de esta función: de vuelta solo
se entregan la marca y los cuatro últimos dígitos, que es lo único que se
guarda en la base de datos.
"""

import secrets
from dataclasses import dataclass
from datetime import date

# Tarjetas de prueba. Todas pasan el algoritmo de Luhn, así que sirven para
# demostrar tanto el camino feliz como cada motivo de rechazo.
TARJETAS_DE_PRUEBA = {
    "4242424242424242": None,  # Visa, aprueba
    "5555555555554444": None,  # Mastercard, aprueba
    "4000000000000002": "La tarjeta fue rechazada por el banco emisor.",
    "4000000000009995": "Fondos insuficientes.",
    "4000000000000069": "La tarjeta está vencida.",
    "4000000000000127": "El código de seguridad es incorrecto.",
}

PREFIJOS_DE_MARCA = (
    ("visa", ("4",)),
    ("mastercard", ("51", "52", "53", "54", "55", "2221", "2720")),
    ("amex", ("34", "37")),
    ("diners", ("36", "38", "300", "301", "302", "303", "304", "305")),
)


@dataclass(frozen=True)
class ResultadoDePago:
    aprobado: bool
    referencia: str
    marca: str
    ultimos_cuatro: str
    motivo: str | None = None


def solo_digitos(valor: str) -> str:
    return "".join(c for c in valor if c.isdigit())


def pasa_luhn(numero: str) -> bool:
    """Algoritmo de Luhn: el mismo que usan las pasarelas de verdad.

    Se recorre de derecha a izquierda duplicando una cifra sí y otra no; si
    el resultado pasa de 9 se le restan 9. La suma total debe ser múltiplo
    de 10.
    """
    suma = 0
    for posicion, caracter in enumerate(reversed(numero)):
        cifra = int(caracter)
        if posicion % 2 == 1:
            cifra *= 2
            if cifra > 9:
                cifra -= 9
        suma += cifra
    return suma % 10 == 0


def detectar_marca(numero: str) -> str:
    for marca, prefijos in PREFIJOS_DE_MARCA:
        if numero.startswith(prefijos):
            return marca
    return "desconocida"


def _esta_vencida(mes: int, anio: int) -> bool:
    hoy = date.today()
    return (anio, mes) < (hoy.year, hoy.month)


def _cvv_valido(cvv: str, marca: str) -> bool:
    largo_esperado = 4 if marca == "amex" else 3
    return cvv.isdigit() and len(cvv) == largo_esperado


def procesar(
    numero: str,
    mes: int,
    anio: int,
    cvv: str,
    titular: str,
) -> ResultadoDePago:
    """Valida la tarjeta y decide si el cobro se aprueba.

    Devuelve siempre un resultado; nunca lanza excepción por un rechazo,
    porque un pago rechazado es una respuesta normal de la pasarela y no un
    error del sistema.
    """
    limpio = solo_digitos(numero)
    marca = detectar_marca(limpio)
    ultimos = limpio[-4:] if len(limpio) >= 4 else "0000"
    referencia = f"BIXE-{secrets.token_hex(8).upper()}"

    def rechazo(motivo: str) -> ResultadoDePago:
        return ResultadoDePago(False, referencia, marca, ultimos, motivo)

    largo_valido = 15 if marca == "amex" else 16
    if len(limpio) != largo_valido:
        return rechazo(
            f"El número de tarjeta debe tener {largo_valido} dígitos."
        )

    if not pasa_luhn(limpio):
        return rechazo("El número de tarjeta no es válido.")

    if not 1 <= mes <= 12:
        return rechazo("El mes de vencimiento no es válido.")

    if _esta_vencida(mes, anio):
        return rechazo("La tarjeta está vencida.")

    if not _cvv_valido(cvv, marca):
        return rechazo("El código de seguridad no es válido.")

    if not titular.strip():
        return rechazo("Falta el nombre del titular.")

    # Las tarjetas de prueba con motivo definido siempre rechazan; el resto,
    # si llegaron hasta aquí, se aprueban.
    motivo_forzado = TARJETAS_DE_PRUEBA.get(limpio)
    if motivo_forzado:
        return rechazo(motivo_forzado)

    return ResultadoDePago(True, referencia, marca, ultimos)
