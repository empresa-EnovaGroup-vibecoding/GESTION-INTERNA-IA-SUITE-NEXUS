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

export interface Cliente {
  id: string;
  nombre: string;
  whatsapp: string;
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
  panelId: string;
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

export type MetodoPago = 'Transferencia' | 'Zelle' | 'PayPal' | 'Binance' | 'Efectivo';

export interface Pago {
  id: string;
  clienteId: string;
  monto: number;
  metodo: MetodoPago;
  fecha: string;
}

export type PageView = 'dashboard' | 'paneles' | 'clientes' | 'finanzas' | 'servicios';
