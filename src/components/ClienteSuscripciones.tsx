import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { format, isBefore, isToday, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const SERVICIOS_PREDEFINIDOS = ['ChatGPT', 'Canva', 'CapCut', 'Claude', 'Midjourney', 'Gemini', 'Copilot', 'Otro'];

interface Props {
  clienteId: string;
}

export default function ClienteSuscripciones({ clienteId }: Props) {
  const { getSuscripcionesByCliente, addSuscripcion, deleteSuscripcion, paneles, getCuposDisponibles, getPanelById } = useData();
  const suscripciones = getSuscripcionesByCliente(clienteId);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    panelId: '',
    servicio: '',
    servicioCustom: '',
    fechaInicio: format(new Date(), 'yyyy-MM-dd'),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const servicio = form.servicio === 'Otro' ? form.servicioCustom : form.servicio;
    if (!servicio || !form.panelId) return;
    addSuscripcion({
      clienteId,
      panelId: form.panelId,
      servicio,
      fechaInicio: form.fechaInicio,
    });
    setForm({ panelId: '', servicio: '', servicioCustom: '', fechaInicio: format(new Date(), 'yyyy-MM-dd') });
    setShowAdd(false);
  };

  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Servicios Activos</h4>
        <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3 w-3" />
          Agregar
        </Button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Servicio</Label>
              <Select value={form.servicio} onValueChange={(v) => setForm(f => ({ ...f, servicio: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICIOS_PREDEFINIDOS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Panel</Label>
              <Select value={form.panelId} onValueChange={(v) => setForm(f => ({ ...f, panelId: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {paneles.map(p => {
                    const disponibles = getCuposDisponibles(p.id);
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
          {form.servicio === 'Otro' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre del servicio</Label>
              <Input
                className="h-8 text-xs"
                value={form.servicioCustom}
                onChange={(e) => setForm(f => ({ ...f, servicioCustom: e.target.value }))}
                placeholder="Nombre personalizado"
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha de Inicio</Label>
            <Input
              type="date"
              className="h-8 text-xs"
              value={form.fechaInicio}
              onChange={(e) => setForm(f => ({ ...f, fechaInicio: e.target.value }))}
              required
            />
          </div>
          <Button type="submit" size="sm" className="w-full text-xs" disabled={!form.panelId || !form.servicio}>
            Agregar Servicio
          </Button>
        </form>
      )}

      {suscripciones.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Sin servicios asignados</p>
      ) : (
        <div className="space-y-2">
          {suscripciones.map(sub => {
            const panel = getPanelById(sub.panelId);
            const vencido = isBefore(startOfDay(new Date(sub.fechaVencimiento)), startOfDay(new Date()));
            const hoy = isToday(new Date(sub.fechaVencimiento));
            return (
              <div key={sub.id} className="flex items-center justify-between rounded-md border border-border bg-card p-2.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{sub.servicio}</span>
                    <span className={
                      vencido ? 'alert-badge bg-destructive/10 text-destructive text-[10px]' :
                      hoy ? 'alert-badge bg-warning/10 text-warning text-[10px]' :
                      'alert-badge bg-success/10 text-success text-[10px]'
                    }>
                      {vencido ? 'Vencido' : hoy ? 'Hoy' : 'Activo'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {panel?.nombre || '—'} · {format(new Date(sub.fechaInicio), 'dd MMM', { locale: es })} → {format(new Date(sub.fechaVencimiento), 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
                <button
                  onClick={() => deleteSuscripcion(sub.id)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
