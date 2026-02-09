import { useMemo } from 'react';
import { Cliente, Suscripcion, Pago } from '@/types';
import { useData } from '@/contexts/DataContext';
import { isSameMonth } from 'date-fns';
import { Check, X } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';

interface Props {
  selectedDate: Date;
}

export default function TablaIngresos({ selectedDate }: Props) {
  const { clientes, suscripciones, pagos, servicios } = useData();

  const data = useMemo(() => {
    return clientes.map(cliente => {
      const subsActivas = suscripciones.filter(
        s => s.clienteId === cliente.id && s.estado === 'activa'
      );
      if (subsActivas.length === 0) return null;

      const serviciosActivos = subsActivas.map(s => {
        const srv = servicios.find(sv => sv.id === s.servicioId);
        return srv?.nombre || 'Sin servicio';
      });

      const totalCobrar = subsActivas.reduce((sum, s) => sum + s.precioCobrado, 0);

      const pagosMes = pagos.filter(
        p => p.clienteId === cliente.id && isSameMonth(new Date(p.fecha), selectedDate)
      );
      const totalPagado = pagosMes.reduce((sum, p) => sum + p.monto, 0);
      const pagado = totalPagado >= totalCobrar;
      const saldo = totalCobrar - totalPagado;

      return {
        cliente,
        serviciosActivos,
        totalCobrar,
        pagado,
        totalPagado,
        saldo: Math.max(0, saldo),
      };
    }).filter(Boolean) as {
      cliente: Cliente;
      serviciosActivos: string[];
      totalCobrar: number;
      pagado: boolean;
      totalPagado: number;
      saldo: number;
    }[];
  }, [clientes, suscripciones, pagos, servicios, selectedDate]);

  const totalIngresos = data.reduce((sum, d) => sum + d.totalCobrar, 0);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-4 pb-2">
        <h3 className="text-sm font-semibold">Ingresos — Lo que cobro a clientes</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Se genera automáticamente desde Clientes y Suscripciones</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="table-header">Cliente</TableHead>
            <TableHead className="table-header">Servicios activos</TableHead>
            <TableHead className="table-header text-right">Total a Cobrar</TableHead>
            <TableHead className="table-header text-center">Pagado</TableHead>
            <TableHead className="table-header text-right">Saldo Pendiente</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No hay clientes con suscripciones activas
              </TableCell>
            </TableRow>
          ) : (
            data.map(d => (
              <TableRow key={d.cliente.id}>
                <TableCell className="font-medium">{d.cliente.nombre}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {d.serviciosActivos.map((s, i) => (
                      <span key={i} className="alert-badge bg-primary/10 text-primary text-[10px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">${d.totalCobrar.toLocaleString()}</TableCell>
                <TableCell className="text-center">
                  {d.pagado ? (
                    <span className="inline-flex items-center gap-1 text-success text-xs font-medium">
                      <Check className="h-3.5 w-3.5" /> Sí
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium">
                      <X className="h-3.5 w-3.5" /> No
                    </span>
                  )}
                </TableCell>
                <TableCell className={`text-right font-medium ${d.saldo > 0 ? 'text-destructive' : 'text-success'}`}>
                  ${d.saldo.toLocaleString()}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {data.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-semibold">TOTAL</TableCell>
              <TableCell className="text-right font-bold text-success">
                ${totalIngresos.toLocaleString()}
              </TableCell>
              <TableCell />
              <TableCell className="text-right font-bold text-destructive">
                ${data.reduce((s, d) => s + d.saldo, 0).toLocaleString()}
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
