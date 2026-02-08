import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Panel, Cliente, Transaccion } from '@/types';
import { addDays, format } from 'date-fns';

interface DataContextType {
  paneles: Panel[];
  clientes: Cliente[];
  transacciones: Transaccion[];
  addPanel: (panel: Omit<Panel, 'id' | 'cuposUsados'>) => void;
  updatePanel: (panel: Panel) => void;
  deletePanel: (id: string) => void;
  addCliente: (cliente: Omit<Cliente, 'id' | 'fechaVencimiento'>) => void;
  updateCliente: (cliente: Cliente) => void;
  deleteCliente: (id: string) => void;
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

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [paneles, setPaneles] = useState<Panel[]>(() => loadFromStorage('paneles', []));
  const [clientes, setClientes] = useState<Cliente[]>(() => loadFromStorage('clientes', []));
  const [transacciones, setTransacciones] = useState<Transaccion[]>(() => loadFromStorage('transacciones', []));

  useEffect(() => { localStorage.setItem('paneles', JSON.stringify(paneles)); }, [paneles]);
  useEffect(() => { localStorage.setItem('clientes', JSON.stringify(clientes)); }, [clientes]);
  useEffect(() => { localStorage.setItem('transacciones', JSON.stringify(transacciones)); }, [transacciones]);

  const addPanel = useCallback((panel: Omit<Panel, 'id' | 'cuposUsados'>) => {
    setPaneles(prev => [...prev, { ...panel, id: generateId(), cuposUsados: 0 }]);
  }, []);

  const updatePanel = useCallback((panel: Panel) => {
    setPaneles(prev => prev.map(p => p.id === panel.id ? panel : p));
  }, []);

  const deletePanel = useCallback((id: string) => {
    setPaneles(prev => prev.filter(p => p.id !== id));
    setClientes(prev => prev.filter(c => c.panelId !== id));
  }, []);

  const addCliente = useCallback((cliente: Omit<Cliente, 'id' | 'fechaVencimiento'>) => {
    const fechaVencimiento = format(addDays(new Date(cliente.fechaInicio), 30), 'yyyy-MM-dd');
    setClientes(prev => [...prev, { ...cliente, id: generateId(), fechaVencimiento }]);
    setPaneles(prev => prev.map(p =>
      p.id === cliente.panelId ? { ...p, cuposUsados: p.cuposUsados + 1 } : p
    ));
  }, []);

  const updateCliente = useCallback((cliente: Cliente) => {
    setClientes(prev => {
      const old = prev.find(c => c.id === cliente.id);
      const updated = {
        ...cliente,
        fechaVencimiento: format(addDays(new Date(cliente.fechaInicio), 30), 'yyyy-MM-dd'),
      };
      // If panel changed, update cupos
      if (old && old.panelId !== cliente.panelId) {
        setPaneles(p => p.map(panel => {
          if (panel.id === old.panelId) return { ...panel, cuposUsados: Math.max(0, panel.cuposUsados - 1) };
          if (panel.id === cliente.panelId) return { ...panel, cuposUsados: panel.cuposUsados + 1 };
          return panel;
        }));
      }
      return prev.map(c => c.id === cliente.id ? updated : c);
    });
  }, []);

  const deleteCliente = useCallback((id: string) => {
    setClientes(prev => {
      const cliente = prev.find(c => c.id === id);
      if (cliente) {
        setPaneles(p => p.map(panel =>
          panel.id === cliente.panelId ? { ...panel, cuposUsados: Math.max(0, panel.cuposUsados - 1) } : panel
        ));
      }
      return prev.filter(c => c.id !== id);
    });
  }, []);

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
      paneles, clientes, transacciones,
      addPanel, updatePanel, deletePanel,
      addCliente, updateCliente, deleteCliente,
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
