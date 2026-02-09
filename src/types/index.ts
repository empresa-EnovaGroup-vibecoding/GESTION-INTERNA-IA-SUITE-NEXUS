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
  precioRefMXN?: number;
  precioRefCOP?: number;
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
  precioCobrado: number; // always in USD — used for all financial calculations
  precioLocal?: number; // optional reference price in client's local currency
  monedaLocal?: 'MXN' | 'COP'; // only set for Mexico/Colombia
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
  corteId?: string; // linked to a Corte for currency conversion
}

export interface Corte {
  id: string;
  fecha: string;
  pais: 'Mexico' | 'Colombia';
  moneda: 'MXN' | 'COP';
  totalRecaudado: number;
  comisionPorcentaje: number;
  totalDespuesComision: number;
  tasaBinance: number;
  usdtCalculado: number;
  usdtRecibidoReal: number;
  notas?: string;
  pagosIds: string[];
}

export type PageView = 'dashboard' | 'paneles' | 'clientes' | 'finanzas' | 'servicios';
