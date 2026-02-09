import { useData } from '@/contexts/DataContext';
import { Pago } from '@/types';
import { format, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Props {
  selectedDate: Date;
}

export default function PagosRecientes({ selectedDate }: Props) {
  const { pagos, clientes, deletePago } = useData();

  const pagosMes = pagos
    .filter(p => isSameMonth(new Date(p.fecha), selectedDate))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const getClienteNombre = (id: string) => clientes.find(c => c.id === id)?.nombre || 'Desconocido';

  if (pagosMes.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-4 pb-2">
        <h3 className="text-sm font-semibold">Pagos Recibidos este Mes</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{pagosMes.length} pago{pagosMes.length !== 1 ? 's' : ''} registrado{pagosMes.length !== 1 ? 's' : ''}</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="table-header">Fecha</TableHead>
            <TableHead className="table-header">Cliente</TableHead>
            <TableHead className="table-header text-right">Monto</TableHead>
            <TableHead className="table-header">Método</TableHead>
            <TableHead className="table-header text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagosMes.map(p => (
            <TableRow key={p.id}>
              <TableCell className="text-muted-foreground">
                {format(new Date(p.fecha), 'dd MMM yyyy', { locale: es })}
              </TableCell>
              <TableCell className="font-medium">{getClienteNombre(p.clienteId)}</TableCell>
              <TableCell className="text-right font-medium text-success">
                +${p.monto.toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-[10px]">{p.metodo}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <button onClick={() => deletePago(p.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
