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
  content_bg: '#19191a',
  content_card_bg: '#1e1e20',
  content_hover_bg: '#252527',
  content_text: '#e2e8f0',
  content_text_secondary: '#94a3b8',
  content_text_heading: '#f8fafc',
};

const STORAGE_KEY_LIGHT = 'content-theme-colors-light';
const STORAGE_KEY_DARK = 'content-theme-colors-dark';
const CUSTOM_FLAG_KEY = 'content-theme-custom';

function getStorageKey(isDark: boolean) {
  return isDark ? STORAGE_KEY_DARK : STORAGE_KEY_LIGHT;
}

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

function cssVarName(key: string) {
  return `--${key.replace(/_/g, '-')}`;
}

function applyAllContentColors(colors: ContentColors) {
  const root = document.documentElement;
  (Object.keys(colors) as (keyof ContentColors)[]).forEach(key => {
    root.style.setProperty(cssVarName(key), colors[key]);
  });
}

export function applyContentColor(key: string, value: string) {
  document.documentElement.style.setProperty(cssVarName(key), value);
}

export function isContentCustomized(): boolean {
  return localStorage.getItem(CUSTOM_FLAG_KEY) === 'true';
}

function loadColorsForMode(dark: boolean): ContentColors {
  try {
    const saved = localStorage.getItem(getStorageKey(dark));
    if (saved) return JSON.parse(saved);
  } catch {}
  return dark ? { ...CONTENT_DEFAULTS_DARK } : { ...CONTENT_DEFAULTS };
}

/** Apply the correct content colors for the given mode. Call after toggling dark/light. */
export function setModeColors(dark: boolean) {
  const isCustom = isContentCustomized();
  const colors = isCustom ? loadColorsForMode(dark) : (dark ? { ...CONTENT_DEFAULTS_DARK } : { ...CONTENT_DEFAULTS });
  applyAllContentColors(colors);
}

export function useContentTheme() {
  const [isCustom, setIsCustom] = useState(() => isContentCustomized());
  const [colors, setColors] = useState<ContentColors>(() => loadColorsForMode(isDarkMode()));

  // ALWAYS apply content colors — never clear them
  useEffect(() => {
    applyAllContentColors(colors);
    const dark = isDarkMode();
    localStorage.setItem(getStorageKey(dark), JSON.stringify(colors));
    localStorage.setItem(CUSTOM_FLAG_KEY, String(isCustom));
  }, [colors, isCustom]);

  const updateColor = useCallback((key: keyof ContentColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
    setIsCustom(true);
    applyContentColor(key, value);
  }, []);

  const resetColors = useCallback(() => {
    const dark = isDarkMode();
    const defaults = dark ? CONTENT_DEFAULTS_DARK : CONTENT_DEFAULTS;
    setColors({ ...defaults });
    setIsCustom(false);
    applyAllContentColors(defaults);
  }, []);

  return { colors, updateColor, resetColors, isCustom };
}
