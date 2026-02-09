import { useState, useEffect } from 'react';
import { Panel, EstadoPanel } from '@/types';
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

const SERVICIOS_PREDETERMINADOS = ['ChatGPT', 'CapCut', 'Canva', 'Veo 3', 'Claude', 'Midjourney'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Panel | null;
}

const emptyForm = {
  nombre: '',
  email: '',
  password: '',
  fechaCompra: format(new Date(), 'yyyy-MM-dd'),
  fechaExpiracion: '',
  capacidadTotal: 10,
  servicioAsociado: '',
  estado: 'activo' as EstadoPanel,
  proveedor: '',
};

export default function PanelFormDialog({ open, onOpenChange, editing }: Props) {
  const { addPanel, updatePanel } = useData();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (editing) {
      setForm({
        nombre: editing.nombre,
        email: editing.email,
        password: editing.password,
        fechaCompra: editing.fechaCompra,
        fechaExpiracion: editing.fechaExpiracion,
        capacidadTotal: editing.capacidadTotal,
        servicioAsociado: editing.servicioAsociado || '',
        estado: editing.estado || 'activo',
        proveedor: editing.proveedor || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [editing, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updatePanel({
        ...editing,
        ...form,
      });
    } else {
      addPanel(form);
    }
    onOpenChange(false);
    setForm(emptyForm);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Panel' : 'Nuevo Panel'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Panel ChatGPT #1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Servicio asociado</Label>
              <Select value={form.servicioAsociado} onValueChange={v => setForm(f => ({ ...f, servicioAsociado: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {SERVICIOS_PREDETERMINADOS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Fecha Compra</Label>
              <Input type="date" value={form.fechaCompra} onChange={e => setForm(f => ({ ...f, fechaCompra: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Expiración</Label>
              <Input type="date" value={form.fechaExpiracion} onChange={e => setForm(f => ({ ...f, fechaExpiracion: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Capacidad</Label>
              <Input type="number" min={1} value={form.capacidadTotal} onChange={e => setForm(f => ({ ...f, capacidadTotal: parseInt(e.target.value) || 1 }))} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v as 'activo' | 'caido' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="caido">Caído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Proveedor (opcional)</Label>
              <Input value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} placeholder="De dónde lo compraste" />
            </div>
          </div>

          <Button type="submit" className="w-full">
            {editing ? 'Guardar Cambios' : 'Crear Panel'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
