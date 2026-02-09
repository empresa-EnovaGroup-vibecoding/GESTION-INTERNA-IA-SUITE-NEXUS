export type EstadoPanel = 'activo' | 'caido';

export interface CredencialHistorial {
  email: string;
  password: string;
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
}

export interface Panel {
  id: string;
  nombre: string;
  email: string;
  password: string;
  fechaCompra: string;
  fechaExpiracion: string;
  capacidadTotal: number;
  cuposUsados: number;
  servicioAsociado: string;
  estado: EstadoPanel;
  proveedor?: string;
  costoMensual: number;
  credencialFechaInicio: string;
  historialCredenciales: CredencialHistorial[];
}

export type PaisCliente = 'Venezuela' | 'Ecuador' | 'Colombia' | 'Mexico';

export interface Cliente {
  id: string;
  nombre: string;
  whatsapp: string;
  pais?: PaisCliente;
}

export interface Servicio {
  id: string;
  nombre: string;
  precioBase: number;
}

export type EstadoSuscripcion = 'activa' | 'vencida' | 'cancelada';

export interface Suscripcion {
  id: string;
  clienteId: string;
  servicioId: string;
  panelId?: string;
  estado: EstadoSuscripcion;
  fechaInicio: string;
  fechaVencimiento: string; // auto: fechaInicio + 30 days
  precioCobrado: number;
  credencialEmail?: string;
  credencialPassword?: string;
  notas?: string;
}

export interface Transaccion {
  id: string;
  tipo: 'ingreso' | 'gasto';
  concepto: string;
  monto: number;
  categoria: string;
  fecha: string;
}

export type MetodoPago = 'Binance Pay' | 'Binance P2P' | 'Transferencia bancaria' | 'Zelle' | 'Nequi' | 'Mercado Pago' | 'PayPal' | 'Efectivo';

export type MonedaPago = 'USD' | 'MXN' | 'COP';

export interface Pago {
  id: string;
  clienteId: string;
  monto: number; // always in USD
  montoOriginal?: number; // amount in original currency
  moneda?: MonedaPago; // original currency
  tasaCambio?: number; // 1 USD = X local currency
  metodo: MetodoPago;
  fecha: string;
}

export type PageView = 'dashboard' | 'paneles' | 'clientes' | 'finanzas' | 'servicios';
