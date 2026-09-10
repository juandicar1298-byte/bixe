from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher

from app.core.configuracion import configuracion

# bcrypt: es el algoritmo con el que ya están guardadas las contraseñas de la
# base de datos, así que los usuarios existentes siguen pudiendo entrar.
gestor_de_hash = PasswordHash((BcryptHasher(),))


def hashear_contrasena(contrasena: str) -> str:
    return gestor_de_hash.hash(contrasena)


def verificar_contrasena(contrasena: str, hash_almacenado: str) -> bool:
    return gestor_de_hash.verify(contrasena, hash_almacenado)


def crear_token(usuario_id: int, rol: int) -> str:
    """Emite un JWT firmado con el identificador y el rol del usuario."""
    ahora = datetime.now(timezone.utc)
    carga = {
        "sub": str(usuario_id),
        "rol": rol,
        "iat": ahora,
        "exp": ahora + timedelta(minutes=configuracion.minutos_expiracion_token),
    }
    return jwt.encode(
        carga,
        configuracion.secret_key,
        algorithm=configuracion.algoritmo_jwt,
    )


def decodificar_token(token: str) -> dict:
    """Verifica la firma y la expiración. Propaga la excepción si algo falla."""
    return jwt.decode(
        token,
        configuracion.secret_key,
        algorithms=[configuracion.algoritmo_jwt],
    )
