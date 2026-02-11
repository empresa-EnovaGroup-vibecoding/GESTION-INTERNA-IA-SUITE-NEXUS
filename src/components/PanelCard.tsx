import { useState } from 'react';
import { Panel, Cliente, Suscripcion } from '@/types';
import { format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Edit2, Eye, EyeOff, Copy, Check, ChevronDown, ChevronUp,
  History, RefreshCw, Users, MessageCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

interface ClienteEnPanel {
  cliente: Cliente;
  suscripcion: Suscripcion;
}

interface PanelCardProps {
  panel: Panel;
  clientesAsignados?: ClienteEnPanel[];
  searchQuery?: string;
  onEdit: (panel: Panel) => void;
  onRenovar?: (panel: Panel) => void;
}

export default function PanelCard({ panel, clientesAsignados = [], searchQuery = '', onEdit, onRenovar }: PanelCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showClientes, setShowClientes] = useState(false);

  const cuposDisponibles = panel.capacidadTotal - panel.cuposUsados;
  const porcentajeUso = (panel.cuposUsados / panel.capacidadTotal) * 100;
  const historial = panel.historialCredenciales || [];

  // Expiration status
  const diasRestantes = panel.fechaExpiracion
    ? differenceInDays(parseISO(panel.fechaExpiracion), new Date())
    : null;
  const estaVencido = diasRestantes !== null && diasRestantes < 0;
  const porVencer = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 15;

  // Check if search matches a client (to auto-expand)
  const q = searchQuery.toLowerCase();
  const clienteMatchIndex = q ? clientesAsignados.findIndex(cep =>
    cep.cliente.nombre.toLowerCase().includes(q)
    || cep.cliente.whatsapp.includes(q)
    || (cep.suscripcion.credencialEmail || '').toLowerCase().includes(q)
  ) : -1;
  const hasClientMatch = clienteMatchIndex >= 0;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRenovar = () => {
    if (onRenovar) {
      onRenovar(panel);
      toast.success(panel.nombre + ' renovado +30 dias');
    }
  };

  const getWhatsAppCaidaUrl = (cliente: Cliente) => {
    const numero = cliente.whatsapp.replace(/\D/g, '');
    const mensaje = 'Hola ' + cliente.nombre + '! Te informo que estamos teniendo un problema tecnico con ' + (panel.servicioAsociado || 'el servicio') + '. Estamos trabajando para resolverlo lo antes posible. Disculpa las molestias!';
    return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(mensaje);
  };

  return (
    <div className={
      'stat-card space-y-3 relative'
      + (estaVencido ? ' opacity-60 ring-1 ring-destructive/40' : '')
      + (porVencer ? ' ring-2 ring-destructive/50' : '')
      + (hasClientMatch ? ' ring-2 ring-primary/60' : '')
    }>
      {/* Expiration banner */}
      {estaVencido && (
        <div className="absolute top-0 left-0 right-0 bg-destructive text-destructive-foreground text-center text-[11px] font-bold py-1 rounded-t-lg -mt-px -mx-px">
          VENCIDO hace {Math.abs(diasRestantes!)} dia{Math.abs(diasRestantes!) !== 1 ? 's' : ''}
        </div>
      )}
      {porVencer && !estaVencido && (
        <div className="absolute top-0 left-0 right-0 bg-warning text-warning-foreground text-center text-[11px] font-bold py-1 rounded-t-lg -mt-px -mx-px">
          Vence en {diasRestantes} dia{diasRestantes !== 1 ? 's' : ''}
        </div>
      )}

      {/* Header */}
      <div className={'flex items-start justify-between' + (estaVencido || porVencer ? ' mt-5' : '')}>
        <div className="space-y-1">
          <h3 className="font-semibold">{panel.nombre}</h3>
          {panel.proveedor && (
            <p className="text-[11px] text-muted-foreground">Proveedor: {panel.proveedor}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {panel.servicioAsociado && (
            <Badge className={'text-[10px] px-2 py-0.5 ' + getServiceColor(panel.servicioAsociado)}>
              {panel.servicioAsociado}
            </Badge>
          )}
          <Badge
            variant="default"
            className={'text-[10px] px-2 py-0.5 border-transparent ' + (estaVencido ? 'bg-destructive/20 text-destructive' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300')}
          >
            {estaVencido ? 'VENCIDO' : 'ACTIVO'}
          </Badge>
        </div>
      </div>

      {/* Credenciales actuales */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Credenciales actuales
          {panel.credencialFechaInicio && (
            <span className="normal-case tracking-normal ml-1">
              (desde {format(new Date(panel.credencialFechaInicio), 'dd MMM yyyy', { locale: es })})
            </span>
          )}
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground shrink-0">Email:</span>
          <span className="font-mono truncate">{panel.email}</span>
          <button onClick={() => copyToClipboard(panel.email, 'email')} className="shrink-0 text-muted-foreground hover:text-foreground">
            {copiedField === 'email' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground shrink-0">Password:</span>
          <span className="font-mono">{showPassword ? panel.password : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}</span>
          <button onClick={() => setShowPassword(!showPassword)} className="shrink-0 text-muted-foreground hover:text-foreground">
            {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
          <button onClick={() => copyToClipboard(panel.password, 'password')} className="shrink-0 text-muted-foreground hover:text-foreground">
            {copiedField === 'password' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Capacidad */}
      <div>
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-muted-foreground">Cupos</span>
          <span className="font-medium">{panel.cuposUsados}/{panel.capacidadTotal}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className={'h-full rounded-full transition-all ' + (
              porcentajeUso >= 90 ? 'bg-destructive' : porcentajeUso >= 70 ? 'bg-warning' : 'bg-primary'
            )}
            style={{ width: Math.min(porcentajeUso, 100) + '%' }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {cuposDisponibles} disponible{cuposDisponibles !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Fechas */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>Compra: {format(new Date(panel.fechaCompra), 'dd MMM yyyy', { locale: es })}</span>
        <span className={estaVencido ? 'text-destructive font-medium' : porVencer ? 'text-warning font-medium' : ''}>
          Exp: {format(new Date(panel.fechaExpiracion), 'dd MMM yyyy', { locale: es })}
        </span>
      </div>

      {/* Clientes Asignados */}
      {clientesAsignados.length > 0 && (
        <div>
          <button
            onClick={() => setShowClientes(!showClientes)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Users className="h-3 w-3" />
            {showClientes || hasClientMatch ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Clientes asignados ({clientesAsignados.length})
          </button>
          {(showClientes || hasClientMatch) && (
            <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-primary/30">
              {clientesAsignados.map((cep) => {
                const isMatch = q && (
                  cep.cliente.nombre.toLowerCase().includes(q)
                  || cep.cliente.whatsapp.includes(q)
                  || (cep.suscripcion.credencialEmail || '').toLowerCase().includes(q)
                );
                return (
                  <div key={cep.suscripcion.id} className={'flex items-center justify-between text-[11px] py-1 px-1.5 rounded' + (isMatch ? ' bg-primary/10 ring-1 ring-primary/30' : '')}>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{cep.cliente.nombre}</p>
                      {cep.suscripcion.credencialEmail && (
                        <p className="text-muted-foreground truncate font-mono text-[10px]">{cep.suscripcion.credencialEmail}</p>
                      )}
                    </div>
                    <a
                      href={getWhatsAppCaidaUrl(cep.cliente)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 ml-1 inline-flex items-center justify-center rounded-md h-6 w-6 text-success hover:bg-success/10 transition-colors"
                      title={'WhatsApp a ' + cep.cliente.nombre}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Historial de Credenciales */}
      {historial.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistorial(!showHistorial)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="h-3 w-3" />
            {showHistorial ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Historial de Credenciales ({historial.length})
          </button>
          {showHistorial && (
            <div className="mt-2 space-y-2 pl-2 border-l-2 border-border">
              {historial.map((entry, i) => (
                <CredencialHistorialEntry key={i} entry={entry} index={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1 border-t border-border">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onEdit(panel)}>
          <Edit2 className="h-3 w-3" /> Editar
        </Button>
        {(porVencer || estaVencido) && onRenovar && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary hover:text-primary" onClick={handleRenovar}>
            <RefreshCw className="h-3 w-3" /> Renovar +30d
          </Button>
        )}
      </div>
    </div>
  );
}

function CredencialHistorialEntry({ entry, index }: { entry: Panel['historialCredenciales'][0]; index: number }) {
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success('Copiado');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="text-[11px] text-muted-foreground space-y-0.5 py-1">
      <div className="flex items-center gap-1">
        <Badge variant="destructive" className="text-[9px] px-1.5 py-0">CAIDO</Badge>
        <span>
          {format(new Date(entry.fechaInicio), 'dd/MM/yyyy', { locale: es })} {'\u2014'} {format(new Date(entry.fechaFin), 'dd/MM/yyyy', { locale: es })}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-foreground">{entry.email}</span>
        <button onClick={() => copy(entry.email, 'email-' + index)} className="text-muted-foreground hover:text-foreground">
          {copied === 'email-' + index ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-foreground">{showPw ? entry.password : '\u2022\u2022\u2022\u2022\u2022\u2022'}</span>
        <button onClick={() => setShowPw(!showPw)} className="text-muted-foreground hover:text-foreground">
          {showPw ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
        </button>
        <button onClick={() => copy(entry.password, 'pw-' + index)} className="text-muted-foreground hover:text-foreground">
          {copied === 'pw-' + index ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
        </button>
      </div>
    </div>
  );
}

export { getServiceColor };
