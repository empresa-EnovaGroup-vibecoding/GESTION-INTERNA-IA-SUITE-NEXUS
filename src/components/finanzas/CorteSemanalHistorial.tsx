import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { format, isSameMonth, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2, ChevronDown, ChevronUp, Copy, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { CorteSemanal } from '@/types';

interface Props {
  selectedDate: Date;
}

export default function CorteSemanalHistorial({ selectedDate }: Props) {
  const { cortesSemanales, deleteCorteSemanal, proyectos } = useData();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cortesMes = useMemo(() =>
    cortesSemanales
      .filter(c => isSameMonth(new Date(c.fechaInicio), selectedDate))
      .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()),
    [cortesSemanales, selectedDate]
  );

  const buildWhatsAppText = (c: CorteSemanal): string => {
    const lines: string[] = [];
    lines.push('✂️ *CORTE SEMANAL*');
    lines.push(`📅 ${format(new Date(c.fechaInicio), 'd MMM', { locale: es })} - ${format(new Date(c.fechaFin), 'd MMM yyyy', { locale: es })}`);
    lines.push('');

    for (const d of c.detalleProyectos) {
      const proy = proyectos.find(p => p.id === d.proyectoId);
      const countryLabel = proy?.pais ? ` (${proy.pais})` : '';
      lines.push(`*${d.nombre.toUpperCase()}*${d.dueno !== '-' ? ` - ${d.dueno}${countryLabel}` : ''}`);
      lines.push(`  ${d.cantidadPagos} pago${d.cantidadPagos !== 1 ? 's' : ''} | Total: $${d.totalPagos.toFixed(2)}`);
      lines.push(`  Tu comisión (${d.comisionPct}%): $${d.comisionMonto.toFixed(2)}`);
      if (d.pagadoAlDueno > 0) {
        lines.push(`  Pagar a ${d.dueno}: $${d.pagadoAlDueno.toFixed(2)}`);
      }
      lines.push('');
    }

    lines.push('📊 *RESUMEN*');
    lines.push(`  Ingresos: $${c.totalIngresos.toFixed(2)}`);
    lines.push(`  Tu comisión total: $${c.totalComisionUsuario.toFixed(2)}`);
    lines.push(`  Gastos semana: -$${c.totalGastos.toFixed(2)}`);
    lines.push(`  *GANANCIA NETA: $${c.gananciaNeta.toFixed(2)}*`);

    if (c.notas) {
      lines.push('');
      lines.push('📝 *Notas*');
      lines.push(c.notas);
    }

    return lines.join('\n');
  };

  if (cortesMes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
        <Scissors className="h-5 w-5 text-muted-foreground mb-2" />
        <p className="text-sm font-medium">No hay cortes semanales este mes</p>
        <p className="mt-1 text-xs text-muted-foreground">Crea uno con el boton &quot;Corte Semanal&quot;</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Historial de cortes semanales</h3>
      {cortesMes.map(c => {
        const isExpanded = expandedId === c.id;
        return (
          <div key={c.id} className="rounded-lg border border-border bg-card overflow-hidden">
            {/* Header row */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : c.id)}
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-muted-foreground">
                    {format(new Date(c.fechaInicio), 'd MMM', { locale: es })} - {format(new Date(c.fechaFin), 'd MMM', { locale: es })}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {differenceInDays(new Date(c.fechaFin), new Date(c.fechaInicio)) + 1} dias
                  </span>
                </div>
                <span className="text-sm font-semibold">${c.totalIngresos.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Comision: <span className="text-primary font-medium">${c.totalComisionUsuario.toFixed(2)}</span></span>
                <span className={`text-xs font-semibold ${c.gananciaNeta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                  Ganancia: ${c.gananciaNeta.toFixed(2)}
                </span>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t border-border px-4 py-3 space-y-3">
                {c.detalleProyectos.map(d => (
                  <div key={d.proyectoId} className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium">{d.nombre}</span>
                      {d.dueno !== '-' && <span className="text-muted-foreground"> ({d.dueno})</span>}
                      <span className="text-muted-foreground"> - {d.cantidadPagos} pago{d.cantidadPagos !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span>${d.totalPagos.toFixed(2)}</span>
                      <span className="text-primary">+${d.comisionMonto.toFixed(2)}</span>
                      {d.pagadoAlDueno > 0 && <span className="text-destructive">-${d.pagadoAlDueno.toFixed(2)}</span>}
                    </div>
                  </div>
                ))}

                <div className="border-t border-border pt-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">Gastos: -${c.totalGastos.toFixed(2)}</span>
                    {c.notas && <span className="text-muted-foreground italic truncate max-w-[200px]">{c.notas}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(buildWhatsAppText(c));
                        toast.success('Copiado al portapapeles');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCorteSemanal(c.id);
                        toast.success('Corte eliminado');
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
