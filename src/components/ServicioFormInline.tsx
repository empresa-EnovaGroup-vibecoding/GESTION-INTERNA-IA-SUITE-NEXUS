import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { format, addDays } from 'date-fns';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface PendingSuscripcion {
  servicioId: string;
  panelId?: string;
  fechaInicio: string;
  precioCobrado: number;
  credencialEmail?: string;
  credencialPassword?: string;
  notas?: string;
  _tempId: string; // for keying in the list
}

interface Props {
  items: PendingSuscripcion[];
  onAdd: (item: PendingSuscripcion) => void;
  onRemove: (tempId: string) => void;
}

export default function ServicioFormInline({ items, onAdd, onRemove }: Props) {
  const { servicios, paneles, getCuposDisponibles, getServicioById, getPanelById } = useData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    servicioId: '',
    panelId: '',
    fechaInicio: format(new Date(), 'yyyy-MM-dd'),
    precioCobrado: 0,
    credencialEmail: '',
    credencialPassword: '',
  });

  const handleServicioChange = (servicioId: string) => {
    const servicio = getServicioById(servicioId);
    setForm(f => ({ ...f, servicioId, precioCobrado: servicio?.precioBase ?? 0 }));
  };

  const handleAdd = () => {
    if (!form.servicioId) return;
    onAdd({
      ...form,
      panelId: form.panelId || undefined,
      credencialEmail: form.credencialEmail || undefined,
      credencialPassword: form.credencialPassword || undefined,
      _tempId: Date.now().toString(36) + Math.random().toString(36).substr(2),
    });
    setForm({
      servicioId: '', panelId: '',
      fechaInicio: format(new Date(), 'yyyy-MM-dd'),
      precioCobrado: 0, credencialEmail: '', credencialPassword: '',
    });
    setShowForm(false);
  };

  // Count pending items per panel to adjust available cupos
  const getPendingCupos = (panelId: string) => {
    return items.filter(i => i.panelId === panelId).length;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Servicios</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-3 w-3" />
          Agregar Servicio
        </Button>
      </div>

      {/* Pending items as cards */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map(item => {
            const servicio = getServicioById(item.servicioId);
            const panel = item.panelId ? getPanelById(item.panelId) : undefined;
            const fechaVenc = format(addDays(new Date(item.fechaInicio), 30), 'dd/MM/yyyy');
            return (
              <div
                key={item._tempId}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{servicio?.nombre || '?'}</span>
                    <span className="text-xs text-muted-foreground">
                      ${item.precioCobrado.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {panel?.nombre || 'Credencial directa'} · Vence: {fechaVenc}
                    {item.credencialEmail && ` · 📧 ${item.credencialEmail}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item._tempId)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Servicio</Label>
              <Select value={form.servicioId} onValueChange={handleServicioChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {servicios.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre} — ${s.precioBase.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {servicios.length === 0 && (
                <p className="text-[11px] text-destructive">Crea servicios en el catálogo primero.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Panel</Label>
              <Select value={form.panelId || '_none'} onValueChange={(v) => setForm(f => ({ ...f, panelId: v === '_none' ? '' : v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Sin panel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin panel (credencial directa)</SelectItem>
                  {paneles.map(p => {
                    const disponibles = getCuposDisponibles(p.id) - getPendingCupos(p.id);
                    return (
                      <SelectItem key={p.id} value={p.id} disabled={disponibles <= 0}>
                        {p.nombre} ({disponibles} cupos)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha Inicio</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={form.fechaInicio}
                onChange={(e) => setForm(f => ({ ...f, fechaInicio: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Precio Cobrado</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                className="h-8 text-xs"
                value={form.precioCobrado}
                onChange={(e) => setForm(f => ({ ...f, precioCobrado: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Email credencial (opc.)</Label>
              <Input
                type="email"
                className="h-8 text-xs"
                value={form.credencialEmail}
                onChange={(e) => setForm(f => ({ ...f, credencialEmail: e.target.value }))}
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Password (opc.)</Label>
              <Input
                type="text"
                className="h-8 text-xs"
                value={form.credencialPassword}
                onChange={(e) => setForm(f => ({ ...f, credencialPassword: e.target.value }))}
                placeholder="••••••"
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full text-xs"
            disabled={!form.servicioId}
            onClick={handleAdd}
          >
            Añadir a la Lista
          </Button>
        </div>
      )}

      {items.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground py-1">
          Sin servicios agregados. Puedes agregar después de crear el cliente.
        </p>
      )}
    </div>
  );
}
