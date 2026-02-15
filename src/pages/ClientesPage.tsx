import { useState, useMemo, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Cliente, PaisCliente, Suscripcion } from '@/types';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Trash2, Edit2, Phone, Users, Search, ArrowUpDown } from 'lucide-react';
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import ServicioFormInline, { PendingSuscripcion } from '@/components/ServicioFormInline';
import ClienteEditPanel from '@/components/ClienteEditPanel';

const PAISES: PaisCliente[] = ['Venezuela', 'Ecuador', 'Colombia', 'Mexico'];

// Corporate monochrome badge style
const BADGE_CLASS = 'bg-muted/60 text-foreground/80 dark:bg-white/8 dark:text-white/70';

export default function ClientesPage() {
  const {
    clientes, suscripciones, addClienteConSuscripciones, updateCliente, deleteCliente,
    getSuscripcionesByCliente, servicios, getServicioById,
  } = useData();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'nombre' | 'vencimiento' | 'pais' | 'servicios'>('nombre');

  // Debounce search - 250ms delay for smooth mobile typing
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Pre-compute subs per client (avoids O(n²) calls in filter+sort)
  const subsMap = useMemo(() => {
    const map: Record<string, Suscripcion[]> = {};
    suscripciones.forEach(s => {
      if (!map[s.clienteId]) map[s.clienteId] = [];
      map[s.clienteId].push(s);
    });
    return map;
  }, [suscripciones]);

  // New client form state
  const [newForm, setNewForm] = useState({ nombre: '', whatsapp: '', pais: '' as PaisCliente | '' });
  const [pendingSubs, setPendingSubs] = useState<PendingSuscripcion[]>([]);

  // Edit client form state
  const [editForm, setEditForm] = useState({ nombre: '', whatsapp: '', pais: '' as PaisCliente | '', notas: '' });

  const clientesFiltrados = useMemo(() => {
    let resultado = [...clientes];

    // Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      resultado = resultado.filter(c => {
        const nombre = c.nombre.toLowerCase();
        const whatsapp = c.whatsapp.toLowerCase();
        const pais = (c.pais || '').toLowerCase();
        const notas = (c.notas || '').toLowerCase();
        const subs = subsMap[c.id] || [];
        const servicioNames = subs.map(s => getServicioById(s.servicioId)?.nombre?.toLowerCase() || '').join(' ');
        const credenciales = subs.map(s => (s.credencialEmail || '').toLowerCase()).join(' ');
        return nombre.includes(q) || whatsapp.includes(q) || pais.includes(q) || notas.includes(q) || servicioNames.includes(q) || credenciales.includes(q);
      });
    }

    // Sort
    resultado.sort((a, b) => {
      if (sortBy === 'nombre') {
        return a.nombre.localeCompare(b.nombre, 'es');
      }
      if (sortBy === 'vencimiento') {
        const subsA = (subsMap[a.id] || []).filter(s => s.estado === 'activa');
        const subsB = (subsMap[b.id] || []).filter(s => s.estado === 'activa');
        const minA = subsA.length > 0 ? Math.min(...subsA.map(s => new Date(s.fechaVencimiento).getTime())) : Infinity;
        const minB = subsB.length > 0 ? Math.min(...subsB.map(s => new Date(s.fechaVencimiento).getTime())) : Infinity;
        return minA - minB;
      }
      if (sortBy === 'pais') {
        return (a.pais || 'ZZZ').localeCompare(b.pais || 'ZZZ', 'es');
      }
      if (sortBy === 'servicios') {
        const countA = (subsMap[a.id] || []).filter(s => s.estado === 'activa').length;
        const countB = (subsMap[b.id] || []).filter(s => s.estado === 'activa').length;
        return countB - countA;
      }
      return 0;
    });

    return resultado;
  }, [clientes, searchQuery, sortBy, subsMap, getServicioById]);

  const resetCreate = () => {
    setNewForm({ nombre: '', whatsapp: '', pais: '' });
    setPendingSubs([]);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.nombre || !newForm.whatsapp) return;
    addClienteConSuscripciones(
      { nombre: newForm.nombre, whatsapp: newForm.whatsapp, pais: newForm.pais || undefined },
      pendingSubs.map(({ _tempId, ...rest }) => rest)
    );
    setCreateOpen(false);
    resetCreate();
  };

  const openEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setEditForm({ nombre: cliente.nombre, whatsapp: cliente.whatsapp, pais: cliente.pais || '', notas: cliente.notas || '' });
  };

  const handleSaveEdit = () => {
    if (!editingCliente) return;
    updateCliente({ ...editingCliente, ...editForm, pais: editForm.pais || undefined, notas: editForm.notas || undefined });
    setEditingCliente(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {searchInput
              ? clientesFiltrados.length + ' de ' + clientes.length + ' clientes'
              : clientes.length + ' clientes registrados'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Nombre, tel, correo..."
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nombre">Nombre A-Z</SelectItem>
              <SelectItem value="vencimiento">Vencimiento</SelectItem>
              <SelectItem value="pais">Pais</SelectItem>
              <SelectItem value="servicios">Mas servicios</SelectItem>
            </SelectContent>
          </Select>

        {/* === 1. NEW CLIENT DIALOG === */}
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetCreate(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Nombre</Label>
                  <Input
                    value={newForm.nombre}
                    onChange={(e) => setNewForm(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Nombre del cliente"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp</Label>
                  <Input
                    value={newForm.whatsapp}
                    onChange={(e) => setNewForm(f => ({ ...f, whatsapp: e.target.value }))}
                    placeholder="+57 300 123 4567"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>País</Label>
                  <Select value={newForm.pais} onValueChange={v => setNewForm(f => ({ ...f, pais: v as PaisCliente }))}>
                    <SelectTrigger>
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

              <ServicioFormInline
                items={pendingSubs}
                onAdd={(item) => setPendingSubs(prev => [...prev, item])}
                onRemove={(tempId) => setPendingSubs(prev => prev.filter(i => i._tempId !== tempId))}
                paisCliente={newForm.pais}
              />

              <Button type="submit" className="w-full">
                Registrar Cliente {pendingSubs.length > 0 && `con ${pendingSubs.length} servicio(s)`}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* === 2. CLIENT TABLE === */}
      {clientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No hay clientes aún</p>
          <p className="mt-1 text-xs text-muted-foreground">Registra tu primer cliente</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="table-header px-4 py-3 text-left">Nombre</th>
                <th className="table-header px-4 py-3 text-left">País</th>
                <th className="table-header px-4 py-3 text-left">WhatsApp</th>
                <th className="table-header px-4 py-3 text-left">Servicios y Vencimientos</th>
                <th className="table-header px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clientesFiltrados.map(cliente => {
                const subs = subsMap[cliente.id] || [];
                const activeSubs = subs.filter(s => s.estado === 'activa');

                // Group subscriptions by service name
                const grouped = activeSubs.reduce<Record<string, { servicioId: string; nombre: string; fechas: string[] }>>((acc, sub) => {
                  const servicio = getServicioById(sub.servicioId);
                  const nombre = servicio?.nombre || '?';
                  if (!acc[nombre]) acc[nombre] = { servicioId: sub.servicioId, nombre, fechas: [] };
                  acc[nombre].fechas.push(sub.fechaVencimiento);
                  return acc;
                }, {});
                const serviciosAgrupados = Object.values(grouped);

                return (
                  <tr key={cliente.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(cliente)}
                        className="font-medium hover:text-primary hover:underline text-left cursor-pointer"
                        title="Ver datos del cliente"
                      >
                        {cliente.nombre}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{cliente.pais || '—'}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://wa.me/${cliente.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {cliente.whatsapp}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {serviciosAgrupados.length === 0 ? (
                        <span className="text-xs text-muted-foreground/60">Sin servicios</span>
                      ) : (
                        <div className="space-y-1.5">
                          {serviciosAgrupados.map(g => {
                            const hoy = startOfDay(new Date());
                            return (
                              <div key={g.nombre} className="flex items-center gap-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0 ${BADGE_CLASS}`}>
                                  {g.fechas.length > 1 ? g.fechas.length + 'x ' : ''}{g.nombre}
                                </span>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                  {g.fechas
                                    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                                    .map((fecha, i) => {
                                      const dias = differenceInDays(startOfDay(new Date(fecha)), hoy);
                                      const vencido = dias < 0;
                                      const porVencer = dias >= 0 && dias <= 5;
                                      const colorFecha = vencido ? 'text-destructive' : porVencer ? 'text-warning' : 'text-muted-foreground';
                                      const label = vencido
                                        ? 'Vencido'
                                        : dias === 0 ? 'Hoy' : dias + 'd';
                                      return (
                                        <span key={i} className={`text-[10px] ${colorFecha}`}>
                                          {format(new Date(fecha), 'dd MMM', { locale: es })}
                                          {' '}
                                          <span className={`font-semibold ${vencido ? 'text-destructive' : porVencer ? 'text-warning' : 'text-success'}`}>
                                            {label}
                                          </span>
                                        </span>
                                      );
                                    })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(cliente)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteCliente(cliente.id)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* === 3. EDIT CLIENT DIALOG === */}
      <Dialog open={!!editingCliente} onOpenChange={(v) => { if (!v) setEditingCliente(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {editingCliente && (
            <div className="space-y-4">
              <ClienteEditPanel
                clienteId={editingCliente.id}
                nombre={editForm.nombre}
                whatsapp={editForm.whatsapp}
                pais={editForm.pais}
                notas={editForm.notas}
                onNombreChange={(v) => setEditForm(f => ({ ...f, nombre: v }))}
                onWhatsappChange={(v) => setEditForm(f => ({ ...f, whatsapp: v }))}
                onPaisChange={(v) => setEditForm(f => ({ ...f, pais: v }))}
                onNotasChange={(v) => setEditForm(f => ({ ...f, notas: v }))}
              />
              <Button className="w-full" onClick={handleSaveEdit}>
                Guardar Datos del Cliente
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
