import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  isWithinInterval, addDays, subWeeks, addWeeks, subMonths, addMonths,
  startOfDay, eachWeekOfInterval,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ClipboardCopy, FileText, ChevronLeft, ChevronRight, CalendarIcon, TrendingUp, TrendingDown, Minus, Send } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type ReportMode = 'semanal' | 'mensual';

export default function ReporteSemanalDialog() {
  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [mode, setMode] = useState<ReportMode>('semanal');
  const { clientes, suscripciones, pagos, paneles, getServicioById } = useData();

  // Period boundaries
  const periodStart = mode === 'semanal'
    ? startOfWeek(startOfDay(selectedDay), { weekStartsOn: 1 })
    : startOfMonth(startOfDay(selectedDay));
  const periodEnd = mode === 'semanal'
    ? endOfWeek(startOfDay(selectedDay), { weekStartsOn: 1 })
    : endOfMonth(startOfDay(selectedDay));

  const reporte = useMemo(() => {
    const nextPeriodStart = addDays(periodEnd, 1);
    const nextPeriodEnd = mode === 'semanal'
      ? addDays(nextPeriodStart, 6)
      : endOfMonth(nextPeriodStart);

    const inPeriod = (dateStr: string) =>
      isWithinInterval(new Date(dateStr), { start: periodStart, end: periodEnd });

    // --- Nuevos clientes ---
    const nuevosClientes: { nombre: string; servicio: string }[] = [];
    for (const cliente of clientes) {
      const subs = suscripciones.filter(s => s.clienteId === cliente.id);
      if (subs.length === 0) continue;
      const earliest = [...subs].sort(
        (a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
      )[0];
      if (inPeriod(earliest.fechaInicio)) {
        const servicio = getServicioById(earliest.servicioId);
        nuevosClientes.push({
          nombre: cliente.nombre,
          servicio: servicio?.nombre || 'Sin servicio',
        });
      }
    }

    // --- Renovaciones ---
    const renovaciones: { cliente: string; servicio: string }[] = [];
    for (const sub of suscripciones) {
      if (!inPeriod(sub.fechaInicio)) continue;
      const isRenewal = suscripciones.some(
        s => s.clienteId === sub.clienteId && s.servicioId === sub.servicioId &&
          s.id !== sub.id && new Date(s.fechaInicio).getTime() < new Date(sub.fechaInicio).getTime()
      );
      if (isRenewal) {
        const cliente = clientes.find(c => c.id === sub.clienteId);
        const servicio = getServicioById(sub.servicioId);
        renovaciones.push({
          cliente: cliente?.nombre || '?',
          servicio: servicio?.nombre || '?',
        });
      }
    }

    // --- Pagos ---
    const pagosPeriodo = pagos.filter(p => inPeriod(p.fecha));
    const totalUSD = pagosPeriodo
      .filter(p => !p.moneda || p.moneda === 'USD')
      .reduce((sum, p) => sum + p.monto, 0);
    const totalMXN = pagosPeriodo
      .filter(p => p.moneda === 'MXN')
      .reduce((sum, p) => sum + (p.montoOriginal || 0), 0);
    const totalCOP = pagosPeriodo
      .filter(p => p.moneda === 'COP')
      .reduce((sum, p) => sum + (p.montoOriginal || 0), 0);
    const totalPagosUSD = pagosPeriodo.reduce((sum, p) => sum + p.monto, 0);

    // --- Vencimientos próximo periodo ---
    const vencimientosProx: { cliente: string; servicio: string; fecha: string }[] = [];
    for (const sub of suscripciones) {
      if (sub.estado !== 'activa') continue;
      const venc = new Date(sub.fechaVencimiento);
      if (isWithinInterval(venc, { start: nextPeriodStart, end: nextPeriodEnd })) {
        const cliente = clientes.find(c => c.id === sub.clienteId);
        const servicio = getServicioById(sub.servicioId);
        vencimientosProx.push({
          cliente: cliente?.nombre || '?',
          servicio: servicio?.nombre || '?',
          fecha: format(venc, 'dd MMM', { locale: es }),
        });
      }
    }

    // --- Ganancia neta ---
    const divisor = mode === 'semanal' ? 4 : 1;
    const totalGastosPeriodo = paneles
      .filter(p => p.estado === 'activo')
      .reduce((sum, p) => sum + (p.costoMensual / divisor), 0);
    const gananciaNeta = Math.round((totalPagosUSD - totalGastosPeriodo) * 100) / 100;

    // --- Monthly extras ---
    const clientesActivosTotal = mode === 'mensual'
      ? new Set(suscripciones.filter(s => s.estado === 'activa').map(s => s.clienteId)).size
      : 0;
    const cancelaciones = mode === 'mensual'
      ? suscripciones.filter(s => s.estado === 'cancelada' && inPeriod(s.fechaInicio)).length
      : 0;

    // --- Weekly breakdown for monthly chart ---
    let weeklyBreakdown: { semana: string; ingresos: number; gastos: number; ganancia: number }[] = [];
    if (mode === 'mensual') {
      const weekStarts = eachWeekOfInterval(
        { start: periodStart, end: periodEnd },
        { weekStartsOn: 1 }
      );
      const gastoSemanal = paneles
        .filter(p => p.estado === 'activo')
        .reduce((sum, p) => sum + (p.costoMensual / 4), 0);

      weeklyBreakdown = weekStarts.map((ws, idx) => {
        const we = endOfWeek(ws, { weekStartsOn: 1 });
        const clampedEnd = we > periodEnd ? periodEnd : we;
        const ingresosSemana = pagos
          .filter(p => isWithinInterval(new Date(p.fecha), { start: ws, end: clampedEnd }))
          .reduce((sum, p) => sum + p.monto, 0);
        const gastoRedondeado = Math.round(gastoSemanal * 100) / 100;
        return {
          semana: `Sem ${idx + 1}`,
          ingresos: Math.round(ingresosSemana * 100) / 100,
          gastos: gastoRedondeado,
          ganancia: Math.round((ingresosSemana - gastoSemanal) * 100) / 100,
        };
      });
    }

    // --- Month-over-month comparison ---
    interface MoMComparison {
      ingresosPrev: number;
      gastosPrev: number;
      gananciaPrev: number;
      clientesNuevosPrev: number;
      renovacionesPrev: number;
      pagosPrev: number;
      ingresosVar: number | null;
      gastosVar: number | null;
      gananciaVar: number | null;
      clientesNuevosVar: number | null;
      renovacionesVar: number | null;
      pagosVar: number | null;
    }
    let comparativo: MoMComparison | null = null;
    if (mode === 'mensual') {
      const prevStart = startOfMonth(subMonths(periodStart, 1));
      const prevEnd = endOfMonth(prevStart);
      const inPrev = (dateStr: string) =>
        isWithinInterval(new Date(dateStr), { start: prevStart, end: prevEnd });

      const pagosPrev = pagos.filter(p => inPrev(p.fecha));
      const ingresosPrev = Math.round(pagosPrev.reduce((sum, p) => sum + p.monto, 0) * 100) / 100;
      const gastosPrev = Math.round(totalGastosPeriodo * 100) / 100; // same panel costs
      const gananciaPrev = Math.round((ingresosPrev - gastosPrev) * 100) / 100;

      let clientesNuevosPrev = 0;
      for (const cliente of clientes) {
        const subs = suscripciones.filter(s => s.clienteId === cliente.id);
        if (subs.length === 0) continue;
        const earliest = [...subs].sort(
          (a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
        )[0];
        if (inPrev(earliest.fechaInicio)) clientesNuevosPrev++;
      }

      let renovacionesPrev = 0;
      for (const sub of suscripciones) {
        if (!inPrev(sub.fechaInicio)) continue;
        const isRen = suscripciones.some(
          s => s.clienteId === sub.clienteId && s.servicioId === sub.servicioId &&
            s.id !== sub.id && new Date(s.fechaInicio).getTime() < new Date(sub.fechaInicio).getTime()
        );
        if (isRen) renovacionesPrev++;
      }

      const calcVar = (current: number, prev: number): number | null => {
        if (prev === 0) return current > 0 ? 100 : null;
        return Math.round(((current - prev) / Math.abs(prev)) * 100);
      };

      comparativo = {
        ingresosPrev,
        gastosPrev,
        gananciaPrev,
        clientesNuevosPrev,
        renovacionesPrev,
        pagosPrev: pagosPrev.length,
        ingresosVar: calcVar(totalPagosUSD, ingresosPrev),
        gastosVar: calcVar(totalGastosPeriodo, gastosPrev),
        gananciaVar: calcVar(gananciaNeta, gananciaPrev),
        clientesNuevosVar: calcVar(nuevosClientes.length, clientesNuevosPrev),
        renovacionesVar: calcVar(renovaciones.length, renovacionesPrev),
        pagosVar: calcVar(pagosPeriodo.length, pagosPrev.length),
      };
    }

    return {
      nuevosClientes, renovaciones,
      pagosCount: pagosPeriodo.length,
      totalUSD: Math.round(totalUSD * 100) / 100,
      totalMXN: Math.round(totalMXN),
      totalCOP: Math.round(totalCOP),
      totalPagosUSD: Math.round(totalPagosUSD * 100) / 100,
      vencimientosProx,
      gananciaNeta,
      totalGastosPeriodo: Math.round(totalGastosPeriodo * 100) / 100,
      clientesActivosTotal,
      cancelaciones,
      weeklyBreakdown,
      comparativo,
    };
  }, [clientes, suscripciones, pagos, paneles, getServicioById, periodStart, periodEnd, mode]);

  const periodLabel = mode === 'semanal'
    ? `${format(periodStart, 'dd MMM', { locale: es })} — ${format(periodEnd, 'dd MMM yyyy', { locale: es })}`
    : format(periodStart, 'MMMM yyyy', { locale: es });

  const buildReporteText = () => {
    const r = reporte;
    const lines: string[] = [];
    const titulo = mode === 'semanal' ? 'REPORTE SEMANAL' : 'REPORTE MENSUAL';
    const periodoTexto = mode === 'semanal'
      ? `Semana del ${format(periodStart, 'dd MMM', { locale: es })} al ${format(periodEnd, 'dd MMM yyyy', { locale: es })}`
      : `Mes de ${format(periodStart, 'MMMM yyyy', { locale: es })}`;

    lines.push(`📊 *${titulo}*`);
    lines.push(`📅 ${periodoTexto}`);
    lines.push('');

    if (mode === 'mensual') {
      lines.push(`📋 *Resumen general*`);
      lines.push(`   Clientes activos: ${r.clientesActivosTotal}`);
      lines.push(`   Cancelaciones: ${r.cancelaciones}`);
      lines.push('');
    }

    lines.push(`👤 *Nuevos clientes (${r.nuevosClientes.length})*`);
    if (r.nuevosClientes.length === 0) {
      lines.push('   Sin nuevos clientes');
    } else {
      for (const c of r.nuevosClientes) {
        lines.push(`   • ${c.nombre} → ${c.servicio}`);
      }
    }
    lines.push('');

    lines.push(`🔄 *Renovaciones (${r.renovaciones.length})*`);
    if (r.renovaciones.length === 0) {
      lines.push('   Sin renovaciones');
    } else {
      for (const ren of r.renovaciones) {
        lines.push(`   • ${ren.cliente} → ${ren.servicio}`);
      }
    }
    lines.push('');

    lines.push(`💰 *Pagos recibidos (${r.pagosCount})*`);
    const monedas: string[] = [];
    if (r.totalUSD > 0) monedas.push(`$${r.totalUSD} USD`);
    if (r.totalMXN > 0) monedas.push(`$${r.totalMXN.toLocaleString()} MXN`);
    if (r.totalCOP > 0) monedas.push(`$${r.totalCOP.toLocaleString()} COP`);
    lines.push(`   ${monedas.length > 0 ? monedas.join(' · ') : '$0 USD'}`);
    lines.push('');

    const vencLabel = mode === 'semanal' ? 'próxima semana' : 'próximo mes';
    lines.push(`⚠️ *Vencimientos ${vencLabel} (${r.vencimientosProx.length})*`);
    if (r.vencimientosProx.length === 0) {
      lines.push('   Sin vencimientos');
    } else {
      for (const v of r.vencimientosProx) {
        lines.push(`   • ${v.cliente} → ${v.servicio} (${v.fecha})`);
      }
    }
    lines.push('');

    lines.push(`📈 *Resumen financiero*`);
    lines.push(`   Ingresos: $${r.totalPagosUSD} USD`);
    const gastoLabel = mode === 'semanal' ? 'Gastos (prorrateo)' : 'Gastos';
    lines.push(`   ${gastoLabel}: $${r.totalGastosPeriodo} USD`);
    lines.push(`   *Ganancia neta: $${r.gananciaNeta} USD*`);

    if (mode === 'mensual' && r.comparativo) {
      const c = r.comparativo;
      const prevMonthLabel = format(subMonths(periodStart, 1), 'MMMM', { locale: es });
      const fmtVar = (v: number | null) => v === null ? '—' : `${v > 0 ? '+' : ''}${v}%`;
      lines.push('');
      lines.push(`📊 *Comparativo vs ${prevMonthLabel}*`);
      lines.push(`   Ingresos: $${c.ingresosPrev} → $${r.totalPagosUSD} (${fmtVar(c.ingresosVar)})`);
      lines.push(`   Ganancia: $${c.gananciaPrev} → $${r.gananciaNeta} (${fmtVar(c.gananciaVar)})`);
      lines.push(`   Nuevos clientes: ${c.clientesNuevosPrev} → ${r.nuevosClientes.length} (${fmtVar(c.clientesNuevosVar)})`);
      lines.push(`   Renovaciones: ${c.renovacionesPrev} → ${r.renovaciones.length} (${fmtVar(c.renovacionesVar)})`);
      lines.push(`   Pagos: ${c.pagosPrev} → ${r.pagosCount} (${fmtVar(c.pagosVar)})`);
    }

    return lines.join('\n');
  };

  const handleCopiar = async () => {
    const text = buildReporteText();
    await navigator.clipboard.writeText(text);
    toast.success('Reporte copiado al portapapeles');
  };

  const isCurrent = mode === 'semanal'
    ? format(periodStart, 'yyyy-MM-dd') === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    : format(periodStart, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

  const handlePrev = () => {
    setSelectedDay(d => mode === 'semanal' ? subWeeks(d, 1) : subMonths(d, 1));
  };
  const handleNext = () => {
    setSelectedDay(d => mode === 'semanal' ? addWeeks(d, 1) : addMonths(d, 1));
  };
  const handleDateSelect = (date: Date | undefined) => {
    if (date) setSelectedDay(date);
  };

  const r = reporte;
  const vencLabel = mode === 'semanal' ? 'Vencimientos próxima semana' : 'Vencimientos próximo mes';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FileText className="h-4 w-4" />
          Generar Reporte
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {mode === 'semanal' ? 'Reporte Semanal' : 'Reporte Mensual'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
            <button
              onClick={() => setMode('semanal')}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                mode === 'semanal'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Semanal
            </button>
            <button
              onClick={() => setMode('mensual')}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                mode === 'mensual'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Mensual
            </button>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'flex-1 justify-center gap-2 text-sm font-semibold capitalize',
                    isCurrent && 'border-primary/50'
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {periodLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDay}
                  onSelect={handleDateSelect}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {!isCurrent && (
            <button
              onClick={() => setSelectedDay(new Date())}
              className="w-full text-center text-[11px] text-primary hover:underline"
            >
              Ir a {mode === 'semanal' ? 'semana' : 'mes'} actual
            </button>
          )}

          {/* Monthly summary */}
          {mode === 'mensual' && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2">📋 Resumen general</h4>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">Clientes activos</p>
                  <p className="text-lg font-bold">{r.clientesActivosTotal}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Cancelaciones</p>
                  <p className="text-lg font-bold text-destructive">{r.cancelaciones}</p>
                </div>
              </div>
            </div>
          )}

          {/* Monthly chart - Ingresos vs Gastos por semana */}
          {mode === 'mensual' && r.weeklyBreakdown.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h4 className="text-xs font-semibold flex items-center gap-1.5">📊 Ingresos vs Gastos por semana</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={r.weeklyBreakdown} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="semana" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={v => `$${v}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => [
                        `$${value}`,
                        name === 'ingresos' ? 'Ingresos' : name === 'gastos' ? 'Gastos' : 'Ganancia',
                      ]}
                    />
                    <Bar dataKey="ingresos" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" name="ingresos" />
                    <Bar dataKey="gastos" radius={[4, 4, 0, 0]} fill="hsl(var(--destructive))" name="gastos" />
                    <Bar dataKey="ganancia" radius={[4, 4, 0, 0]} name="ganancia">
                      {r.weeklyBreakdown.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.ganancia >= 0 ? 'hsl(142, 71%, 45%)' : 'hsl(var(--destructive))'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" /> Ingresos
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-destructive" /> Gastos
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} /> Ganancia
                </span>
              </div>
            </div>
          )}

          {/* Nuevos clientes */}
          <Section emoji="👤" title="Nuevos clientes" count={r.nuevosClientes.length} color="text-emerald-500">
            {r.nuevosClientes.length === 0 ? (
              <EmptyLine />
            ) : (
              r.nuevosClientes.map((c, i) => (
                <li key={i} className="text-xs">
                  <span className="font-medium">{c.nombre}</span>
                  <span className="text-muted-foreground"> → {c.servicio}</span>
                </li>
              ))
            )}
          </Section>

          {/* Renovaciones */}
          <Section emoji="🔄" title="Renovaciones" count={r.renovaciones.length} color="text-green-500">
            {r.renovaciones.length === 0 ? (
              <EmptyLine />
            ) : (
              r.renovaciones.map((ren, i) => (
                <li key={i} className="text-xs">
                  <span className="font-medium">{ren.cliente}</span>
                  <span className="text-muted-foreground"> → {ren.servicio}</span>
                </li>
              ))
            )}
          </Section>

          {/* Pagos */}
          <Section emoji="💰" title="Pagos recibidos" count={r.pagosCount} color="text-primary">
            <div className="flex flex-wrap gap-2 text-xs">
              {r.totalUSD > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                  ${r.totalUSD} USD
                </span>
              )}
              {r.totalMXN > 0 && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-400">
                  ${r.totalMXN.toLocaleString()} MXN
                </span>
              )}
              {r.totalCOP > 0 && (
                <span className="rounded-full bg-violet-500/10 px-2 py-0.5 font-medium text-violet-700 dark:text-violet-400">
                  ${r.totalCOP.toLocaleString()} COP
                </span>
              )}
              {r.pagosCount === 0 && <EmptyLine />}
            </div>
          </Section>

          {/* Vencimientos */}
          <Section emoji="⚠️" title={vencLabel} count={r.vencimientosProx.length} color="text-warning">
            {r.vencimientosProx.length === 0 ? (
              <EmptyLine />
            ) : (
              r.vencimientosProx.map((v, i) => (
                <li key={i} className="text-xs">
                  <span className="font-medium">{v.cliente}</span>
                  <span className="text-muted-foreground"> → {v.servicio} ({v.fecha})</span>
                </li>
              ))
            )}
          </Section>

          {/* Ganancia neta */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">📈 Resumen financiero</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground">Ingresos</p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">${r.totalPagosUSD}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">
                  {mode === 'semanal' ? 'Gastos (prorrateo)' : 'Gastos'}
                </p>
                <p className="text-sm font-semibold text-destructive">${r.totalGastosPeriodo}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Ganancia neta</p>
                <p className={`text-sm font-bold ${r.gananciaNeta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                  ${r.gananciaNeta} USD
                </p>
              </div>
            </div>
          </div>

          {/* Month-over-month comparison */}
          {mode === 'mensual' && r.comparativo && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <h4 className="text-xs font-semibold flex items-center gap-1.5">
                📊 Comparativo vs {format(subMonths(periodStart, 1), 'MMMM', { locale: es })}
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <ComparisonRow label="Ingresos" current={`$${r.totalPagosUSD}`} prev={`$${r.comparativo.ingresosPrev}`} variation={r.comparativo.ingresosVar} positiveIsGood />
                <ComparisonRow label="Ganancia" current={`$${r.gananciaNeta}`} prev={`$${r.comparativo.gananciaPrev}`} variation={r.comparativo.gananciaVar} positiveIsGood />
                <ComparisonRow label="Nuevos clientes" current={String(r.nuevosClientes.length)} prev={String(r.comparativo.clientesNuevosPrev)} variation={r.comparativo.clientesNuevosVar} positiveIsGood />
                <ComparisonRow label="Renovaciones" current={String(r.renovaciones.length)} prev={String(r.comparativo.renovacionesPrev)} variation={r.comparativo.renovacionesVar} positiveIsGood />
                <ComparisonRow label="Pagos" current={String(r.pagosCount)} prev={String(r.comparativo.pagosPrev)} variation={r.comparativo.pagosVar} positiveIsGood />
                <ComparisonRow label="Gastos" current={`$${r.totalGastosPeriodo}`} prev={`$${r.comparativo.gastosPrev}`} variation={r.comparativo.gastosVar} positiveIsGood={false} />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button className="flex-1 gap-2" onClick={handleCopiar}>
              <ClipboardCopy className="h-4 w-4" />
              Copiar Reporte
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => {
                const text = buildReporteText();
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
              }}
            >
              <Send className="h-4 w-4" />
              Enviar por WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ emoji, title, count, color, children }: {
  emoji: string; title: string; count: number; color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold flex items-center gap-1.5">
        <span>{emoji}</span>
        {title}
        <span className={`ml-auto text-[11px] font-medium ${color}`}>{count}</span>
      </h4>
      <ul className="space-y-1 pl-5 list-disc list-outside marker:text-muted-foreground/50">
        {children}
      </ul>
    </div>
  );
}

function EmptyLine() {
  return <li className="text-xs text-muted-foreground list-none -ml-5">Sin registros</li>;
}

function ComparisonRow({ label, current, prev, variation, positiveIsGood }: {
  label: string; current: string; prev: string; variation: number | null; positiveIsGood: boolean;
}) {
  const isPositive = variation !== null && variation > 0;
  const isNegative = variation !== null && variation < 0;
  const isGood = positiveIsGood ? isPositive : isNegative;
  const isBad = positiveIsGood ? isNegative : isPositive;

  return (
    <div className="flex items-center justify-between text-xs py-1">
      <div className="flex flex-col">
        <span className="text-muted-foreground text-[10px]">{label}</span>
        <span className="font-medium">{prev} → {current}</span>
      </div>
      <div className="flex items-center gap-1">
        {variation === null ? (
          <span className="flex items-center gap-0.5 text-muted-foreground">
            <Minus className="h-3 w-3" /> —
          </span>
        ) : (
          <span className={cn(
            'flex items-center gap-0.5 text-[11px] font-semibold',
            isGood && 'text-emerald-600 dark:text-emerald-400',
            isBad && 'text-destructive',
            !isGood && !isBad && 'text-muted-foreground',
          )}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : isNegative ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {variation > 0 ? '+' : ''}{variation}%
          </span>
        )}
      </div>
    </div>
  );
}
