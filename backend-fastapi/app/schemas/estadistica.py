from datetime import date, datetime

from pydantic import BaseModel, Field


class ConteoPorEstado(BaseModel):
    estado: str
    total: int
    monto: float = 0


class ConteoPorRol(BaseModel):
    rol_id: int
    rol: str
    total: int


class VentaMensual(BaseModel):
    mes: str = Field(description="Formato AAAA-MM.")
    pedidos: int
    ingresos: float


class ArticuloVendido(BaseModel):
    nombre: str
    tipo: str
    unidades: int
    monto: float


class PedidoReciente(BaseModel):
    id: int
    cliente: str
    total: float
    estado: str
    fecha_creacion: datetime


class ResumenEntidad(BaseModel):
    total: int = 0
    activos: int = 0


class ResumenPedidos(BaseModel):
    total: int = 0
    ingresos: float = 0


class Estadisticas(BaseModel):
    """Cifras que alimentan el panel de Administrador y el de Empleado."""

    usuarios: ResumenEntidad
    usuarios_por_rol: list[ConteoPorRol]
    productos: ResumenEntidad
    servicios: ResumenEntidad
    pedidos: ResumenPedidos
    pedidos_por_estado: list[ConteoPorEstado]
    ventas_por_mes: list[VentaMensual]
    mas_vendidos: list[ArticuloVendido]
    pedidos_recientes: list[PedidoReciente]


# ============================ Quinto avance ============================
# Los dashboards de ventas y de PQR. Todo sale de la tabla de ventas: un
# pedido pendiente o cancelado no es dinero que haya entrado.


class ResumenVentas(BaseModel):
    ventas: int = 0
    ingresos: float = 0
    impuesto: float = 0
    descuento: float = 0
    clientes: int = 0
    ticket_promedio: float = 0


class PuntoSerie(BaseModel):
    periodo: str = Field(description="AAAA-MM-DD si se agrupa por día, AAAA-MM por mes.")
    ventas: int = 0
    ingresos: float = 0


class VentasPorCanal(BaseModel):
    canal: str
    ventas: int
    ingresos: float


class VentaReciente(BaseModel):
    id: int
    numero: str
    cliente: str
    total: float
    estado: str
    canal: str
    fecha: datetime


class ResumenFacturacion(BaseModel):
    total: int = 0
    facturado: float = 0


class ConteoPorEstadoSimple(BaseModel):
    estado: str
    total: int


class ResumenPqr(BaseModel):
    total: int = 0
    pendientes: int = 0
    por_estado: list[ConteoPorEstadoSimple] = []


class PanelDeVentas(BaseModel):
    """Lo que pinta el dashboard de ventas, en una sola petición."""

    desde: date
    hasta: date
    agrupar: str
    resumen: ResumenVentas
    serie: list[PuntoSerie]
    top_articulos: list[ArticuloVendido]
    por_canal: list[VentasPorCanal]
    ultimas: list[VentaReciente]
    facturacion: ResumenFacturacion
    pqr: ResumenPqr


class ResumenPqrCliente(BaseModel):
    total: int = 0
    pendientes: int = 0


class PanelDelCliente(BaseModel):
    """El dashboard del cliente: solo sus propias cifras."""

    compras: ResumenVentas
    serie: list[PuntoSerie]
    top_articulos: list[ArticuloVendido]
    ultimas: list[VentaReciente]
    pqr: ResumenPqrCliente
