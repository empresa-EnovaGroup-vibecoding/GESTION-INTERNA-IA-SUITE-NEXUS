import { useState, useMemo, useEffect, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { Panel, Cliente, Suscripcion } from '@/types';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PanelCard from '@/components/PanelCard';
import PanelFormDialog from '@/components/PanelFormDialog';
import PanelesResumen from '@/components/PanelesResumen';
import { Input } from '@/components/ui/input';
import { differenceInDays, parseISO } from 'date-fns';

const SERVICIOS_FILTER = ['Todos', 'ChatGPT', 'CapCut', 'Canva', 'Veo 3', 'Claude', 'Midjourney'];

export interface ClienteEnPanel {
  cliente: Cliente;
  suscripcion: Suscripcion;
}

interface PanelesPageProps {
  initialSearch?: string;
  onSearchConsumed?: () => void;
}

export default function PanelesPage({ initialSearch = '', onSearchConsumed }: PanelesPageProps) {
  const { paneles, clientes, suscripciones, updatePanel } = useData();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Panel | null>(null);
  const [filterServicio, setFilterServicio] = useState('Todos');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterResumen, setFilterResumen] = useState('');

  // Debounce search - 250ms delay so typing feels smooth on mobile
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Apply initial search from Dashboard navigation
  useEffect(() => {
    if (initialSearch) {
      setSearchInput(initialSearch);
      setFilterServicio('Todos');
      setFilterResumen('');
      onSearchConsumed?.();
    }
  }, [initialSearch, onSearchConsumed]);

  // Map: panelId -> clients assigned to it
  const clientesPorPanel = useMemo(() => {
    const map: Record<string, ClienteEnPanel[]> = {};
    suscripciones.forEach(sub => {
      if (!sub.panelId || sub.estado !== 'activa') return;
      const cliente = clientes.find(c => c.id === sub.clienteId);
      if (!cliente) return;
      if (!map[sub.panelId]) map[sub.panelId] = [];
      map[sub.panelId].push({ cliente, suscripcion: sub });
    });
    return map;
  }, [suscripciones, clientes]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const hoy = new Date();
    return paneles.filter(p => {
      // Resumen filter (por-vencer)
      if (filterResumen === 'por-vencer') {
        if (!p.fechaExpiracion) return false;
        const diff = differenceInDays(parseISO(p.fechaExpiracion), hoy);
        if (diff > 15) return false;
      }
      if (filterServicio !== 'Todos' && !p.servicioAsociado?.toLowerCase().includes(filterServicio.toLowerCase())) return false;
      if (q) {
        // Search in panel data
        const panelMatch = p.nombre.toLowerCase().includes(q)
          || p.email.toLowerCase().includes(q)
          || (p.notas || '').toLowerCase().includes(q)
          || (p.proveedor || '').toLowerCase().includes(q);
        // Search in assigned clients
        const ceps = clientesPorPanel[p.id] || [];
        const clienteMatch = ceps.some(cep =>
          cep.cliente.nombre.toLowerCase().includes(q)
          || cep.cliente.whatsapp.includes(q)
          || (cep.suscripcion.credencialEmail || '').toLowerCase().includes(q)
        );
        if (!panelMatch && !clienteMatch) return false;
      }
      return true;
    }).sort((a, b) => {
      if (filterResumen === 'por-vencer') {
        const diffA = differenceInDays(parseISO(a.fechaExpiracion), hoy);
        const diffB = differenceInDays(parseISO(b.fechaExpiracion), hoy);
        return diffA - diffB;
      }
      return 0;
    });
  }, [paneles, filterServicio, search, filterResumen, clientesPorPanel]);

  const handleEdit = useCallback((panel: Panel) => {
    setEditing(panel);
    setFormOpen(true);
  }, []);

  const handleRenovar = useCallback((p: Panel) => {
    if (!p.fechaExpiracion) return;
    const newDate = new Date(p.fechaExpiracion);
    newDate.setDate(newDate.getDate() + 30);
    updatePanel({ ...p, fechaExpiracion: newDate.toISOString().split('T')[0] });
  }, [updatePanel]);

  const handleFilterResumen = useCallback((filter: string) => {
    setFilterResumen(filter);
    if (filter) {
      setFilterServicio('Todos');
      setSearchInput('');
    }
  }, []);

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

      {/* Resumen */}
      <PanelesResumen paneles={paneles} onFilterChange={handleFilterResumen} activeFilter={filterResumen} />

      {/* Active filter banner */}
      {filterResumen === 'por-vencer' && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2">
          <p className="text-sm font-medium text-destructive">Mostrando paneles por vencer o vencidos</p>
          <button onClick={() => setFilterResumen('')} className="text-xs text-destructive hover:underline">Quitar filtro</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Buscar panel, cliente, email, WhatsApp..."
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {SERVICIOS_FILTER.map(s => (
            <button
              key={s}
              onClick={() => { setFilterServicio(s); setFilterResumen(''); }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                filterServicio === s && !filterResumen
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Search hint */}
      {searchInput && (
        <p className="text-[11px] text-muted-foreground">
          Buscando en paneles y clientes asignados: <span className="font-medium text-foreground">{searchInput}</span>
          {' '}&middot; {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No hay paneles</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {filterServicio !== 'Todos' || filterResumen || search ? 'Intenta cambiar los filtros' : 'Agrega tu primer panel de IA'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(panel => (
            <PanelCard
              key={panel.id}
              panel={panel}
              clientesAsignados={clientesPorPanel[panel.id] || []}
              searchQuery={search}
              onEdit={handleEdit}
              onRenovar={handleRenovar}
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
