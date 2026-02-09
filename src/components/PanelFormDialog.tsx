import { useState, useEffect } from 'react';
import { Panel, CredencialHistorial } from '@/types';
import { useData } from '@/contexts/DataContext';
import { format } from 'date-fns';
import { AlertTriangle, Eye, EyeOff, Copy, Check, History, Info, Trash2 } from 'lucide-react';
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  costoMensual: 0,
};

export default function PanelFormDialog({ open, onOpenChange, editing }: Props) {
  const { addPanel, updatePanel } = useData();
  const [form, setForm] = useState(emptyForm);
  const [caidaReportada, setCaidaReportada] = useState(false);
  const [historialLocal, setHistorialLocal] = useState<CredencialHistorial[]>([]);

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
        costoMensual: editing.costoMensual ?? 0,
      });
      setHistorialLocal(editing.historialCredenciales || []);
    } else {
      setForm(emptyForm);
      setHistorialLocal([]);
    }
    setCaidaReportada(false);
  }, [editing, open]);

  const handleReportarCaida = () => {
    if (!form.email && !form.password) {
      toast.error('No hay credenciales actuales para archivar');
      return;
    }
    // Archive current credentials to local history
    const archivedEntry: CredencialHistorial = {
      email: form.email,
      password: form.password,
      fechaInicio: editing?.credencialFechaInicio || format(new Date(), 'yyyy-MM-dd'),
      fechaFin: format(new Date(), 'yyyy-MM-dd'),
      motivo: 'Caído - reemplazado',
    };
    setHistorialLocal(prev => [archivedEntry, ...prev]);
    // Clear email/password fields
    setForm(f => ({ ...f, email: '', password: '' }));
    setCaidaReportada(true);
    toast.info('Credenciales archivadas. Ingresa las nuevas credenciales.');
  };

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
        costoMensual: form.costoMensual,
        credencialFechaInicio: caidaReportada ? format(new Date(), 'yyyy-MM-dd') : editing.credencialFechaInicio,
        historialCredenciales: historialLocal,
      });
      if (caidaReportada) {
        toast.success('Credenciales actualizadas correctamente');
      }
    } else {
      addPanel({
        ...form,
        estado: 'activo',
        costoMensual: form.costoMensual,
        credencialFechaInicio: format(new Date(), 'yyyy-MM-dd'),
      });
    }
    onOpenChange(false);
    setForm(emptyForm);
    setCaidaReportada(false);
  };

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

          {/* Credential fields with caída message */}
          {caidaReportada && (
            <div className="flex items-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 p-2.5 text-sm text-blue-700 dark:text-blue-300">
              <Info className="h-4 w-4 shrink-0" />
              Ingresa las nuevas credenciales del proveedor
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder={caidaReportada ? 'nuevo@email.com' : ''} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder={caidaReportada ? 'nueva contraseña' : ''} />
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
              <Label>Proveedor (opcional)</Label>
              <Input value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} placeholder="De dónde lo compraste" />
            </div>
            <div className="space-y-2">
              <Label>Costo Mensual ($)</Label>
              <Input type="number" min={0} step="0.01" value={form.costoMensual} onChange={e => setForm(f => ({ ...f, costoMensual: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
            </div>
          </div>

          <Button type="submit" className="w-full">
            {editing ? 'Guardar Cambios' : 'Crear Panel'}
          </Button>
        </form>

        {/* Reportar Caída button - only in edit mode, only if not already reported */}
        {editing && !caidaReportada && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-full gap-2"
              onClick={handleReportarCaida}
            >
              <AlertTriangle className="h-4 w-4" />
              Reportar Caída / Cambiar Credenciales
            </Button>
          </div>
        )}

        {/* Historial de Credenciales - read only */}
        {editing && historialLocal.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              Historial de Credenciales ({historialLocal.length})
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {historialLocal.map((entry, i) => (
                <CredencialHistorialRow
                  key={i}
                  entry={entry}
                  index={i}
                  onDelete={() => setHistorialLocal(prev => prev.filter((_, idx) => idx !== i))}
                />
              ))}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpiar todo el historial
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminarán todas las credenciales anteriores del historial.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { setHistorialLocal([]); toast.success('Historial limpiado'); }}>
                    Eliminar todo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CredencialHistorialRow({ entry, index, onDelete }: { entry: CredencialHistorial; index: number; onDelete: () => void }) {
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
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(entry.fechaInicio), 'dd/MM/yyyy')} — {format(new Date(entry.fechaFin), 'dd/MM/yyyy')}
          </span>
          <button type="button" onClick={onDelete} className="text-muted-foreground hover:text-destructive shrink-0" title="Eliminar">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Email:</span>
        <span className="font-mono truncate">{entry.email}</span>
        <button type="button" onClick={() => copy(entry.email, `he-${index}`)} className="text-muted-foreground hover:text-foreground shrink-0">
          {copied === `he-${index}` ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Pass:</span>
        <span className="font-mono">{showPw ? entry.password : '••••••'}</span>
        <button type="button" onClick={() => setShowPw(!showPw)} className="text-muted-foreground hover:text-foreground shrink-0">
          {showPw ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
        </button>
        <button type="button" onClick={() => copy(entry.password, `hp-${index}`)} className="text-muted-foreground hover:text-foreground shrink-0">
          {copied === `hp-${index}` ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
        </button>
      </div>
    </div>
  );
}
