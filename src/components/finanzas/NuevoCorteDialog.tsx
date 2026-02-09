import { useState, useMemo, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function NuevoCorteDialog() {
  const { pagos, clientes, addCorte } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    pais: '' as 'Mexico' | 'Colombia' | '',
    totalRecaudado: '',
    comisionPorcentaje: '5',
    tasaBinance: '',
    usdtRecibidoReal: '',
    notas: '',
  });

  const moneda = form.pais === 'Mexico' ? 'MXN' : form.pais === 'Colombia' ? 'COP' : '';

  // Find eligible unlinked payments for this country/week
  const pagosElegibles = useMemo(() => {
    if (!form.pais || !form.fecha) return [];
    const corteDate = new Date(form.fecha);
    const weekStart = startOfWeek(corteDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(corteDate, { weekStartsOn: 1 });
    const monedaTarget = form.pais === 'Mexico' ? 'MXN' : 'COP';

    return pagos.filter(p => {
      if (p.corteId) return false;
      if (p.moneda !== monedaTarget) return false;
      const pagoDate = new Date(p.fecha);
      if (!isWithinInterval(pagoDate, { start: weekStart, end: weekEnd })) return false;
      const cliente = clientes.find(c => c.id === p.clienteId);
      return cliente?.pais === form.pais;
    });
  }, [form.pais, form.fecha, pagos, clientes]);

  // Auto-fill total when eligible payments change
  useEffect(() => {
    const total = pagosElegibles.reduce((sum, p) => sum + (p.montoOriginal || 0), 0);
    setForm(f => ({ ...f, totalRecaudado: total > 0 ? total.toString() : '' }));
  }, [pagosElegibles]);

  const totalRecaudado = parseFloat(form.totalRecaudado) || 0;
  const comision = parseFloat(form.comisionPorcentaje) || 0;
  const totalDespuesComision = Math.round(totalRecaudado * (1 - comision / 100) * 100) / 100;
  const tasaBinance = parseFloat(form.tasaBinance) || 0;
  const usdtCalculado = tasaBinance > 0 ? Math.round((totalDespuesComision / tasaBinance) * 100) / 100 : 0;

  const getClienteNombre = (id: string) => clientes.find(c => c.id === id)?.nombre || 'Desconocido';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pais || !form.tasaBinance || !form.usdtRecibidoReal) return;

    addCorte({
      fecha: form.fecha,
      pais: form.pais as 'Mexico' | 'Colombia',
      moneda: moneda as 'MXN' | 'COP',
      totalRecaudado,
      comisionPorcentaje: comision,
      totalDespuesComision,
      tasaBinance,
      usdtCalculado,
      usdtRecibidoReal: parseFloat(form.usdtRecibidoReal) || 0,
      notas: form.notas || undefined,
    });

    toast.success(`Corte registrado: ${form.usdtRecibidoReal} USDT recibidos`);
    setOpen(false);
    setForm({
      fecha: format(new Date(), 'yyyy-MM-dd'),
      pais: '',
      totalRecaudado: '',
      comisionPorcentaje: '5',
      tasaBinance: '',
      usdtRecibidoReal: '',
      notas: '',
    });
  };

  const weekLabel = form.fecha
    ? `${format(startOfWeek(new Date(form.fecha), { weekStartsOn: 1 }), 'dd MMM', { locale: es })} – ${format(endOfWeek(new Date(form.fecha), { weekStartsOn: 1 }), 'dd MMM', { locale: es })}`
    : '';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Scissors className="h-4 w-4" />
          Nuevo Corte
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Corte P2P</DialogTitle>
          <p className="text-xs text-muted-foreground">Convertir pagos en moneda local a USDT vía Binance P2P</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fecha + País */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fecha del corte</Label>
              <Input
                type="date"
                value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                required
              />
              {weekLabel && (
                <p className="text-[10px] text-muted-foreground">Semana: {weekLabel}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>País</Label>
              <Select value={form.pais} onValueChange={v => setForm(f => ({ ...f, pais: v as 'Mexico' | 'Colombia' }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mexico">🇲🇽 México</SelectItem>
                  <SelectItem value="Colombia">🇨🇴 Colombia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Eligible payments preview */}
          {form.pais && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium mb-1.5">
                Pagos sin corte esta semana ({moneda})
              </p>
              {pagosElegibles.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay pagos pendientes de corte</p>
              ) : (
                <div className="space-y-1">
                  {pagosElegibles.map(p => (
                    <div key={p.id} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{getClienteNombre(p.clienteId)}</span>
                      <span className="font-medium">
                        {(p.montoOriginal || 0).toLocaleString()} {moneda}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-1 mt-1 flex justify-between text-xs font-semibold">
                    <span>Total auto-calculado</span>
                    <span>
                      {pagosElegibles.reduce((s, p) => s + (p.montoOriginal || 0), 0).toLocaleString()} {moneda}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Total recaudado (editable) */}
          <div className="space-y-2">
            <Label>Total recaudado ({moneda || 'moneda local'})</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={form.totalRecaudado}
              onChange={e => {
                const v = e.target.value;
                if (/^\d*\.?\d*$/.test(v)) setForm(f => ({ ...f, totalRecaudado: v }));
              }}
              placeholder="Ej: 2782"
              required
            />
            <p className="text-[10px] text-muted-foreground">Se auto-calcula de los pagos, pero puedes editarlo</p>
          </div>

          {/* Comisión */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Comisión P2P (%)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={form.comisionPorcentaje}
                onChange={e => {
                  const v = e.target.value;
                  if (/^\d*\.?\d*$/.test(v)) setForm(f => ({ ...f, comisionPorcentaje: v }));
                }}
                placeholder="5"
              />
            </div>
            <div className="space-y-2">
              <Label>Después de comisión</Label>
              <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted/50 text-sm">
                {totalDespuesComision.toLocaleString(undefined, { minimumFractionDigits: 2 })} {moneda}
              </div>
            </div>
          </div>

          {/* Tasa Binance */}
          <div className="space-y-2">
            <Label>Tasa Binance P2P (1 USDT = ? {moneda || 'local'})</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={form.tasaBinance}
              onChange={e => {
                const v = e.target.value;
                if (/^\d*\.?\d*$/.test(v)) setForm(f => ({ ...f, tasaBinance: v }));
              }}
              placeholder={moneda === 'MXN' ? 'Ej: 17.43' : 'Ej: 4200'}
              required
            />
          </div>

          {/* USDT calculado + real */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>USDT calculado</Label>
              <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted/50 text-sm font-medium">
                {usdtCalculado.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT
              </div>
            </div>
            <div className="space-y-2">
              <Label>USDT recibido real</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={form.usdtRecibidoReal}
                onChange={e => {
                  const v = e.target.value;
                  if (/^\d*\.?\d*$/.test(v)) setForm(f => ({ ...f, usdtRecibidoReal: v }));
                }}
                placeholder="Ej: 151.56"
                required
              />
            </div>
          </div>

          {/* Difference preview */}
          {usdtCalculado > 0 && parseFloat(form.usdtRecibidoReal) > 0 && (
            <div className="rounded-md bg-muted/50 p-2.5 text-sm">
              <span className="text-muted-foreground">Diferencia: </span>
              <span className={`font-semibold ${(parseFloat(form.usdtRecibidoReal) - usdtCalculado) >= 0 ? 'text-success' : 'text-destructive'}`}>
                {(parseFloat(form.usdtRecibidoReal) - usdtCalculado) >= 0 ? '+' : ''}
                {(parseFloat(form.usdtRecibidoReal) - usdtCalculado).toFixed(2)} USDT
              </span>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Ej: Vendedor @usuario_binance"
              rows={2}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!form.pais || !form.tasaBinance || !form.usdtRecibidoReal}
          >
            Registrar Corte {parseFloat(form.usdtRecibidoReal) > 0 && `— ${form.usdtRecibidoReal} USDT`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
