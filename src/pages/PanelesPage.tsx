import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Panel } from '@/types';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PanelCard from '@/components/PanelCard';
import PanelFormDialog from '@/components/PanelFormDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SERVICIOS_FILTER = ['Todos', 'ChatGPT', 'CapCut', 'Canva', 'Veo 3', 'Claude', 'Midjourney'];

export default function PanelesPage() {
  const { paneles, deletePanel } = useData();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Panel | null>(null);
  const [filterServicio, setFilterServicio] = useState('Todos');
  const [deleteTarget, setDeleteTarget] = useState<Panel | null>(null);

  const filtered = useMemo(() => {
    return paneles.filter(p => {
      if (filterServicio !== 'Todos' && !p.servicioAsociado?.toLowerCase().includes(filterServicio.toLowerCase())) return false;
      return true;
    });
  }, [paneles, filterServicio]);

  const handleEdit = (panel: Panel) => {
    setEditing(panel);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Paneles</h1>
          <p className="text-sm text-muted-foreground">Gestiona tus paneles de IA</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          Nuevo Panel
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {SERVICIOS_FILTER.map(s => (
            <button
              key={s}
              onClick={() => setFilterServicio(s)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                filterServicio === s
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No hay paneles</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {filterServicio !== 'Todos' ? 'Intenta cambiar los filtros' : 'Agrega tu primer panel de IA'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(panel => (
            <PanelCard
              key={panel.id}
              panel={panel}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <PanelFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        editing={editing}
      />
    </div>
  );
}
