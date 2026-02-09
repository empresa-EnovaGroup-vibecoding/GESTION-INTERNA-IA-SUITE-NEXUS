import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Servicio } from '@/types';
import { Plus, Trash2, Edit2, Package } from 'lucide-react';
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

export default function ServiciosPage() {
  const { servicios, suscripciones, addServicio, updateServicio, deleteServicio } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Servicio | null>(null);

  const [form, setForm] = useState({ nombre: '', precioBase: 0 });

  const resetForm = () => {
    setForm({ nombre: '', precioBase: 0 });
    setEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateServicio({ ...editing, ...form });
    } else {
      addServicio(form);
    }
    setOpen(false);
    resetForm();
  };

  const handleEdit = (servicio: Servicio) => {
    setEditing(servicio);
    setForm({ nombre: servicio.nombre, precioBase: servicio.precioBase });
    setOpen(true);
  };

  const getSubscriptorCount = (servicioId: string) =>
    suscripciones.filter(s => s.servicioId === servicioId).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Catálogo de Servicios</h1>
          <p className="text-sm text-muted-foreground">{servicios.length} servicios configurados</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nuevo Servicio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Servicio</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="ChatGPT, Canva, CapCut..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Precio Base</Label>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={form.precioBase}
                  onChange={(e) => setForm(f => ({ ...f, precioBase: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editing ? 'Guardar Cambios' : 'Crear Servicio'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {servicios.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No hay servicios aún</p>
          <p className="mt-1 text-xs text-muted-foreground">Configura tu catálogo de productos de IA</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {servicios.map(servicio => {
            const subsCount = getSubscriptorCount(servicio.id);
            return (
              <div key={servicio.id} className="stat-card flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold">{servicio.nombre}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>${servicio.precioBase.toLocaleString()}</span>
                    <span>·</span>
                    <span>{subsCount} suscriptor{subsCount !== 1 ? 'es' : ''}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(servicio)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteServicio(servicio.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
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
