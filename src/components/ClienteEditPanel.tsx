import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Suscripcion, PaisCliente } from '@/types';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import ServicioFormInline, { PendingSuscripcion } from './ServicioFormInline';
import SuscripcionCard from './SuscripcionCard';
import ClienteHistorial from './ClienteHistorial';

const PAISES: PaisCliente[] = ['Venezuela', 'Ecuador', 'Colombia', 'Mexico'];

interface Props {
  clienteId: string;
  nombre: string;
  whatsapp: string;
  pais: PaisCliente | '';
  onNombreChange: (v: string) => void;
  onWhatsappChange: (v: string) => void;
  onPaisChange: (v: PaisCliente | '') => void;
}

export default function ClienteEditPanel({ clienteId, nombre, whatsapp, pais, onNombreChange, onWhatsappChange, onPaisChange }: Props) {
  const {
    getSuscripcionesByCliente, addSuscripcion, updateSuscripcion, deleteSuscripcion,
  } = useData();
  const suscripciones = getSuscripcionesByCliente(clienteId);
  const [pendingSubs, setPendingSubs] = useState<PendingSuscripcion[]>([]);

  const handleRenovar = (sub: Suscripcion) => {
    const newFechaInicio = format(new Date(), 'yyyy-MM-dd');
    const newFechaVencimiento = format(addDays(new Date(), 30), 'yyyy-MM-dd');
    updateSuscripcion({
      ...sub,
      fechaInicio: newFechaInicio,
      fechaVencimiento: newFechaVencimiento,
      estado: 'activa',
    });
    toast.success('Suscripción renovada +30 días');
  };

  const handleCancelar = (sub: Suscripcion) => {
    updateSuscripcion({ ...sub, estado: 'cancelada' });
    toast.success('Suscripción cancelada');
  };

  const handleAddPending = (item: PendingSuscripcion) => {
    setPendingSubs(prev => [...prev, item]);
  };

  const handleRemovePending = (tempId: string) => {
    setPendingSubs(prev => prev.filter(i => i._tempId !== tempId));
  };

  const handleSavePending = () => {
    for (const item of pendingSubs) {
      addSuscripcion({
        clienteId,
        servicioId: item.servicioId,
        panelId: item.panelId,
        fechaInicio: item.fechaInicio,
        precioCobrado: item.precioCobrado,
        credencialEmail: item.credencialEmail,
        credencialPassword: item.credencialPassword,
        notas: item.notas,
      });
    }
    setPendingSubs([]);
    toast.success(`${pendingSubs.length} servicio(s) agregado(s)`);
  };

  return (
    <div className="space-y-5">
      {/* Client data */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Nombre</Label>
          <Input value={nombre} onChange={e => onNombreChange(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">WhatsApp</Label>
          <Input value={whatsapp} onChange={e => onWhatsappChange(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">País</Label>
          <Select value={pais} onValueChange={v => onPaisChange(v as PaisCliente)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {PAISES.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Existing subscriptions */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Suscripciones Activas ({suscripciones.length})</h4>

        {suscripciones.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Sin suscripciones</p>
        ) : (
          <div className="space-y-3">
            {suscripciones.map(sub => (
              <SuscripcionCard
                key={sub.id}
                sub={sub}
                onRenovar={handleRenovar}
                onCancelar={handleCancelar}
                onDelete={deleteSuscripcion}
              />
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Add new services */}
      <ServicioFormInline
        items={pendingSubs}
        onAdd={handleAddPending}
        onRemove={handleRemovePending}
        paisCliente={pais}
      />

      {pendingSubs.length > 0 && (
        <Button
          type="button"
          size="sm"
          className="w-full"
          onClick={handleSavePending}
        >
          Guardar {pendingSubs.length} servicio(s) nuevo(s)
        </Button>
      )}

      <Separator />

      {/* Activity history */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Historial de Actividad
        </h4>
        <ClienteHistorial clienteId={clienteId} />
      </div>
    </div>
  );
}
