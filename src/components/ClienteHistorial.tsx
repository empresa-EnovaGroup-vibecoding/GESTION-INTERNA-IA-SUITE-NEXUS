import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  UserPlus, PlayCircle, XCircle, AlertTriangle,
  DollarSign, RefreshCw,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HistorialEvent {
  fecha: string;
  tipo: 'registro' | 'asignacion' | 'pago' | 'renovacion' | 'cancelacion' | 'vencimiento';
  descripcion: string;
  detalle?: string;
}

const EVENT_CONFIG: Record<HistorialEvent['tipo'], { icon: typeof UserPlus; color: string }> = {
  registro:    { icon: UserPlus,      color: 'text-emerald-500' },
  asignacion:  { icon: PlayCircle,    color: 'text-sky-500' },
  pago:        { icon: DollarSign,    color: 'text-blue-500' },
  renovacion:  { icon: RefreshCw,     color: 'text-green-500' },
  cancelacion: { icon: XCircle,       color: 'text-destructive' },
  vencimiento: { icon: AlertTriangle, color: 'text-warning' },
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

    // Registration date = earliest subscription start
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

    for (const sub of clienteSubs) {
      const servicio = getServicioById(sub.servicioId);
      const panel = sub.panelId ? getPanelById(sub.panelId) : null;
      const nombre = servicio?.nombre || 'Servicio desconocido';
      const panelInfo = panel ? ` · Panel: ${panel.nombre}` : '';

      // Assignment
      items.push({
        fecha: sub.fechaInicio,
        tipo: 'asignacion',
        descripcion: `${nombre} asignado`,
        detalle: `$${sub.precioCobrado} USD${panelInfo}`,
      });

      // Detect renewal: same service has an older subscription
      const isRenewal = clienteSubs.some(
        s => s.servicioId === sub.servicioId && s.id !== sub.id &&
          new Date(s.fechaInicio).getTime() < new Date(sub.fechaInicio).getTime()
      );
      if (isRenewal) {
        items.push({
          fecha: sub.fechaInicio,
          tipo: 'renovacion',
          descripcion: `${nombre} renovado`,
          detalle: `Vence: ${format(new Date(sub.fechaVencimiento), 'dd MMM yyyy', { locale: es })}`,
        });
      }

      // Cancellation
      if (sub.estado === 'cancelada') {
        items.push({
          fecha: sub.fechaVencimiento,
          tipo: 'cancelacion',
          descripcion: `${nombre} cancelado`,
        });
      }

      // Expired
      if (sub.estado === 'vencida' || (sub.estado === 'activa' && new Date(sub.fechaVencimiento) < new Date())) {
        items.push({
          fecha: sub.fechaVencimiento,
          tipo: 'vencimiento',
          descripcion: `${nombre} venció${sub.estado === 'activa' ? ' (sin renovar)' : ''}`,
        });
      }
    }

    // Payments
    for (const pago of clientePagos) {
      const monedaExtra = pago.montoOriginal && pago.moneda && pago.moneda !== 'USD'
        ? ` (${pago.montoOriginal} ${pago.moneda})`
        : '';
      items.push({
        fecha: pago.fecha,
        tipo: 'pago',
        descripcion: `Pago de $${pago.monto} USD${monedaExtra}`,
        detalle: `Método: ${pago.metodo}`,
      });
    }

    // Sort descending
    items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return items;
  }, [clienteId, suscripciones, pagos, getServicioById, getPanelById]);

  if (events.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">Sin actividad registrada</p>
    );
  }

  return (
    <ScrollArea className="max-h-64">
      <div className="relative pl-6">
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
        <div className="space-y-3 py-1">
          {events.map((ev, idx) => {
            const config = EVENT_CONFIG[ev.tipo];
            const Icon = config.icon;
            return (
              <div key={idx} className="relative flex items-start gap-3">
                <div className={`absolute -left-6 mt-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-background border border-border ${config.color}`}>
                  <Icon className="h-3 w-3" />
                </div>
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
