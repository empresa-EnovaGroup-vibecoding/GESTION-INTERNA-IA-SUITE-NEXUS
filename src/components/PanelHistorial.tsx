import { PanelHistorial as PanelHistorialType } from '@/types';
import { useData } from '@/contexts/DataContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const EVENTO_LABELS: Record<string, string> = {
  activado: '🟢 Activado',
  caido: '🔴 Caído',
  reemplazo_de: '🔄 Reemplazo de',
  reemplazado_por: '➡️ Reemplazado por',
};

interface Props {
  historial: PanelHistorialType[];
}

export default function PanelHistorial({ historial }: Props) {
  const { getPanelById } = useData();

  return (
    <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-border">
      {historial.map((entry, i) => {
        const related = entry.panelRelacionadoId ? getPanelById(entry.panelRelacionadoId) : null;
        return (
          <div key={i} className="text-[11px] text-muted-foreground">
            <span className="font-medium">{format(new Date(entry.fecha), 'dd MMM yyyy', { locale: es })}</span>
            {' — '}
            <span>{EVENTO_LABELS[entry.evento] || entry.evento}</span>
            {related && <span className="font-medium text-foreground"> {related.nombre}</span>}
          </div>
        );
      })}
    </div>
  );
}
