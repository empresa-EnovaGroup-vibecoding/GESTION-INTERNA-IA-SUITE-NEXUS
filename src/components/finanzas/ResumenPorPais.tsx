import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { isSameMonth } from 'date-fns';
import { Globe } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const PAIS_FLAG: Record<string, string> = {
  Venezuela: '🇻🇪',
  Ecuador: '🇪🇨',
  Colombia: '🇨🇴',
  Mexico: '🇲🇽',
};

interface Props {
  selectedDate: Date;
}

export default function ResumenPorPais({ selectedDate }: Props) {
  const { pagos, clientes } = useData();

  const pagosMes = useMemo(
    () => pagos.filter(p => isSameMonth(new Date(p.fecha), selectedDate)),
    [pagos, selectedDate]
  );

  const resumen = useMemo(() => {
    const map = new Map<string, { pais: string; cantPagos: number; totalUSD: number; totalLocal: number; moneda: string }>();

    for (const pago of pagosMes) {
      const cliente = clientes.find(c => c.id === pago.clienteId);
      const pais = cliente?.pais || 'Sin país';
      const moneda = pago.moneda || 'USD';

      const key = pais;
      const existing = map.get(key);
      if (existing) {
        existing.cantPagos++;
        existing.totalUSD += pago.monto;
        if (pago.montoOriginal && moneda !== 'USD') {
          existing.totalLocal += pago.montoOriginal;
        }
      } else {
        map.set(key, {
          pais,
          cantPagos: 1,
          totalUSD: pago.monto,
          totalLocal: pago.montoOriginal && moneda !== 'USD' ? pago.montoOriginal : 0,
          moneda: moneda !== 'USD' ? moneda : 'USD',
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalUSD - a.totalUSD);
  }, [pagosMes, clientes]);

  const grandTotal = useMemo(
    () => resumen.reduce((sum, r) => sum + r.totalUSD, 0),
    [resumen]
  );

  if (resumen.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 p-4 pb-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <div>
          <h3 className="text-sm font-semibold">Pagos por País</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Distribución de ingresos recibidos este mes</p>
        </div>
      </div>
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="table-header">País</TableHead>
            <TableHead className="table-header text-center">Pagos</TableHead>
            <TableHead className="table-header text-right">Monto Local</TableHead>
            <TableHead className="table-header text-right">Total USD</TableHead>
            <TableHead className="table-header text-right">% del Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resumen.map(r => (
            <TableRow key={r.pais}>
              <TableCell className="font-medium">
                <span className="mr-1.5">{PAIS_FLAG[r.pais] || '🌎'}</span>
                {r.pais}
              </TableCell>
              <TableCell className="text-center">{r.cantPagos}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {r.moneda !== 'USD' && r.totalLocal > 0
                  ? `${r.totalLocal.toLocaleString()} ${r.moneda}`
                  : '—'
                }
              </TableCell>
              <TableCell className="text-right font-medium text-success">
                ${r.totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {grandTotal > 0 ? `${Math.round((r.totalUSD / grandTotal) * 100)}%` : '0%'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-semibold">Total</TableCell>
            <TableCell className="text-center font-medium">
              {resumen.reduce((s, r) => s + r.cantPagos, 0)}
            </TableCell>
            <TableCell />
            <TableCell className="text-right font-semibold text-success">
              ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </TableCell>
            <TableCell className="text-right font-medium">100%</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      </div>
    </div>
  );
}
