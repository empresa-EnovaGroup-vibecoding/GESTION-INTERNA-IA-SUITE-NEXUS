import { useState } from 'react';
import { Panel } from '@/types';
import { useData } from '@/contexts/DataContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Edit2, Trash2, Eye, EyeOff, Copy, Check, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import PanelHistorial from './PanelHistorial';

const SERVICE_COLORS: Record<string, string> = {
  'ChatGPT': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  'CapCut': 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  'Canva': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  'Veo 3': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'Claude': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  'Midjourney': 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
};

function getServiceColor(service: string) {
  for (const [key, value] of Object.entries(SERVICE_COLORS)) {
    if (service.toLowerCase().includes(key.toLowerCase())) return value;
  }
  return 'bg-secondary text-secondary-foreground';
}

interface PanelCardProps {
  panel: Panel;
  onEdit: (panel: Panel) => void;
  onMarkCaido: (panel: Panel) => void;
}

export default function PanelCard({ panel, onEdit, onMarkCaido }: PanelCardProps) {
  const { getPanelById } = useData();
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);
  const [showHistorial, setShowHistorial] = useState(false);

  const isCaido = panel.estado === 'caido';
  const cuposDisponibles = panel.capacidadTotal - panel.cuposUsados;
  const porcentajeUso = (panel.cuposUsados / panel.capacidadTotal) * 100;
  const reemplazo = panel.reemplazadoPorId ? getPanelById(panel.reemplazadoPorId) : null;

  const copyToClipboard = (text: string, field: 'email' | 'password') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field === 'email' ? 'Email' : 'Password'} copiado`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className={`stat-card space-y-3 ${isCaido ? 'opacity-60 border-destructive/30' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold">{panel.nombre}</h3>
          {panel.proveedor && (
            <p className="text-[11px] text-muted-foreground">Proveedor: {panel.proveedor}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Badge className={`text-[10px] px-2 py-0.5 ${getServiceColor(panel.servicioAsociado)}`}>
            {panel.servicioAsociado}
          </Badge>
          <Badge
            variant={isCaido ? 'destructive' : 'default'}
            className={`text-[10px] px-2 py-0.5 ${!isCaido ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-transparent' : ''}`}
          >
            {isCaido ? 'CAÍDO' : 'ACTIVO'}
          </Badge>
        </div>
      </div>

      {/* Reemplazo link */}
      {isCaido && reemplazo && (
        <p className="text-xs text-muted-foreground">
          Reemplazado por: <span className="font-medium text-foreground">{reemplazo.nombre}</span>
        </p>
      )}

      {/* Email */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground shrink-0">Email:</span>
        <span className="font-mono truncate">{panel.email}</span>
        <button
          onClick={() => copyToClipboard(panel.email, 'email')}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          {copiedField === 'email' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>

      {/* Password */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground shrink-0">Password:</span>
        <span className="font-mono">{showPassword ? panel.password : '••••••••'}</span>
        <button onClick={() => setShowPassword(!showPassword)} className="shrink-0 text-muted-foreground hover:text-foreground">
          {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </button>
        <button
          onClick={() => copyToClipboard(panel.password, 'password')}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          {copiedField === 'password' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>

      {/* Capacidad */}
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

      {/* Fechas */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Compra: {format(new Date(panel.fechaCompra), 'dd MMM yyyy', { locale: es })}</span>
        <span>Exp: {format(new Date(panel.fechaExpiracion), 'dd MMM yyyy', { locale: es })}</span>
      </div>

      {/* Historial toggle */}
      {panel.historial && panel.historial.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistorial(!showHistorial)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showHistorial ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Historial ({panel.historial.length})
          </button>
          {showHistorial && <PanelHistorial historial={panel.historial} />}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1 border-t border-border">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onEdit(panel)}>
          <Edit2 className="h-3 w-3" /> Editar
        </Button>
        {!isCaido && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
            onClick={() => onMarkCaido(panel)}
          >
            <AlertTriangle className="h-3 w-3" /> Marcar Caído
          </Button>
        )}
      </div>
    </div>
  );
}

export { getServiceColor };
