import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  UserPlus, PlayCircle, XCircle, AlertTriangle,
  DollarSign, RefreshCw, Clock,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HistorialEvent {
  fecha: string;
  tipo: 'registro' | 'asignacion' | 'pago' | 'renovacion' | 'cancelacion' | 'vencimiento';
  descripcion: string;
  detalle?: string;
}

const EVENT_CONFIG: Record<HistorialEvent['tipo'], { icon: typeof UserPlus; color: string; label: string }> = {
  registro:    { icon: UserPlus,      color: 'text-emerald-500', label: 'Registro' },
  asignacion:  { icon: PlayCircle,    color: 'text-sky-500',     label: 'Servicio asignado' },
  pago:        { icon: DollarSign,    color: 'text-blue-500',    label: 'Pago recibido' },
  renovacion:  { icon: RefreshCw,     color: 'text-green-500',   label: 'Renovación' },
  cancelacion: { icon: XCircle,       color: 'text-destructive', label: 'Cancelación' },
  vencimiento: { icon: AlertTriangle, color: 'text-warning',     label: 'Vencimiento' },
};

interface Props {
  clienteId: string;
}

export default function ClienteHistorial({ clienteId }: Props) {
  const { suscripciones, pagos, getServicioById, getPanelById } = useData();

  const events = useMemo(() => {
    const items: HistorialEvent[] = [];
    const clienteSubs = suscripciones.filter(s => s.clienteId === clienteId);
    const clientePagos = pagos.filter(p => p.clienteId === clienteId);

    // Find registration date (earliest subscription start)
    if (clienteSubs.length > 0) {
      const earliest = [...clienteSubs].sort(
        (a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
      )[0];
      items.push({
        fecha: earliest.fechaInicio,
        tipo: 'registro',
        descripcion: 'Cliente registrado',
      });
    }

    // Subscriptions
    for (const sub of clienteSubs) {
      const servicio = getServicioById(sub.servicioId);
      const panel = sub.panelId ? getPanelById(sub.panelId) : null;
      const servicioNombre = servicio?.nombre || 'Servicio desconocido';
      const panelInfo = panel ? ` (Panel: ${panel.nombre})` : '';

      // Assignment event
      items.push({
        fecha: sub.fechaInicio,
        tipo: 'asignacion',
        descripcion: `${servicioNombre} asignado`,
        detalle: `$${sub.precioCobrado} USD${panelInfo}`,
      });

      // If the subscription start is significantly later than registration,
      // it might be a renewal (fechaInicio updated)
      // We detect renewals by checking if fechaVencimiento is ~30 days from fechaInicio
      // and fechaInicio is NOT the earliest date for this service
      const sameSvcSubs = clienteSubs
        .filter(s => s.servicioId === sub.servicioId && s.id !== sub.id);
      const isRenewal = sameSvcSubs.some(s =>
        new Date(s.fechaInicio).getTime() < new Date(sub.fechaInicio).getTime()
      );
      if (isRenewal) {
        items.push({
          fecha: sub.fechaInicio,
          tipo: 'renovacion',
          descripcion: `${servicioNombre} renovado`,
          detalle: `Vence: ${format(new Date(sub.fechaVencimiento), 'dd MMM yyyy', { locale: es })}`,
        });
      }

      // Cancellation
      if (sub.estado === 'cancelada') {
        items.push({
          fecha: sub.fechaVencimiento,
          tipo: 'cancelacion',
          descripcion: `${servicioNombre} cancelado`,
        });
      }

      // Expiration (vencida)
      if (sub.estado === 'vencida') {
        items.push({
          fecha: sub.fechaVencimiento,
          tipo: 'vencimiento',
          descripcion: `${servicioNombre} venció`,
        });
      }

      // Active but past due
      if (sub.estado === 'activa' && new Date(sub.fechaVencimiento) < new Date()) {
        items.push({
          fecha: sub.fechaVencimiento,
          tipo: 'vencimiento',
          descripcion: `${servicioNombre} venció (sin renovar)`,
        });
      }
    }

    // Payments
    for (const pago of clientePagos) {
      const monedaInfo = pago.montoOriginal && pago.moneda && pago.moneda !== 'USD'
        ? ` (${pago.montoOriginal} ${pago.moneda})`
        : '';
      items.push({
        fecha: pago.fecha,
        tipo: 'pago',
        descripcion: `Pago de $${pago.monto} USD${monedaInfo}`,
        detalle: `Método: ${pago.metodo}`,
      });
    }

    // Sort descending (most recent first), deduplicate registro if same date as first asignacion
    items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return items;
  }, [clienteId, suscripciones, pagos, getServicioById, getPanelById]);

  if (events.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        Sin actividad registrada
      </p>
    );
  }

  return (
    <ScrollArea className="max-h-64">
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-3">
          {events.map((ev, idx) => {
            const config = EVENT_CONFIG[ev.tipo];
            const Icon = config.icon;
            return (
              <div key={idx} className="relative flex items-start gap-3">
                {/* Dot/icon */}
                <div className={`absolute -left-6 mt-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-background border border-border ${config.color}`}>
                  <Icon className="h-3 w-3" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{ev.descripcion}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(ev.fecha), 'dd MMM yyyy', { locale: es })}
                    </span>
                  </div>
                  {ev.detalle && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{ev.detalle}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
