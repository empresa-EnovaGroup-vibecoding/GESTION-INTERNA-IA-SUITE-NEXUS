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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Suscripcion, Pago, Cliente } from '@/types';
import { toast } from 'sonner';

type ViewMode = 'month' | 'week';

interface DayEvents {
  date: Date;
  renovaciones: { sub: Suscripcion; cliente: Cliente }[];
  vencimientos: { sub: Suscripcion; cliente: Cliente }[];
  pagos: Pago[];
  nuevosClientes: Cliente[];
}

interface DragData {
  type: 'renovacion' | 'vencimiento' | 'pago' | 'nuevo';
  id: string;
}

export default function CalendarioPage() {
  const {
    clientes, suscripciones, pagos,
    getServicioById, updateSuscripcion, updatePago,
  } = useData();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDay, setSelectedDay] = useState<DayEvents | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const getCliente = useCallback((id: string) => clientes.find(c => c.id === id), [clientes]);

  // Build events for a single date
  const buildDayEvents = useCallback((date: Date): DayEvents => {
    const dateStr = format(date, 'yyyy-MM-dd');

    const renovaciones: { sub: Suscripcion; cliente: Cliente }[] = [];
    suscripciones.forEach(s => {
      if (s.fechaInicio === dateStr && s.estado === 'activa') {
        const cliente = getCliente(s.clienteId);
        if (cliente) renovaciones.push({ sub: s, cliente });
      }
    });

    const vencimientos: { sub: Suscripcion; cliente: Cliente }[] = [];
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

    return { date, renovaciones, vencimientos, pagos: pagosDelDia, nuevosClientes };
  }, [suscripciones, pagos, clientes, getCliente]);

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
        // Move all first subscriptions of this client to the new date
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

  // ─── Draggable chip (shared between both views) ───────────────
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

  // Build flat chip list from events (for monthly view, limited)
  const buildChips = (events: DayEvents, max: number) => {
    const chips: { label: string; color: string; dragData: DragData }[] = [];

    events.renovaciones.forEach(({ sub, cliente }) =>
      chips.push({ label: `↻ ${cliente.nombre}`, color: 'bg-success/15 text-success', dragData: { type: 'renovacion', id: sub.id } })
    );
    events.vencimientos.forEach(({ sub, cliente }) =>
      chips.push({ label: `⚠ ${cliente.nombre}`, color: 'bg-destructive/15 text-destructive', dragData: { type: 'vencimiento', id: sub.id } })
    );
    events.pagos.forEach(p => {
      const c = getCliente(p.clienteId);
      chips.push({ label: `$ ${c?.nombre || '?'}`, color: 'bg-primary/15 text-primary', dragData: { type: 'pago', id: p.id } });
    });
    events.nuevosClientes.forEach(c =>
      chips.push({ label: `+ ${c.nombre}`, color: 'bg-warning/15 text-warning', dragData: { type: 'nuevo', id: c.id } })
    );

    return { visible: chips.slice(0, max), overflow: Math.max(0, chips.length - max) };
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

              return (
                <div
                  key={i}
                  onDragOver={(e) => handleDragOver(e, dateStr)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dateStr)}
                  onClick={() => {
                    const total = events.renovaciones.length + events.vencimientos.length + events.pagos.length + events.nuevosClientes.length;
                    if (total > 0) setSelectedDay(events);
                  }}
                  className={`min-h-[88px] p-1.5 border-b border-r border-border text-left transition-all relative ${
                    inMonth ? 'bg-card' : 'bg-muted/30'
                  } ${isDragTarget ? 'bg-primary/10 ring-2 ring-inset ring-primary/50' : ''} ${
                    isToday(date) ? 'ring-2 ring-inset ring-primary' : ''
                  } ${visible.length > 0 || overflow > 0 ? 'cursor-pointer hover:bg-accent/30' : ''}`}
                >
                  <span className={`text-xs font-medium block mb-0.5 ${
                    isToday(date) ? 'text-primary font-bold' : inMonth ? 'text-foreground' : 'text-muted-foreground/50'
                  }`}>
                    {format(date, 'd')}
                  </span>
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

              return (
                <div
                  key={dateStr}
                  onDragOver={(e) => handleDragOver(e, dateStr)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dateStr)}
                  onClick={() => {
                    if (visible.length > 0) setSelectedDay(events);
                  }}
                  className={`rounded-lg border p-3 text-left transition-all min-h-[160px] ${
                    isDragTarget ? 'border-primary ring-2 ring-primary/30 bg-primary/5' :
                    isToday(date) ? 'border-primary ring-1 ring-primary bg-primary/5' :
                    isSat ? 'border-warning/30 bg-warning/5' :
                    'border-border bg-card'
                  } ${visible.length > 0 ? 'cursor-pointer hover:shadow-md' : ''}`}
                >
                  <div className="text-center mb-2">
                    <p className={`text-[10px] uppercase font-semibold ${isToday(date) ? 'text-primary' : 'text-muted-foreground'}`}>{dayName}</p>
                    <p className={`text-lg font-bold ${isToday(date) ? 'text-primary' : ''}`}>{format(date, 'd')}</p>
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
              {/* Renovaciones */}
              {selectedDay.renovaciones.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    <h4 className="text-xs font-semibold text-success">Renovaciones ({selectedDay.renovaciones.length})</h4>
                  </div>
                  <div className="space-y-1.5">
                    {selectedDay.renovaciones.map(({ sub, cliente }) => {
                      const servicio = getServicioById(sub.servicioId);
                      return (
                        <div
                          key={sub.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, { type: 'renovacion', id: sub.id })}
                          className="flex items-center justify-between rounded-md bg-muted/30 p-2.5 text-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                            <div>
                              <p className="font-medium">{cliente.nombre}</p>
                              <p className="text-xs text-muted-foreground">{servicio?.nombre || 'Sin servicio'}</p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-success">${sub.precioCobrado} USD</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Vencimientos */}
              {selectedDay.vencimientos.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full bg-destructive" />
                    <h4 className="text-xs font-semibold text-destructive">Vencimientos ({selectedDay.vencimientos.length})</h4>
                  </div>
                  <div className="space-y-1.5">
                    {selectedDay.vencimientos.map(({ sub, cliente }) => {
                      const servicio = getServicioById(sub.servicioId);
                      return (
                        <div
                          key={sub.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, { type: 'vencimiento', id: sub.id })}
                          className="flex items-center justify-between rounded-md bg-muted/30 p-2.5 text-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                            <div>
                              <p className="font-medium">{cliente.nombre}</p>
                              <p className="text-xs text-muted-foreground">{servicio?.nombre || 'Sin servicio'}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary hover:bg-primary/10" onClick={() => handleRenovar(sub)}>
                            <RefreshCw className="h-3 w-3" /> Renovar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pagos */}
              {selectedDay.pagos.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <h4 className="text-xs font-semibold text-primary">Pagos ({selectedDay.pagos.length})</h4>
                  </div>
                  <div className="space-y-1.5">
                    {selectedDay.pagos.map(p => {
                      const cliente = getCliente(p.clienteId);
                      return (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, { type: 'pago', id: p.id })}
                          className="flex items-center justify-between rounded-md bg-muted/30 p-2.5 text-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                            <div>
                              <p className="font-medium">{cliente?.nombre || 'Desconocido'}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.metodo}
                                {p.montoOriginal && p.moneda && p.moneda !== 'USD' && ` · ${p.montoOriginal.toLocaleString()} ${p.moneda}`}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-success">+${p.monto.toFixed(2)} USD</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nuevos clientes */}
              {selectedDay.nuevosClientes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full bg-warning" />
                    <h4 className="text-xs font-semibold text-warning">Nuevos Clientes ({selectedDay.nuevosClientes.length})</h4>
                  </div>
                  <div className="space-y-1.5">
                    {selectedDay.nuevosClientes.map(c => (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, { type: 'nuevo', id: c.id })}
                        className="flex items-center justify-between rounded-md bg-muted/30 p-2.5 text-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                          <div>
                            <p className="font-medium">{c.nombre}</p>
                            <p className="text-xs text-muted-foreground">{c.pais || 'Sin país'} · {c.whatsapp}</p>
                          </div>
                        </div>
                        <UserPlus className="h-4 w-4 text-warning" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
