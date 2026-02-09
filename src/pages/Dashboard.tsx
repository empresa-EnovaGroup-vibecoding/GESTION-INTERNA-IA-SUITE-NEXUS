import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { format, isToday, isBefore, addDays, isAfter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, Clock, Users, Monitor, TrendingUp, CalendarClock, MessageCircle } from 'lucide-react';
import { getWhatsAppNotificationUrl } from '@/lib/whatsapp';
import { Suscripcion } from '@/types';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export default function Dashboard() {
  const { clientes, paneles, suscripciones, transacciones, getPanelById, getServicioById } = useData();

  const today = startOfDay(new Date());
  const in3Days = addDays(today, 3);

  const getCliente = (clienteId: string) => clientes.find(c => c.id === clienteId);

  const vencimientosHoy = useMemo(() =>
    suscripciones.filter(s => isToday(new Date(s.fechaVencimiento))),
    [suscripciones]
  );

  const vencimientosProximos = useMemo(() =>
    suscripciones.filter(s => {
      const fecha = startOfDay(new Date(s.fechaVencimiento));
      return isAfter(fecha, today) && (isBefore(fecha, in3Days) || fecha.getTime() === in3Days.getTime());
    }),
    [suscripciones, today, in3Days]
  );

  const vencidos = useMemo(() =>
    suscripciones.filter(s => isBefore(new Date(s.fechaVencimiento), today)),
    [suscripciones, today]
  );

  const totalIngresos = transacciones.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0);
  const totalGastos = transacciones.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0);

  const stats = [
    { label: 'Clientes', value: clientes.length, icon: Users, color: 'text-primary' },
    { label: 'Paneles', value: paneles.length, icon: Monitor, color: 'text-primary' },
    { label: 'Ganancia Neta', value: `$${(totalIngresos - totalGastos).toLocaleString()}`, icon: TrendingUp, color: 'text-success' },
    { label: 'Vencimientos Hoy', value: vencimientosHoy.length, icon: AlertTriangle, color: 'text-destructive' },
  ];

  const WhatsAppButton = ({ suscripcion, tipo }: { suscripcion: Suscripcion; tipo: 'proximo' | 'hoy' | 'vencido' }) => {
    const cliente = getCliente(suscripcion.clienteId);
    const servicio = getServicioById(suscripcion.servicioId);
    if (!cliente) return null;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={getWhatsAppNotificationUrl(cliente, suscripcion, servicio, tipo)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md p-1.5 text-success hover:bg-success/10 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p>Enviar recordatorio por WhatsApp</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const SuscripcionItem = ({ sub, tipo }: { sub: Suscripcion; tipo: 'proximo' | 'hoy' | 'vencido' }) => {
    const cliente = getCliente(sub.clienteId);
    const servicio = getServicioById(sub.servicioId);
    if (!cliente) return null;
    return (
      <div className="flex items-center justify-between rounded-md bg-card p-3 text-sm">
        <div>
          <p className="font-medium">{cliente.nombre}</p>
          <p className="text-xs text-muted-foreground">{servicio?.nombre || '?'} · {cliente.whatsapp}</p>
        </div>
        <div className="flex items-center gap-2">
          {tipo === 'proximo' && (
            <span className="text-xs font-medium text-warning">
              {format(new Date(sub.fechaVencimiento), 'dd MMM', { locale: es })}
            </span>
          )}
          {tipo === 'vencido' && (
            <span className="text-xs text-muted-foreground">
              Venció {format(new Date(sub.fechaVencimiento), 'dd MMM', { locale: es })}
            </span>
          )}
          {tipo === 'hoy' && (
            <span className="text-xs text-muted-foreground">
              {getPanelById(sub.panelId)?.nombre || '—'}
            </span>
          )}
          <WhatsAppButton suscripcion={sub} tipo={tipo} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="mt-2 text-2xl font-bold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-semibold text-destructive">Vencimientos de Hoy</h3>
            <span className="alert-badge bg-destructive/10 text-destructive">{vencimientosHoy.length}</span>
          </div>
          {vencimientosHoy.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay vencimientos hoy</p>
          ) : (
            <div className="space-y-2">
              {vencimientosHoy.map(s => <SuscripcionItem key={s.id} sub={s} tipo="hoy" />)}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-warning/30 bg-warning/5 p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold text-warning">Próximos 3 Días</h3>
            <span className="alert-badge bg-warning/10 text-warning">{vencimientosProximos.length}</span>
          </div>
          {vencimientosProximos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay vencimientos próximos</p>
          ) : (
            <div className="space-y-2">
              {vencimientosProximos.map(s => <SuscripcionItem key={s.id} sub={s} tipo="proximo" />)}
            </div>
          )}
        </div>
      </div>

      {vencidos.length > 0 && (
        <div className="rounded-lg border border-muted bg-muted/30 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Suscripciones Vencidas</h3>
            <span className="alert-badge bg-muted text-muted-foreground">{vencidos.length}</span>
          </div>
          <div className="space-y-2">
            {vencidos.slice(0, 5).map(s => <SuscripcionItem key={s.id} sub={s} tipo="vencido" />)}
            {vencidos.length > 5 && (
              <p className="text-xs text-muted-foreground">+{vencidos.length - 5} más</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
