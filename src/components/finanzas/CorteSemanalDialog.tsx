import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import {
  format, startOfDay, endOfDay, isWithinInterval, differenceInDays,
  subDays, startOfWeek, endOfWeek, isSameDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Scissors, CalendarIcon, Copy, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { DetalleProyectoCorteSemanal } from '@/types';

export default function CorteSemanalDialog() {
  const [open, setOpen] = useState(false);
  const [notas, setNotas] = useState('');
  const { pagos, proyectos, paneles, addCorteSemanal } = useData();

  // Default: last 7 days (today back to 6 days ago)
  const today = startOfDay(new Date());
  const [fechaInicio, setFechaInicio] = useState<Date>(subDays(today, 6));
  const [fechaFin, setFechaFin] = useState<Date>(today);

  const rangeStart = startOfDay(fechaInicio);
  const rangeEnd = endOfDay(fechaFin);
  const numDays = differenceInDays(fechaFin, fechaInicio) + 1;

  const rangeLabel = isSameDay(fechaInicio, fechaFin)
    ? format(fechaInicio, 'd MMM yyyy', { locale: es })
    : `${format(fechaInicio, 'd MMM', { locale: es })} - ${format(fechaFin, 'd MMM yyyy', { locale: es })}`;

  // Quick presets
  const presets = [
    {
      label: 'Ultimos 7 dias',
      apply: () => { setFechaInicio(subDays(today, 6)); setFechaFin(today); },
      active: isSameDay(fechaInicio, subDays(today, 6)) && isSameDay(fechaFin, today),
    },
    {
      label: 'Esta semana',
      apply: () => {
        setFechaInicio(startOfWeek(today, { weekStartsOn: 1 }));
        setFechaFin(today);
      },
      active: isSameDay(fechaInicio, startOfWeek(today, { weekStartsOn: 1 })) && isSameDay(fechaFin, today),
    },
    {
      label: 'Semana pasada',
      apply: () => {
        const prevWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        const prevWeekEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        setFechaInicio(prevWeekStart);
        setFechaFin(prevWeekEnd);
      },
      active: isSameDay(fechaInicio, startOfWeek(subDays(today, 7), { weekStartsOn: 1 }))
        && isSameDay(fechaFin, endOfWeek(subDays(today, 7), { weekStartsOn: 1 })),
    },
  ];

  // Calculate data for the selected range
  const corteData = useMemo(() => {
    const rangePayments = pagos.filter(p =>
      isWithinInterval(new Date(p.fecha), { start: rangeStart, end: rangeEnd })
    );

    // Group by project
    const projectGroups = new Map<string, typeof rangePayments>();
    const withoutProject: typeof rangePayments = [];

    for (const pago of rangePayments) {
      if (pago.proyectoId) {
        const existing = projectGroups.get(pago.proyectoId) || [];
        projectGroups.set(pago.proyectoId, [...existing, pago]);
      } else {
        withoutProject.push(pago);
      }
    }

    // Build details for each project
    const detalleProyectos: DetalleProyectoCorteSemanal[] = [];
    let totalIngresos = 0;
    let totalComisionUsuario = 0;
    let totalPagadoDuenos = 0;

    for (const [proyectoId, projectPayments] of projectGroups) {
      const proyecto = proyectos.find(p => p.id === proyectoId);
      if (!proyecto) continue;

      const totalPagos = projectPayments.reduce((sum, p) => sum + p.monto, 0);
      const comisionPct = proyecto.comisionPorcentaje || 0;
      const comisionMonto = totalPagos * (comisionPct / 100);
      const pagadoAlDueno = totalPagos - comisionMonto;

      detalleProyectos.push({
        proyectoId: proyecto.id,
        nombre: proyecto.nombre,
        dueno: proyecto.duenoCuenta || 'Sin dueno',
        totalPagos: Math.round(totalPagos * 100) / 100,
        cantidadPagos: projectPayments.length,
        comisionPct,
        comisionMonto: Math.round(comisionMonto * 100) / 100,
        pagadoAlDueno: Math.round(pagadoAlDueno * 100) / 100,
      });

      totalIngresos += totalPagos;
      totalComisionUsuario += comisionMonto;
      totalPagadoDuenos += pagadoAlDueno;
    }

    // Handle "Sin proyecto" group
    if (withoutProject.length > 0) {
      const totalPagos = withoutProject.reduce((sum, p) => sum + p.monto, 0);
      detalleProyectos.push({
        proyectoId: 'sin-proyecto',
        nombre: 'Sin proyecto',
        dueno: '-',
        totalPagos: Math.round(totalPagos * 100) / 100,
        cantidadPagos: withoutProject.length,
        comisionPct: 100,
        comisionMonto: Math.round(totalPagos * 100) / 100,
        pagadoAlDueno: 0,
      });

      totalIngresos += totalPagos;
      totalComisionUsuario += totalPagos;
    }

    // Prorate expenses: costoMensual * (numDays / 30)
    const totalGastos = paneles
      .filter(p => p.estado === 'activo')
      .reduce((sum, p) => sum + (p.costoMensual * numDays / 30), 0);

    const gananciaNeta = totalComisionUsuario - totalGastos;

    return {
      detalleProyectos,
      totalIngresos: Math.round(totalIngresos * 100) / 100,
      totalComisionUsuario: Math.round(totalComisionUsuario * 100) / 100,
      totalPagadoDuenos: Math.round(totalPagadoDuenos * 100) / 100,
      totalGastos: Math.round(totalGastos * 100) / 100,
      gananciaNeta: Math.round(gananciaNeta * 100) / 100,
    };
  }, [pagos, proyectos, paneles, rangeStart, rangeEnd, numDays]);

  const handleSaveCorte = async () => {
    try {
      await addCorteSemanal({
        fechaInicio: format(fechaInicio, 'yyyy-MM-dd'),
        fechaFin: format(fechaFin, 'yyyy-MM-dd'),
        totalIngresos: corteData.totalIngresos,
        totalComisionUsuario: corteData.totalComisionUsuario,
        totalPagadoDuenos: corteData.totalPagadoDuenos,
        totalGastos: corteData.totalGastos,
        gananciaNeta: corteData.gananciaNeta,
        detalleProyectos: corteData.detalleProyectos,
        notas: notas.trim() || undefined,
      });
      toast.success('Corte guardado');
      setNotas('');
      setOpen(false);
    } catch (error) {
      console.error('Error saving corte:', error);
      toast.error('Error al guardar el corte');
    }
  };

  const buildWhatsAppText = (): string => {
    const lines: string[] = [];
    lines.push('✂️ *CORTE SEMANAL*');
    lines.push(`📅 ${rangeLabel}`);
    lines.push(`📆 ${numDays} dia${numDays !== 1 ? 's' : ''}`);
    lines.push('');

    for (const detalle of corteData.detalleProyectos) {
      const countryEmoji = detalle.proyectoId === 'sin-proyecto'
        ? ''
        : proyectos.find(p => p.id === detalle.proyectoId)?.pais
          ? ` (${proyectos.find(p => p.id === detalle.proyectoId)?.pais})`
          : '';

      lines.push(`*${detalle.nombre.toUpperCase()}*${detalle.dueno !== '-' ? ` - ${detalle.dueno}${countryEmoji}` : ''}`);
      lines.push(`  ${detalle.cantidadPagos} pago${detalle.cantidadPagos !== 1 ? 's' : ''} | Total: $${detalle.totalPagos.toFixed(2)}`);
      lines.push(`  Tu comision (${detalle.comisionPct}%): $${detalle.comisionMonto.toFixed(2)}`);

      if (detalle.pagadoAlDueno > 0) {
        lines.push(`  Pagar a ${detalle.dueno}: $${detalle.pagadoAlDueno.toFixed(2)}`);
      }
      lines.push('');
    }

    lines.push('📊 *RESUMEN*');
    lines.push(`  Ingresos: $${corteData.totalIngresos.toFixed(2)}`);
    lines.push(`  Tu comision total: $${corteData.totalComisionUsuario.toFixed(2)}`);
    lines.push(`  Gastos (${numDays}d): -$${corteData.totalGastos.toFixed(2)}`);
    lines.push(`  *GANANCIA NETA: $${corteData.gananciaNeta.toFixed(2)}*`);

    if (notas.trim()) {
      lines.push('');
      lines.push('📝 *Notas*');
      lines.push(notas.trim());
    }

    return lines.join('\n');
  };

  const handleCopyToClipboard = async () => {
    const text = buildWhatsAppText();
    await navigator.clipboard.writeText(text);
    toast.success('Texto copiado al portapapeles');
  };

  const handleSelectInicio = (date: Date | undefined) => {
    if (!date) return;
    const d = startOfDay(date);
    setFechaInicio(d);
    // If start is after end, move end to same day
    if (d > fechaFin) setFechaFin(d);
  };

  const handleSelectFin = (date: Date | undefined) => {
    if (!date) return;
    const d = startOfDay(date);
    setFechaFin(d);
    // If end is before start, move start to same day
    if (d < fechaInicio) setFechaInicio(d);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Scissors className="h-4 w-4" />
          Corte Semanal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Corte Semanal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Quick presets */}
          <div className="flex gap-1.5 flex-wrap">
            {presets.map(preset => (
              <button
                key={preset.label}
                onClick={preset.apply}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-medium border transition-colors',
                  preset.active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Date pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Fecha inicio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2 text-xs h-9">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {format(fechaInicio, 'd MMM yyyy', { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaInicio}
                    onSelect={handleSelectInicio}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Fecha fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2 text-xs h-9">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {format(fechaFin, 'd MMM yyyy', { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={fechaFin}
                    onSelect={handleSelectFin}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Range info */}
          <div className="text-center text-xs text-muted-foreground">
            {rangeLabel} — <span className="font-medium text-foreground">{numDays} dia{numDays !== 1 ? 's' : ''}</span>
          </div>

          {/* Projects grouped */}
          {corteData.detalleProyectos.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
              No hay pagos en este periodo
            </div>
          ) : (
            <div className="space-y-3">
              {corteData.detalleProyectos.map((detalle) => {
                const proyecto = proyectos.find(p => p.id === detalle.proyectoId);
                const countryLabel = proyecto?.pais ? ` - ${proyecto.pais}` : '';

                return (
                  <div key={detalle.proyectoId} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold">{detalle.nombre}</h4>
                        {detalle.dueno !== '-' && (
                          <p className="text-xs text-muted-foreground">
                            {detalle.dueno}{countryLabel}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {detalle.cantidadPagos} pago{detalle.cantidadPagos !== 1 ? 's' : ''}
                        </p>
                        <p className="text-sm font-semibold">${detalle.totalPagos.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Tu comision ({detalle.comisionPct}%)</p>
                        <p className="text-sm font-semibold text-primary">${detalle.comisionMonto.toFixed(2)}</p>
                      </div>
                      {detalle.pagadoAlDueno > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground">Pagar a {detalle.dueno}</p>
                          <p className="text-sm font-semibold text-destructive">${detalle.pagadoAlDueno.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary section */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">📊 Resumen Financiero</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground">Ingresos totales</p>
                <p className="text-lg font-bold text-foreground">${corteData.totalIngresos.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Tu comision total</p>
                <p className="text-lg font-bold text-primary">${corteData.totalComisionUsuario.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Gastos ({numDays}d prorrateo)</p>
                <p className="text-lg font-bold text-destructive">-${corteData.totalGastos.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Ganancia neta</p>
                <p className={`text-lg font-bold ${corteData.gananciaNeta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                  ${corteData.gananciaNeta.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Notas field */}
          <div className="space-y-2">
            <Label htmlFor="notas" className="text-xs">Notas (opcional)</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Agrega notas sobre este corte..."
              className="resize-none text-xs min-h-[60px]"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleCopyToClipboard}
              disabled={corteData.detalleProyectos.length === 0}
            >
              <Copy className="h-4 w-4" />
              Copiar para WhatsApp
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleSaveCorte}
              disabled={corteData.detalleProyectos.length === 0}
            >
              <Save className="h-4 w-4" />
              Guardar Corte
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
