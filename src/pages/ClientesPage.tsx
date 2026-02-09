import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Cliente } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Trash2, Edit2, Phone, ChevronDown, ChevronUp } from 'lucide-react';
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
import ClienteSuscripciones from '@/components/ClienteSuscripciones';

export default function ClientesPage() {
  const { clientes, addCliente, updateCliente, deleteCliente, getSuscripcionesByCliente, getPanelById, getServicioById } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({ nombre: '', whatsapp: '' });

  const resetForm = () => {
    setForm({ nombre: '', whatsapp: '' });
    setEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateCliente({ ...editing, ...form });
    } else {
      addCliente(form);
    }
    setOpen(false);
    resetForm();
  };

  const handleEdit = (cliente: Cliente) => {
    setEditing(cliente);
    setForm({ nombre: cliente.nombre, whatsapp: cliente.whatsapp });
    setOpen(true);
  };

  const getServiciosLabel = (clienteId: string): string => {
    const subs = getSuscripcionesByCliente(clienteId);
    if (subs.length === 0) return '—';
    const activos = subs.filter(s => s.estado === 'activa');
    if (activos.length === 0) return `${subs.length} vencido${subs.length > 1 ? 's' : ''}`;
    return activos.map(s => getServicioById(s.servicioId)?.nombre || '?').join(' + ');
  };

  const getEstadoGlobal = (clienteId: string) => {
    const subs = getSuscripcionesByCliente(clienteId);
    if (subs.length === 0) return 'sin-servicio';
    const hayVencido = subs.some(s => s.estado === 'vencida');
    const hayCancelada = subs.every(s => s.estado === 'cancelada');
    if (hayCancelada) return 'cancelado';
    if (hayVencido) return 'vencido';
    return 'activo';
  };

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'vencido': return 'alert-badge bg-destructive/10 text-destructive';
      case 'cancelado': return 'alert-badge bg-muted text-muted-foreground';
      case 'sin-servicio': return 'alert-badge bg-muted text-muted-foreground';
      default: return 'alert-badge bg-success/10 text-success';
    }
  };

  const estadoLabel = (estado: string) => {
    switch (estado) {
      case 'vencido': return 'Vencido';
      case 'cancelado': return 'Cancelado';
      case 'sin-servicio': return 'Sin servicios';
      default: return 'Activo';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clientes.length} clientes registrados</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Nombre del cliente"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={form.whatsapp}
                  onChange={(e) => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="+57 300 123 4567"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editing ? 'Guardar Cambios' : 'Registrar Cliente'}
              </Button>
            </form>

            {editing && (
              <ClienteSuscripciones clienteId={editing.id} />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {clientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <Plus className="h-5 w-5 text-muted-foreground" />
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
                <th className="table-header px-4 py-3 text-left">WhatsApp</th>
                <th className="table-header px-4 py-3 text-left">Servicios</th>
                <th className="table-header px-4 py-3 text-left">Estado</th>
                <th className="table-header px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clientes.map(cliente => {
                const estado = getEstadoGlobal(cliente.id);
                const subs = getSuscripcionesByCliente(cliente.id);
                const isExpanded = expandedId === cliente.id;
                return (
                  <>
                    <tr key={cliente.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{cliente.nombre}</td>
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
                        <span className="text-muted-foreground">{getServiciosLabel(cliente.id)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={estadoBadge(estado)}>{estadoLabel(estado)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {subs.length > 0 && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : cliente.id)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          <button onClick={() => handleEdit(cliente)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteCliente(cliente.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && subs.length > 0 && (
                      <tr key={`${cliente.id}-subs`} className="bg-muted/20">
                        <td colSpan={5} className="px-6 py-3">
                          <div className="space-y-2">
                            {subs.map(sub => {
                              const panel = getPanelById(sub.panelId);
                              const servicio = getServicioById(sub.servicioId);
                              return (
                                <div key={sub.id} className="flex items-center justify-between rounded-md bg-card p-2.5 text-xs">
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium">{servicio?.nombre || '?'}</span>
                                    <span className="text-muted-foreground">Panel: {panel?.nombre || '—'}</span>
                                    {sub.precioCobrado > 0 && (
                                      <span className="text-muted-foreground">${sub.precioCobrado.toLocaleString()}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground">
                                      {format(new Date(sub.fechaInicio), 'dd MMM', { locale: es })} → {format(new Date(sub.fechaVencimiento), 'dd MMM yyyy', { locale: es })}
                                    </span>
                                    <span className={
                                      sub.estado === 'activa' ? 'alert-badge bg-success/10 text-success' :
                                      sub.estado === 'vencida' ? 'alert-badge bg-destructive/10 text-destructive' :
                                      'alert-badge bg-muted text-muted-foreground'
                                    }>
                                      {sub.estado === 'activa' ? 'Activa' : sub.estado === 'vencida' ? 'Vencida' : 'Cancelada'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
