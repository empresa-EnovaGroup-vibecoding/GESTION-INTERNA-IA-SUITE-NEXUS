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
}

const DEFAULTS: ConfigMap = {
  empresa_nombre: 'AI Subs',
  empresa_subtitulo: 'Panel de gestión',
  empresa_logo_url: null,
  color_primario: '#6366F1',
  comision_porcentaje: '5',
  comision_receptor: 'Ederson',
  monedas_activas: '["USD","MXN","COP"]',
  tasas_cambio: '{"MXN":17.5,"COP":4200}',
  equipo: '[]',
};

export function useConfiguracion() {
  const [config, setConfig] = useState<ConfigMap>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    const { data } = await supabaseExternal.from('configuracion').select('clave, valor');
    if (data) {
      const map = { ...DEFAULTS };
      data.forEach((row: any) => {
        if (row.clave in map) {
          (map as any)[row.clave] = row.valor;
        }
      });
      setConfig(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const updateConfig = useCallback(async (clave: keyof ConfigMap, valor: string | null) => {
    setConfig(prev => ({ ...prev, [clave]: valor }));
    await supabaseExternal.from('configuracion').update({ valor }).eq('clave', clave);
  }, []);

  return { config, loading, updateConfig, refetch: fetchConfig };
}
