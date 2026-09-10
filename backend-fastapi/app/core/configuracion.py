from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracion(BaseSettings):
    """Configuración de la aplicación, leída de variables de entorno o de .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    nombre_app: str = "BIXE API"
    entorno: str = "desarrollo"  # desarrollo | produccion
    depuracion: bool = True

    # CORS con lista explícita de orígenes: nunca comodín.
    origenes_permitidos: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
    ]

    # MySQL/MariaDB asíncrono. La contraseña nunca va en el código.
    url_base_datos: str = "mysql+aiomysql://root@localhost:3306/bixe_db"

    # Sin valor por defecto: si falta la variable, la aplicación no arranca.
    secret_key: str
    algoritmo_jwt: str = "HS256"
    minutos_expiracion_token: int = 480

    # Imágenes del catálogo
    carpeta_uploads: str = "uploads"
    tamano_maximo_imagen: int = 3 * 1024 * 1024  # 3 MB
    tipos_imagen_permitidos: list[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
        "image/gif",
    ]

    # Recuperación de contraseña
    url_frontend: str = "http://localhost:5173"
    minutos_expiracion_recuperacion: int = 30

    # Correo saliente. Si smtp_host queda vacío, el servicio funciona en modo
    # degradado: no envía nada y escribe el enlace en el log del servidor.
    smtp_host: str = ""
    smtp_puerto: int = 587
    smtp_usuario: str = ""
    smtp_password: str = ""
    smtp_remitente: str = "BIXE <no-responder@bixe.com>"
    smtp_tls: bool = True

    @property
    def correo_configurado(self) -> bool:
        return bool(self.smtp_host and self.smtp_usuario and self.smtp_password)


configuracion = Configuracion()
