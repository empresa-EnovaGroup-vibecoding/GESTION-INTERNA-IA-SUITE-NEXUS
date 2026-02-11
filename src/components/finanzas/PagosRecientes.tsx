import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { isSameMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2, ImageIcon, Search } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface Props {
  selectedDate: Date;
}

export default function PagosRecientes({ selectedDate }: Props) {
  const { pagos, clientes, deletePago } = useData();
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null);
  const [searchPago, setSearchPago] = useState('');

  const getClienteNombre = (id: string) => clientes.find(c => c.id === id)?.nombre || 'Desconocido';

  const pagosMes = useMemo(() => {
    const todos = pagos
      .filter(p => isSameMonth(new Date(p.fecha), selectedDate))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    if (!searchPago) return todos;

    const q = searchPago.toLowerCase();
    return todos.filter(p => {
      const nombre = getClienteNombre(p.clienteId).toLowerCase();
      const metodo = p.metodo.toLowerCase();
      const ref = (p.referencia || '').toLowerCase();
      return nombre.includes(q) || metodo.includes(q) || ref.includes(q);
    });
  }, [pagos, selectedDate, searchPago, clientes]);

  const totalMes = pagos.filter(p => isSameMonth(new Date(p.fecha), selectedDate)).length;

  if (totalMes === 0) return null;

  return (
    <>
      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 pb-2 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold">Pagos Recibidos este Mes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {searchPago
                ? pagosMes.length + ' de ' + totalMes + ' pagos'
                : totalMes + ' pago' + (totalMes !== 1 ? 's' : '') + ' registrado' + (totalMes !== 1 ? 's' : '')
              }
            </p>
          </div>
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchPago}
              onChange={e => setSearchPago(e.target.value)}
              placeholder="Buscar cliente, ref..."
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="table-header">Fecha</TableHead>
              <TableHead className="table-header">Cliente</TableHead>
              <TableHead className="table-header text-right">Monto</TableHead>
              <TableHead className="table-header">Metodo</TableHead>
              <TableHead className="table-header">Ref</TableHead>
              <TableHead className="table-header text-right">Accion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagosMes.map(p => (
              <TableRow key={p.id}>
                <TableCell className="text-muted-foreground">
                  {format(new Date(p.fecha), 'dd MMM yyyy', { locale: es })}
                </TableCell>
                <TableCell className="font-medium">{getClienteNombre(p.clienteId)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-medium text-success">+${p.monto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    {p.montoOriginal && p.moneda && (
                      <span className="text-[10px] text-muted-foreground">
                        {p.montoOriginal.toLocaleString()} {p.moneda}
                        {p.tasaCambio && (' @ ' + p.tasaCambio)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[10px]">{p.metodo}</Badge>
                </TableCell>
                <TableCell>
                  {p.referencia ? (
                    <span className="text-xs text-muted-foreground font-mono">{p.referencia}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {p.comprobanteUrl && (
                      <button
                        onClick={() => setComprobanteUrl(p.comprobanteUrl!)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        title="Ver comprobante"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => deletePago(p.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog to show receipt image */}
      <Dialog open={!!comprobanteUrl} onOpenChange={() => setComprobanteUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Comprobante de Pago</DialogTitle>
          </DialogHeader>
          {comprobanteUrl && (
            <img
              src={comprobanteUrl}
              alt="Comprobante de pago"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
