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

      const serviciosDetalle = subsActivas.map(s => {
        const srv = servicios.find(sv => sv.id === s.servicioId);
        return {
          nombre: srv?.nombre || 'Sin servicio',
          precioUSD: s.precioCobrado,
          precioLocal: s.precioLocal,
          monedaLocal: s.monedaLocal,
        };
      });

      // CRITICAL: Always use precioCobrado (USD) for financial calculations
      const totalCobrarUSD = subsActivas.reduce((sum, s) => sum + s.precioCobrado, 0);

      const pagosMes = pagos.filter(
        p => p.clienteId === cliente.id && isSameMonth(new Date(p.fecha), selectedDate)
      );
      const totalPagado = pagosMes.reduce((sum, p) => sum + p.monto, 0);
      const pagado = totalPagado >= totalCobrarUSD;
      const saldo = totalCobrarUSD - totalPagado;

      // Build local price summary
      const precioLocalTotal = subsActivas.reduce((sum, s) => {
        if (s.precioLocal && s.monedaLocal) return sum + s.precioLocal;
        return sum;
      }, 0);
      const monedaLocalCliente = subsActivas.find(s => s.monedaLocal)?.monedaLocal;

      return {
        cliente,
        serviciosDetalle,
        totalCobrarUSD,
        precioLocalTotal: precioLocalTotal > 0 ? precioLocalTotal : null,
        monedaLocalCliente: monedaLocalCliente || null,
        pagado,
        totalPagado,
        saldo: Math.max(0, saldo),
      };
    }).filter(Boolean) as {
      cliente: Cliente;
      serviciosDetalle: { nombre: string; precioUSD: number; precioLocal?: number; monedaLocal?: string }[];
      totalCobrarUSD: number;
      precioLocalTotal: number | null;
      monedaLocalCliente: string | null;
      pagado: boolean;
      totalPagado: number;
      saldo: number;
    }[];
  }, [clientes, suscripciones, pagos, servicios, selectedDate]);

  const totalIngresosUSD = data.reduce((sum, d) => sum + d.totalCobrarUSD, 0);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-4 pb-2">
        <h3 className="text-sm font-semibold">Ingresos — Lo que cobro a clientes</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Se genera automáticamente desde Clientes y Suscripciones. Todos los cálculos en USD.</p>
      </div>
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="table-header">Cliente</TableHead>
            <TableHead className="table-header">Servicios</TableHead>
            <TableHead className="table-header text-right">Precio USD</TableHead>
            <TableHead className="table-header text-right">Precio Local</TableHead>
            <TableHead className="table-header text-center">Pagado</TableHead>
            <TableHead className="table-header text-right">Saldo Pendiente</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No hay clientes con suscripciones activas
              </TableCell>
            </TableRow>
          ) : (
            data.map(d => (
              <TableRow key={d.cliente.id}>
                <TableCell className="font-medium">{d.cliente.nombre}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {d.serviciosDetalle.map((s, i) => (
                      <span key={i} className="alert-badge bg-primary/10 text-primary text-[10px]">
                        {s.nombre}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">${d.totalCobrarUSD.toLocaleString()}</TableCell>
                <TableCell className="text-right text-muted-foreground text-xs">
                  {d.precioLocalTotal && d.monedaLocalCliente
                    ? `${d.precioLocalTotal.toLocaleString()} ${d.monedaLocalCliente}`
                    : '—'}
                </TableCell>
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
                ${totalIngresosUSD.toLocaleString()}
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell className="text-right font-bold text-destructive">
                ${data.reduce((s, d) => s + d.saldo, 0).toLocaleString()}
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
      </div>
    </div>
  );
}
