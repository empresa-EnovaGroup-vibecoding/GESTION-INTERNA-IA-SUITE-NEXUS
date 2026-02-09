import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ContentColors } from '@/hooks/useContentTheme';

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
          value={value.startsWith('rgba') ? '#ffffff' : value}
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

interface ContentMiniPreviewProps {
  colors: ContentColors;
}

function ContentMiniPreview({ colors }: ContentMiniPreviewProps) {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  return (
    <div
      className="w-[180px] h-[200px] rounded-2xl overflow-hidden shadow-lg border border-border/50 flex-shrink-0 transition-all duration-200"
      style={{ backgroundColor: colors.content_bg }}
    >
      {/* Header bar */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ borderBottom: `1px solid ${colors.content_hover_bg}` }}
      >
        <div className="h-2 w-12 rounded-full" style={{ backgroundColor: colors.content_text_heading, opacity: 0.8 }} />
        <div className="ml-auto h-2 w-6 rounded-full" style={{ backgroundColor: colors.content_text_secondary, opacity: 0.4 }} />
      </div>

      {/* Page title */}
      <div className="px-3 pt-2 pb-1">
        <div className="h-2.5 w-16 rounded-full" style={{ backgroundColor: colors.content_text_heading }} />
        <div className="h-1.5 w-24 rounded-full mt-1" style={{ backgroundColor: colors.content_text_secondary, opacity: 0.6 }} />
      </div>

      {/* Cards */}
      <div className="px-3 py-2 space-y-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            onMouseEnter={() => setHoveredCard(i)}
            onMouseLeave={() => setHoveredCard(null)}
            className="rounded-lg p-2 transition-all duration-200"
            style={{
              backgroundColor: hoveredCard === i ? colors.content_hover_bg : colors.content_card_bg,
              border: `1px solid ${colors.content_hover_bg}`,
            }}
          >
            <div className="h-1.5 w-14 rounded-full" style={{ backgroundColor: colors.content_text }} />
            <div className="h-1 w-20 rounded-full mt-1" style={{ backgroundColor: colors.content_text_secondary, opacity: 0.5 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface ContentColorPickerProps {
  colors: ContentColors;
  onChange: (key: keyof ContentColors, value: string) => void;
}

export default function ContentColorPicker({ colors, onChange }: ContentColorPickerProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Color controls */}
      <div className="flex-1 space-y-5">
        {/* Group 1: Fondos */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fondos</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorPickerItem label="Fondo principal" value={colors.content_bg} onChange={v => onChange('content_bg', v)} />
            <ColorPickerItem label="Fondo cards" value={colors.content_card_bg} onChange={v => onChange('content_card_bg', v)} />
            <ColorPickerItem label="Fondo hover" value={colors.content_hover_bg} onChange={v => onChange('content_hover_bg', v)} />
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Group 2: Textos */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Textos</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorPickerItem label="Texto principal" value={colors.content_text} onChange={v => onChange('content_text', v)} />
            <ColorPickerItem label="Texto secundario" value={colors.content_text_secondary} onChange={v => onChange('content_text_secondary', v)} />
            <ColorPickerItem label="Encabezados" value={colors.content_text_heading} onChange={v => onChange('content_text_heading', v)} />
          </div>
        </div>
      </div>

      {/* Mini preview */}
      <div className="flex flex-col items-center gap-2">
        <Label className="text-xs text-muted-foreground">Vista previa</Label>
        <ContentMiniPreview colors={colors} />
      </div>
    </div>
  );
}
