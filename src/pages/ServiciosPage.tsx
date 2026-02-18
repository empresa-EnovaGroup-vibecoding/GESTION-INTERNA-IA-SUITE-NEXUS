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
import { toast } from 'sonner';

export default function ServiciosPage() {
  const { servicios, suscripciones, addServicio, updateServicio, deleteServicio } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Servicio | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ nombre: '', precioBase: '', precioRefMXN: '', precioRefCOP: '' });

  const resetForm = () => {
    setForm({ nombre: '', precioBase: '', precioRefMXN: '', precioRefCOP: '' });
    setEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error('El nombre del servicio es obligatorio');
      return;
    }
    if (!form.precioBase) {
      toast.error('El precio base es obligatorio');
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        nombre: form.nombre,
        precioBase: parseFloat(form.precioBase) || 0,
        precioRefMXN: form.precioRefMXN ? parseFloat(form.precioRefMXN) : undefined,
        precioRefCOP: form.precioRefCOP ? parseFloat(form.precioRefCOP) : undefined,
      };
      if (editing) {
        updateServicio({ ...editing, ...data });
        toast.success('Servicio actualizado');
      } else {
        addServicio(data);
        toast.success('Servicio creado');
      }
      setOpen(false);
      resetForm();
    } catch {
      toast.error('Error al guardar servicio');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (servicio: Servicio) => {
    setEditing(servicio);
    setForm({
      nombre: servicio.nombre,
      precioBase: String(servicio.precioBase),
      precioRefMXN: servicio.precioRefMXN != null ? String(servicio.precioRefMXN) : '',
      precioRefCOP: servicio.precioRefCOP != null ? String(servicio.precioRefCOP) : '',
    });
    setOpen(true);
  };

  const getSubscriptorCount = (servicioId: string) =>
    suscripciones.filter(s => s.servicioId === servicioId).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
            <form noValidate onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Servicio</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="ChatGPT, Canva, CapCut..."
                />
              </div>
              <div className="space-y-2">
                <Label>Precio Base (USD)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.precioBase}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || /^\d*\.?\d*$/.test(v)) setForm(f => ({ ...f, precioBase: v }));
                  }}
                  placeholder="5.00"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Referencia MXN (opcional)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={form.precioRefMXN}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || /^\d*\.?\d*$/.test(v)) setForm(f => ({ ...f, precioRefMXN: v }));
                    }}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Referencia COP (opcional)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={form.precioRefCOP}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || /^\d*\.?\d*$/.test(v)) setForm(f => ({ ...f, precioRefCOP: v }));
                    }}
                    placeholder="20000"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Guardando...' : (editing ? 'Guardar Cambios' : 'Crear Servicio')}
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
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>${servicio.precioBase.toLocaleString()} USD</span>
                    {servicio.precioRefMXN != null && (
                      <>
                        <span>·</span>
                        <span>MXN${servicio.precioRefMXN.toLocaleString()}</span>
                      </>
                    )}
                    {servicio.precioRefCOP != null && (
                      <>
                        <span>·</span>
                        <span>COP${servicio.precioRefCOP.toLocaleString()}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{subsCount} suscriptor{subsCount !== 1 ? 'es' : ''}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(servicio)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 active:opacity-80 transition-all">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteServicio(servicio.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 active:opacity-80 transition-all">
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
