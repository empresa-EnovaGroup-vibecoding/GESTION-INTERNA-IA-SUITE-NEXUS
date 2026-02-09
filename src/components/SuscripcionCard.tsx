import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Suscripcion, EstadoSuscripcion, PaisCliente } from '@/types';
import { format, addDays, differenceInDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Copy, Check, RefreshCw, XCircle, Trash2, Mail, Lock, Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PAIS_MONEDA_SYMBOL: Record<string, string> = {
  Venezuela: '$',
  Ecuador: '$',
  Colombia: 'COP$',
  Mexico: 'MXN$',
};

function getMonedaSymbol(pais?: PaisCliente): string {
  return pais ? (PAIS_MONEDA_SYMBOL[pais] || '$') : '$';
}

interface Props {
  sub: Suscripcion;
  onRenovar: (sub: Suscripcion) => void;
  onCancelar: (sub: Suscripcion) => void;
  onDelete: (id: string) => void;
}

export default function SuscripcionCard({ sub, onRenovar, onCancelar, onDelete }: Props) {
  const { servicios, paneles, clientes, getCuposDisponibles, getServicioById, getPanelById, updateSuscripcion } = useData();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    servicioId: sub.servicioId,
    panelId: sub.panelId || '',
    precioCobrado: String(sub.precioCobrado),
    fechaInicio: sub.fechaInicio,
    fechaVencimiento: sub.fechaVencimiento,
    credencialEmail: sub.credencialEmail || '',
    credencialPassword: sub.credencialPassword || '',
  });

  const cliente = clientes.find(c => c.id === sub.clienteId);
  const monedaSymbol = getMonedaSymbol(cliente?.pais);

  const servicio = getServicioById(sub.servicioId);
  const panel = sub.panelId ? getPanelById(sub.panelId) : undefined;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getProgress = () => {
    const inicio = startOfDay(new Date(sub.fechaInicio));
    const vencimiento = startOfDay(new Date(sub.fechaVencimiento));
    const hoy = startOfDay(new Date());
    const totalDias = differenceInDays(vencimiento, inicio);
    const diasTranscurridos = differenceInDays(hoy, inicio);
    if (totalDias <= 0) return 100;
    return Math.max(0, Math.min(100, (diasTranscurridos / totalDias) * 100));
  };

  const getDiasRestantes = () => {
    const vencimiento = startOfDay(new Date(sub.fechaVencimiento));
    const hoy = startOfDay(new Date());
    return differenceInDays(vencimiento, hoy);
  };

  const getProgressColor = (dias: number, estado: EstadoSuscripcion) => {
    if (estado === 'cancelada') return 'bg-muted-foreground';
    if (dias <= 0) return 'bg-destructive';
    if (dias <= 5) return 'bg-warning';
    return 'bg-success';
  };

  const diasRestantes = getDiasRestantes();
  const progress = getProgress();
  const progressColor = getProgressColor(diasRestantes, sub.estado);

  const handleStartEdit = () => {
    setEditForm({
      servicioId: sub.servicioId,
      panelId: sub.panelId || '',
      precioCobrado: String(sub.precioCobrado),
      fechaInicio: sub.fechaInicio,
      fechaVencimiento: sub.fechaVencimiento,
      credencialEmail: sub.credencialEmail || '',
      credencialPassword: sub.credencialPassword || '',
    });
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  const handleSaveEdit = () => {
    updateSuscripcion({
      ...sub,
      servicioId: editForm.servicioId,
      panelId: editForm.panelId || undefined,
      precioCobrado: parseFloat(editForm.precioCobrado) || 0,
      fechaInicio: editForm.fechaInicio,
      fechaVencimiento: editForm.fechaVencimiento,
      credencialEmail: editForm.credencialEmail || undefined,
      credencialPassword: editForm.credencialPassword || undefined,
    });
    setEditing(false);
    toast.success('Suscripción actualizada');
  };

  if (editing) {
    return (
      <div className="rounded-lg border-2 border-primary/30 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-semibold text-primary">Editando suscripción</h5>
          <div className="flex gap-1">
            <Button type="button" variant="default" size="sm" className="h-7 gap-1 text-xs" onClick={handleSaveEdit}>
              <Save className="h-3 w-3" />
              Guardar
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleCancelEdit}>
              <X className="h-3 w-3" />
              Cancelar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Servicio</Label>
            <Select value={editForm.servicioId} onValueChange={v => setEditForm(f => ({ ...f, servicioId: v }))}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {servicios.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Panel</Label>
            <Select value={editForm.panelId || '_none'} onValueChange={v => setEditForm(f => ({ ...f, panelId: v === '_none' ? '' : v }))}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Sin panel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sin panel (credencial directa)</SelectItem>
                {paneles.map(p => {
                  const disponibles = getCuposDisponibles(p.id) + (p.id === sub.panelId ? 1 : 0);
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
            <Label className="text-xs">Precio Cobrado ({monedaSymbol})</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              className="h-8 text-xs"
              value={editForm.precioCobrado}
              onChange={e => setEditForm(f => ({ ...f, precioCobrado: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha Inicio</Label>
            <Input
              type="date"
              className="h-8 text-xs"
              value={editForm.fechaInicio}
              onChange={e => setEditForm(f => ({ ...f, fechaInicio: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha Vencimiento</Label>
            <Input
              type="date"
              className="h-8 text-xs"
              value={editForm.fechaVencimiento}
              onChange={e => setEditForm(f => ({ ...f, fechaVencimiento: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email Credencial</Label>
            <Input
              type="email"
              className="h-8 text-xs"
              value={editForm.credencialEmail}
              onChange={e => setEditForm(f => ({ ...f, credencialEmail: e.target.value }))}
              placeholder="usuario@ejemplo.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Password</Label>
            <Input
              type="text"
              className="h-8 text-xs"
              value={editForm.credencialPassword}
              onChange={e => setEditForm(f => ({ ...f, credencialPassword: e.target.value }))}
              placeholder="••••••"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{servicio?.nombre || 'Servicio eliminado'}</span>
            <span className={
              sub.estado === 'activa'
                ? diasRestantes <= 0 ? 'alert-badge bg-destructive/10 text-destructive text-[10px]'
                  : diasRestantes <= 5 ? 'alert-badge bg-warning/10 text-warning text-[10px]'
                  : 'alert-badge bg-success/10 text-success text-[10px]'
                : sub.estado === 'vencida' ? 'alert-badge bg-destructive/10 text-destructive text-[10px]'
                : 'alert-badge bg-muted text-muted-foreground text-[10px]'
            }>
              {sub.estado === 'cancelada' ? 'Cancelada' : diasRestantes <= 0 ? 'Vencido' : diasRestantes <= 5 ? 'Por vencer' : 'Al día'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {panel?.nombre || 'Credencial directa'} · {monedaSymbol}{sub.precioCobrado.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-primary hover:text-primary"
            onClick={handleStartEdit}
          >
            <Pencil className="h-3 w-3" />
            Editar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-primary hover:text-primary"
            onClick={() => onRenovar(sub)}
          >
            <RefreshCw className="h-3 w-3" />
            Renovar
          </Button>
          {sub.estado !== 'cancelada' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
              onClick={() => onCancelar(sub)}
            >
              <XCircle className="h-3 w-3" />
              Cancelar
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(sub.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{format(new Date(sub.fechaInicio), 'dd MMM yyyy', { locale: es })}</span>
          <span>
            {diasRestantes > 0
              ? `${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}`
              : diasRestantes === 0 ? 'Vence hoy'
              : `Venció hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) !== 1 ? 's' : ''}`
            }
          </span>
          <span>{format(new Date(sub.fechaVencimiento), 'dd MMM yyyy', { locale: es })}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progressColor}`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      {/* Credentials */}
      {(sub.credencialEmail || sub.credencialPassword) && (
        <div className="flex items-center gap-3 rounded-md bg-muted/50 p-2.5 text-xs">
          {sub.credencialEmail && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{sub.credencialEmail}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(sub.credencialEmail!, `email-${sub.id}`)}
                className="rounded p-0.5 hover:bg-muted"
              >
                {copiedField === `email-${sub.id}` ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </div>
          )}
          {sub.credencialPassword && (
            <div className="flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-muted-foreground" />
              <span className="font-mono text-muted-foreground">{sub.credencialPassword}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(sub.credencialPassword!, `pass-${sub.id}`)}
                className="rounded p-0.5 hover:bg-muted"
              >
                {copiedField === `pass-${sub.id}` ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {sub.notas && (
        <p className="text-[11px] text-muted-foreground italic">📝 {sub.notas}</p>
      )}
    </div>
  );
}
