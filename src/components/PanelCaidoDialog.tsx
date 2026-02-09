import { useState } from 'react';
import { Panel } from '@/types';
import { useData } from '@/contexts/DataContext';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Props {
  panel: Panel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SERVICIOS_PREDETERMINADOS = ['ChatGPT', 'CapCut', 'Canva', 'Veo 3', 'Claude', 'Midjourney'];

export default function PanelCaidoDialog({ panel, open, onOpenChange }: Props) {
  const { paneles, marcarPanelCaido } = useData();
  const [mode, setMode] = useState<'select' | 'create' | null>(null);
  const [selectedPanelId, setSelectedPanelId] = useState('');
  const [newPanel, setNewPanel] = useState({
    nombre: '',
    email: '',
    password: '',
    fechaCompra: format(new Date(), 'yyyy-MM-dd'),
    fechaExpiracion: '',
    capacidadTotal: 10,
    servicioAsociado: '',
    proveedor: '',
  });

  if (!panel) return null;

  const availablePaneles = paneles.filter(
    p => p.id !== panel.id && p.estado === 'activo'
  );

  const handleConfirm = () => {
    if (mode === 'select' && selectedPanelId) {
      marcarPanelCaido(panel.id, { type: 'existing', panelId: selectedPanelId });
      toast.success('Panel marcado como caído y clientes migrados');
    } else if (mode === 'create') {
      if (!newPanel.nombre || !newPanel.email || !newPanel.password || !newPanel.fechaExpiracion || !newPanel.servicioAsociado) {
        toast.error('Completa los campos requeridos del nuevo panel');
        return;
      }
      marcarPanelCaido(panel.id, { type: 'new', panelData: newPanel });
      toast.success('Panel creado y clientes migrados automáticamente');
    } else {
      // No replacement
      marcarPanelCaido(panel.id);
      toast.success('Panel marcado como caído');
    }
    onOpenChange(false);
    setMode(null);
    setSelectedPanelId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar "{panel.nombre}" como Caído</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ¿Deseas asignar un panel de reemplazo? Los clientes se moverán automáticamente.
          </p>

          <div className="flex gap-2">
            <Button
              variant={mode === 'select' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('select')}
              disabled={availablePaneles.length === 0}
            >
              Panel existente
            </Button>
            <Button
              variant={mode === 'create' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('create')}
            >
              Crear nuevo
            </Button>
            <Button
              variant={mode === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode(null)}
            >
              Sin reemplazo
            </Button>
          </div>

          {mode === 'select' && (
            <div className="space-y-2">
              <Label>Seleccionar panel</Label>
              <Select value={selectedPanelId} onValueChange={setSelectedPanelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegir panel..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePaneles.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} ({p.servicioAsociado}) — {p.capacidadTotal - p.cuposUsados} cupos libres
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={newPanel.nombre} onChange={e => setNewPanel(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del panel" required />
              </div>
              <div className="space-y-2">
                <Label>Servicio asociado</Label>
                <Select value={newPanel.servicioAsociado} onValueChange={v => setNewPanel(p => ({ ...p, servicioAsociado: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar servicio" /></SelectTrigger>
                  <SelectContent>
                    {SERVICIOS_PREDETERMINADOS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={newPanel.email} onChange={e => setNewPanel(p => ({ ...p, email: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input value={newPanel.password} onChange={e => setNewPanel(p => ({ ...p, password: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Compra</Label>
                  <Input type="date" value={newPanel.fechaCompra} onChange={e => setNewPanel(p => ({ ...p, fechaCompra: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Expiración</Label>
                  <Input type="date" value={newPanel.fechaExpiracion} onChange={e => setNewPanel(p => ({ ...p, fechaExpiracion: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Capacidad</Label>
                  <Input type="number" min={1} value={newPanel.capacidadTotal} onChange={e => setNewPanel(p => ({ ...p, capacidadTotal: parseInt(e.target.value) || 1 }))} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Proveedor (opcional)</Label>
                <Input value={newPanel.proveedor} onChange={e => setNewPanel(p => ({ ...p, proveedor: e.target.value }))} placeholder="De dónde lo compraste" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirm}>
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
