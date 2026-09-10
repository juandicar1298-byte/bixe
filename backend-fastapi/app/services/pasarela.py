"""Pasarela de pago simulada.

No mueve dinero real ni habla con ningún proveedor: reproduce el
comportamiento de una pasarela para poder demostrar el flujo completo de
compra. Las validaciones (Luhn, vigencia, CVV, formato de celular) sí son las
de verdad.

Los datos sensibles no salen nunca de este módulo: de vuelta solo se entregan
un identificador enmascarado (los cuatro últimos dígitos) y la entidad, que es
lo único que se guarda en la base de datos.
"""

import secrets
from dataclasses import dataclass
from datetime import date

# --------------------------- Medios disponibles ---------------------------

METODOS = {
    "tarjeta": "Tarjeta de crédito o débito",
    "pse": "PSE · Débito desde tu banco",
    "nequi": "Nequi",
}

BANCOS_PSE = {
    "bancolombia": "Bancolombia",
    "davivienda": "Davivienda",
    "bbva": "BBVA Colombia",
    "bogota": "Banco de Bogotá",
    "occidente": "Banco de Occidente",
    "nubank": "Nu Colombia",
}

# --------------------------- Datos de prueba ---------------------------
# Todas las tarjetas pasan el algoritmo de Luhn, así que sirven para
# demostrar tanto el camino feliz como cada motivo de rechazo.

TARJETAS_DE_PRUEBA = {
    "4242424242424242": None,  # Visa, aprueba
    "5555555555554444": None,  # Mastercard, aprueba
    "4000000000000002": "La tarjeta fue rechazada por el banco emisor.",
    "4000000000009995": "Fondos insuficientes.",
    "4000000000000069": "La tarjeta está vencida.",
    "4000000000000127": "El código de seguridad es incorrecto.",
}

# Un documento y un celular que siempre rechazan, para poder enseñar el error.
DOCUMENTO_QUE_RECHAZA = "10000000"
CELULAR_QUE_RECHAZA = "3000000000"

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
    metodo: str
    # Entidad del medio de pago: la marca de la tarjeta, el banco de PSE
    # o simplemente "nequi".
    entidad: str
    ultimos_cuatro: str
    titular: str | None = None
    motivo: str | None = None


def solo_digitos(valor: str) -> str:
    return "".join(c for c in valor if c.isdigit())


def nueva_referencia() -> str:
    return f"BIXE-{secrets.token_hex(8).upper()}"


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


# ------------------------------ Tarjeta ------------------------------


def _cobrar_con_tarjeta(datos: dict) -> ResultadoDePago:
    limpio = solo_digitos(datos["numero"])
    marca = detectar_marca(limpio)
    ultimos = limpio[-4:] if len(limpio) >= 4 else "0000"
    titular = datos["titular"].strip()
    referencia = nueva_referencia()

    def rechazo(motivo: str) -> ResultadoDePago:
        return ResultadoDePago(
            False, referencia, "tarjeta", marca, ultimos, titular, motivo
        )

    largo_valido = 15 if marca == "amex" else 16
    if len(limpio) != largo_valido:
        return rechazo(f"El número de tarjeta debe tener {largo_valido} dígitos.")

    if not pasa_luhn(limpio):
        return rechazo("El número de tarjeta no es válido.")

    if not 1 <= datos["mes"] <= 12:
        return rechazo("El mes de vencimiento no es válido.")

    if _esta_vencida(datos["mes"], datos["anio"]):
        return rechazo("La tarjeta está vencida.")

    if not _cvv_valido(datos["cvv"], marca):
        return rechazo("El código de seguridad no es válido.")

    if not titular:
        return rechazo("Falta el nombre del titular.")

    motivo_forzado = TARJETAS_DE_PRUEBA.get(limpio)
    if motivo_forzado:
        return rechazo(motivo_forzado)

    return ResultadoDePago(True, referencia, "tarjeta", marca, ultimos, titular)


# -------------------------------- PSE --------------------------------


def _cobrar_con_pse(datos: dict) -> ResultadoDePago:
    banco = datos["banco"]
    documento = solo_digitos(datos["numero_documento"])
    ultimos = documento[-4:] if len(documento) >= 4 else documento.zfill(4)
    referencia = nueva_referencia()

    def rechazo(motivo: str) -> ResultadoDePago:
        return ResultadoDePago(False, referencia, "pse", banco, ultimos, None, motivo)

    if banco not in BANCOS_PSE:
        return rechazo("El banco seleccionado no está disponible.")

    if len(documento) < 6:
        return rechazo("El número de documento no es válido.")

    if documento == DOCUMENTO_QUE_RECHAZA:
        return rechazo("El banco rechazó el débito de la cuenta.")

    return ResultadoDePago(True, referencia, "pse", banco, ultimos)


# ------------------------------- Nequi -------------------------------


def _cobrar_con_nequi(datos: dict) -> ResultadoDePago:
    celular = solo_digitos(datos["celular"])
    ultimos = celular[-4:] if len(celular) >= 4 else celular.zfill(4)
    referencia = nueva_referencia()

    def rechazo(motivo: str) -> ResultadoDePago:
        return ResultadoDePago(False, referencia, "nequi", "nequi", ultimos, None, motivo)

    if len(celular) != 10 or not celular.startswith("3"):
        return rechazo("El celular debe tener 10 dígitos y empezar por 3.")

    if celular == CELULAR_QUE_RECHAZA:
        return rechazo("La cuenta Nequi no tiene saldo suficiente.")

    return ResultadoDePago(True, referencia, "nequi", "nequi", ultimos)


# ------------------------------ Entrada ------------------------------

_COBRADORES = {
    "tarjeta": _cobrar_con_tarjeta,
    "pse": _cobrar_con_pse,
    "nequi": _cobrar_con_nequi,
}


def procesar(datos: dict) -> ResultadoDePago:
    """Cobra según el método elegido.

    Devuelve siempre un resultado; nunca lanza excepción por un rechazo,
    porque un pago rechazado es una respuesta normal de la pasarela y no un
    error del sistema.
    """
    cobrador = _COBRADORES.get(datos["metodo"])
    if cobrador is None:
        return ResultadoDePago(
            False,
            nueva_referencia(),
            datos.get("metodo", "desconocido"),
            "desconocida",
            "0000",
            None,
            "El medio de pago no está disponible.",
        )
    return cobrador(datos)
