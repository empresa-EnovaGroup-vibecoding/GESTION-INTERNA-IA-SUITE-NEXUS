import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Panel, Cliente, Servicio, Suscripcion, Transaccion, EstadoPanel } from '@/types';
import { addDays, format } from 'date-fns';

export type ReplacementOption =
  | { type: 'existing'; panelId: string }
  | { type: 'new'; panelData: Omit<Panel, 'id' | 'cuposUsados' | 'historial' | 'estado'> };

interface DataContextType {
  paneles: Panel[];
  clientes: Cliente[];
  servicios: Servicio[];
  suscripciones: Suscripcion[];
  transacciones: Transaccion[];
  // Paneles
  addPanel: (panel: Omit<Panel, 'id' | 'cuposUsados' | 'historial'>) => void;
  updatePanel: (panel: Panel) => void;
  deletePanel: (id: string) => void;
  marcarPanelCaido: (panelId: string, replacement?: ReplacementOption) => void;
  // Clientes
  addCliente: (cliente: Omit<Cliente, 'id'>) => void;
  addClienteConSuscripciones: (cliente: Omit<Cliente, 'id'>, suscripciones: Omit<Suscripcion, 'id' | 'fechaVencimiento' | 'estado' | 'clienteId'>[]) => void;
  updateCliente: (cliente: Cliente) => void;
  deleteCliente: (id: string) => void;
  // Servicios (catálogo)
  addServicio: (servicio: Omit<Servicio, 'id'>) => void;
  updateServicio: (servicio: Servicio) => void;
  deleteServicio: (id: string) => void;
  getServicioById: (id: string) => Servicio | undefined;
  // Suscripciones
  addSuscripcion: (suscripcion: Omit<Suscripcion, 'id' | 'fechaVencimiento' | 'estado'>) => void;
  updateSuscripcion: (suscripcion: Suscripcion) => void;
  deleteSuscripcion: (id: string) => void;
  getSuscripcionesByCliente: (clienteId: string) => Suscripcion[];
  // Transacciones
  addTransaccion: (transaccion: Omit<Transaccion, 'id'>) => void;
  deleteTransaccion: (id: string) => void;
  // Helpers
  getPanelById: (id: string) => Panel | undefined;
  getCuposDisponibles: (panelId: string) => number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

// Migrate: convert old string-based servicio to servicioId
function migrateData() {
  try {
    // Migrate old clientes (with panelId) to new format
    const clientesRaw = localStorage.getItem('clientes');
    if (clientesRaw) {
      const oldClientes = JSON.parse(clientesRaw);
      if (oldClientes.length > 0 && 'panelId' in oldClientes[0]) {
        const existingSuscripciones = loadFromStorage<Suscripcion[]>('suscripciones', []);
        if (existingSuscripciones.length === 0) {
          const newClientes: Cliente[] = [];
          const newSuscripciones: Suscripcion[] = [];
          for (const old of oldClientes) {
            newClientes.push({ id: old.id, nombre: old.nombre, whatsapp: old.whatsapp });
            if (old.panelId) {
              newSuscripciones.push({
                id: generateId(),
                clienteId: old.id,
                servicioId: '',
                panelId: old.panelId,
                estado: 'activa',
                fechaInicio: old.fechaInicio,
                fechaVencimiento: old.fechaVencimiento || format(addDays(new Date(old.fechaInicio), 30), 'yyyy-MM-dd'),
                precioCobrado: 0,
              });
            }
          }
          localStorage.setItem('clientes', JSON.stringify(newClientes));
          localStorage.setItem('suscripciones', JSON.stringify(newSuscripciones));
        }
      }
    }

    // Migrate old suscripciones with string 'servicio' field to servicioId
    const subsRaw = localStorage.getItem('suscripciones');
    if (subsRaw) {
      const subs = JSON.parse(subsRaw);
      if (subs.length > 0 && 'servicio' in subs[0] && !('servicioId' in subs[0])) {
        const servicios: Servicio[] = loadFromStorage('servicios', []);
        const servicioMap = new Map<string, string>();

        for (const sub of subs) {
          const nombre = sub.servicio || 'General';
          if (!servicioMap.has(nombre)) {
            const existing = servicios.find(s => s.nombre === nombre);
            if (existing) {
              servicioMap.set(nombre, existing.id);
            } else {
              const newServicio: Servicio = { id: generateId(), nombre, precioBase: 0 };
              servicios.push(newServicio);
              servicioMap.set(nombre, newServicio.id);
            }
          }
        }

        const migratedSubs = subs.map((sub: any) => ({
          id: sub.id,
          clienteId: sub.clienteId,
          servicioId: servicioMap.get(sub.servicio || 'General') || '',
          panelId: sub.panelId,
          estado: sub.estado || 'activa',
          fechaInicio: sub.fechaInicio,
          fechaVencimiento: sub.fechaVencimiento,
          precioCobrado: sub.precioCobrado ?? 0,
          credencialEmail: sub.credencialEmail,
          credencialPassword: sub.credencialPassword,
          notas: sub.notas,
        }));

        localStorage.setItem('suscripciones', JSON.stringify(migratedSubs));
        localStorage.setItem('servicios', JSON.stringify(servicios));
      } else if (subs.length > 0 && !('estado' in subs[0])) {
        // Migrate suscripciones that have servicioId but missing new fields
        const migratedSubs = subs.map((sub: any) => ({
          ...sub,
          estado: sub.estado || 'activa',
          precioCobrado: sub.precioCobrado ?? 0,
        }));
        localStorage.setItem('suscripciones', JSON.stringify(migratedSubs));
      }
    }

    // Migrate old paneles missing new fields
    const panelesRaw = localStorage.getItem('paneles');
    if (panelesRaw) {
      const oldPaneles = JSON.parse(panelesRaw);
      if (oldPaneles.length > 0 && !('historial' in oldPaneles[0])) {
        const migrated = oldPaneles.map((p: any) => ({
          ...p,
          estado: p.estado || 'activo',
          servicioAsociado: p.servicioAsociado || '',
          historial: p.historial || [{ fecha: p.fechaCompra || format(new Date(), 'yyyy-MM-dd'), evento: 'activado' }],
        }));
        localStorage.setItem('paneles', JSON.stringify(migrated));
      }
    }
  } catch {
    // ignore migration errors
  }
}

migrateData();

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [paneles, setPaneles] = useState<Panel[]>(() => loadFromStorage('paneles', []));
  const [clientes, setClientes] = useState<Cliente[]>(() => loadFromStorage('clientes', []));
  const [servicios, setServicios] = useState<Servicio[]>(() => loadFromStorage('servicios', []));
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>(() => loadFromStorage('suscripciones', []));
  const [transacciones, setTransacciones] = useState<Transaccion[]>(() => loadFromStorage('transacciones', []));

  useEffect(() => { localStorage.setItem('paneles', JSON.stringify(paneles)); }, [paneles]);
  useEffect(() => { localStorage.setItem('clientes', JSON.stringify(clientes)); }, [clientes]);
  useEffect(() => { localStorage.setItem('servicios', JSON.stringify(servicios)); }, [servicios]);
  useEffect(() => { localStorage.setItem('suscripciones', JSON.stringify(suscripciones)); }, [suscripciones]);
  useEffect(() => { localStorage.setItem('transacciones', JSON.stringify(transacciones)); }, [transacciones]);

  // --- Paneles ---
  const addPanel = useCallback((panel: Omit<Panel, 'id' | 'cuposUsados' | 'historial'>) => {
    const now = format(new Date(), 'yyyy-MM-dd');
    setPaneles(prev => [...prev, {
      ...panel,
      id: generateId(),
      cuposUsados: 0,
      estado: panel.estado || 'activo',
      servicioAsociado: panel.servicioAsociado || '',
      historial: [{ fecha: now, evento: 'activado' }],
    }]);
  }, []);

  const updatePanel = useCallback((panel: Panel) => {
    setPaneles(prev => prev.map(p => p.id === panel.id ? panel : p));
  }, []);

  const deletePanel = useCallback((id: string) => {
    setPaneles(prev => prev.filter(p => p.id !== id));
    setSuscripciones(prev => prev.filter(s => s.panelId !== id));
  }, []);

  const marcarPanelCaido = useCallback((panelId: string, replacement?: ReplacementOption) => {
    const now = format(new Date(), 'yyyy-MM-dd');

    if (replacement?.type === 'new') {
      // Create replacement panel first
      const newId = generateId();
      const newPanel: Panel = {
        ...replacement.panelData,
        id: newId,
        cuposUsados: 0,
        estado: 'activo',
        historial: [
          { fecha: now, evento: 'activado' },
          { fecha: now, evento: 'reemplazo_de', panelRelacionadoId: panelId },
        ],
      };

      // Move suscripciones
      setSuscripciones(prev => prev.map(s =>
        s.panelId === panelId ? { ...s, panelId: newId } : s
      ));

      // Update cupos
      setPaneles(prev => {
        const oldPanel = prev.find(p => p.id === panelId);
        const movedCount = oldPanel?.cuposUsados || 0;
        return [
          ...prev.map(p => {
            if (p.id === panelId) {
              return {
                ...p,
                estado: 'caido' as EstadoPanel,
                cuposUsados: 0,
                reemplazadoPorId: newId,
                historial: [...(p.historial || []), { fecha: now, evento: 'caido' as const }, { fecha: now, evento: 'reemplazado_por' as const, panelRelacionadoId: newId }],
              };
            }
            return p;
          }),
          { ...newPanel, cuposUsados: movedCount },
        ];
      });
    } else if (replacement?.type === 'existing') {
      const targetId = replacement.panelId;

      setSuscripciones(prev => prev.map(s =>
        s.panelId === panelId ? { ...s, panelId: targetId } : s
      ));

      setPaneles(prev => {
        const oldPanel = prev.find(p => p.id === panelId);
        const movedCount = oldPanel?.cuposUsados || 0;
        return prev.map(p => {
          if (p.id === panelId) {
            return {
              ...p,
              estado: 'caido' as EstadoPanel,
              cuposUsados: 0,
              reemplazadoPorId: targetId,
              historial: [...(p.historial || []), { fecha: now, evento: 'caido' as const }, { fecha: now, evento: 'reemplazado_por' as const, panelRelacionadoId: targetId }],
            };
          }
          if (p.id === targetId) {
            return {
              ...p,
              cuposUsados: p.cuposUsados + movedCount,
              historial: [...(p.historial || []), { fecha: now, evento: 'reemplazo_de' as const, panelRelacionadoId: panelId }],
            };
          }
          return p;
        });
      });
    } else {
      // No replacement
      setPaneles(prev => prev.map(p => {
        if (p.id === panelId) {
          return {
            ...p,
            estado: 'caido' as EstadoPanel,
            historial: [...(p.historial || []), { fecha: now, evento: 'caido' as const }],
          };
        }
        return p;
      }));
    }
  }, []);

  // --- Clientes ---
  const addCliente = useCallback((cliente: Omit<Cliente, 'id'>) => {
    setClientes(prev => [...prev, { ...cliente, id: generateId() }]);
  }, []);

  const addClienteConSuscripciones = useCallback((
    cliente: Omit<Cliente, 'id'>,
    subsData: Omit<Suscripcion, 'id' | 'fechaVencimiento' | 'estado' | 'clienteId'>[]
  ) => {
    const clienteId = generateId();
    setClientes(prev => [...prev, { ...cliente, id: clienteId }]);
    if (subsData.length > 0) {
      const newSubs = subsData.map(s => ({
        ...s,
        id: generateId(),
        clienteId,
        estado: 'activa' as const,
        fechaVencimiento: format(addDays(new Date(s.fechaInicio), 30), 'yyyy-MM-dd'),
      }));
      setSuscripciones(prev => [...prev, ...newSubs]);
      setPaneles(prev => prev.map(p => {
        const count = newSubs.filter(s => s.panelId === p.id).length;
        return count > 0 ? { ...p, cuposUsados: p.cuposUsados + count } : p;
      }));
    }
  }, []);

  const updateCliente = useCallback((cliente: Cliente) => {
    setClientes(prev => prev.map(c => c.id === cliente.id ? cliente : c));
  }, []);

  const deleteCliente = useCallback((id: string) => {
    setSuscripciones(prev => {
      const clienteSubs = prev.filter(s => s.clienteId === id);
      setPaneles(p => p.map(panel => {
        const count = clienteSubs.filter(s => s.panelId === panel.id).length;
        return count > 0 ? { ...panel, cuposUsados: Math.max(0, panel.cuposUsados - count) } : panel;
      }));
      return prev.filter(s => s.clienteId !== id);
    });
    setClientes(prev => prev.filter(c => c.id !== id));
  }, []);

  // --- Servicios (catálogo) ---
  const addServicio = useCallback((servicio: Omit<Servicio, 'id'>) => {
    setServicios(prev => [...prev, { ...servicio, id: generateId() }]);
  }, []);

  const updateServicio = useCallback((servicio: Servicio) => {
    setServicios(prev => prev.map(s => s.id === servicio.id ? servicio : s));
  }, []);

  const deleteServicio = useCallback((id: string) => {
    setServicios(prev => prev.filter(s => s.id !== id));
    // Also remove suscripciones tied to this servicio and update cupos
    setSuscripciones(prev => {
      const toRemove = prev.filter(s => s.servicioId === id);
      setPaneles(p => p.map(panel => {
        const count = toRemove.filter(s => s.panelId === panel.id).length;
        return count > 0 ? { ...panel, cuposUsados: Math.max(0, panel.cuposUsados - count) } : panel;
      }));
      return prev.filter(s => s.servicioId !== id);
    });
  }, []);

  const getServicioById = useCallback((id: string) => servicios.find(s => s.id === id), [servicios]);

  // --- Suscripciones ---
  const addSuscripcion = useCallback((suscripcion: Omit<Suscripcion, 'id' | 'fechaVencimiento' | 'estado'>) => {
    const fechaVencimiento = format(addDays(new Date(suscripcion.fechaInicio), 30), 'yyyy-MM-dd');
    setSuscripciones(prev => [...prev, { ...suscripcion, id: generateId(), fechaVencimiento, estado: 'activa' }]);
    setPaneles(prev => prev.map(p =>
      p.id === suscripcion.panelId ? { ...p, cuposUsados: p.cuposUsados + 1 } : p
    ));
  }, []);

  const updateSuscripcion = useCallback((suscripcion: Suscripcion) => {
    setSuscripciones(prev => {
      const old = prev.find(s => s.id === suscripcion.id);
      if (old && old.panelId !== suscripcion.panelId) {
        setPaneles(p => p.map(panel => {
          if (panel.id === old.panelId) return { ...panel, cuposUsados: Math.max(0, panel.cuposUsados - 1) };
          if (panel.id === suscripcion.panelId) return { ...panel, cuposUsados: panel.cuposUsados + 1 };
          return panel;
        }));
      }
      return prev.map(s => s.id === suscripcion.id ? suscripcion : s);
    });
  }, []);

  const deleteSuscripcion = useCallback((id: string) => {
    setSuscripciones(prev => {
      const sub = prev.find(s => s.id === id);
      if (sub) {
        setPaneles(p => p.map(panel =>
          panel.id === sub.panelId ? { ...panel, cuposUsados: Math.max(0, panel.cuposUsados - 1) } : panel
        ));
      }
      return prev.filter(s => s.id !== id);
    });
  }, []);

  const getSuscripcionesByCliente = useCallback((clienteId: string) =>
    suscripciones.filter(s => s.clienteId === clienteId),
    [suscripciones]
  );

  // --- Transacciones ---
  const addTransaccion = useCallback((transaccion: Omit<Transaccion, 'id'>) => {
    setTransacciones(prev => [...prev, { ...transaccion, id: generateId() }]);
  }, []);

  const deleteTransaccion = useCallback((id: string) => {
    setTransacciones(prev => prev.filter(t => t.id !== id));
  }, []);

  // --- Helpers ---
  const getPanelById = useCallback((id: string) => paneles.find(p => p.id === id), [paneles]);

  const getCuposDisponibles = useCallback((panelId: string) => {
    const panel = paneles.find(p => p.id === panelId);
    return panel ? panel.capacidadTotal - panel.cuposUsados : 0;
  }, [paneles]);

  return (
    <DataContext.Provider value={{
      paneles, clientes, servicios, suscripciones, transacciones,
      addPanel, updatePanel, deletePanel, marcarPanelCaido,
      addCliente, addClienteConSuscripciones, updateCliente, deleteCliente,
      addServicio, updateServicio, deleteServicio, getServicioById,
      addSuscripcion, updateSuscripcion, deleteSuscripcion, getSuscripcionesByCliente,
      addTransaccion, deleteTransaccion,
      getPanelById, getCuposDisponibles,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
