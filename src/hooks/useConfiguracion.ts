import { useState, useEffect, useCallback } from 'react';
import { supabaseExternal } from '@/lib/supabaseExternal';

export interface ConfigMap {
  empresa_nombre: string;
  empresa_subtitulo: string;
  empresa_logo_url: string | null;
  color_primario: string;
  comision_porcentaje: string;
  comision_receptor: string;
  monedas_activas: string;
  tasas_cambio: string;
  equipo: string;
  sidebar_bg: string;
  sidebar_text: string;
  sidebar_active_bg: string;
  sidebar_active_text: string;
  sidebar_hover_bg: string;
  sidebar_icon_color: string;
  sidebar_icon_active: string;
  sidebar_border: string;
  sidebar_logo_bg: string;
}

export const SIDEBAR_DEFAULTS = {
  sidebar_bg: '#0c0c0f',
  sidebar_text: '#8a8a96',
  sidebar_active_bg: '#1a1a1e',
  sidebar_active_text: '#ececf0',
  sidebar_hover_bg: '#141418',
  sidebar_icon_color: '#5f5f6a',
  sidebar_icon_active: '#E85565',
  sidebar_border: '#1e1e23',
  sidebar_logo_bg: '#111114',
};

const DEFAULTS: ConfigMap = {
  empresa_nombre: 'Nexus',
  empresa_subtitulo: 'Panel de gestión',
  empresa_logo_url: null,
  color_primario: '#6366F1',
  comision_porcentaje: '5',
  comision_receptor: 'Ederson',
  monedas_activas: '["USD","MXN","COP"]',
  tasas_cambio: '{"MXN":17.5,"COP":4200}',
  equipo: '[]',
  ...SIDEBAR_DEFAULTS,
};

export function useConfiguracion() {
  const [config, setConfig] = useState<ConfigMap>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    const { data } = await supabaseExternal.from('configuracion').select('clave, valor');
    if (data && data.length > 0) {
      const map = { ...DEFAULTS };
      data.forEach((row: any) => {
        if (row.clave in map) {
          (map as any)[row.clave] = row.valor;
        }
      });
      setConfig(map);
    } else {
      // Seed defaults if table is empty
      const rows = Object.entries(DEFAULTS).map(([clave, valor]) => ({
        clave,
        valor: valor === null ? null : String(valor),
      }));
      await supabaseExternal.from('configuracion').upsert(rows, { onConflict: 'clave' });
      setConfig(DEFAULTS);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const updateConfig = useCallback(async (clave: keyof ConfigMap, valor: string | null) => {
    setConfig(prev => ({ ...prev, [clave]: valor }));
    await supabaseExternal.from('configuracion').upsert(
      { clave, valor },
      { onConflict: 'clave' }
    );
  }, []);

  return { config, loading, updateConfig, refetch: fetchConfig };
}
