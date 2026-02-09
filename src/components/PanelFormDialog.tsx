import { useState, useEffect } from 'react';
import { Panel } from '@/types';
import { useData } from '@/contexts/DataContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, Eye, EyeOff, Copy, Check, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

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
  proveedor: '',
};

export default function PanelFormDialog({ open, onOpenChange, editing }: Props) {
  const { addPanel, updatePanel, rotarCredenciales } = useData();
  const [form, setForm] = useState(emptyForm);
  const [showRotar, setShowRotar] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

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
        proveedor: editing.proveedor || '',
      });
    } else {
      setForm(emptyForm);
    }
    setShowRotar(false);
    setNewEmail('');
    setNewPassword('');
  }, [editing, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updatePanel({
        ...editing,
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        fechaCompra: form.fechaCompra,
        fechaExpiracion: form.fechaExpiracion,
        capacidadTotal: form.capacidadTotal,
        servicioAsociado: form.servicioAsociado,
        proveedor: form.proveedor,
      });
    } else {
      addPanel({
        ...form,
        estado: 'activo',
        credencialFechaInicio: format(new Date(), 'yyyy-MM-dd'),
      });
    }
    onOpenChange(false);
    setForm(emptyForm);
  };

  const handleRotar = () => {
    if (!newEmail || !newPassword) {
      toast.error('Ingresa el nuevo email y password');
      return;
    }
    if (!editing) return;
    rotarCredenciales(editing.id, newEmail, newPassword);
    toast.success('Credenciales actualizadas y anteriores archivadas');
    onOpenChange(false);
  };

  const historial = editing?.historialCredenciales || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Panel' : 'Nuevo Panel'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Panel ChatGPT #1" required />
            </div>
            <div className="space-y-2">
              <Label>Servicio asociado</Label>
              <Select value={form.servicioAsociado} onValueChange={v => setForm(f => ({ ...f, servicioAsociado: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
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

          <div className="space-y-2">
            <Label>Proveedor (opcional)</Label>
            <Input value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} placeholder="De dónde lo compraste" />
          </div>

          <Button type="submit" className="w-full">
            {editing ? 'Guardar Cambios' : 'Crear Panel'}
          </Button>
        </form>

        {/* Sección de rotación de credenciales - solo en edición */}
        {editing && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            {!showRotar ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="w-full gap-2"
                onClick={() => setShowRotar(true)}
              >
                <AlertTriangle className="h-4 w-4" />
                Reportar Caída / Cambiar Credenciales
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Cambiar Credenciales
                </p>
                <p className="text-xs text-muted-foreground">
                  Las credenciales actuales ({form.email}) se archivarán automáticamente en el historial con estado "Caído".
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nuevo Email</Label>
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="nuevo@email.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nuevo Password</Label>
                    <Input
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="nueva contraseña"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" size="sm" className="flex-1" onClick={handleRotar}>
                    Confirmar Cambio
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowRotar(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Historial de Credenciales */}
            {historial.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  Historial de Credenciales ({historial.length})
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {historial.map((entry, i) => (
                    <CredencialHistorialRow key={i} entry={entry} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CredencialHistorialRow({ entry, index }: { entry: Panel['historialCredenciales'][0]; index: number }) {
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success('Copiado');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="rounded-md border border-border bg-muted/30 p-2 text-xs space-y-1">
      <div className="flex items-center justify-between">
        <Badge variant="destructive" className="text-[9px] px-1.5 py-0">CAÍDO</Badge>
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(entry.fechaInicio), 'dd/MM/yyyy')} — {format(new Date(entry.fechaFin), 'dd/MM/yyyy')}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Email:</span>
        <span className="font-mono truncate">{entry.email}</span>
        <button onClick={() => copy(entry.email, `he-${index}`)} className="text-muted-foreground hover:text-foreground shrink-0">
          {copied === `he-${index}` ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Pass:</span>
        <span className="font-mono">{showPw ? entry.password : '••••••'}</span>
        <button onClick={() => setShowPw(!showPw)} className="text-muted-foreground hover:text-foreground shrink-0">
          {showPw ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
        </button>
        <button onClick={() => copy(entry.password, `hp-${index}`)} className="text-muted-foreground hover:text-foreground shrink-0">
          {copied === `hp-${index}` ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
        </button>
      </div>
    </div>
  );
}
