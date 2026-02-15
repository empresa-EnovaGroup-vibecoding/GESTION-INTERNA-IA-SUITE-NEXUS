import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Panel, Cliente, Servicio, Suscripcion, Pago, Corte, Proyecto, CorteSemanal, EstadoPanel, CredencialHistorial } from '@/types';
import { addDays, format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { supabaseExternal } from '@/lib/supabaseExternal';
import { PanelSchema, ClienteSchema, ServicioSchema, SuscripcionSchema, PagoSchema, CorteSchema, validateInput } from '@/lib/validationSchemas';
import { toast } from 'sonner';

interface DataContextType {
  paneles: Panel[];
  clientes: Cliente[];
  servicios: Servicio[];
  suscripciones: Suscripcion[];

  pagos: Pago[];
  cortes: Corte[];
  proyectos: Proyecto[];
  cortesSemanales: CorteSemanal[];
  loading: boolean;
  // Paneles
  addPanel: (panel: Omit<Panel, 'id' | 'cuposUsados' | 'historialCredenciales'>) => void;
  updatePanel: (panel: Panel) => void;
  deletePanel: (id: string) => void;
  rotarCredenciales: (panelId: string, newEmail: string, newPassword: string) => void;
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
  // Pagos
  addPago: (pago: Omit<Pago, 'id'>) => void;
  updatePago: (pago: Pago) => void;
  deletePago: (id: string) => void;
  // Cortes
  addCorte: (corte: Omit<Corte, 'id' | 'pagosIds'>) => void;
  deleteCorte: (id: string) => void;
  // Proyectos
  addProyecto: (proyecto: Omit<Proyecto, 'id'>) => void;
  updateProyecto: (proyecto: Proyecto) => void;
  deleteProyecto: (id: string) => void;
  getProyectoById: (id: string) => Proyecto | undefined;
  // Cortes Semanales
  addCorteSemanal: (corte: Omit<CorteSemanal, 'id'>) => void;
  deleteCorteSemanal: (id: string) => void;
  // Helpers
  getPanelById: (id: string) => Panel | undefined;
  getCuposDisponibles: (panelId: string) => number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

function generateId(): string {
  return crypto.randomUUID();
}

// Safe Supabase operation - logs error and shows toast if it fails
async function persist(promise: Promise<{ error?: { message: string } | null }>, action: string) {
  try {
    const result = await promise;
    if (result?.error) {
      console.error('[DB]', action, result.error.message);
      toast.error('Error al ' + action);
    }
  } catch (err) {
    console.error('[DB]', action, err);
    toast.error('Error al ' + action);
  }
}

// === Supabase row mappers ===

function panelToRow(p: Panel) {
  return {
    id: p.id, nombre: p.nombre, email: p.email, password: p.password,
    fecha_compra: p.fechaCompra, fecha_expiracion: p.fechaExpiracion,
    capacidad_total: p.capacidadTotal, cupos_usados: p.cuposUsados,
    servicio_asociado: p.servicioAsociado, estado: p.estado,
    proveedor: p.proveedor || null, costo_mensual: p.costoMensual,
    credencial_fecha_inicio: p.credencialFechaInicio,
    historial_credenciales: p.historialCredenciales as unknown,
    vpn: p.vpn || null,
    notas: p.notas ?? null,
  };
}
function rowToPanel(r: Record<string, unknown>): Panel {
  return {
    id: r.id as string, nombre: r.nombre as string, email: r.email as string, password: r.password as string,
    fechaCompra: r.fecha_compra as string, fechaExpiracion: r.fecha_expiracion as string,
    capacidadTotal: Number(r.capacidad_total), cuposUsados: Number(r.cupos_usados),
    servicioAsociado: r.servicio_asociado as string, estado: r.estado as Panel['estado'],
    proveedor: (r.proveedor as string) || '', costoMensual: Number(r.costo_mensual),
    credencialFechaInicio: r.credencial_fecha_inicio as string,
    historialCredenciales: (r.historial_credenciales as Panel['historialCredenciales']) || [],
    vpn: (r.vpn as string) ?? undefined,
    notas: (r.notas as string) ?? undefined,
  };
}

function clienteToRow(c: Cliente) {
  return { id: c.id, nombre: c.nombre, whatsapp: c.whatsapp, pais: c.pais || null, notas: c.notas || null };
}
function rowToCliente(r: Record<string, unknown>): Cliente {
  return { id: r.id as string, nombre: r.nombre as string, whatsapp: r.whatsapp as string, pais: (r.pais as Cliente['pais']) || undefined, notas: (r.notas as string) || undefined };
}

function servicioToRow(s: Servicio) {
  return { id: s.id, nombre: s.nombre, precio_base: s.precioBase, precio_ref_mxn: s.precioRefMXN ?? null, precio_ref_cop: s.precioRefCOP ?? null };
}
function rowToServicio(r: Record<string, unknown>): Servicio {
  return { id: r.id as string, nombre: r.nombre as string, precioBase: Number(r.precio_base), precioRefMXN: r.precio_ref_mxn != null ? Number(r.precio_ref_mxn) : undefined, precioRefCOP: r.precio_ref_cop != null ? Number(r.precio_ref_cop) : undefined };
}

function suscripcionToRow(s: Suscripcion) {
  return {
    id: s.id, cliente_id: s.clienteId, servicio_id: s.servicioId,
    panel_id: s.panelId || null, estado: s.estado,
    fecha_inicio: s.fechaInicio, fecha_vencimiento: s.fechaVencimiento,
    precio_cobrado: s.precioCobrado,
    precio_local: s.precioLocal ?? null, moneda_local: s.monedaLocal ?? null,
    credencial_email: s.credencialEmail ?? null, credencial_password: s.credencialPassword ?? null,
    notas: s.notas ?? null,
  };
}
function rowToSuscripcion(r: Record<string, unknown>): Suscripcion {
  return {
    id: r.id as string, clienteId: r.cliente_id as string, servicioId: r.servicio_id as string,
    panelId: (r.panel_id as string) || undefined, estado: r.estado as Suscripcion['estado'],
    fechaInicio: r.fecha_inicio as string, fechaVencimiento: r.fecha_vencimiento as string,
    precioCobrado: Number(r.precio_cobrado),
    precioLocal: r.precio_local != null ? Number(r.precio_local) : undefined, monedaLocal: (r.moneda_local as Suscripcion['monedaLocal']) ?? undefined,
    credencialEmail: (r.credencial_email as string) ?? undefined, credencialPassword: (r.credencial_password as string) ?? undefined,
    notas: (r.notas as string) ?? undefined,
  };
}

function pagoToRow(p: Pago) {
  return {
    id: p.id, cliente_id: p.clienteId, monto: p.monto,
    monto_original: p.montoOriginal ?? null, moneda: p.moneda ?? null,
    tasa_cambio: p.tasaCambio ?? null, metodo: p.metodo,
    fecha: p.fecha, corte_id: p.corteId ?? null,
    referencia: p.referencia ?? null,
    comprobante_url: p.comprobanteUrl ?? null,
    datos_extraidos: p.datosExtraidos ?? null,
    proyecto_id: p.proyectoId ?? null,
  };
}
function rowToPago(r: Record<string, unknown>): Pago {
  return {
    id: r.id as string, clienteId: r.cliente_id as string, monto: Number(r.monto),
    montoOriginal: r.monto_original != null ? Number(r.monto_original) : undefined, moneda: (r.moneda as Pago['moneda']) ?? undefined,
    tasaCambio: r.tasa_cambio != null ? Number(r.tasa_cambio) : undefined, metodo: r.metodo as Pago['metodo'],
    fecha: r.fecha as string, corteId: (r.corte_id as string) ?? undefined,
    referencia: (r.referencia as string) ?? undefined,
    comprobanteUrl: (r.comprobante_url as string) ?? undefined,
    datosExtraidos: (r.datos_extraidos as Record<string, unknown>) ?? undefined,
    proyectoId: (r.proyecto_id as string) ?? undefined,
  };
}

function proyectoToRow(p: Proyecto) {
  return {
    id: p.id, nombre: p.nombre,
    dueno_cuenta: p.duenoCuenta ?? null,
    comision_porcentaje: p.comisionPorcentaje ?? null,
    pais: p.pais ?? null,
  };
}
function rowToProyecto(r: unknown): Proyecto {
  const row = r as Record<string, unknown>;
  return {
    id: row.id as string, nombre: row.nombre as string,
    duenoCuenta: (row.dueno_cuenta as string) ?? undefined,
    comisionPorcentaje: row.comision_porcentaje != null ? Number(row.comision_porcentaje) : undefined,
    pais: (row.pais as string) ?? undefined,
  };
}

function corteSemanalToRow(c: CorteSemanal) {
  return {
    id: c.id, fecha_inicio: c.fechaInicio, fecha_fin: c.fechaFin,
    total_ingresos: c.totalIngresos, total_comision_usuario: c.totalComisionUsuario,
    total_pagado_duenos: c.totalPagadoDuenos, total_gastos: c.totalGastos,
    ganancia_neta: c.gananciaNeta, detalle_proyectos: c.detalleProyectos as unknown,
    notas: c.notas ?? null,
  };
}
function rowToCorteSemanal(r: unknown): CorteSemanal {
  const row = r as Record<string, unknown>;
  return {
    id: row.id as string, fechaInicio: row.fecha_inicio as string, fechaFin: row.fecha_fin as string,
    totalIngresos: Number(row.total_ingresos), totalComisionUsuario: Number(row.total_comision_usuario),
    totalPagadoDuenos: Number(row.total_pagado_duenos), totalGastos: Number(row.total_gastos),
    gananciaNeta: Number(row.ganancia_neta),
    detalleProyectos: (row.detalle_proyectos as CorteSemanal['detalleProyectos']) || [],
    notas: (row.notas as string) ?? undefined,
  };
}

function corteToRow(c: Corte) {
  return {
    id: c.id, fecha: c.fecha, pais: c.pais, moneda: c.moneda,
    total_recaudado: c.totalRecaudado, comision_porcentaje: c.comisionPorcentaje,
    total_despues_comision: c.totalDespuesComision, tasa_binance: c.tasaBinance,
    usdt_calculado: c.usdtCalculado, usdt_recibido_real: c.usdtRecibidoReal,
    notas: c.notas ?? null, pagos_ids: c.pagosIds as unknown,
  };
}
function rowToCorte(r: Record<string, unknown>): Corte {
  return {
    id: r.id as string, fecha: r.fecha as string, pais: r.pais as Corte['pais'], moneda: r.moneda as Corte['moneda'],
    totalRecaudado: Number(r.total_recaudado), comisionPorcentaje: Number(r.comision_porcentaje),
    totalDespuesComision: Number(r.total_despues_comision), tasaBinance: Number(r.tasa_binance),
    usdtCalculado: Number(r.usdt_calculado), usdtRecibidoReal: Number(r.usdt_recibido_real),
    notas: (r.notas as string) ?? undefined, pagosIds: (r.pagos_ids as string[]) || [],
  };
}



// === localStorage migration ===
async function migrateLocalStorageToSupabase() {
  const tables = [
    { key: 'servicios', table: 'servicios', toRow: servicioToRow },
    { key: 'paneles', table: 'paneles', toRow: panelToRow },
    { key: 'clientes', table: 'clientes', toRow: clienteToRow },
    { key: 'suscripciones', table: 'suscripciones', toRow: suscripcionToRow },
    { key: 'pagos', table: 'pagos', toRow: pagoToRow },
    { key: 'cortes', table: 'cortes', toRow: corteToRow },

  ];

  for (const { key, table, toRow } of tables) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const items = JSON.parse(raw);
      if (!Array.isArray(items) || items.length === 0) continue;

      // Check if Supabase already has data for this table
      const { count } = await supabaseExternal.from(table).select('id', { count: 'exact', head: true });
      if (count && count > 0) continue; // skip if data exists

      const rows = items.map((item: Record<string, unknown>) => toRow(item as never));
      const { error } = await supabaseExternal.from(table).upsert(rows, { onConflict: 'id' });
      if (!error) {
        localStorage.removeItem(key);
        console.log(`Migrated ${items.length} items from localStorage.${key} to Supabase`);
      } else {
        console.error(`Error migrating ${key}:`, error);
      }
    } catch (e) {
      console.error(`Migration error for ${key}:`, e);
    }
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [paneles, setPaneles] = useState<Panel[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cortes, setCortes] = useState<Corte[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cortesSemanales, setCortesSemanales] = useState<CorteSemanal[]>([]);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // Load all data from Supabase on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function loadData() {
      try {
        await migrateLocalStorageToSupabase();

        const [pRes, cRes, sRes, subRes, pgRes, coRes, prRes, csRes] = await Promise.all([
          supabaseExternal.from('paneles').select('*'),
          supabaseExternal.from('clientes').select('*'),
          supabaseExternal.from('servicios').select('*'),
          supabaseExternal.from('suscripciones').select('*'),
          supabaseExternal.from('pagos').select('*'),
          supabaseExternal.from('cortes').select('*'),
          supabaseExternal.from('proyectos').select('*'),
          supabaseExternal.from('cortes_semanales').select('*'),
        ]);

        setPaneles((pRes.data || []).map(rowToPanel));
        setClientes((cRes.data || []).map(rowToCliente));
        setServicios((sRes.data || []).map(rowToServicio));
        setSuscripciones((subRes.data || []).map(rowToSuscripcion));
        setPagos((pgRes.data || []).map(rowToPago));
        setCortes((coRes.data || []).map(rowToCorte));
        setProyectos((prRes.data || []).map(rowToProyecto));
        setCortesSemanales((csRes.data || []).map(rowToCorteSemanal));
      } catch (err) {
        console.error('Error loading data:', err);
        toast.error('Error al cargar datos. Revisa tu conexion.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // --- Paneles ---
  const addPanel = useCallback(async (panel: Omit<Panel, 'id' | 'cuposUsados' | 'historialCredenciales'>) => {
    validateInput(PanelSchema, panel);
    const now = format(new Date(), 'yyyy-MM-dd');
    const newPanel: Panel = {
      ...panel, id: generateId(), cuposUsados: 0,
      estado: panel.estado || 'activo', servicioAsociado: panel.servicioAsociado || '',
      credencialFechaInicio: panel.credencialFechaInicio || now, historialCredenciales: [],
    };
    setPaneles(prev => [...prev, newPanel]);
    await persist(supabaseExternal.from('paneles').insert(panelToRow(newPanel)), 'guardar panel');
  }, []);

  const updatePanel = useCallback(async (panel: Panel) => {
    setPaneles(prev => prev.map(p => p.id === panel.id ? panel : p));
    await persist(supabaseExternal.from('paneles').update(panelToRow(panel)).eq('id', panel.id), 'actualizar panel');
  }, []);

  const deletePanel = useCallback(async (id: string) => {
    setPaneles(prev => prev.filter(p => p.id !== id));
    setSuscripciones(prev => prev.filter(s => s.panelId !== id));
    await Promise.all([
      persist(supabaseExternal.from('paneles').delete().eq('id', id), 'eliminar panel'),
      persist(supabaseExternal.from('suscripciones').delete().eq('panel_id', id), 'eliminar suscripciones del panel'),
    ]);
  }, []);

  const rotarCredenciales = useCallback(async (panelId: string, newEmail: string, newPassword: string) => {
    const now = format(new Date(), 'yyyy-MM-dd');
    let updatedPanel: Panel | null = null;
    setPaneles(prev => prev.map(p => {
      if (p.id !== panelId) return p;
      const historialEntry: CredencialHistorial = {
        email: p.email, password: p.password,
        fechaInicio: p.credencialFechaInicio, fechaFin: now, motivo: 'Caído - reemplazado',
      };
      updatedPanel = {
        ...p, email: newEmail, password: newPassword,
        credencialFechaInicio: now, estado: 'activo' as EstadoPanel,
        historialCredenciales: [historialEntry, ...(p.historialCredenciales || [])],
      };
      return updatedPanel;
    }));
    if (updatedPanel) {
      await persist(supabaseExternal.from('paneles').update(panelToRow(updatedPanel)).eq('id', panelId), 'rotar credenciales');
    }
  }, []);

  // --- Clientes ---
  const addCliente = useCallback(async (cliente: Omit<Cliente, 'id'>) => {
    validateInput(ClienteSchema, cliente);
    const newCliente: Cliente = { ...cliente, id: generateId() };
    setClientes(prev => [...prev, newCliente]);
    await persist(supabaseExternal.from('clientes').insert(clienteToRow(newCliente)), 'guardar cliente');
  }, []);

  const addClienteConSuscripciones = useCallback(async (
    cliente: Omit<Cliente, 'id'>,
    subsData: Omit<Suscripcion, 'id' | 'fechaVencimiento' | 'estado' | 'clienteId'>[]
  ) => {
    const clienteId = generateId();
    const newCliente: Cliente = { ...cliente, id: clienteId };
    setClientes(prev => [...prev, newCliente]);
    await persist(supabaseExternal.from('clientes').insert(clienteToRow(newCliente)), 'guardar cliente');

    if (subsData.length > 0) {
      const newSubs: Suscripcion[] = subsData.map(s => ({
        ...s, id: generateId(), clienteId,
        estado: 'activa' as const,
        fechaVencimiento: format(addDays(new Date(s.fechaInicio), 30), 'yyyy-MM-dd'),
      }));
      setSuscripciones(prev => [...prev, ...newSubs]);
      setPaneles(prev => prev.map(p => {
        const count = newSubs.filter(s => s.panelId === p.id).length;
        return count > 0 ? { ...p, cuposUsados: p.cuposUsados + count } : p;
      }));

      await persist(supabaseExternal.from('suscripciones').insert(newSubs.map(suscripcionToRow)), 'guardar suscripciones');
      const panelUpdates = new Map<string, number>();
      newSubs.forEach(s => {
        if (s.panelId) panelUpdates.set(s.panelId, (panelUpdates.get(s.panelId) || 0) + 1);
      });
      for (const [pid, count] of panelUpdates) {
        const panel = paneles.find(p => p.id === pid);
        if (panel) {
          await persist(supabaseExternal.from('paneles').update({ cupos_usados: panel.cuposUsados + count }).eq('id', pid), 'actualizar cupos');
        }
      }
    }
  }, [paneles]);

  const updateCliente = useCallback(async (cliente: Cliente) => {
    setClientes(prev => prev.map(c => c.id === cliente.id ? cliente : c));
    await persist(supabaseExternal.from('clientes').update(clienteToRow(cliente)).eq('id', cliente.id), 'actualizar cliente');
  }, []);

  const deleteCliente = useCallback(async (id: string) => {
    setSuscripciones(prev => {
      const clienteSubs = prev.filter(s => s.clienteId === id);
      setPaneles(p => p.map(panel => {
        const count = clienteSubs.filter(s => s.panelId === panel.id).length;
        return count > 0 ? { ...panel, cuposUsados: Math.max(0, panel.cuposUsados - count) } : panel;
      }));
      return prev.filter(s => s.clienteId !== id);
    });
    setClientes(prev => prev.filter(c => c.id !== id));
    await Promise.all([
      persist(supabaseExternal.from('suscripciones').delete().eq('cliente_id', id), 'eliminar suscripciones'),
      persist(supabaseExternal.from('clientes').delete().eq('id', id), 'eliminar cliente'),
    ]);
  }, []);

  // --- Servicios ---
  const addServicio = useCallback(async (servicio: Omit<Servicio, 'id'>) => {
    validateInput(ServicioSchema, servicio);
    const newServicio: Servicio = { ...servicio, id: generateId() };
    setServicios(prev => [...prev, newServicio]);
    await persist(supabaseExternal.from('servicios').insert(servicioToRow(newServicio)), 'guardar servicio');
  }, []);

  const updateServicio = useCallback(async (servicio: Servicio) => {
    setServicios(prev => prev.map(s => s.id === servicio.id ? servicio : s));
    await persist(supabaseExternal.from('servicios').update(servicioToRow(servicio)).eq('id', servicio.id), 'actualizar servicio');
  }, []);

  const deleteServicio = useCallback(async (id: string) => {
    setServicios(prev => prev.filter(s => s.id !== id));
    setSuscripciones(prev => {
      const toRemove = prev.filter(s => s.servicioId === id);
      setPaneles(p => p.map(panel => {
        const count = toRemove.filter(s => s.panelId === panel.id).length;
        return count > 0 ? { ...panel, cuposUsados: Math.max(0, panel.cuposUsados - count) } : panel;
      }));
      return prev.filter(s => s.servicioId !== id);
    });
    await Promise.all([
      persist(supabaseExternal.from('suscripciones').delete().eq('servicio_id', id), 'eliminar suscripciones'),
      persist(supabaseExternal.from('servicios').delete().eq('id', id), 'eliminar servicio'),
    ]);
  }, []);

  const getServicioById = useCallback((id: string) => servicios.find(s => s.id === id), [servicios]);

  // --- Suscripciones ---
  const addSuscripcion = useCallback(async (suscripcion: Omit<Suscripcion, 'id' | 'fechaVencimiento' | 'estado'>) => {
    validateInput(SuscripcionSchema, suscripcion);
    const fechaVencimiento = format(addDays(new Date(suscripcion.fechaInicio), 30), 'yyyy-MM-dd');
    const newSub: Suscripcion = { ...suscripcion, id: generateId(), fechaVencimiento, estado: 'activa' };
    setSuscripciones(prev => [...prev, newSub]);
    if (suscripcion.panelId) {
      setPaneles(prev => prev.map(p =>
        p.id === suscripcion.panelId ? { ...p, cuposUsados: p.cuposUsados + 1 } : p
      ));
      await persist(supabaseExternal.from('paneles').update({ cupos_usados: (paneles.find(p => p.id === suscripcion.panelId)?.cuposUsados || 0) + 1 }).eq('id', suscripcion.panelId), 'actualizar cupos');
    }
    await persist(supabaseExternal.from('suscripciones').insert(suscripcionToRow(newSub)), 'guardar suscripcion');
  }, [paneles]);

  const updateSuscripcion = useCallback(async (suscripcion: Suscripcion) => {
    setSuscripciones(prev => {
      const old = prev.find(s => s.id === suscripcion.id);
      if (old && old.panelId !== suscripcion.panelId) {
        setPaneles(p => p.map(panel => {
          if (old.panelId && panel.id === old.panelId) return { ...panel, cuposUsados: Math.max(0, panel.cuposUsados - 1) };
          if (suscripcion.panelId && panel.id === suscripcion.panelId) return { ...panel, cuposUsados: panel.cuposUsados + 1 };
          return panel;
        }));
      }
      return prev.map(s => s.id === suscripcion.id ? suscripcion : s);
    });
    await persist(supabaseExternal.from('suscripciones').update(suscripcionToRow(suscripcion)).eq('id', suscripcion.id), 'actualizar suscripcion');
  }, []);

  const deleteSuscripcion = useCallback(async (id: string) => {
    setSuscripciones(prev => {
      const sub = prev.find(s => s.id === id);
      if (sub?.panelId) {
        setPaneles(p => p.map(panel =>
          panel.id === sub.panelId ? { ...panel, cuposUsados: Math.max(0, panel.cuposUsados - 1) } : panel
        ));
      }
      return prev.filter(s => s.id !== id);
    });
    await persist(supabaseExternal.from('suscripciones').delete().eq('id', id), 'eliminar suscripcion');
  }, []);

  const getSuscripcionesByCliente = useCallback((clienteId: string) =>
    suscripciones.filter(s => s.clienteId === clienteId),
    [suscripciones]
  );

  // --- Pagos ---
  const addPago = useCallback(async (pago: Omit<Pago, 'id'>) => {
    validateInput(PagoSchema, pago);
    const newPago: Pago = { ...pago, id: generateId() };
    setPagos(prev => [...prev, newPago]);
    await persist(supabaseExternal.from('pagos').insert(pagoToRow(newPago)), 'guardar pago');
  }, []);

  const updatePago = useCallback(async (pago: Pago) => {
    setPagos(prev => prev.map(p => p.id === pago.id ? pago : p));
    await persist(supabaseExternal.from('pagos').update(pagoToRow(pago)).eq('id', pago.id), 'actualizar pago');
  }, []);

  const deletePago = useCallback(async (id: string) => {
    setPagos(prev => prev.filter(p => p.id !== id));
    await persist(supabaseExternal.from('pagos').delete().eq('id', id), 'eliminar pago');
  }, []);

  // --- Cortes ---
  const addCorte = useCallback(async (corteData: Omit<Corte, 'id' | 'pagosIds'>) => {
    validateInput(CorteSchema, corteData);
    const corteId = generateId();
    const monedaTarget = corteData.pais === 'Mexico' ? 'MXN' : 'COP';
    const corteDate = new Date(corteData.fecha);
    const weekStart = startOfWeek(corteDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(corteDate, { weekStartsOn: 1 });

    const eligiblePagoIds = pagos
      .filter(p => {
        if (p.corteId) return false;
        if (p.moneda !== monedaTarget) return false;
        const pagoDate = new Date(p.fecha);
        if (!isWithinInterval(pagoDate, { start: weekStart, end: weekEnd })) return false;
        const cliente = clientes.find(c => c.id === p.clienteId);
        return cliente?.pais === corteData.pais;
      })
      .map(p => p.id);

    const newCorte: Corte = { ...corteData, id: corteId, pagosIds: eligiblePagoIds };
    setCortes(prev => [...prev, newCorte]);
    await persist(supabaseExternal.from('cortes').insert(corteToRow(newCorte)), 'guardar corte');

    if (corteData.tasaBinance > 0 && eligiblePagoIds.length > 0) {
      const updatedPagos: Pago[] = [];
      setPagos(prev => prev.map(p => {
        if (!eligiblePagoIds.includes(p.id)) return p;
        const newMonto = p.montoOriginal && p.montoOriginal > 0
          ? Math.round((p.montoOriginal / corteData.tasaBinance) * 100) / 100
          : p.monto;
        const updated = { ...p, corteId, monto: newMonto };
        updatedPagos.push(updated);
        return updated;
      }));
      for (const up of updatedPagos) {
        await persist(supabaseExternal.from('pagos').update(pagoToRow(up)).eq('id', up.id), 'actualizar pago del corte');
      }
    }
  }, [pagos, clientes]);

  const deleteCorte = useCallback(async (id: string) => {
    const revertedPagos: Pago[] = [];
    setPagos(prev => prev.map(p => {
      if (p.corteId !== id) return p;
      const revertedMonto = p.montoOriginal && p.tasaCambio && p.tasaCambio > 0
        ? Math.round((p.montoOriginal / p.tasaCambio) * 100) / 100
        : p.monto;
      const reverted = { ...p, corteId: undefined, monto: revertedMonto };
      revertedPagos.push(reverted);
      return reverted;
    }));
    setCortes(prev => prev.filter(c => c.id !== id));

    for (const rp of revertedPagos) {
      await persist(supabaseExternal.from('pagos').update(pagoToRow(rp)).eq('id', rp.id), 'revertir pago');
    }
    await persist(supabaseExternal.from('cortes').delete().eq('id', id), 'eliminar corte');
  }, []);

  // --- Proyectos ---
  const addProyecto = useCallback(async (proyecto: Omit<Proyecto, 'id'>) => {
    const newProyecto: Proyecto = { ...proyecto, id: generateId() };
    setProyectos(prev => [...prev, newProyecto]);
    await persist(supabaseExternal.from('proyectos').insert(proyectoToRow(newProyecto)), 'guardar proyecto');
  }, []);

  const updateProyecto = useCallback(async (proyecto: Proyecto) => {
    setProyectos(prev => prev.map(p => p.id === proyecto.id ? proyecto : p));
    await persist(supabaseExternal.from('proyectos').update(proyectoToRow(proyecto)).eq('id', proyecto.id), 'actualizar proyecto');
  }, []);

  const deleteProyecto = useCallback(async (id: string) => {
    setProyectos(prev => prev.filter(p => p.id !== id));
    setPagos(prev => prev.map(p => p.proyectoId === id ? { ...p, proyectoId: undefined } : p));
    await Promise.all([
      persist(supabaseExternal.from('proyectos').delete().eq('id', id), 'eliminar proyecto'),
      persist(supabaseExternal.from('pagos').update({ proyecto_id: null }).eq('proyecto_id', id), 'desvincular pagos'),
    ]);
  }, []);

  const getProyectoById = useCallback((id: string) => proyectos.find(p => p.id === id), [proyectos]);

  // --- Cortes Semanales ---
  const addCorteSemanal = useCallback(async (corte: Omit<CorteSemanal, 'id'>) => {
    const newCorte: CorteSemanal = { ...corte, id: generateId() };
    setCortesSemanales(prev => [...prev, newCorte]);
    await persist(supabaseExternal.from('cortes_semanales').insert(corteSemanalToRow(newCorte)), 'guardar corte semanal');
  }, []);

  const deleteCorteSemanal = useCallback(async (id: string) => {
    setCortesSemanales(prev => prev.filter(c => c.id !== id));
    await persist(supabaseExternal.from('cortes_semanales').delete().eq('id', id), 'eliminar corte semanal');
  }, []);

  // --- Helpers ---
  const getPanelById = useCallback((id: string) => paneles.find(p => p.id === id), [paneles]);

  const getCuposDisponibles = useCallback((panelId: string) => {
    const panel = paneles.find(p => p.id === panelId);
    return panel ? panel.capacidadTotal - panel.cuposUsados : 0;
  }, [paneles]);

  const contextValue = useMemo(() => ({
    paneles, clientes, servicios, suscripciones, pagos, cortes, proyectos, cortesSemanales, loading,
    addPanel, updatePanel, deletePanel, rotarCredenciales,
    addCliente, addClienteConSuscripciones, updateCliente, deleteCliente,
    addServicio, updateServicio, deleteServicio, getServicioById,
    addSuscripcion, updateSuscripcion, deleteSuscripcion, getSuscripcionesByCliente,
    addPago, updatePago, deletePago,
    addCorte, deleteCorte,
    addProyecto, updateProyecto, deleteProyecto, getProyectoById,
    addCorteSemanal, deleteCorteSemanal,
    getPanelById, getCuposDisponibles,
  }), [
    paneles, clientes, servicios, suscripciones, pagos, cortes, proyectos, cortesSemanales, loading,
    addPanel, updatePanel, deletePanel, rotarCredenciales,
    addCliente, addClienteConSuscripciones, updateCliente, deleteCliente,
    addServicio, updateServicio, deleteServicio, getServicioById,
    addSuscripcion, updateSuscripcion, deleteSuscripcion, getSuscripcionesByCliente,
    addPago, updatePago, deletePago,
    addCorte, deleteCorte,
    addProyecto, updateProyecto, deleteProyecto, getProyectoById,
    addCorteSemanal, deleteCorteSemanal,
    getPanelById, getCuposDisponibles,
  ]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
