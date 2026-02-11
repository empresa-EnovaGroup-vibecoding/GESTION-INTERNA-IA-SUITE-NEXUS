import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { format as fmtDate } from 'date-fns';
import { format, isSameMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cliente } from '@/types';
import { getWhatsAppCobroUrl } from '@/lib/whatsapp';
import { toast } from 'sonner';
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
import MetaHistorial from '@/components/finanzas/MetaHistorial';
import MetasPorServicio from '@/components/finanzas/MetasPorServicio';

interface ClienteDeudor {
  cliente: Cliente;
  totalCobrar: number;
  totalPagado: number;
  saldo: number;
  servicios: string[];
}

export default function FinanzasPage() {
  const { paneles, suscripciones, pagos, clientes, cortes, proyectos, getServicioById } = useData();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDeudores, setShowDeudores] = useState(false);
  const [cobroIndex, setCobroIndex] = useState(-1);
  const [selectedProyecto, setSelectedProyecto] = useState<string | null>(null);

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

  // Pagos filtrados por proyecto
  const pagosFiltrados = useMemo(() => {
    if (!selectedProyecto) return pagos;
    return pagos.filter(p => p.proyectoId === selectedProyecto);
  }, [pagos, selectedProyecto]);

  // INGRESOS REALES
  const totalIngresos = useMemo(() => {
    const cortesDelMes = cortes.filter(c => isSameMonth(new Date(c.fecha), selectedDate));
    const usdtFromCortes = selectedProyecto ? 0 : cortesDelMes.reduce((sum, c) => sum + c.usdtRecibidoReal, 0);
    const pagosDirectosUSD = pagosFiltrados.filter(p =>
      isSameMonth(new Date(p.fecha), selectedDate) &&
      (!p.moneda || p.moneda === 'USD') &&
      !p.corteId
    );
    const usdDirectos = pagosDirectosUSD.reduce((sum, p) => sum + p.monto, 0);
    return Math.round((usdtFromCortes + usdDirectos) * 100) / 100;
  }, [cortes, pagosFiltrados, selectedDate, selectedProyecto]);

  const ganancia = totalIngresos - totalGastos;

  // Clientes que deben - FULL LIST
  const deudores = useMemo(() => {
    const clientesConSubActiva = new Set(
      suscripciones.filter(s => s.estado === 'activa').map(s => s.clienteId)
    );
    const result: ClienteDeudor[] = [];
    clientesConSubActiva.forEach(clienteId => {
      const cliente = clientes.find(c => c.id === clienteId);
      if (!cliente) return;
      const subsCliente = suscripciones.filter(s => s.clienteId === clienteId && s.estado === 'activa');
      const totalCobrar = subsCliente.reduce((sum, s) => sum + s.precioCobrado, 0);
      const pagosMes = pagosFiltrados.filter(
        p => p.clienteId === clienteId && isSameMonth(new Date(p.fecha), selectedDate)
      );
      const totalPagado = pagosMes.reduce((sum, p) => sum + p.monto, 0);
      if (totalPagado < totalCobrar) {
        const servicios = subsCliente.map(s => {
          const servicio = getServicioById(s.servicioId);
          return servicio?.nombre || 'Servicio';
        });
        result.push({
          cliente,
          totalCobrar,
          totalPagado,
          saldo: Math.round((totalCobrar - totalPagado) * 100) / 100,
          servicios,
        });
      }
    });
    return result.sort((a, b) => b.saldo - a.saldo);
  }, [suscripciones, pagosFiltrados, clientes, selectedDate, getServicioById]);

  // Pendiente de convertir
  const pendienteConvertir = useMemo(() => {
    const pagosPendientes = pagosFiltrados.filter(p =>
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
      label: parts.length > 0 ? parts.join(' + ') : 'Sin pendientes',
    };
  }, [pagosFiltrados, selectedDate]);

  // Cobrar siguiente
  const handleCobrarSiguiente = () => {
    const nextIndex = cobroIndex + 1;
    if (nextIndex < deudores.length) {
      const d = deudores[nextIndex];
      window.open(getWhatsAppCobroUrl(d.cliente, d.saldo, d.servicios), '_blank');
      setCobroIndex(nextIndex);
      if (nextIndex === deudores.length - 1) {
        toast.success('Ultimo cliente contactado!');
      }
    }
  };

  const handleToggleDeudores = () => {
    if (deudores.length === 0) return;
    setShowDeudores(!showDeudores);
    if (!showDeudores) setCobroIndex(-1);
  };

  const totalDeuda = deudores.reduce((sum, d) => sum + d.saldo, 0);

  return (
    <div className="space-y-4">
      {/* Header with month selector + action buttons */}
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
          {proyectos.length > 0 && (
            <Select value={selectedProyecto || 'all'} onValueChange={v => setSelectedProyecto(v === 'all' ? null : v)}>
              <SelectTrigger className="w-[150px] h-9 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proyectos</SelectItem>
                {proyectos.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <ReporteSemanalDialog />
          <NuevoCorteDialog />
          <RegistrarPagoDialog />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="ingresos-gastos">Ingresos y Gastos</TabsTrigger>
          <TabsTrigger value="cortes">Cortes P2P</TabsTrigger>
          <TabsTrigger value="metas">Metas y Analisis</TabsTrigger>
        </TabsList>

        {/* Tab 1: Resumen */}
        <TabsContent value="resumen" className="space-y-6 mt-4">
          <FinanzasResumen
            totalGastos={totalGastos}
            totalIngresos={totalIngresos}
            ganancia={ganancia}
            clientesQueDeben={deudores.length}
            pendienteConvertir={pendienteConvertir}
            onClientesQueDebenClick={handleToggleDeudores}
            showDeudores={showDeudores}
          />

          {showDeudores && deudores.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-warning">
                    {deudores.length} cliente{deudores.length !== 1 ? 's' : ''} debe{deudores.length === 1 ? '' : 'n'} ${totalDeuda.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Click en WhatsApp para cobrar uno por uno
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-warning/50 text-warning hover:bg-warning/10 hover:text-warning"
                  onClick={handleCobrarSiguiente}
                >
                  <Send className="h-3.5 w-3.5" />
                  {cobroIndex < 0
                    ? 'Cobrar a todos (' + deudores.length + ')'
                    : cobroIndex >= deudores.length - 1
                      ? 'Todos contactados!'
                      : 'Siguiente ' + (cobroIndex + 2) + '/' + deudores.length
                  }
                </Button>
              </div>
              <div className="space-y-1.5">
                {deudores.map((d, i) => {
                  const contactado = i <= cobroIndex;
                  return (
                    <div
                      key={d.cliente.id}
                      className={'flex items-center justify-between rounded-md bg-card border p-3 text-sm gap-2 transition-opacity ' + (contactado ? 'border-success/30 opacity-60' : 'border-border/50')}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{d.cliente.nombre}</p>
                          {contactado && <span className="text-[10px] text-success font-medium">Contactado</span>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{d.servicios.join(', ')}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-warning">${d.saldo.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        {d.totalPagado > 0 && (
                          <p className="text-[10px] text-muted-foreground">Pago ${d.totalPagado.toLocaleString()} de ${d.totalCobrar.toLocaleString()}</p>
                        )}
                      </div>
                      <a
                        href={getWhatsAppCobroUrl(d.cliente, d.saldo, d.servicios)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md h-9 w-9 text-success hover:bg-success/10 transition-colors shrink-0"
                        title={'Cobrar a ' + d.cliente.nombre}
                      >
                        <MessageCircle className="h-4.5 w-4.5" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <MetaMensual totalIngresos={totalIngresos} mesKey={fmtDate(selectedDate, 'yyyy-MM')} />
          <GananciaChart />
        </TabsContent>

        {/* Tab 2: Pagos */}
        <TabsContent value="pagos" className="space-y-6 mt-4">
          <PagosRecientes selectedDate={selectedDate} selectedProyecto={selectedProyecto} />
        </TabsContent>

        {/* Tab 3: Ingresos y Gastos */}
        <TabsContent value="ingresos-gastos" className="space-y-6 mt-4">
          <TablaIngresos selectedDate={selectedDate} />
          <TablaGastos panelesActivos={panelesActivos} totalGastos={totalGastos} />
          <TablaRentabilidad />
        </TabsContent>

        {/* Tab 4: Cortes P2P */}
        <TabsContent value="cortes" className="space-y-6 mt-4">
          <CortesHistorial selectedDate={selectedDate} />
        </TabsContent>

        {/* Tab 5: Metas y Analisis */}
        <TabsContent value="metas" className="space-y-6 mt-4">
          <MetasPorServicio mesKey={fmtDate(selectedDate, 'yyyy-MM')} selectedDate={selectedDate} />
          <MetaHistorial currentMesKey={fmtDate(selectedDate, 'yyyy-MM')} />
          <ResumenPorPais selectedDate={selectedDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
