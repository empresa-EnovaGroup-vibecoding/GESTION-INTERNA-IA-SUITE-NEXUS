import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Panel } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Trash2, Edit2, Eye, EyeOff } from 'lucide-react';
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

export default function PanelesPage() {
  const { paneles, addPanel, updatePanel, deletePanel } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Panel | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    fechaCompra: format(new Date(), 'yyyy-MM-dd'),
    fechaExpiracion: '',
    capacidadTotal: 10,
  });

  const resetForm = () => {
    setForm({
      nombre: '', email: '', password: '',
      fechaCompra: format(new Date(), 'yyyy-MM-dd'),
      fechaExpiracion: '', capacidadTotal: 10,
    });
    setEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updatePanel({ ...editing, ...form });
    } else {
      addPanel(form);
    }
    setOpen(false);
    resetForm();
  };

  const handleEdit = (panel: Panel) => {
    setEditing(panel);
    setForm({
      nombre: panel.nombre,
      email: panel.email,
      password: panel.password,
      fechaCompra: panel.fechaCompra,
      fechaExpiracion: panel.fechaExpiracion,
      capacidadTotal: panel.capacidadTotal,
    });
    setOpen(true);
  };

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Paneles</h1>
          <p className="text-sm text-muted-foreground">Gestiona tus paneles de IA</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nuevo Panel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Panel' : 'Nuevo Panel'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="ChatGPT Plus, Claude Pro..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    value={form.password}
                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Fecha Compra</Label>
                  <Input
                    type="date"
                    value={form.fechaCompra}
                    onChange={(e) => setForm(f => ({ ...f, fechaCompra: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiración</Label>
                  <Input
                    type="date"
                    value={form.fechaExpiracion}
                    onChange={(e) => setForm(f => ({ ...f, fechaExpiracion: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Capacidad</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.capacidadTotal}
                    onChange={(e) => setForm(f => ({ ...f, capacidadTotal: parseInt(e.target.value) || 1 }))}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editing ? 'Guardar Cambios' : 'Crear Panel'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {paneles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No hay paneles aún</p>
          <p className="mt-1 text-xs text-muted-foreground">Agrega tu primer panel de IA</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {paneles.map((panel) => {
            const cuposDisponibles = panel.capacidadTotal - panel.cuposUsados;
            const porcentajeUso = (panel.cuposUsados / panel.capacidadTotal) * 100;
            return (
              <div key={panel.id} className="stat-card space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{panel.nombre}</h3>
                    <p className="text-xs text-muted-foreground">{panel.email}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(panel)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deletePanel(panel.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Password:</span>
                  <span className="font-mono">
                    {showPasswords[panel.id] ? panel.password : '••••••••'}
                  </span>
                  <button onClick={() => togglePassword(panel.id)} className="text-muted-foreground hover:text-foreground">
                    {showPasswords[panel.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>

                <div>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted-foreground">Cupos</span>
                    <span className="font-medium">{panel.cuposUsados}/{panel.capacidadTotal}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        porcentajeUso >= 90 ? 'bg-destructive' : porcentajeUso >= 70 ? 'bg-warning' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(porcentajeUso, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cuposDisponibles} disponible{cuposDisponibles !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Compra: {format(new Date(panel.fechaCompra), 'dd MMM yyyy', { locale: es })}</span>
                  <span>Exp: {format(new Date(panel.fechaExpiracion), 'dd MMM yyyy', { locale: es })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
