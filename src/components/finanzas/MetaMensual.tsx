import { useState, useEffect, useMemo } from 'react';
import { Target, Settings, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Props {
  totalIngresos: number;
  mesKey: string; // e.g. "2026-02" to store per-month goals
}

const STORAGE_KEY = 'finanzas_meta_mensual';

function getStoredGoals(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStoredGoal(mesKey: string, value: number) {
  const goals = getStoredGoals();
  goals[mesKey] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

export default function MetaMensual({ totalIngresos, mesKey }: Props) {
  const [meta, setMeta] = useState<number>(0);
  const [editValue, setEditValue] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    const goals = getStoredGoals();
    setMeta(goals[mesKey] || 0);
  }, [mesKey]);

  const porcentaje = useMemo(() => {
    if (meta <= 0) return 0;
    return Math.min(Math.round((totalIngresos / meta) * 100), 100);
  }, [totalIngresos, meta]);

  const porcentajeReal = useMemo(() => {
    if (meta <= 0) return 0;
    return Math.round((totalIngresos / meta) * 100);
  }, [totalIngresos, meta]);

  const faltante = meta > 0 ? Math.max(0, meta - totalIngresos) : 0;
  const metaAlcanzada = meta > 0 && totalIngresos >= meta;

  const handleSave = () => {
    const num = parseFloat(editValue);
    if (!isNaN(num) && num >= 0) {
      setMeta(num);
      setStoredGoal(mesKey, num);
      setPopoverOpen(false);
    }
  };

  const handleOpenEdit = () => {
    setEditValue(meta > 0 ? String(meta) : '');
    setPopoverOpen(true);
  };

  if (meta <= 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Target className="h-4 w-4" />
          <span className="text-sm">Sin meta de ingresos configurada para este mes</span>
        </div>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleOpenEdit}>
              <Target className="h-3.5 w-3.5" />
              Establecer meta
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <GoalEditor
              editValue={editValue}
              setEditValue={setEditValue}
              onSave={handleSave}
              onCancel={() => setPopoverOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Target className="h-4 w-4 text-primary" />
          Meta mensual de ingresos
        </h3>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpenEdit}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <GoalEditor
              editValue={editValue}
              setEditValue={setEditValue}
              onSave={handleSave}
              onCancel={() => setPopoverOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="relative">
          <Progress
            value={porcentaje}
            className={cn(
              'h-4 rounded-full',
              metaAlcanzada && '[&>div]:bg-emerald-500'
            )}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary-foreground mix-blend-difference">
            {porcentajeReal}%
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            ${totalIngresos.toLocaleString(undefined, { minimumFractionDigits: 2 })} de ${meta.toLocaleString()} USD
          </span>
          {metaAlcanzada ? (
            <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              ¡Meta alcanzada!
              {porcentajeReal > 100 && ` (+${porcentajeReal - 100}%)`}
            </span>
          ) : (
            <span className="text-muted-foreground">
              Faltan <span className="font-semibold text-foreground">${faltante.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalEditor({ editValue, setEditValue, onSave, onCancel }: {
  editValue: string;
  setEditValue: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold">Meta de ingresos (USD)</p>
      <Input
        type="number"
        placeholder="Ej: 500"
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSave()}
        className="h-8 text-sm"
        min={0}
        autoFocus
      />
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={onSave}>
          <Check className="h-3 w-3" />
          Guardar
        </Button>
        <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs gap-1" onClick={onCancel}>
          <X className="h-3 w-3" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
