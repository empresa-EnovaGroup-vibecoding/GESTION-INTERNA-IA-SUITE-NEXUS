import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function TablaRentabilidad() {
  const { paneles, suscripciones, servicios } = useData();

  const data = useMemo(() => {
    // Collect all service names from panels and subscriptions
    const servicioNames = new Set<string>();
    paneles.filter(p => p.estado === 'activo').forEach(p => {
      if (p.servicioAsociado) servicioNames.add(p.servicioAsociado);
    });
    suscripciones.filter(s => s.estado === 'activa').forEach(s => {
      const srv = servicios.find(sv => sv.id === s.servicioId);
      if (srv) servicioNames.add(srv.nombre);
    });

    return Array.from(servicioNames).map(nombre => {
      const panelesServicio = paneles.filter(
        p => p.estado === 'activo' && p.servicioAsociado === nombre
      );
      const costoTotal = panelesServicio.reduce((sum, p) => sum + p.costoMensual, 0);

      const subsServicio = suscripciones.filter(s => {
        if (s.estado !== 'activa') return false;
        const srv = servicios.find(sv => sv.id === s.servicioId);
        return srv?.nombre === nombre;
      });
      const ingresoTotal = subsServicio.reduce((sum, s) => sum + s.precioCobrado, 0);

      const ganancia = ingresoTotal - costoTotal;
      const margen = ingresoTotal > 0 ? Math.round((ganancia / ingresoTotal) * 100) : 0;

      return {
        nombre,
        cantPaneles: panelesServicio.length,
        costoTotal,
        cantClientes: subsServicio.length,
        ingresoTotal,
        ganancia,
        margen,
      };
    }).sort((a, b) => b.ganancia - a.ganancia);
  }, [paneles, suscripciones, servicios]);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-4 pb-2">
        <h3 className="text-sm font-semibold">Rentabilidad por Servicio</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Comparativa de gastos vs ingresos por cada servicio</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="table-header">Servicio</TableHead>
            <TableHead className="table-header text-right">Costo Paneles</TableHead>
            <TableHead className="table-header text-right">Ingresos Clientes</TableHead>
            <TableHead className="table-header text-right">Ganancia</TableHead>
            <TableHead className="table-header text-right">Margen %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No hay datos de servicios
              </TableCell>
            </TableRow>
          ) : (
            data.map(d => (
              <TableRow key={d.nombre}>
                <TableCell className="font-medium">{d.nombre}</TableCell>
                <TableCell className="text-right text-destructive">
                  ${d.costoTotal.toLocaleString()}
                  <span className="text-[10px] text-muted-foreground ml-1">
                    ({d.cantPaneles} panel{d.cantPaneles !== 1 ? 'es' : ''})
                  </span>
                </TableCell>
                <TableCell className="text-right text-success">
                  ${d.ingresoTotal.toLocaleString()}
                  <span className="text-[10px] text-muted-foreground ml-1">
                    ({d.cantClientes} cliente{d.cantClientes !== 1 ? 's' : ''})
                  </span>
                </TableCell>
                <TableCell className={`text-right font-semibold ${d.ganancia >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ${d.ganancia.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <span className={`alert-badge text-[10px] ${
                    d.margen >= 50 ? 'bg-success/10 text-success'
                    : d.margen >= 20 ? 'bg-warning/10 text-warning'
                    : 'bg-destructive/10 text-destructive'
                  }`}>
                    {d.margen}%
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
