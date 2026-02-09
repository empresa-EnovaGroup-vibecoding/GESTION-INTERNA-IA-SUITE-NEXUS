import { useState, useRef, useEffect } from 'react';
import { hexToHSL } from '@/lib/colorUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, Palette, Users, Database, Upload, Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import { useConfiguracion, SIDEBAR_DEFAULTS } from '@/hooks/useConfiguracion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SidebarColorPicker, { type SidebarColors } from '@/components/SidebarColorPicker';
import ContentColorPicker from '@/components/ContentColorPicker';
import { applySidebarColor } from '@/lib/sidebarTheme';
import { useContentTheme } from '@/hooks/useContentTheme';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TeamMember {
  nombre: string;
  rol: string;
  whatsapp: string;
}

export default function ConfiguracionPage() {
  const { config, loading, updateConfig, refetch } = useConfiguracion();
  const { colors: contentColors, updateColor: updateContentColor, resetColors: resetContentColors } = useContentTheme();

  // Empresa
  const [nombre, setNombre] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Personalización
  const [colorPrimario, setColorPrimario] = useState('#6366F1');

  // Sidebar colors
  const [sidebarColors, setSidebarColors] = useState<SidebarColors>({ ...SIDEBAR_DEFAULTS });

  // Equipo
  const [equipo, setEquipo] = useState<TeamMember[]>([]);
  const [newMember, setNewMember] = useState<TeamMember>({ nombre: '', rol: '', whatsapp: '' });

  // Datos
  const [comisionPorcentaje, setComisionPorcentaje] = useState('5');
  const [comisionReceptor, setComisionReceptor] = useState('Ederson');
  const [tasasMXN, setTasasMXN] = useState('17.5');
  const [tasasCOP, setTasasCOP] = useState('4200');

  // Sync state from config when loaded
  useEffect(() => {
    if (!loading) {
      setNombre(config.empresa_nombre);
      setSubtitulo(config.empresa_subtitulo);
      setLogoUrl(config.empresa_logo_url);
      setColorPrimario(config.color_primario);
      setComisionPorcentaje(config.comision_porcentaje);
      setComisionReceptor(config.comision_receptor);
      setSidebarColors({
        sidebar_bg: config.sidebar_bg,
        sidebar_text: config.sidebar_text,
        sidebar_active_bg: config.sidebar_active_bg,
        sidebar_active_text: config.sidebar_active_text,
        sidebar_hover_bg: config.sidebar_hover_bg,
        sidebar_icon_color: config.sidebar_icon_color,
        sidebar_icon_active: config.sidebar_icon_active,
        sidebar_border: config.sidebar_border,
        sidebar_logo_bg: config.sidebar_logo_bg,
      });
      try { setEquipo(JSON.parse(config.equipo)); } catch { setEquipo([]); }
      try {
        const tasas = JSON.parse(config.tasas_cambio);
        setTasasMXN(String(tasas.MXN ?? '17.5'));
        setTasasCOP(String(tasas.COP ?? '4200'));
      } catch { /* defaults */ }
    }
  }, [loading, config]);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
      const url = urlData.publicUrl;
      setLogoUrl(url);
      await updateConfig('empresa_logo_url', url);
      toast.success('Logo subido correctamente');
    } catch (err: any) {
      toast.error('Error al subir logo: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const saveEmpresa = async () => {
    await Promise.all([
      updateConfig('empresa_nombre', nombre),
      updateConfig('empresa_subtitulo', subtitulo),
    ]);
    toast.success('Perfil de empresa actualizado');
  };

  const saveColor = async () => {
    await updateConfig('color_primario', colorPrimario);
    const hsl = hexToHSL(colorPrimario);
    if (hsl) {
      document.documentElement.style.setProperty('--primary', hsl);
      document.documentElement.style.setProperty('--ring', hsl);
    }
    toast.success('Color primario actualizado');
  };

  const handleSidebarColorChange = (key: keyof SidebarColors, value: string) => {
    setSidebarColors(prev => ({ ...prev, [key]: value }));
    applySidebarColor(key, value);
  };

  const saveSidebarColors = async () => {
    const keys = Object.keys(sidebarColors) as (keyof SidebarColors)[];
    await Promise.all(keys.map(k => updateConfig(k, sidebarColors[k])));
    toast.success('Colores del sidebar guardados');
  };

  const resetSidebarColors = () => {
    setSidebarColors({ ...SIDEBAR_DEFAULTS });
    Object.entries(SIDEBAR_DEFAULTS).forEach(([k, v]) => applySidebarColor(k, v));
    toast.info('Colores restablecidos (guarda para persistir)');
  };

  const PRESETS: Record<string, { label: string; colors: SidebarColors }> = {
    oscuro: { label: 'Oscuro Clásico', colors: { ...SIDEBAR_DEFAULTS } },
    azul: { label: 'Azul Profundo', colors: { sidebar_bg: '#0f1729', sidebar_text: '#7da2c9', sidebar_active_bg: '#1a2744', sidebar_active_text: '#ffffff', sidebar_hover_bg: '#142035', sidebar_icon_color: '#4a7aab', sidebar_icon_active: '#38bdf8', sidebar_border: '#1e2d4a', sidebar_logo_bg: '#0c1220' } },
    verde: { label: 'Verde Bosque', colors: { sidebar_bg: '#0f1f17', sidebar_text: '#7aad8e', sidebar_active_bg: '#1a3327', sidebar_active_text: '#ffffff', sidebar_hover_bg: '#14291e', sidebar_icon_color: '#4d8b63', sidebar_icon_active: '#34d399', sidebar_border: '#1e3a2b', sidebar_logo_bg: '#0b1a12' } },
    morado: { label: 'Morado Elegante', colors: { sidebar_bg: '#1a1427', sidebar_text: '#a78bbd', sidebar_active_bg: '#2d1f42', sidebar_active_text: '#ffffff', sidebar_hover_bg: '#221a35', sidebar_icon_color: '#7c5fa0', sidebar_icon_active: '#a78bfa', sidebar_border: '#2d1f42', sidebar_logo_bg: '#15101f' } },
    claro: { label: 'Claro', colors: { sidebar_bg: '#f8fafc', sidebar_text: '#64748b', sidebar_active_bg: '#e2e8f0', sidebar_active_text: '#0f172a', sidebar_hover_bg: '#f1f5f9', sidebar_icon_color: '#94a3b8', sidebar_icon_active: '#6366f1', sidebar_border: '#e2e8f0', sidebar_logo_bg: '#ffffff' } },
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    setSidebarColors({ ...preset.colors });
    Object.entries(preset.colors).forEach(([k, v]) => applySidebarColor(k, v));
    toast.info(`Preset "${preset.label}" aplicado (guarda para persistir)`);
  };

  const addMember = async () => {
    if (!newMember.nombre.trim()) return;
    const updated = [...equipo, newMember];
    setEquipo(updated);
    setNewMember({ nombre: '', rol: '', whatsapp: '' });
    await updateConfig('equipo', JSON.stringify(updated));
    toast.success('Miembro agregado');
  };

  const removeMember = async (idx: number) => {
    const updated = equipo.filter((_, i) => i !== idx);
    setEquipo(updated);
    await updateConfig('equipo', JSON.stringify(updated));
    toast.success('Miembro eliminado');
  };

  const saveDatos = async () => {
    await Promise.all([
      updateConfig('comision_porcentaje', comisionPorcentaje),
      updateConfig('comision_receptor', comisionReceptor),
      updateConfig('tasas_cambio', JSON.stringify({ MXN: parseFloat(tasasMXN) || 17.5, COP: parseFloat(tasasCOP) || 4200 })),
    ]);
    toast.success('Datos guardados');
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando configuración…</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="page-title">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">Personaliza tu panel de gestión</p>
      </div>

      {/* 1. Perfil de Empresa */}
      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Perfil de la Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Logo */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Logo</Label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-14 w-14 rounded-xl object-cover border border-border" />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4 mr-1" />
                  {uploading ? 'Subiendo…' : 'Subir logo'}
                </Button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG. Máx 2MB.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nombre de la empresa</Label>
              <Input value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subtítulo</Label>
              <Input value={subtitulo} onChange={e => setSubtitulo(e.target.value)} />
            </div>
          </div>
          <Button size="sm" onClick={saveEmpresa}><Save className="h-4 w-4 mr-1" /> Guardar</Button>
        </CardContent>
      </Card>

      {/* 2. Personalización */}
      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <Palette className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Personalización</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Color primario</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={colorPrimario}
                onChange={e => setColorPrimario(e.target.value)}
                className="h-10 w-14 rounded-lg border border-border cursor-pointer"
              />
              <Input value={colorPrimario} onChange={e => setColorPrimario(e.target.value)} className="w-32 font-mono text-sm" />
            </div>
          </div>
          {/* Live preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Vista previa</Label>
            <div className="flex items-center gap-3">
              <Button style={{ backgroundColor: colorPrimario }} className="text-white">Botón primario</Button>
              <Badge style={{ backgroundColor: colorPrimario + '20', color: colorPrimario }}>Tag ejemplo</Badge>
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colorPrimario }} />
            </div>
          </div>
          <Button size="sm" onClick={saveColor}><Save className="h-4 w-4 mr-1" /> Aplicar color</Button>

          {/* Sidebar colors */}
          <div className="border-t border-border pt-5 mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Colores del Sidebar</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Personaliza cada parte del panel lateral</p>
              </div>
              <div className="flex items-center gap-2">
                <Select onValueChange={applyPreset}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue placeholder="Presets" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRESETS).map(([key, preset]) => (
                      <SelectItem key={key} value={key} className="text-xs">{preset.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <SidebarColorPicker colors={sidebarColors} onChange={handleSidebarColorChange} />

            <div className="flex items-center gap-2 pt-2">
              <Button size="sm" onClick={saveSidebarColors}><Save className="h-4 w-4 mr-1" /> Aplicar colores</Button>
              <Button size="sm" variant="outline" onClick={resetSidebarColors}><RotateCcw className="h-4 w-4 mr-1" /> Restablecer</Button>
            </div>
          </div>

          {/* Content area colors */}
          <div className="border-t border-border pt-5 mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Colores del Área Principal</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Personaliza el fondo, tarjetas y textos del contenido</p>
              </div>
            </div>

            <ContentColorPicker colors={contentColors} onChange={updateContentColor} />

            <div className="flex items-center gap-2 pt-2">
              <Button size="sm" onClick={() => toast.success('Colores aplicados en tiempo real')}><Save className="h-4 w-4 mr-1" /> Colores aplicados</Button>
              <Button size="sm" variant="outline" onClick={() => { resetContentColors(); toast.info('Colores del contenido restablecidos al tema por defecto'); }}><RotateCcw className="h-4 w-4 mr-1" /> Restablecer</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Equipo */}
      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Equipo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {equipo.length > 0 && (
            <div className="space-y-2">
              {equipo.map((m, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{m.nombre}</p>
                    <p className="text-xs text-muted-foreground">{m.rol} · {m.whatsapp}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeMember(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Input placeholder="Nombre" value={newMember.nombre} onChange={e => setNewMember(p => ({ ...p, nombre: e.target.value }))} />
            <Input placeholder="Rol" value={newMember.rol} onChange={e => setNewMember(p => ({ ...p, rol: e.target.value }))} />
            <Input placeholder="WhatsApp" value={newMember.whatsapp} onChange={e => setNewMember(p => ({ ...p, whatsapp: e.target.value }))} />
          </div>
          <Button variant="outline" size="sm" onClick={addMember} disabled={!newMember.nombre.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Agregar miembro
          </Button>
        </CardContent>
      </Card>

      {/* 4. Datos */}
      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <Database className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Datos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Monedas y tasas de cambio</Label>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">USD</p>
                <Input value="1.00" disabled className="bg-muted/50 font-mono" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">1 USD → MXN</p>
                <Input type="number" value={tasasMXN} onChange={e => setTasasMXN(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">1 USD → COP</p>
                <Input type="number" value={tasasCOP} onChange={e => setTasasCOP(e.target.value)} className="font-mono" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Comisión (%)</Label>
              <Input type="number" value={comisionPorcentaje} onChange={e => setComisionPorcentaje(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receptor de comisión</Label>
              <Input value={comisionReceptor} onChange={e => setComisionReceptor(e.target.value)} />
            </div>
          </div>
          <Button size="sm" onClick={saveDatos}><Save className="h-4 w-4 mr-1" /> Guardar datos</Button>
        </CardContent>
      </Card>
    </div>
  );
}

