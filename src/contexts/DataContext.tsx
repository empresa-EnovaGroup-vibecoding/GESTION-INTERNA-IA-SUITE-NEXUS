import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Panel, Cliente, Servicio, Suscripcion, Transaccion } from '@/types';
import { addDays, format } from 'date-fns';

interface DataContextType {
  paneles: Panel[];
  clientes: Cliente[];
  servicios: Servicio[];
  suscripciones: Suscripcion[];
  transacciones: Transaccion[];
  // Paneles
  addPanel: (panel: Omit<Panel, 'id' | 'cuposUsados'>) => void;
  updatePanel: (panel: Panel) => void;
  deletePanel: (id: string) => void;
  // Clientes
  addCliente: (cliente: Omit<Cliente, 'id'>) => void;
  updateCliente: (cliente: Cliente) => void;
  deleteCliente: (id: string) => void;
  // Servicios (catálogo)
  addServicio: (servicio: Omit<Servicio, 'id'>) => void;
  updateServicio: (servicio: Servicio) => void;
  deleteServicio: (id: string) => void;
  getServicioById: (id: string) => Servicio | undefined;
  // Suscripciones
  addSuscripcion: (suscripcion: Omit<Suscripcion, 'id' | 'fechaVencimiento'>) => void;
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
                fechaInicio: old.fechaInicio,
                fechaVencimiento: old.fechaVencimiento || format(addDays(new Date(old.fechaInicio), 30), 'yyyy-MM-dd'),
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
          fechaInicio: sub.fechaInicio,
          fechaVencimiento: sub.fechaVencimiento,
        }));

        localStorage.setItem('suscripciones', JSON.stringify(migratedSubs));
        localStorage.setItem('servicios', JSON.stringify(servicios));
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
  const addPanel = useCallback((panel: Omit<Panel, 'id' | 'cuposUsados'>) => {
    setPaneles(prev => [...prev, { ...panel, id: generateId(), cuposUsados: 0 }]);
  }, []);

  const updatePanel = useCallback((panel: Panel) => {
    setPaneles(prev => prev.map(p => p.id === panel.id ? panel : p));
  }, []);

  const deletePanel = useCallback((id: string) => {
    setPaneles(prev => prev.filter(p => p.id !== id));
    setSuscripciones(prev => prev.filter(s => s.panelId !== id));
  }, []);

  // --- Clientes ---
  const addCliente = useCallback((cliente: Omit<Cliente, 'id'>) => {
    setClientes(prev => [...prev, { ...cliente, id: generateId() }]);
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
  const addSuscripcion = useCallback((suscripcion: Omit<Suscripcion, 'id' | 'fechaVencimiento'>) => {
    const fechaVencimiento = format(addDays(new Date(suscripcion.fechaInicio), 30), 'yyyy-MM-dd');
    setSuscripciones(prev => [...prev, { ...suscripcion, id: generateId(), fechaVencimiento }]);
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
      addPanel, updatePanel, deletePanel,
      addCliente, updateCliente, deleteCliente,
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
