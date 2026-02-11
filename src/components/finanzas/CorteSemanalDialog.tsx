import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import {
  format, addDays, subDays, startOfDay, isWithinInterval, isFriday,
  nextFriday, previousFriday, isAfter, isBefore, isSameDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Scissors, ChevronLeft, ChevronRight, Copy, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // Calculate current week's Friday
  const getCurrentWeekFriday = (): Date => {
    const today = startOfDay(new Date());

    if (isFriday(today)) {
      return today;
    } else if (isAfter(today, nextFriday(today))) {
      // If today is after this week's Friday, use this week's Friday
      return previousFriday(addDays(today, 1));
    } else {
      // If today is before Friday, go back to last Friday
      return previousFriday(today);
    }
  };

  const [weekStartFriday, setWeekStartFriday] = useState<Date>(getCurrentWeekFriday());

  // Week range: Friday to Thursday
  const weekStart = startOfDay(weekStartFriday);
  const weekEnd = addDays(weekStart, 6); // Thursday

  const weekLabel = `${format(weekStart, 'd MMM', { locale: es })} - ${format(weekEnd, 'd MMM yyyy', { locale: es })}`;

  // Calculate weekly data
  const weeklyData = useMemo(() => {
    // Filter payments in the week range
    const weekPayments = pagos.filter(p =>
      isWithinInterval(new Date(p.fecha), { start: weekStart, end: weekEnd })
    );

    // Group by project
    const projectGroups = new Map<string, typeof weekPayments>();
    const withoutProject: typeof weekPayments = [];

    for (const pago of weekPayments) {
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
        dueno: proyecto.duenoCuenta || 'Sin dueño',
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

    // Calculate weekly expenses (active panels' monthly cost / 4)
    const totalGastos = paneles
      .filter(p => p.estado === 'activo')
      .reduce((sum, p) => sum + (p.costoMensual / 4), 0);

    const gananciaNeta = totalComisionUsuario - totalGastos;

    return {
      detalleProyectos,
      totalIngresos: Math.round(totalIngresos * 100) / 100,
      totalComisionUsuario: Math.round(totalComisionUsuario * 100) / 100,
      totalPagadoDuenos: Math.round(totalPagadoDuenos * 100) / 100,
      totalGastos: Math.round(totalGastos * 100) / 100,
      gananciaNeta: Math.round(gananciaNeta * 100) / 100,
    };
  }, [pagos, proyectos, paneles, weekStart, weekEnd]);

  const handlePrevWeek = () => {
    setWeekStartFriday(d => subDays(d, 7));
  };

  const handleNextWeek = () => {
    setWeekStartFriday(d => addDays(d, 7));
  };

  const handleSaveCorte = async () => {
    try {
      await addCorteSemanal({
        fechaInicio: format(weekStart, 'yyyy-MM-dd'),
        fechaFin: format(weekEnd, 'yyyy-MM-dd'),
        totalIngresos: weeklyData.totalIngresos,
        totalComisionUsuario: weeklyData.totalComisionUsuario,
        totalPagadoDuenos: weeklyData.totalPagadoDuenos,
        totalGastos: weeklyData.totalGastos,
        gananciaNeta: weeklyData.gananciaNeta,
        detalleProyectos: weeklyData.detalleProyectos,
        notas: notas.trim() || undefined,
      });
      toast.success('Corte semanal guardado');
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
    lines.push(`📅 ${format(weekStart, 'd MMM', { locale: es })} - ${format(weekEnd, 'd MMM yyyy', { locale: es })}`);
    lines.push('');

    // Projects
    for (const detalle of weeklyData.detalleProyectos) {
      const countryEmoji = detalle.proyectoId === 'sin-proyecto'
        ? ''
        : proyectos.find(p => p.id === detalle.proyectoId)?.pais
          ? ` (${proyectos.find(p => p.id === detalle.proyectoId)?.pais})`
          : '';

      lines.push(`*${detalle.nombre.toUpperCase()}*${detalle.dueno !== '-' ? ` - ${detalle.dueno}${countryEmoji}` : ''}`);
      lines.push(`  ${detalle.cantidadPagos} pago${detalle.cantidadPagos !== 1 ? 's' : ''} | Total: $${detalle.totalPagos.toFixed(2)}`);
      lines.push(`  Tu comisión (${detalle.comisionPct}%): $${detalle.comisionMonto.toFixed(2)}`);

      if (detalle.pagadoAlDueno > 0) {
        lines.push(`  Pagar a ${detalle.dueno}: $${detalle.pagadoAlDueno.toFixed(2)}`);
      }
      lines.push('');
    }

    // Summary
    lines.push('📊 *RESUMEN*');
    lines.push(`  Ingresos: $${weeklyData.totalIngresos.toFixed(2)}`);
    lines.push(`  Tu comisión total: $${weeklyData.totalComisionUsuario.toFixed(2)}`);
    lines.push(`  Gastos semana: -$${weeklyData.totalGastos.toFixed(2)}`);
    lines.push(`  *GANANCIA NETA: $${weeklyData.gananciaNeta.toFixed(2)}*`);

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

  const isCurrent = isSameDay(weekStartFriday, getCurrentWeekFriday());

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
          {/* Week selector */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className={`flex-1 text-center text-sm font-semibold ${isCurrent ? 'text-primary' : ''}`}>
              {weekLabel}
            </div>

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {!isCurrent && (
            <button
              onClick={() => setWeekStartFriday(getCurrentWeekFriday())}
              className="w-full text-center text-[11px] text-primary hover:underline"
            >
              Ir a semana actual
            </button>
          )}

          {/* Projects grouped */}
          {weeklyData.detalleProyectos.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
              No hay pagos en esta semana
            </div>
          ) : (
            <div className="space-y-3">
              {weeklyData.detalleProyectos.map((detalle) => {
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
                        <p className="text-[10px] text-muted-foreground">Tu comisión ({detalle.comisionPct}%)</p>
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
                <p className="text-lg font-bold text-foreground">${weeklyData.totalIngresos.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Tu comisión total</p>
                <p className="text-lg font-bold text-primary">${weeklyData.totalComisionUsuario.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Gastos semana</p>
                <p className="text-lg font-bold text-destructive">-${weeklyData.totalGastos.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Ganancia neta</p>
                <p className={`text-lg font-bold ${weeklyData.gananciaNeta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                  ${weeklyData.gananciaNeta.toFixed(2)}
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
              disabled={weeklyData.detalleProyectos.length === 0}
            >
              <Copy className="h-4 w-4" />
              Copiar para WhatsApp
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleSaveCorte}
              disabled={weeklyData.detalleProyectos.length === 0}
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
