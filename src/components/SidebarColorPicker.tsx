import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ColorPickerItemProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

function ColorPickerItem({ label, value, onChange }: ColorPickerItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-10 h-10"
        />
        <div
          className="h-10 w-10 rounded-xl border border-border shadow-sm transition-colors duration-200"
          style={{ backgroundColor: value }}
        />
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-foreground mb-1">{label}</p>
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-8 w-28 font-mono text-xs"
        />
      </div>
    </div>
  );
}

export interface SidebarColors {
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

interface SidebarMiniPreviewProps {
  colors: SidebarColors;
}

function SidebarMiniPreview({ colors }: SidebarMiniPreviewProps) {
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const items = [
    { label: 'Dashboard', active: true },
    { label: 'Clientes', active: false },
    { label: 'Finanzas', active: false },
    { label: 'Servicios', active: false },
  ];

  return (
    <div
      className="w-[180px] h-[200px] rounded-2xl overflow-hidden shadow-lg border border-border/50 flex-shrink-0 transition-all duration-200"
      style={{ backgroundColor: colors.sidebar_bg }}
    >
      {/* Logo area */}
      <div
        className="px-3 py-3 flex items-center gap-2 transition-colors duration-200"
        style={{ backgroundColor: colors.sidebar_logo_bg, borderBottom: `1px solid ${colors.sidebar_border}` }}
      >
        <div className="h-6 w-6 rounded-lg" style={{ backgroundColor: colors.sidebar_icon_active }} />
        <div>
          <div className="h-2 w-14 rounded-full" style={{ backgroundColor: colors.sidebar_active_text, opacity: 0.9 }} />
          <div className="h-1.5 w-10 rounded-full mt-1" style={{ backgroundColor: colors.sidebar_text, opacity: 0.4 }} />
        </div>
      </div>

      {/* Menu items */}
      <div className="px-2 py-2 space-y-0.5">
        <p className="px-2 py-1 text-[7px] font-semibold uppercase tracking-widest" style={{ color: colors.sidebar_text, opacity: 0.4 }}>
          Menú
        </p>
        {items.map((item, i) => {
          const isHovered = hoveredItem === i && !item.active;
          return (
            <div
              key={i}
              onMouseEnter={() => setHoveredItem(i)}
              onMouseLeave={() => setHoveredItem(null)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-default transition-all duration-200"
              style={{
                backgroundColor: item.active
                  ? colors.sidebar_active_bg
                  : isHovered
                    ? colors.sidebar_hover_bg
                    : 'transparent',
                borderLeft: item.active ? `2px solid ${colors.sidebar_icon_active}` : '2px solid transparent',
              }}
            >
              <div
                className="h-3 w-3 rounded transition-colors duration-200"
                style={{
                  backgroundColor: item.active ? colors.sidebar_icon_active : colors.sidebar_icon_color,
                }}
              />
              <span
                className="text-[9px] font-medium transition-colors duration-200"
                style={{
                  color: item.active ? colors.sidebar_active_text : isHovered ? colors.sidebar_active_text : colors.sidebar_text,
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-auto px-3 py-2" style={{ borderTop: `1px solid ${colors.sidebar_border}` }}>
        <div className="h-1.5 w-16 rounded-full" style={{ backgroundColor: colors.sidebar_text, opacity: 0.3 }} />
      </div>
    </div>
  );
}

interface SidebarColorPickerProps {
  colors: SidebarColors;
  onChange: (key: keyof SidebarColors, value: string) => void;
}

export default function SidebarColorPicker({ colors, onChange }: SidebarColorPickerProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Color controls */}
      <div className="flex-1 space-y-5">
        {/* Group 1: Fondos */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fondos</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorPickerItem label="Fondo principal" value={colors.sidebar_bg} onChange={v => onChange('sidebar_bg', v)} />
            <ColorPickerItem label="Fondo item activo" value={colors.sidebar_active_bg} onChange={v => onChange('sidebar_active_bg', v)} />
            <ColorPickerItem label="Fondo hover" value={colors.sidebar_hover_bg} onChange={v => onChange('sidebar_hover_bg', v)} />
            <ColorPickerItem label="Fondo área logo" value={colors.sidebar_logo_bg} onChange={v => onChange('sidebar_logo_bg', v)} />
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Group 2: Textos */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Textos</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorPickerItem label="Texto normal" value={colors.sidebar_text} onChange={v => onChange('sidebar_text', v)} />
            <ColorPickerItem label="Texto activo" value={colors.sidebar_active_text} onChange={v => onChange('sidebar_active_text', v)} />
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Group 3: Acentos */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acentos</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorPickerItem label="Iconos" value={colors.sidebar_icon_color} onChange={v => onChange('sidebar_icon_color', v)} />
            <ColorPickerItem label="Iconos activos" value={colors.sidebar_icon_active} onChange={v => onChange('sidebar_icon_active', v)} />
            <ColorPickerItem label="Bordes" value={colors.sidebar_border} onChange={v => onChange('sidebar_border', v)} />
          </div>
        </div>
      </div>

      {/* Mini preview */}
      <div className="flex flex-col items-center gap-2">
        <Label className="text-xs text-muted-foreground">Vista previa</Label>
        <SidebarMiniPreview colors={colors} />
      </div>
    </div>
  );
}
