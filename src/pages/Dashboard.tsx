import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { format, isToday, isBefore, addDays, isAfter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, Clock, Users, Monitor, TrendingUp, CalendarClock } from 'lucide-react';

export default function Dashboard() {
  const { clientes, paneles, transacciones, getPanelById } = useData();

  const today = startOfDay(new Date());
  const in3Days = addDays(today, 3);

  const vencimientosHoy = useMemo(() =>
    clientes.filter(c => isToday(new Date(c.fechaVencimiento))),
    [clientes]
  );

  const vencimientosProximos = useMemo(() =>
    clientes.filter(c => {
      const fecha = startOfDay(new Date(c.fechaVencimiento));
      return isAfter(fecha, today) && (isBefore(fecha, in3Days) || fecha.getTime() === in3Days.getTime());
    }),
    [clientes, today, in3Days]
  );

  const vencidos = useMemo(() =>
    clientes.filter(c => isBefore(new Date(c.fechaVencimiento), today)),
    [clientes, today]
  );

  const totalIngresos = transacciones.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0);
  const totalGastos = transacciones.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0);

  const stats = [
    { label: 'Clientes Activos', value: clientes.length, icon: Users, color: 'text-primary' },
    { label: 'Paneles', value: paneles.length, icon: Monitor, color: 'text-primary' },
    { label: 'Ganancia Neta', value: `$${(totalIngresos - totalGastos).toLocaleString()}`, icon: TrendingUp, color: 'text-success' },
    { label: 'Vencimientos Hoy', value: vencimientosHoy.length, icon: AlertTriangle, color: 'text-destructive' },
  ];

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
        {/* Vencimientos Hoy */}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-semibold text-destructive">Vencimientos de Hoy</h3>
            <span className="alert-badge bg-destructive/10 text-destructive">
              {vencimientosHoy.length}
            </span>
          </div>
          {vencimientosHoy.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay vencimientos hoy</p>
          ) : (
            <div className="space-y-2">
              {vencimientosHoy.map(c => (
                <div key={c.id} className="flex items-center justify-between rounded-md bg-card p-3 text-sm">
                  <div>
                    <p className="font-medium">{c.nombre}</p>
                    <p className="text-xs text-muted-foreground">{c.whatsapp}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {getPanelById(c.panelId)?.nombre || 'Sin panel'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximos 3 días */}
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold text-warning">Próximos 3 Días</h3>
            <span className="alert-badge bg-warning/10 text-warning">
              {vencimientosProximos.length}
            </span>
          </div>
          {vencimientosProximos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay vencimientos próximos</p>
          ) : (
            <div className="space-y-2">
              {vencimientosProximos.map(c => (
                <div key={c.id} className="flex items-center justify-between rounded-md bg-card p-3 text-sm">
                  <div>
                    <p className="font-medium">{c.nombre}</p>
                    <p className="text-xs text-muted-foreground">{c.whatsapp}</p>
                  </div>
                  <span className="text-xs font-medium text-warning">
                    {format(new Date(c.fechaVencimiento), 'dd MMM', { locale: es })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vencidos */}
      {vencidos.length > 0 && (
        <div className="rounded-lg border border-muted bg-muted/30 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Suscripciones Vencidas</h3>
            <span className="alert-badge bg-muted text-muted-foreground">
              {vencidos.length}
            </span>
          </div>
          <div className="space-y-2">
            {vencidos.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-md bg-card p-3 text-sm">
                <div>
                  <p className="font-medium">{c.nombre}</p>
                  <p className="text-xs text-muted-foreground">{c.whatsapp}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  Venció {format(new Date(c.fechaVencimiento), 'dd MMM', { locale: es })}
                </span>
              </div>
            ))}
            {vencidos.length > 5 && (
              <p className="text-xs text-muted-foreground">+{vencidos.length - 5} más</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
