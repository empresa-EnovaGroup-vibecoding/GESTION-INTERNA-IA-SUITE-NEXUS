import { useState, useMemo, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { format, isToday, isBefore, addDays, isAfter, startOfDay, differenceInDays, isSameMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle, Clock, Users, Monitor, TrendingUp,
  CalendarClock, MessageCircle, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, ExternalLink,
} from 'lucide-react';
import { getWhatsAppNotificationUrl } from '@/lib/whatsapp';
import { Suscripcion } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import InstallBanner from '@/components/InstallBanner';

interface DashboardProps {
  onNavigate?: (page: 'clientes' | 'paneles' | 'finanzas' | 'servicios') => void;
  onNavigateToPanel?: (search: string) => void;
}

export default function Dashboard({ onNavigate, onNavigateToPanel }: DashboardProps) {
  const {
    clientes, paneles, suscripciones, pagos, cortes,
    getPanelById, getServicioById, updateSuscripcion,
  } = useData();

  const [showPaneles, setShowPaneles] = useState(false);

  const today = startOfDay(new Date());
  const in7Days = addDays(today, 7);

  const getCliente = (clienteId: string) => clientes.find(c => c.id === clienteId);

  // --- Suscripciones data ---
  const vencidos = useMemo(() =>
    suscripciones.filter(s =>
      s.estado === 'activa' && isBefore(startOfDay(new Date(s.fechaVencimiento)), today)
    ).sort((a, b) => new Date(b.fechaVencimiento).getTime() - new Date(a.fechaVencimiento).getTime()),
    [suscripciones, today]
  );

  const vencimientosHoy = useMemo(() =>
    suscripciones.filter(s => s.estado === 'activa' && isToday(new Date(s.fechaVencimiento))),
    [suscripciones]
  );

  const vencimientosProximos = useMemo(() =>
    suscripciones.filter(s => {
      if (s.estado !== 'activa') return false;
      const fecha = startOfDay(new Date(s.fechaVencimiento));
      return isAfter(fecha, today) && !isToday(new Date(s.fechaVencimiento))
        && (isBefore(fecha, in7Days) || fecha.getTime() === in7Days.getTime());
    }).sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()),
    [suscripciones, today, in7Days]
  );

  // --- Stats ---
  const clientesActivos = useMemo(() => {
    const ids = new Set(suscripciones.filter(s => s.estado === 'activa').map(s => s.clienteId));
    return ids.size;
  }, [suscripciones]);

  const panelesActivos = useMemo(() =>
    paneles.filter(p => p.estado === 'activo').length,
    [paneles]
  );

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

  // --- Paneles por vencer ---
  const panelesUrgentes = useMemo(() => {
    const hoy = new Date();
    return paneles.filter(p => {
      if (!p.fechaExpiracion) return false;
      const diff = differenceInDays(parseISO(p.fechaExpiracion), hoy);
      return diff <= 15;
    }).sort((a, b) => {
      const diffA = differenceInDays(parseISO(a.fechaExpiracion), new Date());
      const diffB = differenceInDays(parseISO(b.fechaExpiracion), new Date());
      return diffA - diffB;
    });
  }, [paneles]);

  // --- Total urgentes ---
  const totalUrgente = vencidos.length + vencimientosHoy.length;
  const hayAlgo = vencidos.length > 0 || vencimientosHoy.length > 0 || vencimientosProximos.length > 0 || panelesUrgentes.length > 0;

  // --- Renovar action ---
  const handleRenovar = useCallback((sub: Suscripcion) => {
    const cliente = getCliente(sub.clienteId);
    const newFecha = format(addDays(new Date(sub.fechaVencimiento), 30), 'yyyy-MM-dd');
    updateSuscripcion({ ...sub, fechaVencimiento: newFecha, estado: 'activa' });
    toast.success((cliente?.nombre || 'Cliente') + ' renovado hasta ' + format(new Date(newFecha), 'dd MMM yyyy', { locale: es }));
  }, [updateSuscripcion, clientes]);

  // --- Row component ---
  const SuscripcionRow = ({ sub, tipo }: { sub: Suscripcion; tipo: 'hoy' | 'proximo' | 'vencido' }) => {
    const cliente = getCliente(sub.clienteId);
    const servicio = getServicioById(sub.servicioId);
    if (!cliente) return null;

    const fechaVenc = new Date(sub.fechaVencimiento);
    const diasDiff = differenceInDays(fechaVenc, today);
    const panel = sub.panelId ? getPanelById(sub.panelId) : null;

    let statusLabel: string;
    let statusClass: string;

    if (tipo === 'hoy') {
      statusLabel = 'Vence hoy';
      statusClass = 'text-destructive font-semibold';
    } else if (tipo === 'vencido') {
      const diasVencido = Math.abs(diasDiff);
      statusLabel = 'Hace ' + diasVencido + 'd';
      statusClass = 'text-destructive';
    } else {
      statusLabel = 'En ' + diasDiff + 'd';
      statusClass = diasDiff <= 3 ? 'text-warning font-medium' : 'text-muted-foreground';
    }

    return (
      <div className="flex items-center justify-between rounded-md bg-card border border-border/50 p-3 text-sm gap-2">
        <div className="flex-1 min-w-0">
          <button
            onClick={() => {
              if (panel && onNavigateToPanel) {
                onNavigateToPanel(panel.nombre);
              } else {
                onNavigate?.('clientes');
              }
            }}
            className="font-medium truncate hover:text-primary hover:underline text-left block max-w-full"
            title={panel ? 'Ver panel: ' + panel.nombre : 'Ver clientes'}
          >
            {cliente.nombre}
          </button>
          <p className="text-xs text-muted-foreground truncate">{servicio?.nombre || 'Sin servicio'}</p>
        </div>
        <span className={'text-xs whitespace-nowrap ' + statusClass}>
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
            title="Renovar +30 dias"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <InstallBanner />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button onClick={() => onNavigate?.('clientes')} className="stat-card text-left cursor-pointer hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Clientes Activos</p>
            <Users className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="mt-1.5 text-xl font-bold">{clientesActivos}</p>
        </button>

        <button onClick={() => onNavigate?.('paneles')} className="stat-card text-left cursor-pointer hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Paneles Activos</p>
            <Monitor className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="mt-1.5 text-xl font-bold">{panelesActivos}</p>
        </button>

        <button onClick={() => onNavigate?.('finanzas')} className="stat-card text-left cursor-pointer hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Ganancia Neta</p>
            <TrendingUp className="h-3.5 w-3.5 text-success" />
          </div>
          <p className={'mt-1.5 text-xl font-bold ' + (ganancia >= 0 ? 'text-success' : 'text-destructive')}>
            ${ganancia.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </button>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Requieren Accion</p>
            <AlertTriangle className={'h-3.5 w-3.5 ' + (totalUrgente > 0 ? 'text-destructive' : 'text-muted-foreground')} />
          </div>
          <p className={'mt-1.5 text-xl font-bold ' + (totalUrgente > 0 ? 'text-destructive' : '')}>
            {totalUrgente}
          </p>
        </div>
      </div>

      {/* Paneles por vencer - desplegable compacto */}
      {panelesUrgentes.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5">
          <button
            onClick={() => setShowPaneles(!showPaneles)}
            className="flex items-center justify-between w-full px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-warning" />
              <span className="text-sm font-semibold text-warning">Paneles por Vencer</span>
              <span className="alert-badge bg-warning/10 text-warning">{panelesUrgentes.length}</span>
            </div>
            {showPaneles ? <ChevronUp className="h-4 w-4 text-warning" /> : <ChevronDown className="h-4 w-4 text-warning" />}
          </button>
          {showPaneles && (
            <div className="px-4 pb-3 space-y-1">
              {panelesUrgentes.map(p => {
                const dias = differenceInDays(parseISO(p.fechaExpiracion), new Date());
                const vencido = dias < 0;
                return (
                  <div key={p.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-card/50 group">
                    {onNavigateToPanel ? (
                      <button
                        onClick={() => onNavigateToPanel(p.nombre)}
                        className="font-medium truncate hover:text-primary hover:underline text-left flex items-center gap-1.5"
                        title="Ver panel completo"
                      >
                        {p.nombre}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary shrink-0" />
                      </button>
                    ) : (
                      <span className="font-medium truncate">{p.nombre}</span>
                    )}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-muted-foreground">{p.servicioAsociado}</span>
                      <span className={'text-xs font-medium ' + (vencido ? 'text-destructive' : dias <= 3 ? 'text-destructive' : 'text-warning')}>
                        {vencido ? 'Vencido' : dias === 0 ? 'Hoy' : dias + 'd'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Todo al dia message */}
      {!hayAlgo && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-success/30 bg-success/5 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-success mb-3" />
          <p className="text-base font-semibold text-success">Todo al dia</p>
          <p className="text-sm text-muted-foreground mt-1">No hay vencimientos pendientes ni paneles por vencer</p>
        </div>
      )}

      {/* Vencimiento sections - only show non-empty, ordered by urgency */}
      {hayAlgo && (
        <div className="space-y-4">
          {/* 1. Vencidos (most urgent) */}
          {vencidos.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-semibold text-destructive">Vencidos</h3>
                <span className="alert-badge bg-destructive/10 text-destructive">{vencidos.length}</span>
              </div>
              <div className="space-y-2">
                {vencidos.map(s => <SuscripcionRow key={s.id} sub={s} tipo="vencido" />)}
              </div>
            </div>
          )}

          {/* 2. Vence Hoy */}
          {vencimientosHoy.length > 0 && (
            <div id="vencimientos-hoy" className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-semibold text-destructive">Vence Hoy</h3>
                <span className="alert-badge bg-destructive/10 text-destructive">{vencimientosHoy.length}</span>
              </div>
              <div className="space-y-2">
                {vencimientosHoy.map(s => <SuscripcionRow key={s.id} sub={s} tipo="hoy" />)}
              </div>
            </div>
          )}

          {/* 3. Proximos 7 dias */}
          {vencimientosProximos.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-semibold text-warning">Proximos 7 Dias</h3>
                <span className="alert-badge bg-warning/10 text-warning">{vencimientosProximos.length}</span>
              </div>
              <div className="space-y-2">
                {vencimientosProximos.map(s => <SuscripcionRow key={s.id} sub={s} tipo="proximo" />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
