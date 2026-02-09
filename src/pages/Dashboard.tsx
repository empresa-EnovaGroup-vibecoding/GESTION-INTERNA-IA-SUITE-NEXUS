import { useMemo, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { format, isToday, isBefore, addDays, isAfter, startOfDay, differenceInDays, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle, Clock, Users, Monitor, TrendingUp,
  CalendarClock, MessageCircle, RefreshCw, Calendar,
} from 'lucide-react';
import { getWhatsAppNotificationUrl } from '@/lib/whatsapp';
import { Suscripcion } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Dashboard() {
  const {
    clientes, paneles, suscripciones, pagos, cortes,
    getPanelById, getServicioById, updateSuscripcion,
  } = useData();

  const today = startOfDay(new Date());
  const in3Days = addDays(today, 3);
  const in7Days = addDays(today, 7);

  const getCliente = (clienteId: string) => clientes.find(c => c.id === clienteId);

  // --- Sections data ---
  const vencimientosHoy = useMemo(() =>
    suscripciones.filter(s => s.estado === 'activa' && isToday(new Date(s.fechaVencimiento))),
    [suscripciones]
  );

  const vencimientosProximos3 = useMemo(() =>
    suscripciones.filter(s => {
      if (s.estado !== 'activa') return false;
      const fecha = startOfDay(new Date(s.fechaVencimiento));
      return isAfter(fecha, today) && !isToday(new Date(s.fechaVencimiento))
        && (isBefore(fecha, in3Days) || fecha.getTime() === in3Days.getTime());
    }),
    [suscripciones, today, in3Days]
  );

  const vencidos = useMemo(() =>
    suscripciones.filter(s =>
      s.estado === 'activa' && isBefore(startOfDay(new Date(s.fechaVencimiento)), today)
    ).sort((a, b) => new Date(b.fechaVencimiento).getTime() - new Date(a.fechaVencimiento).getTime()),
    [suscripciones, today]
  );

  const vencimientosProximos7 = useMemo(() =>
    suscripciones.filter(s => {
      if (s.estado !== 'activa') return false;
      const fecha = startOfDay(new Date(s.fechaVencimiento));
      return isAfter(fecha, in3Days) && (isBefore(fecha, in7Days) || fecha.getTime() === in7Days.getTime());
    }),
    [suscripciones, in3Days, in7Days]
  );

  // --- Stats ---
  const clientesActivos = useMemo(() => {
    const idsConSubActiva = new Set(
      suscripciones.filter(s => s.estado === 'activa').map(s => s.clienteId)
    );
    return idsConSubActiva.size;
  }, [suscripciones]);

  const panelesActivos = useMemo(() =>
    paneles.filter(p => p.estado === 'activo').length,
    [paneles]
  );

  // Ganancia = real income (USDT from cortes + USD payments) - gastos (panel costs)
  const ganancia = useMemo(() => {
    const selectedDate = new Date();
    const totalGastos = paneles
      .filter(p => p.estado === 'activo')
      .reduce((sum, p) => sum + p.costoMensual, 0);

    const cortesDelMes = cortes.filter(c => isSameMonth(new Date(c.fecha), selectedDate));
    const usdtFromCortes = cortesDelMes.reduce((sum, c) => sum + c.usdtRecibidoReal, 0);

    const pagosDirectosUSD = pagos.filter(p =>
      isSameMonth(new Date(p.fecha), selectedDate) &&
      (!p.moneda || p.moneda === 'USD') &&
      !p.corteId
    );
    const usdDirectos = pagosDirectosUSD.reduce((sum, p) => sum + p.monto, 0);

    return Math.round((usdtFromCortes + usdDirectos - totalGastos) * 100) / 100;
  }, [paneles, cortes, pagos]);

  // --- Renovar action ---
  const handleRenovar = useCallback((sub: Suscripcion) => {
    const cliente = getCliente(sub.clienteId);
    const newFecha = format(addDays(new Date(sub.fechaVencimiento), 30), 'yyyy-MM-dd');
    updateSuscripcion({
      ...sub,
      fechaVencimiento: newFecha,
      estado: 'activa',
    });
    toast.success(`${cliente?.nombre || 'Cliente'} renovado hasta ${format(new Date(newFecha), 'dd MMM yyyy', { locale: es })}`);
  }, [updateSuscripcion, clientes]);

  // --- Scroll to section ---
  const scrollToVencimientos = () => {
    document.getElementById('vencimientos-hoy')?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Row component ---
  const SuscripcionRow = ({ sub, tipo }: { sub: Suscripcion; tipo: 'hoy' | 'proximo' | 'vencido' }) => {
    const cliente = getCliente(sub.clienteId);
    const servicio = getServicioById(sub.servicioId);
    if (!cliente) return null;

    const fechaVenc = new Date(sub.fechaVencimiento);
    const diasDiff = differenceInDays(fechaVenc, today);

    let statusLabel: string;
    let statusClass: string;

    if (tipo === 'hoy') {
      statusLabel = 'Vence hoy';
      statusClass = 'text-destructive font-semibold';
    } else if (tipo === 'vencido') {
      const diasVencido = Math.abs(diasDiff);
      statusLabel = `Venció hace ${diasVencido} día${diasVencido !== 1 ? 's' : ''}`;
      statusClass = 'text-destructive';
    } else {
      statusLabel = `Vence en ${diasDiff} día${diasDiff !== 1 ? 's' : ''}`;
      statusClass = 'text-warning';
    }

    return (
      <div className="flex items-center justify-between rounded-md bg-card border border-border/50 p-3 text-sm gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{cliente.nombre}</p>
          <p className="text-xs text-muted-foreground truncate">{servicio?.nombre || 'Sin servicio'}</p>
        </div>
        <span className={`text-xs whitespace-nowrap ${statusClass}`}>
          {statusLabel}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={getWhatsAppNotificationUrl(cliente, sub, servicio, tipo)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md h-8 w-8 text-success hover:bg-success/10 transition-colors"
            title="Enviar WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary hover:bg-primary/10"
            onClick={() => handleRenovar(sub)}
            title="Renovar +30 días"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  // --- Section component ---
  const VencimientoSection = ({
    id,
    title,
    icon: Icon,
    iconColor,
    borderColor,
    bgColor,
    badgeColor,
    items,
    tipo,
    emptyMessage,
  }: {
    id?: string;
    title: string;
    icon: React.ElementType;
    iconColor: string;
    borderColor: string;
    bgColor: string;
    badgeColor: string;
    items: Suscripcion[];
    tipo: 'hoy' | 'proximo' | 'vencido';
    emptyMessage: string;
  }) => (
    <div id={id} className={`rounded-lg border ${borderColor} ${bgColor} p-5`}>
      <div className="mb-4 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <h3 className={`text-sm font-semibold ${iconColor}`}>{title}</h3>
        <span className={`alert-badge ${badgeColor}`}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {items.map(s => <SuscripcionRow key={s.id} sub={s} tipo={tipo} />)}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Clientes Activos</p>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold">{clientesActivos}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Con suscripción activa</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Paneles Activos</p>
            <Monitor className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold">{panelesActivos}</p>
          <p className="text-[11px] text-muted-foreground mt-1">En funcionamiento</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Ganancia Neta</p>
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <p className={`mt-2 text-2xl font-bold ${ganancia >= 0 ? 'text-success' : 'text-destructive'}`}>
            ${ganancia.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Ingresos reales - Gastos</p>
        </div>

        <div
          className="stat-card cursor-pointer hover:border-destructive/50 transition-colors"
          onClick={scrollToVencimientos}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Vencimientos Hoy</p>
            <AlertTriangle className={`h-4 w-4 ${vencimientosHoy.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </div>
          <p className={`mt-2 text-2xl font-bold ${vencimientosHoy.length > 0 ? 'text-destructive' : ''}`}>
            {vencimientosHoy.length}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {vencimientosHoy.length > 0 ? 'Click para ver detalles ↓' : 'Todo al día ✓'}
          </p>
        </div>
      </div>

      {/* Vencimiento sections */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VencimientoSection
          id="vencimientos-hoy"
          title="Vencimientos de Hoy"
          icon={AlertTriangle}
          iconColor="text-destructive"
          borderColor="border-destructive/30"
          bgColor="bg-destructive/5"
          badgeColor="bg-destructive/10 text-destructive"
          items={vencimientosHoy}
          tipo="hoy"
          emptyMessage="No hay vencimientos hoy ✓"
        />

        <VencimientoSection
          title="Próximos 3 Días"
          icon={CalendarClock}
          iconColor="text-warning"
          borderColor="border-warning/30"
          bgColor="bg-warning/5"
          badgeColor="bg-warning/10 text-warning"
          items={vencimientosProximos3}
          tipo="proximo"
          emptyMessage="Sin vencimientos próximos"
        />

        <VencimientoSection
          title="Vencidos"
          icon={Clock}
          iconColor="text-destructive"
          borderColor="border-destructive/30"
          bgColor="bg-destructive/5"
          badgeColor="bg-destructive/10 text-destructive"
          items={vencidos}
          tipo="vencido"
          emptyMessage="No hay suscripciones vencidas ✓"
        />

        <VencimientoSection
          title="Próximos 7 Días"
          icon={Calendar}
          iconColor="text-primary"
          borderColor="border-primary/20"
          bgColor="bg-primary/5"
          badgeColor="bg-primary/10 text-primary"
          items={vencimientosProximos7}
          tipo="proximo"
          emptyMessage="Sin vencimientos esta semana"
        />
      </div>
    </div>
  );
}
