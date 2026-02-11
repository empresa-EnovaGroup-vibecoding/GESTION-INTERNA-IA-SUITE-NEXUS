import { useState, useEffect, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { MetodoPago, MonedaPago, PaisCliente } from '@/types';
import { format } from 'date-fns';
import { Plus, Upload, Loader2, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabaseExternal } from '@/lib/supabaseExternal';

const METODOS: MetodoPago[] = [
  'Binance Pay', 'Binance P2P', 'Transferencia bancaria',
  'Zelle', 'Nequi', 'Mercado Pago', 'PayPal', 'Efectivo',
];

const MONEDAS: { value: MonedaPago; label: string }[] = [
  { value: 'USD', label: 'USD - Dolar' },
  { value: 'MXN', label: 'MXN - Peso Mexicano' },
  { value: 'COP', label: 'COP - Peso Colombiano' },
];

const PAIS_MONEDA: Record<PaisCliente, MonedaPago> = {
  Venezuela: 'USD',
  Ecuador: 'USD',
  Colombia: 'COP',
  Mexico: 'MXN',
};

function mapMoneda(moneda: string | null): MonedaPago {
  if (!moneda) return 'USD';
  const upper = moneda.toUpperCase();
  if (upper === 'MXN') return 'MXN';
  if (upper === 'COP') return 'COP';
  return 'USD';
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface ExtractedData {
  monto: number | null;
  moneda: string | null;
  fecha: string | null;
  metodo: string | null;
  referencia: string | null;
  remitente: string | null;
}

export default function RegistrarPagoDialog() {
  const { clientes, addPago } = useData();
  const [open, setOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [aiData, setAiData] = useState<ExtractedData | null>(null);
  const [pagosRegistrados, setPagosRegistrados] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    clienteId: '',
    monto: '',
    metodo: '' as MetodoPago | '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    moneda: 'USD' as MonedaPago,
    tasaCambio: '',
    referencia: '',
  });

  useEffect(() => {
    if (form.clienteId) {
      const cliente = clientes.find(c => c.id === form.clienteId);
      if (cliente?.pais) {
        const moneda = PAIS_MONEDA[cliente.pais];
        setForm(f => ({ ...f, moneda, tasaCambio: moneda === 'USD' ? '' : f.tasaCambio }));
      }
    }
  }, [form.clienteId, clientes]);

  const needsRate = form.moneda !== 'USD';
  const tasaCambio = parseFloat(form.tasaCambio) || 0;
  const montoOriginal = parseFloat(form.monto) || 0;
  const montoUSD = needsRate && tasaCambio > 0
    ? Math.round((montoOriginal / tasaCambio) * 100) / 100
    : montoOriginal;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setImageFile(file);

    setAnalyzing(true);
    try {
      const base64 = await fileToBase64(file);
      const { supabase } = await import('@/integrations/supabase/client');
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/extract-receipt`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
          },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type || 'image/jpeg',
          }),
        }
      );

      const result = await response.json();

      if (result.success && result.data) {
        const d = result.data as ExtractedData;
        setAiData(d);

        setForm(f => ({
          ...f,
          monto: d.monto != null ? String(d.monto) : f.monto,
          moneda: d.moneda ? mapMoneda(d.moneda) : f.moneda,
          metodo: (d.metodo || f.metodo) as MetodoPago | '',
          fecha: d.fecha || f.fecha,
          referencia: d.referencia ? String(d.referencia) : f.referencia,
        }));

        if (d.remitente) {
          const name = String(d.remitente).toLowerCase();
          const match = clientes.find(c =>
            c.nombre.toLowerCase().includes(name) ||
            name.includes(c.nombre.toLowerCase())
          );
          if (match) {
            setForm(f => ({ ...f, clienteId: match.id }));
          }
        }

        toast.success('Comprobante analizado. Revisa los datos.');
      } else {
        toast.error('No se pudo analizar el comprobante');
      }
    } catch (err) {
      console.error('Error analyzing receipt:', err);
      toast.error('Error al analizar la imagen');
    } finally {
      setAnalyzing(false);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageFile(null);
    setAiData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clienteId || !form.metodo || !form.monto) return;
    if (needsRate && tasaCambio <= 0) {
      toast.error('Ingresa la tasa de cambio');
      return;
    }

    let comprobanteUrl: string | undefined;
    if (imageFile) {
      const ext = imageFile.name.split('.').pop() || 'jpg';
      const path = 'comprobante-' + Date.now() + '.' + ext;
      const { error: uploadError } = await supabaseExternal.storage
        .from('comprobantes')
        .upload(path, imageFile, { upsert: true });

      if (uploadError) {
        toast.error('Error al subir comprobante');
        console.error(uploadError);
      } else {
        const { data: urlData } = supabaseExternal.storage
          .from('comprobantes')
          .getPublicUrl(path);
        comprobanteUrl = urlData.publicUrl;
      }
    }

    addPago({
      clienteId: form.clienteId,
      monto: montoUSD,
      montoOriginal: needsRate ? montoOriginal : undefined,
      moneda: needsRate ? form.moneda : undefined,
      tasaCambio: needsRate ? tasaCambio : undefined,
      metodo: form.metodo as MetodoPago,
      fecha: form.fecha,
      referencia: form.referencia || undefined,
      comprobanteUrl,
      datosExtraidos: aiData ? (aiData as unknown as Record<string, unknown>) : undefined,
    });

    const count = pagosRegistrados + 1;
    setPagosRegistrados(count);
    toast.success('Pago #' + count + ' registrado: $' + montoUSD.toFixed(2) + ' USD');

    // Keep clienteId, moneda, metodo, tasaCambio for fast re-entry
    const keepClienteId = form.clienteId;
    const keepMoneda = form.moneda;
    const keepMetodo = form.metodo;
    const keepTasa = form.tasaCambio;
    clearImage();
    setForm({
      clienteId: keepClienteId,
      monto: '',
      metodo: keepMetodo,
      fecha: format(new Date(), 'yyyy-MM-dd'),
      moneda: keepMoneda,
      tasaCambio: keepTasa,
      referencia: '',
    });
  };

  const resetForm = () => {
    setForm({
      clienteId: '', monto: '', metodo: '' as MetodoPago | '', moneda: 'USD', tasaCambio: '',
      fecha: format(new Date(), 'yyyy-MM-dd'), referencia: '',
    });
    clearImage();
    setPagosRegistrados(0);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Registrar Pago
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Registrar Pago de Cliente</DialogTitle>
            {pagosRegistrados > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                <CheckCircle2 className="h-3 w-3" />
                {pagosRegistrados} registrado{pagosRegistrados !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Upload comprobante */}
          <div className="space-y-2">
            <Label>Comprobante de pago (opcional)</Label>
            {!imagePreview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analizando comprobante...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Subir foto del comprobante
                  </>
                )}
              </button>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img
                  src={imagePreview}
                  alt="Comprobante"
                  className="w-full max-h-40 object-cover"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
                {analyzing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="flex items-center gap-2 rounded-lg bg-black/70 px-4 py-2 text-sm text-white">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analizando...
                    </div>
                  </div>
                )}
                {aiData && !analyzing && (
                  <div className="absolute bottom-0 left-0 right-0 bg-emerald-600/90 px-3 py-1.5 text-xs font-medium text-white">
                    Datos extraidos automaticamente
                  </div>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={form.clienteId} onValueChange={v => setForm(f => ({ ...f, clienteId: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
              <SelectContent>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre} {c.pais ? '(' + c.pais + ')' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {aiData && aiData.remitente && (
              <p className="text-xs text-muted-foreground">
                IA detecto: <span className="font-medium text-foreground">{String(aiData.remitente)}</span>
              </p>
            )}
          </div>

          {/* Moneda + Monto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select value={form.moneda} onValueChange={v => setForm(f => ({ ...f, moneda: v as MonedaPago, tasaCambio: v === 'USD' ? '' : f.tasaCambio }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONEDAS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto ({form.moneda})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.monto}
                onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                placeholder={'Ej: ' + (form.moneda === 'MXN' ? '82' : form.moneda === 'COP' ? '16000' : '4')}
                required
              />
            </div>
          </div>

          {/* Tasa de cambio (only for non-USD) */}
          {needsRate && (
            <div className="space-y-2">
              <Label>Tasa de cambio (1 USD = ? {form.moneda})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.tasaCambio}
                onChange={e => setForm(f => ({ ...f, tasaCambio: e.target.value }))}
                placeholder={form.moneda === 'MXN' ? 'Ej: 20.5' : 'Ej: 4000'}
                required
              />
              {montoOriginal > 0 && tasaCambio > 0 && (
                <div className="rounded-md bg-muted/50 p-2.5 text-sm">
                  <span className="text-muted-foreground">
                    {montoOriginal.toLocaleString()} {form.moneda} / {tasaCambio} ={' '}
                  </span>
                  <span className="font-semibold text-success">
                    ${montoUSD.toFixed(2)} USD
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Metodo + Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Metodo</Label>
              <Select value={form.metodo} onValueChange={v => setForm(f => ({ ...f, metodo: v as MetodoPago }))}>
                <SelectTrigger><SelectValue placeholder="Metodo..." /></SelectTrigger>
                <SelectContent>
                  {METODOS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
            </div>
          </div>

          {/* Referencia */}
          <div className="space-y-2">
            <Label>Referencia / No. transaccion (opcional)</Label>
            <Input
              value={form.referencia}
              onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
              placeholder="Ej: 4928788"
              maxLength={200}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={!form.clienteId || !form.metodo || !form.monto || (needsRate && tasaCambio <= 0) || analyzing}
            >
              {analyzing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizando...</>
              ) : (
                <>Registrar {montoUSD > 0 ? '- $' + montoUSD.toFixed(2) + ' USD' : ''}</>
              )}
            </Button>
            {pagosRegistrados > 0 && (
              <Button type="button" variant="outline" onClick={handleClose}>
                Listo
              </Button>
            )}
          </div>

          {pagosRegistrados > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              El formulario se limpia para registrar el siguiente pago. Click "Listo" para cerrar.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
