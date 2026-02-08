import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { format, startOfWeek, endOfWeek, subWeeks, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const categorias = {
  ingreso: ['Venta de suscripción', 'Renovación', 'Otro ingreso'],
  gasto: ['Publicidad', 'Proveedor', 'Herramienta', 'Otro gasto'],
};

export default function FinanzasPage() {
  const { transacciones, addTransaccion, deleteTransaccion } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tipo: 'ingreso' as 'ingreso' | 'gasto',
    concepto: '',
    monto: '',
    categoria: '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
  });

  const resetForm = () => {
    setForm({ tipo: 'ingreso', concepto: '', monto: '', categoria: '', fecha: format(new Date(), 'yyyy-MM-dd') });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTransaccion({
      ...form,
      monto: parseFloat(form.monto),
    });
    setOpen(false);
    resetForm();
  };

  const totalIngresos = transacciones.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0);
  const totalGastos = transacciones.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0);
  const ganancia = totalIngresos - totalGastos;

  // Chart data: last 6 weeks
  const chartData = useMemo(() => {
    const weeks = [];
    for (let i = 5; i >= 0; i--) {
      const start = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const end = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const weekTransactions = transacciones.filter(t =>
        isWithinInterval(new Date(t.fecha), { start, end })
      );
      const ingresos = weekTransactions.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0);
      const gastos = weekTransactions.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0);
      weeks.push({
        semana: format(start, 'dd MMM', { locale: es }),
        Ingresos: ingresos,
        Gastos: gastos,
        Ganancia: ingresos - gastos,
      });
    }
    return weeks;
  }, [transacciones]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Finanzas</h1>
          <p className="text-sm text-muted-foreground">Control de ingresos y gastos</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Registrar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Transacción</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v: 'ingreso' | 'gasto') => setForm(f => ({ ...f, tipo: v, categoria: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                    <SelectItem value="gasto">Gasto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={form.categoria}
                  onValueChange={(v) => setForm(f => ({ ...f, categoria: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias[form.tipo].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Concepto</Label>
                <Input
                  value={form.concepto}
                  onChange={(e) => setForm(f => ({ ...f, concepto: e.target.value }))}
                  placeholder="Descripción breve"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Monto ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.monto}
                    onChange={(e) => setForm(f => ({ ...f, monto: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm(f => ({ ...f, fecha: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={!form.categoria}>
                Registrar Transacción
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Ingresos</p>
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <p className="mt-2 text-2xl font-bold text-success">${totalIngresos.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Gastos</p>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </div>
          <p className="mt-2 text-2xl font-bold text-destructive">${totalGastos.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Ganancia Neta</p>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <p className={`mt-2 text-2xl font-bold ${ganancia >= 0 ? 'text-success' : 'text-destructive'}`}>
            ${ganancia.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold">Ganancia Neta Semanal</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="semana" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Ingresos" fill="hsl(152, 69%, 31%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Ganancia" fill="hsl(173, 58%, 39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions table */}
      {transacciones.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="table-header px-4 py-3 text-left">Fecha</th>
                <th className="table-header px-4 py-3 text-left">Tipo</th>
                <th className="table-header px-4 py-3 text-left">Categoría</th>
                <th className="table-header px-4 py-3 text-left">Concepto</th>
                <th className="table-header px-4 py-3 text-right">Monto</th>
                <th className="table-header px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...transacciones].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map(t => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(t.fecha), 'dd MMM yyyy', { locale: es })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`alert-badge ${t.tipo === 'ingreso' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                      {t.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.categoria}</td>
                  <td className="px-4 py-3">{t.concepto}</td>
                  <td className={`px-4 py-3 text-right font-medium ${t.tipo === 'ingreso' ? 'text-success' : 'text-destructive'}`}>
                    {t.tipo === 'ingreso' ? '+' : '-'}${t.monto.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteTransaccion(t.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
