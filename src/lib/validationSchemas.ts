import { z } from 'zod';

export const PanelSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido').max(100),
  email: z.string().trim().email('Email inválido').max(255),
  password: z.string().min(1, 'Contraseña requerida').max(500),
  fechaCompra: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  fechaExpiracion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  capacidadTotal: z.number().int().positive('Debe ser positivo').max(1000),
  servicioAsociado: z.string().max(255).default(''),
  estado: z.enum(['activo', 'caido']).default('activo'),
  proveedor: z.string().max(255).optional(),
  costoMensual: z.number().min(0, 'No puede ser negativo'),
  credencialFechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').optional(),
  notas: z.string().max(2000).optional(),
});

export const ClienteSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido').max(200),
  whatsapp: z.string().trim().min(1, 'WhatsApp requerido').max(30),
  pais: z.enum(['Venezuela', 'Ecuador', 'Colombia', 'Mexico']).optional(),
});

export const ServicioSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido').max(200),
  precioBase: z.number().min(0, 'No puede ser negativo'),
  precioRefMXN: z.number().min(0).optional(),
  precioRefCOP: z.number().min(0).optional(),
});

export const SuscripcionSchema = z.object({
  clienteId: z.string().uuid('ID de cliente inválido'),
  servicioId: z.string().uuid('ID de servicio inválido'),
  panelId: z.string().uuid('ID de panel inválido').optional(),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  precioCobrado: z.number().min(0, 'No puede ser negativo'),
  precioLocal: z.number().min(0).optional(),
  monedaLocal: z.enum(['MXN', 'COP']).optional(),
  credencialEmail: z.string().max(255).optional(),
  credencialPassword: z.string().max(500).optional(),
  notas: z.string().max(2000).optional(),
});

export const PagoSchema = z.object({
  clienteId: z.string().uuid('ID de cliente inválido'),
  monto: z.number().min(0, 'No puede ser negativo'),
  montoOriginal: z.number().min(0).optional(),
  moneda: z.enum(['USD', 'MXN', 'COP']).optional(),
  tasaCambio: z.number().positive().optional(),
  metodo: z.enum(['Binance Pay', 'Binance P2P', 'Transferencia bancaria', 'Zelle', 'Nequi', 'Mercado Pago', 'PayPal', 'Efectivo']),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  corteId: z.string().uuid().optional(),
});

export const CorteSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  pais: z.enum(['Mexico', 'Colombia']),
  moneda: z.enum(['MXN', 'COP']),
  totalRecaudado: z.number().min(0),
  comisionPorcentaje: z.number().min(0).max(100),
  totalDespuesComision: z.number().min(0),
  tasaBinance: z.number().min(0),
  usdtCalculado: z.number().min(0),
  usdtRecibidoReal: z.number().min(0),
  notas: z.string().max(2000).optional(),
});

/** Safely validate data against schema. Throws with user-friendly message on failure. */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Datos inválidos: ${message}`);
  }
  return data as T;
}
