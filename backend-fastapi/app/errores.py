"""Excepciones del dominio. No conocen HTTP: solo describen qué salió mal."""


class ErrorDeDominio(Exception):
    """Raíz de todas las excepciones de negocio de BIXE."""

    codigo = "error_de_dominio"

    def __init__(self, mensaje: str):
        self.mensaje = mensaje
        super().__init__(mensaje)


class RecursoNoEncontrado(ErrorDeDominio):
    """El identificador solicitado no corresponde a ningún recurso."""

    codigo = "recurso_no_encontrado"

    def __init__(self, recurso: str, identificador: int | str):
        self.recurso = recurso
        self.identificador = identificador
        super().__init__(f"No existe {recurso} con identificador {identificador}.")


class ConflictoDeNegocio(ErrorDeDominio):
    """Los datos son válidos, pero el estado del sistema impide la operación."""

    codigo = "conflicto_de_negocio"


class CorreoYaRegistrado(ConflictoDeNegocio):
    codigo = "correo_ya_registrado"

    def __init__(self, correo: str):
        super().__init__(f"Ya existe una cuenta registrada con el correo {correo}.")


class DocumentoYaRegistrado(ConflictoDeNegocio):
    codigo = "documento_ya_registrado"

    def __init__(self, documento: str):
        super().__init__(
            f"Ya existe una cuenta registrada con el documento {documento}."
        )


class CarritoVacio(ConflictoDeNegocio):
    codigo = "carrito_vacio"

    def __init__(self):
        super().__init__("No se puede confirmar un pedido sin artículos.")


class ArticuloNoDisponible(ConflictoDeNegocio):
    codigo = "articulo_no_disponible"

    def __init__(self, tipo: str, identificador: int):
        super().__init__(
            f"El {tipo} {identificador} ya no está disponible para la venta."
        )


class PedidoNoCancelable(ConflictoDeNegocio):
    codigo = "pedido_no_cancelable"

    def __init__(self, pedido_id: int, estado: str):
        super().__init__(
            f"El pedido {pedido_id} está en estado «{estado}»; solo se pueden "
            f"cancelar los pedidos pendientes."
        )


class PedidoYaPagado(ConflictoDeNegocio):
    codigo = "pedido_ya_pagado"

    def __init__(self, pedido_id: int):
        super().__init__(f"El pedido {pedido_id} ya fue pagado.")


class PagoRechazado(ConflictoDeNegocio):
    """La pasarela no aprobó el cobro. No es un fallo del sistema."""

    codigo = "pago_rechazado"


class OperacionSobreUnoMismo(ConflictoDeNegocio):
    """Impide que un administrador se bloquee a sí mismo el acceso."""

    codigo = "operacion_sobre_uno_mismo"


class TokenDeRecuperacionInvalido(ConflictoDeNegocio):
    codigo = "token_recuperacion_invalido"

    def __init__(self):
        super().__init__(
            "El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo."
        )


class ImagenInvalida(ErrorDeDominio):
    codigo = "imagen_invalida"


class NoAutenticado(ErrorDeDominio):
    """No se pudo establecer la identidad del solicitante. Responde 401."""

    codigo = "no_autenticado"

    def __init__(self, mensaje: str = "Credenciales ausentes o inválidas."):
        super().__init__(mensaje)


class PermisoDenegado(ErrorDeDominio):
    """La identidad es conocida, pero no tiene permiso. Responde 403."""

    codigo = "permiso_denegado"

    def __init__(self, mensaje: str = "No tiene permiso para realizar esta operación."):
        super().__init__(mensaje)
