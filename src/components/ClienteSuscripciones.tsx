import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Suscripcion } from '@/types';
import { format, isBefore, isToday, startOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';

interface Props {
  clienteId: string;
}

export default function ClienteSuscripciones({ clienteId }: Props) {
  const {
    getSuscripcionesByCliente, addSuscripcion, updateSuscripcion, deleteSuscripcion,
    paneles, servicios, getCuposDisponibles, getPanelById, getServicioById,
  } = useData();
  const suscripciones = getSuscripcionesByCliente(clienteId);

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ panelId: string; fechaInicio: string; fechaVencimiento: string }>({
    panelId: '', fechaInicio: '', fechaVencimiento: '',
  });

  const [form, setForm] = useState({
    panelId: '',
    servicioId: '',
    fechaInicio: format(new Date(), 'yyyy-MM-dd'),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.servicioId || !form.panelId) return;
    addSuscripcion({
      clienteId,
      servicioId: form.servicioId,
      panelId: form.panelId,
      fechaInicio: form.fechaInicio,
    });
    setForm({ panelId: '', servicioId: '', fechaInicio: format(new Date(), 'yyyy-MM-dd') });
    setShowAdd(false);
  };

  const startEdit = (sub: Suscripcion) => {
    setEditingId(sub.id);
    setEditForm({
      panelId: sub.panelId,
      fechaInicio: sub.fechaInicio,
      fechaVencimiento: sub.fechaVencimiento,
    });
  };

  const saveEdit = (sub: Suscripcion) => {
    updateSuscripcion({
      ...sub,
      panelId: editForm.panelId,
      fechaInicio: editForm.fechaInicio,
      fechaVencimiento: editForm.fechaVencimiento,
    });
    setEditingId(null);
  };

  const handleFechaInicioChange = (value: string) => {
    const fechaVencimiento = format(addDays(new Date(value), 30), 'yyyy-MM-dd');
    setEditForm(f => ({ ...f, fechaInicio: value, fechaVencimiento }));
  };

  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Servicios Activos</h4>
        <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3 w-3" />
          Agregar
        </Button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Servicio</Label>
            <Select value={form.servicioId} onValueChange={(v) => setForm(f => ({ ...f, servicioId: v }))}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Seleccionar servicio" />
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
              <p className="text-[11px] text-destructive">Debes crear servicios en el catálogo primero.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Panel</Label>
            <Select value={form.panelId} onValueChange={(v) => setForm(f => ({ ...f, panelId: v }))}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Seleccionar panel" />
              </SelectTrigger>
              <SelectContent>
                {paneles.map(p => {
                  const disponibles = getCuposDisponibles(p.id);
                  return (
                    <SelectItem key={p.id} value={p.id} disabled={disponibles <= 0}>
                      {p.nombre} ({disponibles} cupos)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha de Inicio</Label>
            <Input
              type="date"
              className="h-8 text-xs"
              value={form.fechaInicio}
              onChange={(e) => setForm(f => ({ ...f, fechaInicio: e.target.value }))}
              required
            />
          </div>
          <Button type="submit" size="sm" className="w-full text-xs" disabled={!form.panelId || !form.servicioId}>
            Agregar Servicio
          </Button>
        </form>
      )}

      {suscripciones.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Sin servicios asignados</p>
      ) : (
        <div className="space-y-2">
          {suscripciones.map(sub => {
            const servicio = getServicioById(sub.servicioId);
            const panel = getPanelById(sub.panelId);
            const vencido = isBefore(startOfDay(new Date(sub.fechaVencimiento)), startOfDay(new Date()));
            const hoy = isToday(new Date(sub.fechaVencimiento));
            const isEditing = editingId === sub.id;

            if (isEditing) {
              return (
                <div key={sub.id} className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{servicio?.nombre || 'Servicio eliminado'}</span>
                    <div className="flex gap-1">
                      <button onClick={() => saveEdit(sub)} className="rounded p-1 text-success hover:bg-success/10">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Panel</Label>
                      <Select value={editForm.panelId} onValueChange={(v) => setEditForm(f => ({ ...f, panelId: v }))}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {paneles.map(p => {
                            const disponibles = getCuposDisponibles(p.id);
                            const isCurrent = p.id === sub.panelId;
                            return (
                              <SelectItem key={p.id} value={p.id} disabled={!isCurrent && disponibles <= 0}>
                                {p.nombre} ({isCurrent ? 'actual' : `${disponibles} cupos`})
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px]">Fecha Inicio</Label>
                        <Input
                          type="date"
                          className="h-7 text-xs"
                          value={editForm.fechaInicio}
                          onChange={(e) => handleFechaInicioChange(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Vencimiento</Label>
                        <Input
                          type="date"
                          className="h-7 text-xs"
                          value={editForm.fechaVencimiento}
                          onChange={(e) => setEditForm(f => ({ ...f, fechaVencimiento: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={sub.id} className="flex items-center justify-between rounded-md border border-border bg-card p-2.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{servicio?.nombre || 'Servicio eliminado'}</span>
                    <span className={
                      vencido ? 'alert-badge bg-destructive/10 text-destructive text-[10px]' :
                      hoy ? 'alert-badge bg-warning/10 text-warning text-[10px]' :
                      'alert-badge bg-success/10 text-success text-[10px]'
                    }>
                      {vencido ? 'Vencido' : hoy ? 'Hoy' : 'Activo'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {panel?.nombre || '—'} · {format(new Date(sub.fechaInicio), 'dd MMM', { locale: es })} → {format(new Date(sub.fechaVencimiento), 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
                <div className="flex gap-0.5">
                  <button
                    onClick={() => startEdit(sub)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteSuscripcion(sub.id)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
