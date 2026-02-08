import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Panel, Cliente, Suscripcion, Transaccion } from '@/types';
import { addDays, format } from 'date-fns';

interface DataContextType {
  paneles: Panel[];
  clientes: Cliente[];
  suscripciones: Suscripcion[];
  transacciones: Transaccion[];
  addPanel: (panel: Omit<Panel, 'id' | 'cuposUsados'>) => void;
  updatePanel: (panel: Panel) => void;
  deletePanel: (id: string) => void;
  addCliente: (cliente: Omit<Cliente, 'id'>) => void;
  updateCliente: (cliente: Cliente) => void;
  deleteCliente: (id: string) => void;
  addSuscripcion: (suscripcion: Omit<Suscripcion, 'id' | 'fechaVencimiento'>) => void;
  deleteSuscripcion: (id: string) => void;
  getSuscripcionesByCliente: (clienteId: string) => Suscripcion[];
  addTransaccion: (transaccion: Omit<Transaccion, 'id'>) => void;
  deleteTransaccion: (id: string) => void;
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

// Migrate old data: convert old clientes (with panelId/fechaInicio) into new format + suscripciones
function migrateOldData() {
  try {
    const clientesRaw = localStorage.getItem('clientes');
    if (!clientesRaw) return;
    const oldClientes = JSON.parse(clientesRaw);
    if (!oldClientes.length || !('panelId' in oldClientes[0])) return;

    const existingSuscripciones = loadFromStorage<Suscripcion[]>('suscripciones', []);
    if (existingSuscripciones.length > 0) return; // already migrated

    const newClientes: Cliente[] = [];
    const newSuscripciones: Suscripcion[] = [];

    for (const old of oldClientes) {
      newClientes.push({ id: old.id, nombre: old.nombre, whatsapp: old.whatsapp });
      if (old.panelId) {
        newSuscripciones.push({
          id: generateId(),
          clienteId: old.id,
          panelId: old.panelId,
          servicio: 'General',
          fechaInicio: old.fechaInicio,
          fechaVencimiento: old.fechaVencimiento || format(addDays(new Date(old.fechaInicio), 30), 'yyyy-MM-dd'),
        });
      }
    }

    localStorage.setItem('clientes', JSON.stringify(newClientes));
    localStorage.setItem('suscripciones', JSON.stringify(newSuscripciones));
  } catch {
    // ignore migration errors
  }
}

// Run migration on load
migrateOldData();

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [paneles, setPaneles] = useState<Panel[]>(() => loadFromStorage('paneles', []));
  const [clientes, setClientes] = useState<Cliente[]>(() => loadFromStorage('clientes', []));
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>(() => loadFromStorage('suscripciones', []));
  const [transacciones, setTransacciones] = useState<Transaccion[]>(() => loadFromStorage('transacciones', []));

  useEffect(() => { localStorage.setItem('paneles', JSON.stringify(paneles)); }, [paneles]);
  useEffect(() => { localStorage.setItem('clientes', JSON.stringify(clientes)); }, [clientes]);
  useEffect(() => { localStorage.setItem('suscripciones', JSON.stringify(suscripciones)); }, [suscripciones]);
  useEffect(() => { localStorage.setItem('transacciones', JSON.stringify(transacciones)); }, [transacciones]);

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

  const addCliente = useCallback((cliente: Omit<Cliente, 'id'>) => {
    setClientes(prev => [...prev, { ...cliente, id: generateId() }]);
  }, []);

  const updateCliente = useCallback((cliente: Cliente) => {
    setClientes(prev => prev.map(c => c.id === cliente.id ? cliente : c));
  }, []);

  const deleteCliente = useCallback((id: string) => {
    // Remove suscripciones and update cupos
    setSuscripciones(prev => {
      const clienteSubs = prev.filter(s => s.clienteId === id);
      // Decrement cupos for each panel
      setPaneles(p => p.map(panel => {
        const count = clienteSubs.filter(s => s.panelId === panel.id).length;
        return count > 0 ? { ...panel, cuposUsados: Math.max(0, panel.cuposUsados - count) } : panel;
      }));
      return prev.filter(s => s.clienteId !== id);
    });
    setClientes(prev => prev.filter(c => c.id !== id));
  }, []);

  const addSuscripcion = useCallback((suscripcion: Omit<Suscripcion, 'id' | 'fechaVencimiento'>) => {
    const fechaVencimiento = format(addDays(new Date(suscripcion.fechaInicio), 30), 'yyyy-MM-dd');
    setSuscripciones(prev => [...prev, { ...suscripcion, id: generateId(), fechaVencimiento }]);
    setPaneles(prev => prev.map(p =>
      p.id === suscripcion.panelId ? { ...p, cuposUsados: p.cuposUsados + 1 } : p
    ));
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

  const addTransaccion = useCallback((transaccion: Omit<Transaccion, 'id'>) => {
    setTransacciones(prev => [...prev, { ...transaccion, id: generateId() }]);
  }, []);

  const deleteTransaccion = useCallback((id: string) => {
    setTransacciones(prev => prev.filter(t => t.id !== id));
  }, []);

  const getPanelById = useCallback((id: string) => paneles.find(p => p.id === id), [paneles]);

  const getCuposDisponibles = useCallback((panelId: string) => {
    const panel = paneles.find(p => p.id === panelId);
    return panel ? panel.capacidadTotal - panel.cuposUsados : 0;
  }, [paneles]);

  return (
    <DataContext.Provider value={{
      paneles, clientes, suscripciones, transacciones,
      addPanel, updatePanel, deletePanel,
      addCliente, updateCliente, deleteCliente,
      addSuscripcion, deleteSuscripcion, getSuscripcionesByCliente,
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
