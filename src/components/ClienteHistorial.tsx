import { useMemo, useState } from 'react';
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

type EventTipo = HistorialEvent['tipo'];

const FILTER_LABELS: Record<EventTipo, string> = {
  registro: 'Registro',
  asignacion: 'Asignaciones',
  pago: 'Pagos',
  renovacion: 'Renovaciones',
  cancelacion: 'Cancelaciones',
  vencimiento: 'Vencimientos',
};

const EVENT_CONFIG: Record<EventTipo, { icon: typeof UserPlus; color: string; filterColor: string }> = {
  registro:    { icon: UserPlus,      color: 'text-emerald-500', filterColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  asignacion:  { icon: PlayCircle,    color: 'text-sky-500',     filterColor: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30' },
  pago:        { icon: DollarSign,    color: 'text-primary',     filterColor: 'bg-primary/15 text-primary border-primary/30' },
  renovacion:  { icon: RefreshCw,     color: 'text-green-500',   filterColor: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' },
  cancelacion: { icon: XCircle,       color: 'text-destructive', filterColor: 'bg-destructive/15 text-destructive border-destructive/30' },
  vencimiento: { icon: AlertTriangle, color: 'text-warning',     filterColor: 'bg-warning/15 text-warning border-warning/30' },
};

interface Props {
  clienteId: string;
}

export default function ClienteHistorial({ clienteId }: Props) {
  const { suscripciones, pagos, getServicioById, getPanelById } = useData();
  const [activeFilter, setActiveFilter] = useState<EventTipo | null>(null);

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

  // Count events by type for filter badges
  const eventCounts = useMemo(() => {
    const counts: Partial<Record<EventTipo, number>> = {};
    for (const ev of events) {
      counts[ev.tipo] = (counts[ev.tipo] || 0) + 1;
    }
    return counts;
  }, [events]);

  const filteredEvents = useMemo(
    () => activeFilter ? events.filter(ev => ev.tipo === activeFilter) : events,
    [events, activeFilter]
  );

  // Available filter types (only show types that have events)
  const availableTypes = useMemo(
    () => (Object.keys(FILTER_LABELS) as EventTipo[]).filter(t => (eventCounts[t] || 0) > 0),
    [eventCounts]
  );

  if (events.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">Sin actividad registrada</p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveFilter(null)}
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${
            activeFilter === null
              ? 'bg-foreground/10 text-foreground border-foreground/20'
              : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
          }`}
        >
          Todos ({events.length})
        </button>
        {availableTypes.map(tipo => {
          const config = EVENT_CONFIG[tipo];
          const Icon = config.icon;
          const isActive = activeFilter === tipo;
          return (
            <button
              key={tipo}
              onClick={() => setActiveFilter(isActive ? null : tipo)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${
                isActive ? config.filterColor : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
              }`}
            >
              <Icon className="h-3 w-3" />
              {FILTER_LABELS[tipo]} ({eventCounts[tipo]})
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <ScrollArea className="max-h-64">
        <div className="relative pl-6">
          <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
          <div className="space-y-3 py-1">
            {filteredEvents.map((ev, idx) => {
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
    </div>
  );
}
