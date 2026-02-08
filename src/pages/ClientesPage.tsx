import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Cliente } from '@/types';
import { format, isBefore, isToday, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Trash2, Edit2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ClientesPage() {
  const { clientes, paneles, addCliente, updateCliente, deleteCliente, getPanelById, getCuposDisponibles } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);

  const [form, setForm] = useState({
    nombre: '',
    whatsapp: '',
    panelId: '',
    fechaInicio: format(new Date(), 'yyyy-MM-dd'),
  });

  const resetForm = () => {
    setForm({ nombre: '', whatsapp: '', panelId: '', fechaInicio: format(new Date(), 'yyyy-MM-dd') });
    setEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateCliente({ ...editing, ...form, fechaVencimiento: editing.fechaVencimiento });
    } else {
      addCliente(form);
    }
    setOpen(false);
    resetForm();
  };

  const handleEdit = (cliente: Cliente) => {
    setEditing(cliente);
    setForm({
      nombre: cliente.nombre,
      whatsapp: cliente.whatsapp,
      panelId: cliente.panelId,
      fechaInicio: cliente.fechaInicio,
    });
    setOpen(true);
  };

  const getEstado = (fechaVencimiento: string) => {
    const fecha = startOfDay(new Date(fechaVencimiento));
    const hoy = startOfDay(new Date());
    if (isBefore(fecha, hoy)) return 'vencido';
    if (isToday(fecha)) return 'hoy';
    return 'activo';
  };

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'vencido': return 'alert-badge bg-destructive/10 text-destructive';
      case 'hoy': return 'alert-badge bg-warning/10 text-warning';
      default: return 'alert-badge bg-success/10 text-success';
    }
  };

  const estadoLabel = (estado: string) => {
    switch (estado) {
      case 'vencido': return 'Vencido';
      case 'hoy': return 'Vence hoy';
      default: return 'Activo';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clientes.length} clientes registrados</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Nombre del cliente"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={form.whatsapp}
                  onChange={(e) => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="+57 300 123 4567"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Panel</Label>
                <Select
                  value={form.panelId}
                  onValueChange={(v) => setForm(f => ({ ...f, panelId: v }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar panel" />
                  </SelectTrigger>
                  <SelectContent>
                    {paneles.map(p => {
                      const disponibles = getCuposDisponibles(p.id);
                      const disabled = disponibles <= 0 && (!editing || editing.panelId !== p.id);
                      return (
                        <SelectItem key={p.id} value={p.id} disabled={disabled}>
                          {p.nombre} ({disponibles} cupos)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha de Inicio</Label>
                <Input
                  type="date"
                  value={form.fechaInicio}
                  onChange={(e) => setForm(f => ({ ...f, fechaInicio: e.target.value }))}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={!form.panelId}>
                {editing ? 'Guardar Cambios' : 'Registrar Cliente'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {clientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No hay clientes aún</p>
          <p className="mt-1 text-xs text-muted-foreground">Registra tu primer cliente</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="table-header px-4 py-3 text-left">Nombre</th>
                <th className="table-header px-4 py-3 text-left">WhatsApp</th>
                <th className="table-header px-4 py-3 text-left">Panel</th>
                <th className="table-header px-4 py-3 text-left">Inicio</th>
                <th className="table-header px-4 py-3 text-left">Vencimiento</th>
                <th className="table-header px-4 py-3 text-left">Estado</th>
                <th className="table-header px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clientes.map(cliente => {
                const estado = getEstado(cliente.fechaVencimiento);
                const panel = getPanelById(cliente.panelId);
                return (
                  <tr key={cliente.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{cliente.nombre}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://wa.me/${cliente.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {cliente.whatsapp}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{panel?.nombre || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(cliente.fechaInicio), 'dd MMM yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(cliente.fechaVencimiento), 'dd MMM yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={estadoBadge(estado)}>{estadoLabel(estado)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleEdit(cliente)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteCliente(cliente.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
