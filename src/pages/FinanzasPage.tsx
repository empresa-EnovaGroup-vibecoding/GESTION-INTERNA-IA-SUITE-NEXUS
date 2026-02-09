import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { format, isSameMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FinanzasResumen from '@/components/finanzas/FinanzasResumen';
import TablaGastos from '@/components/finanzas/TablaGastos';
import TablaIngresos from '@/components/finanzas/TablaIngresos';
import TablaRentabilidad from '@/components/finanzas/TablaRentabilidad';
import GananciaChart from '@/components/finanzas/GananciaChart';
import PagosRecientes from '@/components/finanzas/PagosRecientes';
import RegistrarPagoDialog from '@/components/finanzas/RegistrarPagoDialog';

export default function FinanzasPage() {
  const { paneles, suscripciones, pagos, clientes } = useData();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const mesLabel = format(selectedDate, 'MMMM yyyy', { locale: es });

  // Active panels (gastos)
  const panelesActivos = useMemo(
    () => paneles.filter(p => p.estado === 'activo'),
    [paneles]
  );
  const totalGastos = useMemo(
    () => panelesActivos.reduce((sum, p) => sum + p.costoMensual, 0),
    [panelesActivos]
  );

  // Active subscriptions (ingresos)
  const totalIngresos = useMemo(
    () => suscripciones.filter(s => s.estado === 'activa').reduce((sum, s) => sum + s.precioCobrado, 0),
    [suscripciones]
  );

  const ganancia = totalIngresos - totalGastos;

  // Clientes que deben (active subs, no payment this month)
  const clientesQueDeben = useMemo(() => {
    const clientesConSubActiva = new Set(
      suscripciones.filter(s => s.estado === 'activa').map(s => s.clienteId)
    );
    let count = 0;
    clientesConSubActiva.forEach(clienteId => {
      const subsCliente = suscripciones.filter(s => s.clienteId === clienteId && s.estado === 'activa');
      const totalCobrar = subsCliente.reduce((sum, s) => sum + s.precioCobrado, 0);
      const pagosMes = pagos.filter(
        p => p.clienteId === clienteId && isSameMonth(new Date(p.fecha), selectedDate)
      );
      const totalPagado = pagosMes.reduce((sum, p) => sum + p.monto, 0);
      if (totalPagado < totalCobrar) count++;
    });
    return count;
  }, [suscripciones, pagos, selectedDate]);

  return (
    <div className="space-y-6">
      {/* Header with month selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Finanzas</h1>
          <p className="text-sm text-muted-foreground">Control automático de ingresos y gastos</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(d => subMonths(d, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium capitalize min-w-[120px] text-center">{mesLabel}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(d => addMonths(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <RegistrarPagoDialog />
        </div>
      </div>

      {/* Summary cards */}
      <FinanzasResumen
        totalGastos={totalGastos}
        totalIngresos={totalIngresos}
        ganancia={ganancia}
        clientesQueDeben={clientesQueDeben}
      />

      {/* Chart */}
      <GananciaChart />

      {/* Gastos table */}
      <TablaGastos panelesActivos={panelesActivos} totalGastos={totalGastos} />

      {/* Ingresos table */}
      <TablaIngresos selectedDate={selectedDate} />

      {/* Rentabilidad */}
      <TablaRentabilidad />

      {/* Pagos recientes */}
      <PagosRecientes selectedDate={selectedDate} />
    </div>
  );
}
