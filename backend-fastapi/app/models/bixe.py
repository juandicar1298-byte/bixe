from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base_datos import Base

# Los nombres de tabla y de columna corresponden a la base de datos que ya
# existe en MySQL, creada durante el tercer avance. Los modelos se mapean
# sobre ella en lugar de inventar un esquema nuevo.

roles_permisos = Table(
    "roles_permisos",
    Base.metadata,
    Column("id_rol", ForeignKey("roles.id_rol"), primary_key=True),
    Column("id_permiso", ForeignKey("permisos.id_permiso"), primary_key=True),
)


class Permiso(Base):
    __tablename__ = "permisos"

    id: Mapped[int] = mapped_column("id_permiso", primary_key=True)
    nombre: Mapped[str] = mapped_column("nombre_permiso", String(50), unique=True)
    descripcion: Mapped[str | None] = mapped_column(String(150))


class Rol(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column("id_rol", primary_key=True)
    nombre: Mapped[str] = mapped_column("nombre_rol", String(30), unique=True)

    permisos: Mapped[list[Permiso]] = relationship(
        secondary=roles_permisos, lazy="selectin"
    )


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column("id_usuario", primary_key=True)
    nombre: Mapped[str] = mapped_column(String(30))
    apellido: Mapped[str] = mapped_column(String(30))
    tipo_documento: Mapped[str] = mapped_column(String(5))
    numero_documento: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    direccion: Mapped[str] = mapped_column(String(60))
    telefono: Mapped[str] = mapped_column(String(10))
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    contrasena_hash: Mapped[str] = mapped_column("password", String(255))
    rol_id: Mapped[int] = mapped_column("id_rol", ForeignKey("roles.id_rol"))
    estado: Mapped[str] = mapped_column(String(10), default="activo")
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    # lazy="joined": en async no puede quedar una relación perezosa que luego
    # se lea, porque dispararía E/S fuera del await (MissingGreenlet).
    rol: Mapped[Rol] = relationship(lazy="joined")

    @property
    def activo(self) -> bool:
        return self.estado == "activo"


class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column("id_producto", primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60), index=True)
    categoria: Mapped[str] = mapped_column(String(10))  # moto | auto
    cilindraje: Mapped[str | None] = mapped_column(String(20))
    potencia: Mapped[str | None] = mapped_column(String(30))
    torque: Mapped[str | None] = mapped_column(String(30))
    velocidad_maxima: Mapped[str | None] = mapped_column(String(20))
    peso: Mapped[str | None] = mapped_column(String(20))
    transmision: Mapped[str | None] = mapped_column(String(30))
    combustible: Mapped[str | None] = mapped_column(String(30))
    descripcion: Mapped[str | None] = mapped_column(String(255))
    descripcion_larga: Mapped[str | None] = mapped_column(Text)
    precio: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    imagen_url: Mapped[str | None] = mapped_column(String(255))
    estado: Mapped[str] = mapped_column(String(10), default="activo", index=True)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    # selectin es seguro en async: carga la galería en una segunda consulta,
    # no de forma perezosa cuando alguien lee el atributo.
    imagenes: Mapped[list["ProductoImagen"]] = relationship(
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="ProductoImagen.orden",
    )


class Servicio(Base):
    __tablename__ = "servicios"

    id: Mapped[int] = mapped_column("id_servicio", primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    categoria: Mapped[str] = mapped_column(String(60), default="mantenimiento")
    descripcion: Mapped[str | None] = mapped_column(String(255))
    descripcion_larga: Mapped[str | None] = mapped_column(Text)
    duracion_min: Mapped[int | None] = mapped_column(Integer)
    precio: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    imagen_url: Mapped[str | None] = mapped_column(String(255))
    estado: Mapped[str] = mapped_column(String(10), default="activo", index=True)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    imagenes: Mapped[list["ServicioImagen"]] = relationship(
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="ServicioImagen.orden",
    )


class PedidoItem(Base):
    __tablename__ = "pedido_items"

    id: Mapped[int] = mapped_column("id_item", primary_key=True)
    pedido_id: Mapped[int] = mapped_column(
        "id_pedido", ForeignKey("pedidos.id_pedido", ondelete="CASCADE"), index=True
    )
    tipo: Mapped[str] = mapped_column(String(10))  # producto | servicio
    referencia_id: Mapped[int] = mapped_column("id_referencia", Integer)
    # El nombre y el precio se congelan en el momento de la compra, para que el
    # historial no cambie si después se edita el catálogo.
    nombre: Mapped[str] = mapped_column(String(120))
    imagen_url: Mapped[str | None] = mapped_column(String(255))
    precio_unitario: Mapped[float] = mapped_column(Numeric(12, 2))
    cantidad: Mapped[int] = mapped_column(Integer, default=1)


class Pedido(Base):
    __tablename__ = "pedidos"

    id: Mapped[int] = mapped_column("id_pedido", primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        "id_usuario", ForeignKey("usuarios.id_usuario"), index=True
    )
    total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    estado: Mapped[str] = mapped_column(String(12), default="pendiente", index=True)
    # El estado del pedido (preparación) y el del pago son cosas distintas.
    estado_pago: Mapped[str] = mapped_column(String(12), default="pendiente", index=True)
    notas: Mapped[str | None] = mapped_column(String(255))
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    usuario: Mapped[Usuario] = relationship(lazy="joined")
    items: Mapped[list[PedidoItem]] = relationship(
        lazy="selectin", cascade="all, delete-orphan"
    )


class RecuperacionContrasena(Base):
    """Token de un solo uso para restablecer la contraseña olvidada."""

    __tablename__ = "recuperaciones"

    id: Mapped[int] = mapped_column("id_recuperacion", primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        "id_usuario", ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), index=True
    )
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    # Los seis dígitos que viajan en el correo. El token sigue existiendo
    # porque es lo que se canjea al final: el código solo sirve para obtenerlo.
    codigo: Mapped[str] = mapped_column(String(6), default="")

    # Intentos fallidos sobre el código. Es la única defensa real de seis
    # dígitos: sin límite, probarlos todos es cuestión de un rato.
    intentos: Mapped[int] = mapped_column(default=0)

    expira_en: Mapped[datetime] = mapped_column(DateTime)
    usado_en: Mapped[datetime | None] = mapped_column(DateTime)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class ProductoImagen(Base):
    """Fotos adicionales de un producto.

    productos.imagen_url sigue siendo la portada (la que sale en el catálogo);
    estas son las que se ven en la galería de la ficha del modelo.
    """

    __tablename__ = "producto_imagenes"

    id: Mapped[int] = mapped_column("id_imagen", primary_key=True)
    producto_id: Mapped[int] = mapped_column(
        "id_producto",
        ForeignKey("productos.id_producto", ondelete="CASCADE"),
        index=True,
    )
    url: Mapped[str] = mapped_column(String(255))
    descripcion: Mapped[str | None] = mapped_column(String(120))
    orden: Mapped[int] = mapped_column(Integer, default=0)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class Pago(Base):
    """Intento de cobro contra la pasarela.

    Del número de tarjeta solo se conservan los cuatro últimos dígitos y la
    marca. El número completo y el CVV no se guardan en ningún momento.
    """

    __tablename__ = "pagos"

    id: Mapped[int] = mapped_column("id_pago", primary_key=True)
    pedido_id: Mapped[int] = mapped_column(
        "id_pedido", ForeignKey("pedidos.id_pedido", ondelete="CASCADE"), index=True
    )
    referencia: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    metodo: Mapped[str] = mapped_column(String(20), default="tarjeta")
    marca: Mapped[str | None] = mapped_column(String(20))
    ultimos_cuatro: Mapped[str | None] = mapped_column(String(4))
    titular: Mapped[str | None] = mapped_column(String(60))
    monto: Mapped[float] = mapped_column(Numeric(12, 2))
    estado: Mapped[str] = mapped_column(String(12))
    motivo_rechazo: Mapped[str | None] = mapped_column(String(120))
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class Factura(Base):
    """Factura emitida cuando el pago queda aprobado.

    Los precios del catálogo ya incluyen IVA, así que la factura no suma nada
    al total: discrimina cuánto de ese total corresponde al impuesto.
    """

    __tablename__ = "facturas"

    id: Mapped[int] = mapped_column("id_factura", primary_key=True)
    numero: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    consecutivo: Mapped[int] = mapped_column(Integer, unique=True)
    pedido_id: Mapped[int] = mapped_column(
        "id_pedido", ForeignKey("pedidos.id_pedido", ondelete="CASCADE"), unique=True
    )
    base_gravable: Mapped[float] = mapped_column(Numeric(12, 2))
    porcentaje_iva: Mapped[float] = mapped_column(Numeric(5, 2), default=19)
    valor_iva: Mapped[float] = mapped_column(Numeric(12, 2))
    total: Mapped[float] = mapped_column(Numeric(12, 2))
    fecha_emision: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class ServicioImagen(Base):
    """Fotos adicionales de un servicio.

    servicios.imagen_url sigue siendo la portada (la de la tarjeta del
    catálogo); estas son las que se ven al abrir el detalle del servicio.
    """

    __tablename__ = "servicio_imagenes"

    id: Mapped[int] = mapped_column("id_imagen", primary_key=True)
    servicio_id: Mapped[int] = mapped_column(
        "id_servicio",
        ForeignKey("servicios.id_servicio", ondelete="CASCADE"),
        index=True,
    )
    url: Mapped[str] = mapped_column(String(255))
    descripcion: Mapped[str | None] = mapped_column(String(120))
    orden: Mapped[int] = mapped_column(Integer, default=0)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
