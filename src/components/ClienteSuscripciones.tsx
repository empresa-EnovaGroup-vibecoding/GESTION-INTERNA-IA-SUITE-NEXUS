import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Suscripcion, EstadoSuscripcion } from '@/types';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

const estadoOptions: { value: EstadoSuscripcion; label: string }[] = [
  { value: 'activa', label: 'Activa' },
  { value: 'vencida', label: 'Vencida' },
  { value: 'cancelada', label: 'Cancelada' },
];

const estadoBadgeClass = (estado: EstadoSuscripcion) => {
  switch (estado) {
    case 'activa': return 'alert-badge bg-success/10 text-success text-[10px]';
    case 'vencida': return 'alert-badge bg-destructive/10 text-destructive text-[10px]';
    case 'cancelada': return 'alert-badge bg-muted text-muted-foreground text-[10px]';
  }
};

export default function ClienteSuscripciones({ clienteId }: Props) {
  const {
    getSuscripcionesByCliente, addSuscripcion, updateSuscripcion, deleteSuscripcion,
    paneles, servicios, getCuposDisponibles, getPanelById, getServicioById,
  } = useData();
  const suscripciones = getSuscripcionesByCliente(clienteId);

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    panelId: string; fechaInicio: string; fechaVencimiento: string;
    estado: EstadoSuscripcion; precioCobrado: number;
    credencialEmail: string; credencialPassword: string; notas: string;
  }>({
    panelId: '', fechaInicio: '', fechaVencimiento: '',
    estado: 'activa', precioCobrado: 0,
    credencialEmail: '', credencialPassword: '', notas: '',
  });

  const [form, setForm] = useState({
    panelId: '',
    servicioId: '',
    fechaInicio: format(new Date(), 'yyyy-MM-dd'),
    precioCobrado: 0,
    credencialEmail: '',
    credencialPassword: '',
    notas: '',
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.servicioId || !form.panelId) return;
    addSuscripcion({
      clienteId,
      servicioId: form.servicioId,
      panelId: form.panelId,
      fechaInicio: form.fechaInicio,
      precioCobrado: form.precioCobrado,
      credencialEmail: form.credencialEmail || undefined,
      credencialPassword: form.credencialPassword || undefined,
      notas: form.notas || undefined,
    });
    setForm({
      panelId: '', servicioId: '', fechaInicio: format(new Date(), 'yyyy-MM-dd'),
      precioCobrado: 0, credencialEmail: '', credencialPassword: '', notas: '',
    });
    setShowAdd(false);
  };

  const startEdit = (sub: Suscripcion) => {
    setEditingId(sub.id);
    setEditForm({
      panelId: sub.panelId,
      fechaInicio: sub.fechaInicio,
      fechaVencimiento: sub.fechaVencimiento,
      estado: sub.estado,
      precioCobrado: sub.precioCobrado,
      credencialEmail: sub.credencialEmail || '',
      credencialPassword: sub.credencialPassword || '',
      notas: sub.notas || '',
    });
  };

  const saveEdit = (sub: Suscripcion) => {
    updateSuscripcion({
      ...sub,
      panelId: editForm.panelId,
      fechaInicio: editForm.fechaInicio,
      fechaVencimiento: editForm.fechaVencimiento,
      estado: editForm.estado,
      precioCobrado: editForm.precioCobrado,
      credencialEmail: editForm.credencialEmail || undefined,
      credencialPassword: editForm.credencialPassword || undefined,
      notas: editForm.notas || undefined,
    });
    setEditingId(null);
  };

  const handleFechaInicioChange = (value: string) => {
    const fechaVencimiento = format(addDays(new Date(value), 30), 'yyyy-MM-dd');
    setEditForm(f => ({ ...f, fechaInicio: value, fechaVencimiento }));
  };

  const handleAddServicioChange = (servicioId: string) => {
    const servicio = getServicioById(servicioId);
    setForm(f => ({ ...f, servicioId, precioCobrado: servicio?.precioBase ?? 0 }));
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
            <Select value={form.servicioId} onValueChange={handleAddServicioChange}>
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
          <div className="grid grid-cols-2 gap-2">
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
            <div className="space-y-1.5">
              <Label className="text-xs">Precio Cobrado</Label>
              <Input
                type="number"
                min={0}
                step={100}
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
              <Label className="text-xs">Password credencial (opc.)</Label>
              <Input
                type="text"
                className="h-8 text-xs"
                value={form.credencialPassword}
                onChange={(e) => setForm(f => ({ ...f, credencialPassword: e.target.value }))}
                placeholder="••••••"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notas (opc.)</Label>
            <Textarea
              className="text-xs min-h-[60px]"
              value={form.notas}
              onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Observaciones..."
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
            const isEditing = editingId === sub.id;

            if (isEditing) {
              return (
                <div key={sub.id} className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{servicio?.nombre || 'Servicio eliminado'}</span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => saveEdit(sub)} className="rounded p-1 text-success hover:bg-success/10">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
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
                      <div className="space-y-1">
                        <Label className="text-[11px]">Estado</Label>
                        <Select value={editForm.estado} onValueChange={(v) => setEditForm(f => ({ ...f, estado: v as EstadoSuscripcion }))}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {estadoOptions.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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
                    <div className="space-y-1">
                      <Label className="text-[11px]">Precio Cobrado</Label>
                      <Input
                        type="number"
                        min={0}
                        step={100}
                        className="h-7 text-xs"
                        value={editForm.precioCobrado}
                        onChange={(e) => setEditForm(f => ({ ...f, precioCobrado: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px]">Email credencial</Label>
                        <Input
                          type="email"
                          className="h-7 text-xs"
                          value={editForm.credencialEmail}
                          onChange={(e) => setEditForm(f => ({ ...f, credencialEmail: e.target.value }))}
                          placeholder="usuario@ejemplo.com"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Password credencial</Label>
                        <Input
                          type="text"
                          className="h-7 text-xs"
                          value={editForm.credencialPassword}
                          onChange={(e) => setEditForm(f => ({ ...f, credencialPassword: e.target.value }))}
                          placeholder="••••••"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Notas</Label>
                      <Textarea
                        className="text-xs min-h-[50px]"
                        value={editForm.notas}
                        onChange={(e) => setEditForm(f => ({ ...f, notas: e.target.value }))}
                        placeholder="Observaciones..."
                      />
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
                    <span className={estadoBadgeClass(sub.estado)}>
                      {sub.estado === 'activa' ? 'Activa' : sub.estado === 'vencida' ? 'Vencida' : 'Cancelada'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {panel?.nombre || '—'} · {format(new Date(sub.fechaInicio), 'dd MMM', { locale: es })} → {format(new Date(sub.fechaVencimiento), 'dd MMM yyyy', { locale: es })}
                    {sub.precioCobrado > 0 && ` · $${sub.precioCobrado.toLocaleString()}`}
                  </p>
                  {(sub.credencialEmail || sub.notas) && (
                    <p className="text-[10px] text-muted-foreground/70">
                      {sub.credencialEmail && `📧 ${sub.credencialEmail}`}
                      {sub.credencialEmail && sub.notas && ' · '}
                      {sub.notas && `📝 ${sub.notas}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => startEdit(sub)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
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