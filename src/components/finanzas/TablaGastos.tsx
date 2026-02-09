import { Panel } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';

interface Props {
  panelesActivos: Panel[];
  totalGastos: number;
}

export default function TablaGastos({ panelesActivos, totalGastos }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-4 pb-2">
        <h3 className="text-sm font-semibold">Gastos — Lo que pago a proveedores</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Se genera automáticamente desde la sección Paneles</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="table-header">Panel</TableHead>
            <TableHead className="table-header">Servicio</TableHead>
            <TableHead className="table-header text-right">Costo Mensual</TableHead>
            <TableHead className="table-header">Proveedor</TableHead>
            <TableHead className="table-header">Próx. Renovación</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {panelesActivos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No hay paneles activos
              </TableCell>
            </TableRow>
          ) : (
            panelesActivos.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{p.servicioAsociado}</TableCell>
                <TableCell className="text-right font-medium text-destructive">
                  ${p.costoMensual.toLocaleString()}
                </TableCell>
                <TableCell className="text-muted-foreground">{p.proveedor || '—'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.fechaExpiracion ? format(new Date(p.fechaExpiracion), 'dd MMM yyyy', { locale: es }) : '—'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {panelesActivos.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-semibold">TOTAL</TableCell>
              <TableCell className="text-right font-bold text-destructive">
                ${totalGastos.toLocaleString()}
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
