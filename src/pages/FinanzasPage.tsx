import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { format as fmtDate } from 'date-fns';
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
import ResumenPorPais from '@/components/finanzas/ResumenPorPais';
import RegistrarPagoDialog from '@/components/finanzas/RegistrarPagoDialog';
import NuevoCorteDialog from '@/components/finanzas/NuevoCorteDialog';
import CortesHistorial from '@/components/finanzas/CortesHistorial';
import ReporteSemanalDialog from '@/components/finanzas/ReporteSemanalDialog';
import MetaMensual from '@/components/finanzas/MetaMensual';

export default function FinanzasPage() {
  const { paneles, suscripciones, pagos, clientes, cortes } = useData();
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

  // INGRESOS REALES: USDT from cortes + direct USD payments
  const totalIngresos = useMemo(() => {
    // 1. USDT real received from cortes this month
    const cortesDelMes = cortes.filter(c => isSameMonth(new Date(c.fecha), selectedDate));
    const usdtFromCortes = cortesDelMes.reduce((sum, c) => sum + c.usdtRecibidoReal, 0);

    // 2. Direct USD payments (no currency conversion needed)
    const pagosDirectosUSD = pagos.filter(p =>
      isSameMonth(new Date(p.fecha), selectedDate) &&
      (!p.moneda || p.moneda === 'USD') &&
      !p.corteId
    );
    const usdDirectos = pagosDirectosUSD.reduce((sum, p) => sum + p.monto, 0);

    // 3. Local currency payments that went through a corte (already counted in corte USDT)
    // DON'T add them again — they're included in usdtFromCortes

    return Math.round((usdtFromCortes + usdDirectos) * 100) / 100;
  }, [cortes, pagos, selectedDate]);

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

  // Pendiente de convertir: local currency payments without a corte this month
  const pendienteConvertir = useMemo(() => {
    const pagosPendientes = pagos.filter(p =>
      isSameMonth(new Date(p.fecha), selectedDate) &&
      p.moneda && p.moneda !== 'USD' &&
      !p.corteId
    );

    const mxnTotal = pagosPendientes
      .filter(p => p.moneda === 'MXN')
      .reduce((sum, p) => sum + (p.montoOriginal || 0), 0);
    const copTotal = pagosPendientes
      .filter(p => p.moneda === 'COP')
      .reduce((sum, p) => sum + (p.montoOriginal || 0), 0);

    const parts: string[] = [];
    if (mxnTotal > 0) parts.push(`${mxnTotal.toLocaleString()} MXN`);
    if (copTotal > 0) parts.push(`${copTotal.toLocaleString()} COP`);

    return {
      count: pagosPendientes.length,
      label: parts.length > 0 ? parts.join(' · ') : 'Sin pendientes',
    };
  }, [pagos, selectedDate]);

  return (
    <div className="space-y-6">
      {/* Header with month selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold">Finanzas</h1>
          <p className="text-sm text-muted-foreground">Control de ingresos reales y gastos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(d => subMonths(d, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium capitalize min-w-[120px] text-center">{mesLabel}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(d => addMonths(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <ReporteSemanalDialog />
          <NuevoCorteDialog />
          <RegistrarPagoDialog />
        </div>
      </div>

      {/* Summary cards */}
      <FinanzasResumen
        totalGastos={totalGastos}
        totalIngresos={totalIngresos}
        ganancia={ganancia}
        clientesQueDeben={clientesQueDeben}
        pendienteConvertir={pendienteConvertir}
      />

      {/* Monthly goal */}
      <MetaMensual totalIngresos={totalIngresos} mesKey={fmtDate(selectedDate, 'yyyy-MM')} />

      {/* Chart */}
      <GananciaChart />

      {/* Cortes P2P */}
      <CortesHistorial selectedDate={selectedDate} />

      {/* Gastos table */}
      <TablaGastos panelesActivos={panelesActivos} totalGastos={totalGastos} />

      {/* Ingresos table */}
      <TablaIngresos selectedDate={selectedDate} />

      {/* Rentabilidad */}
      <TablaRentabilidad />

      {/* Pagos por país */}
      <ResumenPorPais selectedDate={selectedDate} />

      {/* Pagos recientes */}
      <PagosRecientes selectedDate={selectedDate} />
    </div>
  );
}
