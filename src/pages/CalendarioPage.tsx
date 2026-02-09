import { useState, useMemo, useCallback, DragEvent } from 'react';
import { useData } from '@/contexts/DataContext';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, eachDayOfInterval, isToday, isSameMonth,
  addDays, getDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, RefreshCw, CreditCard,
  UserPlus, AlertTriangle, X, Scissors, GripVertical,
  Filter, DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Suscripcion, Pago, Cliente } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ViewMode = 'month' | 'week';
type EventFilter = 'todo' | 'pagos' | 'vencimientos' | 'renovaciones' | 'nuevos';

interface DayEvents {
  date: Date;
  renovaciones: { sub: Suscripcion; cliente: Cliente }[];
  vencimientos: { sub: Suscripcion; cliente: Cliente }[];
  pagos: Pago[];
  nuevosClientes: Cliente[];
  suscripcionesCreadas: { sub: Suscripcion; cliente: Cliente; servicioNombre: string }[];
}

interface DragData {
  type: 'renovacion' | 'vencimiento' | 'pago' | 'nuevo';
  id: string;
}

const FILTER_OPTIONS: { value: EventFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'todo', label: 'Todo', icon: <Filter className="h-3 w-3" /> },
  { value: 'pagos', label: 'Pagos', icon: <CreditCard className="h-3 w-3" /> },
  { value: 'vencimientos', label: 'Vencimientos', icon: <AlertTriangle className="h-3 w-3" /> },
  { value: 'renovaciones', label: 'Renovaciones', icon: <RefreshCw className="h-3 w-3" /> },
  { value: 'nuevos', label: 'Nuevos clientes', icon: <UserPlus className="h-3 w-3" /> },
];

export default function CalendarioPage() {
  const {
    clientes, suscripciones, pagos,
    getServicioById, updateSuscripcion, updatePago,
  } = useData();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDay, setSelectedDay] = useState<DayEvents | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<EventFilter>('todo');

  const getCliente = useCallback((id: string) => clientes.find(c => c.id === id), [clientes]);

  // Build events for a single date
  const buildDayEvents = useCallback((date: Date): DayEvents => {
    const dateStr = format(date, 'yyyy-MM-dd');

    const renovaciones: DayEvents['renovaciones'] = [];
    const suscripcionesCreadas: DayEvents['suscripcionesCreadas'] = [];

    suscripciones.forEach(s => {
      if (s.fechaInicio === dateStr && s.estado === 'activa') {
        const cliente = getCliente(s.clienteId);
        if (!cliente) return;

        const servicio = getServicioById(s.servicioId);
        const servicioNombre = servicio?.nombre || 'Sin servicio';

        // It's a renewal if there's an older sub with the same service
        const isRenewal = suscripciones.some(
          other => other.clienteId === s.clienteId && other.servicioId === s.servicioId &&
            other.id !== s.id && new Date(other.fechaInicio).getTime() < new Date(s.fechaInicio).getTime()
        );

        if (isRenewal) {
          renovaciones.push({ sub: s, cliente });
        }

        suscripcionesCreadas.push({ sub: s, cliente, servicioNombre });
      }
    });

    const vencimientos: DayEvents['vencimientos'] = [];
    suscripciones.forEach(s => {
      if (s.fechaVencimiento === dateStr) {
        const cliente = getCliente(s.clienteId);
        if (cliente) vencimientos.push({ sub: s, cliente });
      }
    });

    const pagosDelDia = pagos.filter(p => p.fecha === dateStr);

    const nuevosClientes: Cliente[] = [];
    const clientesConPrimeraSub = new Map<string, string>();
    suscripciones.forEach(s => {
      const existing = clientesConPrimeraSub.get(s.clienteId);
      if (!existing || s.fechaInicio < existing) {
        clientesConPrimeraSub.set(s.clienteId, s.fechaInicio);
      }
    });
    clientesConPrimeraSub.forEach((firstDate, clienteId) => {
      if (firstDate === dateStr) {
        const cliente = getCliente(clienteId);
        if (cliente) nuevosClientes.push(cliente);
      }
    });

    return { date, renovaciones, vencimientos, pagos: pagosDelDia, nuevosClientes, suscripcionesCreadas };
  }, [suscripciones, pagos, clientes, getCliente, getServicioById]);

  // Count events based on active filter
  const getFilteredEventCount = useCallback((events: DayEvents): number => {
    switch (activeFilter) {
      case 'pagos': return events.pagos.length;
      case 'vencimientos': return events.vencimientos.length;
      case 'renovaciones': return events.renovaciones.length;
      case 'nuevos': return events.nuevosClientes.length;
      default:
        return events.renovaciones.length + events.vencimientos.length +
          events.pagos.length + events.nuevosClientes.length;
    }
  }, [activeFilter]);

  // Get event badge color for a day
  const getDayBadgeColor = useCallback((events: DayEvents): string => {
    if (activeFilter === 'pagos') return events.pagos.length > 0 ? 'bg-primary text-primary-foreground' : '';
    if (activeFilter === 'vencimientos') return events.vencimientos.length > 0 ? 'bg-destructive text-destructive-foreground' : '';
    if (activeFilter === 'renovaciones') return events.renovaciones.length > 0 ? 'bg-success text-white' : '';
    if (activeFilter === 'nuevos') return events.nuevosClientes.length > 0 ? 'bg-warning text-white' : '';

    // "todo" mode: priority color
    if (events.vencimientos.length > 0) return 'bg-destructive text-destructive-foreground';
    if (events.pagos.length > 0) return 'bg-primary text-primary-foreground';
    if (events.renovaciones.length > 0) return 'bg-success text-white';
    if (events.nuevosClientes.length > 0) return 'bg-warning text-white';
    return '';
  }, [activeFilter]);

  // Calendar days for month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd }).map(date => ({
      date,
      inMonth: isSameMonth(date, currentDate),
      events: buildDayEvents(date),
    }));
  }, [currentDate, buildDayEvents]);

  // Week days
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd }).map(date => ({
      date,
      events: buildDayEvents(date),
    }));
  }, [currentDate, buildDayEvents]);

  const weekSummary = useMemo(() => {
    let totalPagos = 0, totalMXN = 0, totalCOP = 0, renovaciones = 0, vencimientos = 0;
    weekDays.forEach(d => {
      totalPagos += d.events.pagos.length;
      d.events.pagos.forEach(p => {
        if (p.moneda === 'MXN') totalMXN += p.montoOriginal || 0;
        if (p.moneda === 'COP') totalCOP += p.montoOriginal || 0;
      });
      renovaciones += d.events.renovaciones.length;
      vencimientos += d.events.vencimientos.length;
    });
    return { totalPagos, totalMXN, totalCOP, renovaciones, vencimientos };
  }, [weekDays]);

  // ─── Drag-and-Drop handlers ───────────────────────────────────
  const handleDragStart = (e: DragEvent, data: DragData) => {
    e.dataTransfer.setData('application/json', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateStr);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (e: DragEvent, targetDateStr: string) => {
    e.preventDefault();
    setDragOverDate(null);

    let data: DragData;
    try {
      data = JSON.parse(e.dataTransfer.getData('application/json'));
    } catch {
      return;
    }

    switch (data.type) {
      case 'vencimiento': {
        const sub = suscripciones.find(s => s.id === data.id);
        if (sub && sub.fechaVencimiento !== targetDateStr) {
          updateSuscripcion({ ...sub, fechaVencimiento: targetDateStr });
          const cliente = getCliente(sub.clienteId);
          toast.success(`Vencimiento de ${cliente?.nombre} movido al ${format(new Date(targetDateStr), 'dd MMM', { locale: es })}`);
        }
        break;
      }
      case 'renovacion': {
        const sub = suscripciones.find(s => s.id === data.id);
        if (sub && sub.fechaInicio !== targetDateStr) {
          const newVenc = format(addDays(new Date(targetDateStr), 30), 'yyyy-MM-dd');
          updateSuscripcion({ ...sub, fechaInicio: targetDateStr, fechaVencimiento: newVenc });
          const cliente = getCliente(sub.clienteId);
          toast.success(`Renovación de ${cliente?.nombre} movida al ${format(new Date(targetDateStr), 'dd MMM', { locale: es })}`);
        }
        break;
      }
      case 'pago': {
        const pago = pagos.find(p => p.id === data.id);
        if (pago && pago.fecha !== targetDateStr) {
          updatePago({ ...pago, fecha: targetDateStr });
          const cliente = getCliente(pago.clienteId);
          toast.success(`Pago de ${cliente?.nombre} movido al ${format(new Date(targetDateStr), 'dd MMM', { locale: es })}`);
        }
        break;
      }
      case 'nuevo': {
        const clienteSubs = suscripciones.filter(s => s.clienteId === data.id);
        const firstSub = clienteSubs.reduce<Suscripcion | null>((first, s) =>
          !first || s.fechaInicio < first.fechaInicio ? s : first, null);
        if (firstSub && firstSub.fechaInicio !== targetDateStr) {
          const newVenc = format(addDays(new Date(targetDateStr), 30), 'yyyy-MM-dd');
          updateSuscripcion({ ...firstSub, fechaInicio: targetDateStr, fechaVencimiento: newVenc });
          const cliente = getCliente(data.id);
          toast.success(`Registro de ${cliente?.nombre} movido al ${format(new Date(targetDateStr), 'dd MMM', { locale: es })}`);
        }
        break;
      }
    }
    setSelectedDay(null);
  };

  const handleRenovar = (sub: Suscripcion) => {
    const cliente = getCliente(sub.clienteId);
    const newFecha = format(addDays(new Date(sub.fechaVencimiento), 30), 'yyyy-MM-dd');
    updateSuscripcion({ ...sub, fechaVencimiento: newFecha, estado: 'activa' });
    toast.success(`${cliente?.nombre || 'Cliente'} renovado hasta ${format(new Date(newFecha), 'dd MMM yyyy', { locale: es })}`);
    setSelectedDay(null);
  };

  const mesLabel = format(currentDate, 'MMMM yyyy', { locale: es });
  const weekLabel = useMemo(() => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    const we = endOfWeek(currentDate, { weekStartsOn: 1 });
    return `${format(ws, 'dd MMM', { locale: es })} – ${format(we, 'dd MMM yyyy', { locale: es })}`;
  }, [currentDate]);

  const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // ─── Draggable chip ───────────────────────────────────────────
  const EventChip = ({
    label, color, dragData, compact = false,
  }: {
    label: string; color: string; dragData: DragData; compact?: boolean;
  }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, dragData)}
      className={`flex items-center gap-1 rounded px-1.5 py-0.5 cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-md ${color} ${compact ? 'text-[9px]' : 'text-[10px]'}`}
      title={`Arrastrar: ${label}`}
    >
      <GripVertical className={compact ? 'h-2.5 w-2.5 shrink-0 opacity-40' : 'h-3 w-3 shrink-0 opacity-40'} />
      <span className="truncate">{label}</span>
    </div>
  );

  // Build filtered chip list
  const buildChips = (events: DayEvents, max: number) => {
    const chips: { label: string; color: string; dragData: DragData }[] = [];

    if (activeFilter === 'todo' || activeFilter === 'renovaciones') {
      events.renovaciones.forEach(({ sub, cliente }) =>
        chips.push({ label: `↻ ${cliente.nombre}`, color: 'bg-success/15 text-success', dragData: { type: 'renovacion', id: sub.id } })
      );
    }
    if (activeFilter === 'todo' || activeFilter === 'vencimientos') {
      events.vencimientos.forEach(({ sub, cliente }) =>
        chips.push({ label: `⚠ ${cliente.nombre}`, color: 'bg-destructive/15 text-destructive', dragData: { type: 'vencimiento', id: sub.id } })
      );
    }
    if (activeFilter === 'todo' || activeFilter === 'pagos') {
      events.pagos.forEach(p => {
        const c = getCliente(p.clienteId);
        chips.push({ label: `$ ${c?.nombre || '?'}`, color: 'bg-primary/15 text-primary', dragData: { type: 'pago', id: p.id } });
      });
    }
    if (activeFilter === 'todo' || activeFilter === 'nuevos') {
      events.nuevosClientes.forEach(c =>
        chips.push({ label: `+ ${c.nombre}`, color: 'bg-warning/15 text-warning', dragData: { type: 'nuevo', id: c.id } })
      );
    }

    return { visible: chips.slice(0, max), overflow: Math.max(0, chips.length - max) };
  };

  // Day total USD
  const getDayTotal = (events: DayEvents) => {
    return events.pagos.reduce((sum, p) => sum + p.monto, 0);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold">Calendario</h1>
          <p className="text-sm text-muted-foreground">Arrastra eventos entre días para reprogramar</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-card overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Semana
            </button>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => viewMode === 'month' ? setCurrentDate(d => subMonths(d, 1)) : setCurrentDate(d => addDays(d, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium capitalize min-w-[140px] text-center">
              {viewMode === 'month' ? mesLabel : weekLabel}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => viewMode === 'month' ? setCurrentDate(d => addMonths(d, 1)) : setCurrentDate(d => addDays(d, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setActiveFilter(opt.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border',
              activeFilter === opt.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Renovaciones</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> Vencimientos</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Pagos</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> Nuevos clientes</span>
        <span className="flex items-center gap-1 ml-2 text-muted-foreground/60">
          <GripVertical className="h-3 w-3" /> Arrastra para mover
        </span>
      </div>

      {/* ═══ MONTHLY VIEW ═══ */}
      {viewMode === 'month' && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {DOW.map(d => (
              <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map(({ date, inMonth, events }, i) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const { visible, overflow } = buildChips(events, 3);
              const isDragTarget = dragOverDate === dateStr;
              const filteredCount = getFilteredEventCount(events);
              const badgeColor = getDayBadgeColor(events);
              const hasEvents = filteredCount > 0;

              return (
                <div
                  key={i}
                  onDragOver={(e) => handleDragOver(e, dateStr)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dateStr)}
                  onClick={() => {
                    // Always allow opening detail for any day (shows empty state too)
                    const totalAll = events.renovaciones.length + events.vencimientos.length + events.pagos.length + events.nuevosClientes.length;
                    if (totalAll > 0) setSelectedDay(events);
                  }}
                  className={cn(
                    'min-h-[88px] p-1.5 border-b border-r border-border text-left transition-all relative',
                    inMonth ? 'bg-card' : 'bg-muted/30',
                    isDragTarget && 'bg-primary/10 ring-2 ring-inset ring-primary/50',
                    isToday(date) && 'ring-2 ring-inset ring-primary',
                    hasEvents && 'cursor-pointer hover:bg-accent/30',
                  )}
                >
                  <div className="flex items-start justify-between mb-0.5">
                    <span className={cn(
                      'text-xs font-medium',
                      isToday(date) ? 'text-primary font-bold' : inMonth ? 'text-foreground' : 'text-muted-foreground/50'
                    )}>
                      {format(date, 'd')}
                    </span>
                    {/* Event count badge */}
                    {inMonth && filteredCount > 0 && (
                      <span className={cn(
                        'text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center',
                        badgeColor
                      )}>
                        {filteredCount}
                      </span>
                    )}
                  </div>
                  {inMonth && (
                    <div className="space-y-0.5">
                      {visible.map((chip, ci) => (
                        <EventChip key={ci} {...chip} compact />
                      ))}
                      {overflow > 0 && (
                        <p className="text-[8px] text-muted-foreground text-center">+{overflow} más</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ WEEKLY VIEW ═══ */}
      {viewMode === 'week' && (
        <div className="space-y-4">
          {/* Week summary */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Resumen de la Semana</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{weekSummary.totalPagos} pagos</p>
                  {weekSummary.totalMXN > 0 && <p className="text-[10px] text-muted-foreground">{weekSummary.totalMXN.toLocaleString()} MXN</p>}
                  {weekSummary.totalCOP > 0 && <p className="text-[10px] text-muted-foreground">{weekSummary.totalCOP.toLocaleString()} COP</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-success" />
                <p className="font-medium">{weekSummary.renovaciones} renovaciones</p>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <p className="font-medium">{weekSummary.vencimientos} vencimientos</p>
              </div>
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-warning" />
                <p className="font-medium">{weekDays.reduce((s, d) => s + d.events.nuevosClientes.length, 0)} nuevos</p>
              </div>
            </div>
            {(weekSummary.totalMXN > 0 || weekSummary.totalCOP > 0) && (
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  <Scissors className="h-3.5 w-3.5 inline mr-1" />
                  Pendiente de convertir
                  {weekSummary.totalMXN > 0 && <span className="ml-1 font-medium">{weekSummary.totalMXN.toLocaleString()} MXN</span>}
                  {weekSummary.totalMXN > 0 && weekSummary.totalCOP > 0 && ' · '}
                  {weekSummary.totalCOP > 0 && <span className="font-medium">{weekSummary.totalCOP.toLocaleString()} COP</span>}
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Scissors className="h-3.5 w-3.5" />
                  Ir a Corte Semanal
                </Button>
              </div>
            )}
          </div>

          {/* Day columns */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(({ date, events }) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const dayName = format(date, 'EEE', { locale: es });
              const isSat = getDay(date) === 6;
              const isDragTarget = dragOverDate === dateStr;
              const { visible } = buildChips(events, 99);
              const filteredCount = getFilteredEventCount(events);
              const badgeColor = getDayBadgeColor(events);

              return (
                <div
                  key={dateStr}
                  onDragOver={(e) => handleDragOver(e, dateStr)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dateStr)}
                  onClick={() => {
                    const totalAll = events.renovaciones.length + events.vencimientos.length + events.pagos.length + events.nuevosClientes.length;
                    if (totalAll > 0) setSelectedDay(events);
                  }}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-all min-h-[160px]',
                    isDragTarget ? 'border-primary ring-2 ring-primary/30 bg-primary/5' :
                    isToday(date) ? 'border-primary ring-1 ring-primary bg-primary/5' :
                    isSat ? 'border-warning/30 bg-warning/5' :
                    'border-border bg-card',
                    visible.length > 0 && 'cursor-pointer hover:shadow-md',
                  )}
                >
                  <div className="text-center mb-2">
                    <p className={`text-[10px] uppercase font-semibold ${isToday(date) ? 'text-primary' : 'text-muted-foreground'}`}>{dayName}</p>
                    <div className="flex items-center justify-center gap-1.5">
                      <p className={`text-lg font-bold ${isToday(date) ? 'text-primary' : ''}`}>{format(date, 'd')}</p>
                      {filteredCount > 0 && (
                        <span className={cn(
                          'text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center',
                          badgeColor
                        )}>
                          {filteredCount}
                        </span>
                      )}
                    </div>
                    {isSat && (
                      <Badge variant="outline" className="text-[8px] px-1 py-0 text-warning border-warning/30 mt-0.5">Corte</Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    {visible.length === 0 && (
                      <p className="text-[10px] text-muted-foreground/50 text-center mt-4">—</p>
                    )}
                    {visible.map((chip, ci) => (
                      <EventChip key={ci} {...chip} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ DAY DETAIL MODAL ═══ */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setSelectedDay(null)} />
          <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-lg border border-border bg-card shadow-xl mx-4">
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-sm font-semibold capitalize">
                  {format(selectedDay.date, "EEEE dd 'de' MMMM yyyy", { locale: es })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Arrastra items fuera del modal hacia el calendario para mover
                </p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="rounded-md p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>

            <div className="p-4 space-y-5">
              {/* Day total */}
              {getDayTotal(selectedDay) > 0 && (
                <div className="rounded-lg bg-primary/10 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Total del día</span>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    ${getDayTotal(selectedDay).toFixed(2)} USD
                  </span>
                </div>
              )}

              {/* Nuevos clientes */}
              {selectedDay.nuevosClientes.length > 0 && (
                <DetailSection
                  color="bg-warning" textColor="text-warning"
                  title="Clientes nuevos" count={selectedDay.nuevosClientes.length}
                >
                  {selectedDay.nuevosClientes.map(c => (
                    <DraggableItem
                      key={c.id}
                      dragData={{ type: 'nuevo', id: c.id }}
                      onDragStart={handleDragStart}
                      left={
                        <div>
                          <p className="font-medium">{c.nombre}</p>
                          <p className="text-xs text-muted-foreground">{c.pais || 'Sin país'} · {c.whatsapp}</p>
                        </div>
                      }
                      right={<UserPlus className="h-4 w-4 text-warning" />}
                    />
                  ))}
                </DetailSection>
              )}

              {/* Suscripciones creadas */}
              {selectedDay.suscripcionesCreadas.length > 0 && (
                <DetailSection
                  color="bg-accent" textColor="text-accent-foreground"
                  title="Suscripciones creadas" count={selectedDay.suscripcionesCreadas.length}
                >
                  {selectedDay.suscripcionesCreadas.map(({ sub, cliente, servicioNombre }) => (
                    <div key={sub.id} className="flex items-center justify-between rounded-md bg-muted/30 p-2.5 text-sm">
                      <div>
                        <p className="font-medium">{cliente.nombre}</p>
                        <p className="text-xs text-muted-foreground">{servicioNombre}</p>
                      </div>
                      <span className="text-xs font-medium">${sub.precioCobrado} USD</span>
                    </div>
                  ))}
                </DetailSection>
              )}

              {/* Pagos recibidos */}
              {selectedDay.pagos.length > 0 && (
                <DetailSection
                  color="bg-primary" textColor="text-primary"
                  title="Pagos recibidos" count={selectedDay.pagos.length}
                >
                  {selectedDay.pagos.map(p => {
                    const cliente = getCliente(p.clienteId);
                    return (
                      <DraggableItem
                        key={p.id}
                        dragData={{ type: 'pago', id: p.id }}
                        onDragStart={handleDragStart}
                        left={
                          <div>
                            <p className="font-medium">{cliente?.nombre || 'Desconocido'}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.metodo}
                              {p.montoOriginal && p.moneda && p.moneda !== 'USD' && ` · ${p.montoOriginal.toLocaleString()} ${p.moneda}`}
                            </p>
                          </div>
                        }
                        right={<span className="text-xs font-medium text-success">+${p.monto.toFixed(2)} USD</span>}
                      />
                    );
                  })}
                </DetailSection>
              )}

              {/* Renovaciones */}
              {selectedDay.renovaciones.length > 0 && (
                <DetailSection
                  color="bg-success" textColor="text-success"
                  title="Renovaciones" count={selectedDay.renovaciones.length}
                >
                  {selectedDay.renovaciones.map(({ sub, cliente }) => {
                    const servicio = getServicioById(sub.servicioId);
                    return (
                      <DraggableItem
                        key={sub.id}
                        dragData={{ type: 'renovacion', id: sub.id }}
                        onDragStart={handleDragStart}
                        left={
                          <div>
                            <p className="font-medium">{cliente.nombre}</p>
                            <p className="text-xs text-muted-foreground">{servicio?.nombre || 'Sin servicio'}</p>
                          </div>
                        }
                        right={<span className="text-xs font-medium text-success">${sub.precioCobrado} USD</span>}
                      />
                    );
                  })}
                </DetailSection>
              )}

              {/* Vencimientos */}
              {selectedDay.vencimientos.length > 0 && (
                <DetailSection
                  color="bg-destructive" textColor="text-destructive"
                  title="Vencimientos" count={selectedDay.vencimientos.length}
                >
                  {selectedDay.vencimientos.map(({ sub, cliente }) => {
                    const servicio = getServicioById(sub.servicioId);
                    return (
                      <DraggableItem
                        key={sub.id}
                        dragData={{ type: 'vencimiento', id: sub.id }}
                        onDragStart={handleDragStart}
                        left={
                          <div>
                            <p className="font-medium">{cliente.nombre}</p>
                            <p className="text-xs text-muted-foreground">{servicio?.nombre || 'Sin servicio'}</p>
                          </div>
                        }
                        right={
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary hover:bg-primary/10" onClick={() => handleRenovar(sub)}>
                            <RefreshCw className="h-3 w-3" /> Renovar
                          </Button>
                        }
                      />
                    );
                  })}
                </DetailSection>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reusable sub-components ────────────────────────────────────

function DetailSection({ color, textColor, title, count, children }: {
  color: string; textColor: string; title: string; count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={cn('h-2 w-2 rounded-full', color)} />
        <h4 className={cn('text-xs font-semibold', textColor)}>{title} ({count})</h4>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DraggableItem({ dragData, onDragStart, left, right }: {
  dragData: DragData;
  onDragStart: (e: DragEvent<HTMLDivElement>, data: DragData) => void;
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, dragData)}
      className="flex items-center justify-between rounded-md bg-muted/30 p-2.5 text-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
        {left}
      </div>
      {right}
    </div>
  );
}
