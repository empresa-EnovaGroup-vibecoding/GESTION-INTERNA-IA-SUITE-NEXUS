import { useState, useMemo, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, eachDayOfInterval, isToday, isSameMonth,
  isSameDay, addDays, getDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, RefreshCw, CreditCard,
  UserPlus, AlertTriangle, CalendarDays, X, Scissors,
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

export default function CalendarioPage() {
  const {
    clientes, suscripciones, pagos, cortes,
    getServicioById, updateSuscripcion,
  } = useData();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDay, setSelectedDay] = useState<DayEvents | null>(null);

  const getCliente = useCallback((id: string) => clientes.find(c => c.id === id), [clientes]);

  // Build events for a date range
  const buildDayEvents = useCallback((date: Date): DayEvents => {
    const dateStr = format(date, 'yyyy-MM-dd');

    // Renovaciones: suscripciones whose fechaVencimiento was extended to land 30 days after this date
    // We approximate by checking if fechaInicio matches (re-started on this day)
    // Actually, we track renovations by finding suscripciones where fechaVencimiento is exactly +30 from this date
    // Better approach: check suscripciones whose fechaVencimiento minus 30 = this date AND estado is activa
    // This means the subscription was renewed on this date
    const renovaciones: { sub: Suscripcion; cliente: Cliente }[] = [];
    suscripciones.forEach(s => {
      // A renewal happened on this date if the subscription's start or a 30-day boundary aligns
      // Simplification: use fechaInicio as the "creation/renewal" date
      if (s.fechaInicio === dateStr && s.estado === 'activa') {
        const cliente = getCliente(s.clienteId);
        if (cliente) renovaciones.push({ sub: s, cliente });
      }
    });

    // Vencimientos
    const vencimientos: { sub: Suscripcion; cliente: Cliente }[] = [];
    suscripciones.forEach(s => {
      if (s.fechaVencimiento === dateStr) {
        const cliente = getCliente(s.clienteId);
        if (cliente) vencimientos.push({ sub: s, cliente });
      }
    });

    // Pagos
    const pagosDelDia = pagos.filter(p => p.fecha === dateStr);

    // Nuevos clientes — we don't have a registration date field, so we approximate
    // by checking if any suscripcion was created (fechaInicio) for this client on this date
    // and it's the FIRST suscripcion for that client
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

  // Calendar days
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

  // Week days (current week of currentDate)
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd }).map(date => ({
      date,
      events: buildDayEvents(date),
    }));
  }, [currentDate, buildDayEvents]);

  // Week summary for weekly view
  const weekSummary = useMemo(() => {
    let totalPagos = 0;
    let totalMXN = 0;
    let totalCOP = 0;
    let renovaciones = 0;
    let vencimientos = 0;

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

  const navigateMonth = (dir: number) => {
    setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
  };

  const navigateWeek = (dir: number) => {
    setCurrentDate(d => addDays(d, dir * 7));
  };

  const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Event dots component
  const EventDots = ({ events }: { events: DayEvents }) => {
    const dots: { color: string; count: number; label: string }[] = [];
    if (events.renovaciones.length > 0) dots.push({ color: 'bg-success', count: events.renovaciones.length, label: 'renovaciones' });
    if (events.vencimientos.length > 0) dots.push({ color: 'bg-destructive', count: events.vencimientos.length, label: 'vencimientos' });
    if (events.pagos.length > 0) dots.push({ color: 'bg-primary', count: events.pagos.length, label: 'pagos' });
    if (events.nuevosClientes.length > 0) dots.push({ color: 'bg-warning', count: events.nuevosClientes.length, label: 'nuevos' });

    if (dots.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
        {dots.map((dot, i) => (
          <div key={i} className="flex items-center gap-0.5" title={`${dot.count} ${dot.label}`}>
            <div className={`h-1.5 w-1.5 rounded-full ${dot.color}`} />
            {dot.count > 1 && (
              <span className="text-[8px] text-muted-foreground leading-none">{dot.count}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold">Calendario</h1>
          <p className="text-sm text-muted-foreground">Vista de actividad diaria</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border bg-card overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Semana
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1">
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => viewMode === 'month' ? navigateMonth(-1) : navigateWeek(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium capitalize min-w-[140px] text-center">
              {viewMode === 'month' ? mesLabel : weekLabel}
            </span>
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => viewMode === 'month' ? navigateMonth(1) : navigateWeek(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Hoy
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Renovaciones</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> Vencimientos</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Pagos</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> Nuevos clientes</span>
      </div>

      {/* Monthly view */}
      {viewMode === 'month' && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DOW.map(d => (
              <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map(({ date, inMonth, events }, i) => {
              const hasEvents = events.renovaciones.length + events.vencimientos.length + events.pagos.length + events.nuevosClientes.length > 0;
              return (
                <button
                  key={i}
                  onClick={() => hasEvents && setSelectedDay(events)}
                  className={`min-h-[72px] p-1.5 border-b border-r border-border text-left transition-colors relative ${
                    inMonth ? 'bg-card' : 'bg-muted/30'
                  } ${hasEvents ? 'cursor-pointer hover:bg-accent/50' : 'cursor-default'} ${
                    isToday(date) ? 'ring-2 ring-inset ring-primary' : ''
                  }`}
                >
                  <span className={`text-xs font-medium ${
                    isToday(date) ? 'text-primary font-bold' :
                    inMonth ? 'text-foreground' : 'text-muted-foreground/50'
                  }`}>
                    {format(date, 'd')}
                  </span>
                  {inMonth && <EventDots events={events} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly view */}
      {viewMode === 'week' && (
        <div className="space-y-4">
          {/* Week summary card */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Resumen de la Semana</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{weekSummary.totalPagos} pagos</p>
                  {weekSummary.totalMXN > 0 && (
                    <p className="text-[10px] text-muted-foreground">{weekSummary.totalMXN.toLocaleString()} MXN</p>
                  )}
                  {weekSummary.totalCOP > 0 && (
                    <p className="text-[10px] text-muted-foreground">{weekSummary.totalCOP.toLocaleString()} COP</p>
                  )}
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
                <p className="font-medium">
                  {weekDays.reduce((s, d) => s + d.events.nuevosClientes.length, 0)} nuevos
                </p>
              </div>
            </div>

            {/* Saturday corte shortcut */}
            {(weekSummary.totalMXN > 0 || weekSummary.totalCOP > 0) && (
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  <Scissors className="h-3.5 w-3.5 inline mr-1" />
                  Pendiente de convertir esta semana
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
              const dayName = format(date, 'EEE', { locale: es });
              const hasEvents = events.renovaciones.length + events.vencimientos.length + events.pagos.length + events.nuevosClientes.length > 0;
              const isSaturday = getDay(date) === 6;

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => hasEvents && setSelectedDay(events)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    isToday(date) ? 'border-primary ring-1 ring-primary bg-primary/5' :
                    isSaturday ? 'border-warning/30 bg-warning/5' :
                    'border-border bg-card'
                  } ${hasEvents ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`}
                >
                  <div className="text-center mb-2">
                    <p className={`text-[10px] uppercase font-semibold ${
                      isToday(date) ? 'text-primary' : 'text-muted-foreground'
                    }`}>{dayName}</p>
                    <p className={`text-lg font-bold ${isToday(date) ? 'text-primary' : ''}`}>
                      {format(date, 'd')}
                    </p>
                    {isSaturday && (
                      <Badge variant="outline" className="text-[8px] px-1 py-0 text-warning border-warning/30 mt-0.5">
                        Corte
                      </Badge>
                    )}
                  </div>

                  {/* Event list */}
                  <div className="space-y-1">
                    {events.renovaciones.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                        <span className="truncate text-muted-foreground">{events.renovaciones.length} renov.</span>
                      </div>
                    )}
                    {events.vencimientos.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                        <span className="truncate text-muted-foreground">{events.vencimientos.length} venc.</span>
                      </div>
                    )}
                    {events.pagos.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <span className="truncate text-muted-foreground">{events.pagos.length} pago{events.pagos.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {events.nuevosClientes.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
                        <span className="truncate text-muted-foreground">{events.nuevosClientes.length} nuevo{events.nuevosClientes.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {!hasEvents && (
                      <p className="text-[10px] text-muted-foreground/50 text-center">—</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Day detail modal */}
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
                  {selectedDay.renovaciones.length + selectedDay.vencimientos.length + selectedDay.pagos.length + selectedDay.nuevosClientes.length} eventos
                </p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="rounded-md p-1.5 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {/* Renovaciones */}
              {selectedDay.renovaciones.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    <h4 className="text-xs font-semibold text-success">
                      Renovaciones ({selectedDay.renovaciones.length})
                    </h4>
                  </div>
                  <div className="space-y-1.5">
                    {selectedDay.renovaciones.map(({ sub, cliente }) => {
                      const servicio = getServicioById(sub.servicioId);
                      return (
                        <div key={sub.id} className="flex items-center justify-between rounded-md bg-muted/30 p-2.5 text-sm">
                          <div>
                            <p className="font-medium">{cliente.nombre}</p>
                            <p className="text-xs text-muted-foreground">{servicio?.nombre || 'Sin servicio'}</p>
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
                    <h4 className="text-xs font-semibold text-destructive">
                      Vencimientos ({selectedDay.vencimientos.length})
                    </h4>
                  </div>
                  <div className="space-y-1.5">
                    {selectedDay.vencimientos.map(({ sub, cliente }) => {
                      const servicio = getServicioById(sub.servicioId);
                      return (
                        <div key={sub.id} className="flex items-center justify-between rounded-md bg-muted/30 p-2.5 text-sm">
                          <div>
                            <p className="font-medium">{cliente.nombre}</p>
                            <p className="text-xs text-muted-foreground">{servicio?.nombre || 'Sin servicio'}</p>
                          </div>
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 gap-1 text-xs text-primary hover:bg-primary/10"
                            onClick={() => handleRenovar(sub)}
                          >
                            <RefreshCw className="h-3 w-3" />
                            Renovar
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
                    <h4 className="text-xs font-semibold text-primary">
                      Pagos ({selectedDay.pagos.length})
                    </h4>
                  </div>
                  <div className="space-y-1.5">
                    {selectedDay.pagos.map(p => {
                      const cliente = getCliente(p.clienteId);
                      return (
                        <div key={p.id} className="flex items-center justify-between rounded-md bg-muted/30 p-2.5 text-sm">
                          <div>
                            <p className="font-medium">{cliente?.nombre || 'Desconocido'}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.metodo}
                              {p.montoOriginal && p.moneda && p.moneda !== 'USD' && (
                                <span> · {p.montoOriginal.toLocaleString()} {p.moneda}</span>
                              )}
                            </p>
                          </div>
                          <span className="text-xs font-medium text-success">
                            +${p.monto.toFixed(2)} USD
                          </span>
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
                    <h4 className="text-xs font-semibold text-warning">
                      Nuevos Clientes ({selectedDay.nuevosClientes.length})
                    </h4>
                  </div>
                  <div className="space-y-1.5">
                    {selectedDay.nuevosClientes.map(c => (
                      <div key={c.id} className="flex items-center justify-between rounded-md bg-muted/30 p-2.5 text-sm">
                        <div>
                          <p className="font-medium">{c.nombre}</p>
                          <p className="text-xs text-muted-foreground">{c.pais || 'Sin país'} · {c.whatsapp}</p>
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
