import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { MetodoPago } from '@/types';
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

const METODOS: MetodoPago[] = ['Transferencia', 'Zelle', 'PayPal', 'Binance', 'Efectivo'];

export default function RegistrarPagoDialog() {
  const { clientes, addPago } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clienteId: '',
    monto: '',
    metodo: '' as MetodoPago | '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clienteId || !form.metodo) return;
    addPago({
      clienteId: form.clienteId,
      monto: parseFloat(form.monto),
      metodo: form.metodo as MetodoPago,
      fecha: form.fecha,
    });
    toast.success('Pago registrado');
    setOpen(false);
    setForm({ clienteId: '', monto: '', metodo: '', fecha: format(new Date(), 'yyyy-MM-dd') });
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
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={form.clienteId} onValueChange={v => setForm(f => ({ ...f, clienteId: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
              <SelectContent>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Monto ($)</Label>
              <Input type="number" min="0" step="0.01" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} required />
            </div>
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
          </div>
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
          </div>
          <Button type="submit" className="w-full" disabled={!form.clienteId || !form.metodo || !form.monto}>
            Registrar Pago
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
