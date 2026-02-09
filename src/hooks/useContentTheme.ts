import { useState, useEffect, useCallback } from 'react';

export interface ContentColors {
  content_bg: string;
  content_card_bg: string;
  content_hover_bg: string;
  content_text: string;
  content_text_secondary: string;
  content_text_heading: string;
}

export const CONTENT_DEFAULTS: ContentColors = {
  content_bg: '#f8fafc',
  content_card_bg: '#ffffff',
  content_hover_bg: '#f1f5f9',
  content_text: '#1e293b',
  content_text_secondary: '#64748b',
  content_text_heading: '#0f172a',
};

export const CONTENT_DEFAULTS_DARK: ContentColors = {
  content_bg: '#0f172a',
  content_card_bg: 'rgba(255,255,255,0.05)',
  content_hover_bg: 'rgba(255,255,255,0.08)',
  content_text: '#e2e8f0',
  content_text_secondary: '#94a3b8',
  content_text_heading: '#f8fafc',
};

const STORAGE_KEY = 'content-theme-colors';
const CSS_KEYS = Object.keys(CONTENT_DEFAULTS) as (keyof ContentColors)[];

function applyAllContentColors(colors: ContentColors) {
  const root = document.documentElement;
  CSS_KEYS.forEach(key => {
    root.style.setProperty(`--${key.replace(/_/g, '-')}`, colors[key]);
  });
}

export function applyContentColor(key: string, value: string) {
  document.documentElement.style.setProperty(`--${key.replace(/_/g, '-')}`, value);
}

export function useContentTheme() {
  const [colors, setColors] = useState<ContentColors>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { ...CONTENT_DEFAULTS };
  });

  // Apply on mount and when colors change
  useEffect(() => {
    applyAllContentColors(colors);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  }, [colors]);

  const updateColor = useCallback((key: keyof ContentColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
    applyContentColor(key, value);
  }, []);

  const resetColors = useCallback(() => {
    const isDark = document.documentElement.classList.contains('dark');
    const defaults = isDark ? CONTENT_DEFAULTS_DARK : CONTENT_DEFAULTS;
    setColors({ ...defaults });
    applyAllContentColors(defaults);
  }, []);

  return { colors, updateColor, resetColors };
}
