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
    smtp_remitente: str = ""
    smtp_tls: bool = True

    # Chatbot con Inteligencia Artificial. Sin clave, el asistente sigue
    # funcionando con respuestas preparadas a partir del catálogo.
    proveedor_ia: str = ""  # anthropic | openai | vacío
    ia_api_key: str = ""
    ia_modelo: str = ""

    @property
    def ia_configurada(self) -> bool:
        return bool(self.proveedor_ia and self.ia_api_key)

    @property
    def correo_configurado(self) -> bool:
        return bool(self.smtp_host and self.smtp_usuario and self.smtp_password)

    @property
    def remitente_efectivo(self) -> str:
        """Desde qué dirección sale el correo.

        Gmail y casi todos los proveedores gratuitos exigen que el remitente
        sea la misma cuenta con la que se inicia sesión: si no coincide,
        rechazan el envío o reescriben la cabecera. Por eso, dejar
        SMTP_REMITENTE vacío es lo normal y lo que se recomienda; solo tiene
        sentido rellenarlo con un dominio propio.
        """
        return self.smtp_remitente or self.smtp_usuario


configuracion = Configuracion()
