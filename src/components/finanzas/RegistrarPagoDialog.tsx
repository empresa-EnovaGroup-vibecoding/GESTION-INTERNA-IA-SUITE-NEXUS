import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { MetodoPago, MonedaPago, PaisCliente } from '@/types';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const METODOS: MetodoPago[] = [
  'Binance Pay', 'Binance P2P', 'Transferencia bancaria',
  'Zelle', 'Nequi', 'Mercado Pago', 'PayPal', 'Efectivo',
];

const MONEDAS: { value: MonedaPago; label: string }[] = [
  { value: 'USD', label: 'USD — Dólar' },
  { value: 'MXN', label: 'MXN — Peso Mexicano' },
  { value: 'COP', label: 'COP — Peso Colombiano' },
];

const PAIS_MONEDA: Record<PaisCliente, MonedaPago> = {
  Venezuela: 'USD',
  Ecuador: 'USD',
  Colombia: 'COP',
  Mexico: 'MXN',
};

export default function RegistrarPagoDialog() {
  const { clientes, addPago } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clienteId: '',
    monto: '',
    metodo: '' as MetodoPago | '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    moneda: 'USD' as MonedaPago,
    tasaCambio: '',
  });

  // Pre-select currency based on client's country
  useEffect(() => {
    if (form.clienteId) {
      const cliente = clientes.find(c => c.id === form.clienteId);
      if (cliente?.pais) {
        const moneda = PAIS_MONEDA[cliente.pais];
        setForm(f => ({ ...f, moneda, tasaCambio: moneda === 'USD' ? '' : f.tasaCambio }));
      }
    }
  }, [form.clienteId, clientes]);

  const needsRate = form.moneda !== 'USD';
  const tasaCambio = parseFloat(form.tasaCambio) || 0;
  const montoOriginal = parseFloat(form.monto) || 0;
  const montoUSD = needsRate && tasaCambio > 0
    ? Math.round((montoOriginal / tasaCambio) * 100) / 100
    : montoOriginal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clienteId || !form.metodo || !form.monto) return;
    if (needsRate && tasaCambio <= 0) {
      toast.error('Ingresa la tasa de cambio');
      return;
    }

    addPago({
      clienteId: form.clienteId,
      monto: montoUSD,
      montoOriginal: needsRate ? montoOriginal : undefined,
      moneda: needsRate ? form.moneda : undefined,
      tasaCambio: needsRate ? tasaCambio : undefined,
      metodo: form.metodo as MetodoPago,
      fecha: form.fecha,
    });

    toast.success(`Pago registrado: $${montoUSD.toFixed(2)} USD`);
    setOpen(false);
    setForm({
      clienteId: '', monto: '', metodo: '', moneda: 'USD', tasaCambio: '',
      fecha: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Registrar Pago
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pago de Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={form.clienteId} onValueChange={v => setForm(f => ({ ...f, clienteId: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
              <SelectContent>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre} {c.pais ? `(${c.pais})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Moneda + Monto */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select value={form.moneda} onValueChange={v => setForm(f => ({ ...f, moneda: v as MonedaPago, tasaCambio: v === 'USD' ? '' : f.tasaCambio }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONEDAS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto ({form.moneda})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.monto}
                onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                placeholder={`Ej: ${form.moneda === 'MXN' ? '82' : form.moneda === 'COP' ? '16000' : '4'}`}
                required
              />
            </div>
          </div>

          {/* Tasa de cambio (only for non-USD) */}
          {needsRate && (
            <div className="space-y-2">
              <Label>Tasa de cambio (1 USD = ? {form.moneda})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.tasaCambio}
                onChange={e => setForm(f => ({ ...f, tasaCambio: e.target.value }))}
                placeholder={form.moneda === 'MXN' ? 'Ej: 20.5' : 'Ej: 4000'}
                required
              />
              {montoOriginal > 0 && tasaCambio > 0 && (
                <div className="rounded-md bg-muted/50 p-2.5 text-sm">
                  <span className="text-muted-foreground">
                    {montoOriginal.toLocaleString()} {form.moneda} / {tasaCambio} = {' '}
                  </span>
                  <span className="font-semibold text-success">
                    ${montoUSD.toFixed(2)} USD
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Método + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Método</Label>
              <Select value={form.metodo} onValueChange={v => setForm(f => ({ ...f, metodo: v as MetodoPago }))}>
                <SelectTrigger><SelectValue placeholder="Método..." /></SelectTrigger>
                <SelectContent>
                  {METODOS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!form.clienteId || !form.metodo || !form.monto || (needsRate && tasaCambio <= 0)}
          >
            Registrar Pago {montoUSD > 0 && `— $${montoUSD.toFixed(2)} USD`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
