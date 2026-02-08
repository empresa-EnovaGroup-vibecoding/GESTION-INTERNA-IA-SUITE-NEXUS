export interface Panel {
  id: string;
  nombre: string;
  email: string;
  password: string;
  fechaCompra: string;
  fechaExpiracion: string;
  capacidadTotal: number;
  cuposUsados: number;
}

export interface Cliente {
  id: string;
  nombre: string;
  whatsapp: string;
  panelId: string;
  fechaInicio: string;
  fechaVencimiento: string; // auto: fechaInicio + 30 days
}

export interface Transaccion {
  id: string;
  tipo: 'ingreso' | 'gasto';
  concepto: string;
  monto: number;
  categoria: string;
  fecha: string;
}

export type PageView = 'dashboard' | 'paneles' | 'clientes' | 'finanzas';
