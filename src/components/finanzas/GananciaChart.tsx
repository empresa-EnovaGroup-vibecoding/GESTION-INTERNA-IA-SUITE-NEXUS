import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { startOfWeek, endOfWeek, subWeeks, isWithinInterval, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function GananciaChart() {
  const { paneles, suscripciones, pagos } = useData();

  const chartData = useMemo(() => {
    const weeks = [];
    const gastoMensualTotal = paneles
      .filter(p => p.estado === 'activo')
      .reduce((sum, p) => sum + p.costoMensual, 0);
    // Distribute monthly cost evenly across ~4.3 weeks
    const gastoSemanal = gastoMensualTotal / 4.33;

    const ingresoMensualTotal = suscripciones
      .filter(s => s.estado === 'activa')
      .reduce((sum, s) => sum + s.precioCobrado, 0);
    const ingresoSemanal = ingresoMensualTotal / 4.33;

    for (let i = 5; i >= 0; i--) {
      const start = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const end = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });

      // Real payments in this week
      const pagosWeek = pagos.filter(p =>
        isWithinInterval(new Date(p.fecha), { start, end })
      );
      const cobrado = pagosWeek.reduce((sum, p) => sum + p.monto, 0);

      weeks.push({
        semana: format(start, 'dd MMM', { locale: es }),
        Ingresos: Math.round(ingresoSemanal),
        Gastos: Math.round(gastoSemanal),
        Ganancia: Math.round(ingresoSemanal - gastoSemanal),
        Cobrado: cobrado,
      });
    }
    return weeks;
  }, [paneles, suscripciones, pagos]);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold">Ganancia Neta Semanal</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="semana" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line type="monotone" dataKey="Ingresos" stroke="hsl(152, 69%, 31%)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Gastos" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Ganancia" stroke="hsl(173, 58%, 39%)" strokeWidth={2.5} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
