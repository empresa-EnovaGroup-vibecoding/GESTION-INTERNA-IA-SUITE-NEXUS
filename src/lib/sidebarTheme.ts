import { SIDEBAR_DEFAULTS, type ConfigMap } from '@/hooks/useConfiguracion';

const SIDEBAR_KEYS = Object.keys(SIDEBAR_DEFAULTS) as (keyof typeof SIDEBAR_DEFAULTS)[];

export function applySidebarTheme(config: ConfigMap) {
  const root = document.documentElement;
  SIDEBAR_KEYS.forEach(key => {
    root.style.setProperty(`--${key.replace(/_/g, '-')}`, config[key] || SIDEBAR_DEFAULTS[key]);
  });
}

export function applySidebarColor(key: string, value: string) {
  document.documentElement.style.setProperty(`--${key.replace(/_/g, '-')}`, value);
}
