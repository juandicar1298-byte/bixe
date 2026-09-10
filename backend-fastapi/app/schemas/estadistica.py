from datetime import datetime

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
