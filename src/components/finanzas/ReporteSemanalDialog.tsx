import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import {
  format, startOfWeek, endOfWeek, isWithinInterval,
  addDays, differenceInDays, startOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ClipboardCopy, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ReporteSemanalDialog() {
  const [open, setOpen] = useState(false);
  const { clientes, suscripciones, pagos, paneles, getServicioById } = useData();

  const reporte = useMemo(() => {
    const hoy = startOfDay(new Date());
    const weekStart = startOfWeek(hoy, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(hoy, { weekStartsOn: 1 });
    const nextWeekStart = addDays(weekEnd, 1);
    const nextWeekEnd = addDays(nextWeekStart, 6);

    const inWeek = (dateStr: string) =>
      isWithinInterval(new Date(dateStr), { start: weekStart, end: weekEnd });

    // --- Nuevos clientes ---
    // Clients whose earliest subscription started this week
    const nuevosClientes: { nombre: string; servicio: string }[] = [];
    for (const cliente of clientes) {
      const subs = suscripciones.filter(s => s.clienteId === cliente.id);
      if (subs.length === 0) continue;
      const earliest = [...subs].sort(
        (a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
      )[0];
      if (inWeek(earliest.fechaInicio)) {
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
      if (!inWeek(sub.fechaInicio)) continue;
      // It's a renewal if there's an older sub with the same service for the same client
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
    const pagosSemanales = pagos.filter(p => inWeek(p.fecha));
    const totalUSD = pagosSemanales
      .filter(p => !p.moneda || p.moneda === 'USD')
      .reduce((sum, p) => sum + p.monto, 0);
    const totalMXN = pagosSemanales
      .filter(p => p.moneda === 'MXN')
      .reduce((sum, p) => sum + (p.montoOriginal || 0), 0);
    const totalCOP = pagosSemanales
      .filter(p => p.moneda === 'COP')
      .reduce((sum, p) => sum + (p.montoOriginal || 0), 0);
    const totalPagosUSD = pagosSemanales.reduce((sum, p) => sum + p.monto, 0);

    // --- Vencimientos próxima semana ---
    const vencimientosProx: { cliente: string; servicio: string; fecha: string }[] = [];
    for (const sub of suscripciones) {
      if (sub.estado !== 'activa') continue;
      const venc = new Date(sub.fechaVencimiento);
      if (isWithinInterval(venc, { start: nextWeekStart, end: nextWeekEnd })) {
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
    const totalGastosSemanal = paneles
      .filter(p => p.estado === 'activo')
      .reduce((sum, p) => sum + (p.costoMensual / 4), 0); // prorrateado semanal
    const gananciaNeta = Math.round((totalPagosUSD - totalGastosSemanal) * 100) / 100;

    return {
      weekStart, weekEnd,
      nuevosClientes, renovaciones,
      pagosCount: pagosSemanales.length,
      totalUSD: Math.round(totalUSD * 100) / 100,
      totalMXN: Math.round(totalMXN),
      totalCOP: Math.round(totalCOP),
      totalPagosUSD: Math.round(totalPagosUSD * 100) / 100,
      vencimientosProx,
      gananciaNeta,
      totalGastosSemanal: Math.round(totalGastosSemanal * 100) / 100,
    };
  }, [clientes, suscripciones, pagos, paneles, getServicioById]);

  const buildReporteText = () => {
    const r = reporte;
    const lines: string[] = [];

    lines.push(`📊 *REPORTE SEMANAL*`);
    lines.push(`📅 Semana del ${format(r.weekStart, 'dd MMM', { locale: es })} al ${format(r.weekEnd, 'dd MMM yyyy', { locale: es })}`);
    lines.push('');

    // Nuevos clientes
    lines.push(`👤 *Nuevos clientes (${r.nuevosClientes.length})*`);
    if (r.nuevosClientes.length === 0) {
      lines.push('   Sin nuevos clientes');
    } else {
      for (const c of r.nuevosClientes) {
        lines.push(`   • ${c.nombre} → ${c.servicio}`);
      }
    }
    lines.push('');

    // Renovaciones
    lines.push(`🔄 *Renovaciones (${r.renovaciones.length})*`);
    if (r.renovaciones.length === 0) {
      lines.push('   Sin renovaciones');
    } else {
      for (const ren of r.renovaciones) {
        lines.push(`   • ${ren.cliente} → ${ren.servicio}`);
      }
    }
    lines.push('');

    // Pagos
    lines.push(`💰 *Pagos recibidos (${r.pagosCount})*`);
    const monedas: string[] = [];
    if (r.totalUSD > 0) monedas.push(`$${r.totalUSD} USD`);
    if (r.totalMXN > 0) monedas.push(`$${r.totalMXN.toLocaleString()} MXN`);
    if (r.totalCOP > 0) monedas.push(`$${r.totalCOP.toLocaleString()} COP`);
    lines.push(`   ${monedas.length > 0 ? monedas.join(' · ') : '$0 USD'}`);
    lines.push('');

    // Vencimientos
    lines.push(`⚠️ *Vencimientos próxima semana (${r.vencimientosProx.length})*`);
    if (r.vencimientosProx.length === 0) {
      lines.push('   Sin vencimientos');
    } else {
      for (const v of r.vencimientosProx) {
        lines.push(`   • ${v.cliente} → ${v.servicio} (${v.fecha})`);
      }
    }
    lines.push('');

    // Ganancia
    lines.push(`📈 *Resumen financiero*`);
    lines.push(`   Ingresos: $${r.totalPagosUSD} USD`);
    lines.push(`   Gastos (prorrateo): $${r.totalGastosSemanal} USD`);
    lines.push(`   *Ganancia neta: $${r.gananciaNeta} USD*`);

    return lines.join('\n');
  };

  const handleCopiar = async () => {
    const text = buildReporteText();
    await navigator.clipboard.writeText(text);
    toast.success('Reporte copiado al portapapeles');
  };

  const r = reporte;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FileText className="h-4 w-4" />
          Reporte Semanal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reporte Semanal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Date range */}
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">Semana del</p>
            <p className="font-semibold">
              {format(r.weekStart, 'dd MMM', { locale: es })} — {format(r.weekEnd, 'dd MMM yyyy', { locale: es })}
            </p>
          </div>

          {/* Nuevos clientes */}
          <Section
            emoji="👤"
            title="Nuevos clientes"
            count={r.nuevosClientes.length}
            color="text-emerald-500"
          >
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
          <Section emoji="💰" title="Pagos recibidos" count={r.pagosCount} color="text-blue-500">
            <div className="flex flex-wrap gap-2 text-xs">
              {r.totalUSD > 0 && (
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 font-medium text-blue-700 dark:text-blue-400">
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
          <Section emoji="⚠️" title="Vencimientos próxima semana" count={r.vencimientosProx.length} color="text-warning">
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
                <p className="text-[10px] text-muted-foreground">Gastos (prorrateo)</p>
                <p className="text-sm font-semibold text-destructive">${r.totalGastosSemanal}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Ganancia neta</p>
                <p className={`text-sm font-bold ${r.gananciaNeta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                  ${r.gananciaNeta} USD
                </p>
              </div>
            </div>
          </div>

          {/* Copy button */}
          <Button className="w-full gap-2" onClick={handleCopiar}>
            <ClipboardCopy className="h-4 w-4" />
            Copiar Reporte
          </Button>
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
