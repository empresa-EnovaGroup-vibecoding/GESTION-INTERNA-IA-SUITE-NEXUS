import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';

interface Props {
  totalGastos: number;
  totalIngresos: number;
  ganancia: number;
  clientesQueDeben: number;
}

export default function FinanzasResumen({ totalGastos, totalIngresos, ganancia, clientesQueDeben }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="stat-card">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Gastos del Mes</p>
          <TrendingDown className="h-4 w-4 text-destructive" />
        </div>
        <p className="mt-2 text-2xl font-bold text-destructive">${totalGastos.toLocaleString()}</p>
        <p className="text-[11px] text-muted-foreground mt-1">Lo que pagas a proveedores</p>
      </div>

      <div className="stat-card">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Ingresos del Mes</p>
          <TrendingUp className="h-4 w-4 text-success" />
        </div>
        <p className="mt-2 text-2xl font-bold text-success">${totalIngresos.toLocaleString()}</p>
        <p className="text-[11px] text-muted-foreground mt-1">Lo que cobras a clientes</p>
      </div>

      <div className="stat-card">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Ganancia Neta</p>
          <DollarSign className="h-4 w-4 text-primary" />
        </div>
        <p className={`mt-2 text-2xl font-bold ${ganancia >= 0 ? 'text-success' : 'text-destructive'}`}>
          ${ganancia.toLocaleString()}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">Ingresos - Gastos</p>
      </div>

      <div className="stat-card">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Clientes que Deben</p>
          <AlertCircle className="h-4 w-4 text-warning" />
        </div>
        <p className="mt-2 text-2xl font-bold text-warning">{clientesQueDeben}</p>
        <p className="text-[11px] text-muted-foreground mt-1">Sin pago este mes</p>
      </div>
    </div>
  );
}
