import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { isSameMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown, ChevronRight, Trash2, Scissors } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const PAIS_FLAG: Record<string, string> = {
  Mexico: '🇲🇽',
  Colombia: '🇨🇴',
};

interface Props {
  selectedDate: Date;
}

export default function CortesHistorial({ selectedDate }: Props) {
  const { cortes, pagos, clientes, deleteCorte } = useData();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cortesDelMes = useMemo(() =>
    cortes
      .filter(c => isSameMonth(new Date(c.fecha), selectedDate))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [cortes, selectedDate]
  );

  const getClienteNombre = (id: string) => clientes.find(c => c.id === id)?.nombre || 'Desconocido';

  if (cortesDelMes.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 p-4 pb-2">
        <Scissors className="h-4 w-4 text-muted-foreground" />
        <div>
          <h3 className="text-sm font-semibold">Historial de Cortes P2P</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {cortesDelMes.length} corte{cortesDelMes.length !== 1 ? 's' : ''} este mes
          </p>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="table-header w-8"></TableHead>
            <TableHead className="table-header">Fecha</TableHead>
            <TableHead className="table-header">País</TableHead>
            <TableHead className="table-header text-right">Recaudado</TableHead>
            <TableHead className="table-header text-right">Comisión</TableHead>
            <TableHead className="table-header text-right">Tasa</TableHead>
            <TableHead className="table-header text-right">USDT Recibido</TableHead>
            <TableHead className="table-header text-right">Diferencia</TableHead>
            <TableHead className="table-header text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cortesDelMes.map(corte => {
            const isExpanded = expandedId === corte.id;
            const diferencia = Math.round((corte.usdtRecibidoReal - corte.usdtCalculado) * 100) / 100;
            const pagosDelCorte = pagos.filter(p => corte.pagosIds.includes(p.id));

            return (
              <>
                <TableRow
                  key={corte.id}
                  className="cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : corte.id)}
                >
                  <TableCell className="w-8">
                    {isExpanded
                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    }
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(corte.fecha), 'dd MMM yyyy', { locale: es })}
                  </TableCell>
                  <TableCell>
                    <span className="mr-1">{PAIS_FLAG[corte.pais]}</span>
                    {corte.pais}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {corte.totalRecaudado.toLocaleString()} {corte.moneda}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {corte.comisionPorcentaje}%
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {corte.tasaBinance}
                  </TableCell>
                  <TableCell className="text-right font-medium text-success">
                    {corte.usdtRecibidoReal.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT
                  </TableCell>
                  <TableCell className={`text-right text-xs font-medium ${diferencia >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {diferencia >= 0 ? '+' : ''}{diferencia.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteCorte(corte.id); }}
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>

                {/* Expanded: show linked payments */}
                {isExpanded && (
                  <TableRow key={`${corte.id}-detail`}>
                    <TableCell colSpan={9} className="bg-muted/30 p-0">
                      <div className="px-6 py-3">
                        <p className="text-xs font-semibold mb-2 text-muted-foreground">
                          Pagos incluidos en este corte ({pagosDelCorte.length})
                        </p>
                        {pagosDelCorte.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No hay pagos vinculados</p>
                        ) : (
                          <div className="space-y-1.5">
                            {pagosDelCorte.map(p => (
                              <div key={p.id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-3">
                                  <span className="font-medium">{getClienteNombre(p.clienteId)}</span>
                                  <span className="text-muted-foreground">
                                    {format(new Date(p.fecha), 'dd MMM', { locale: es })}
                                  </span>
                                  <Badge variant="secondary" className="text-[10px]">{p.metodo}</Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-muted-foreground">
                                    {(p.montoOriginal || 0).toLocaleString()} {corte.moneda}
                                  </span>
                                  <span className="font-medium text-success">
                                    → ${p.monto.toFixed(2)} USD
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {corte.notas && (
                          <p className="text-xs text-muted-foreground mt-2 italic">📝 {corte.notas}</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
