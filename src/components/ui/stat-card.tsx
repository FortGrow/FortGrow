import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  delta,
  accent = "brand",
  lowerIsBetter = false,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number;
  accent?: "brand" | "grow" | "warn" | "danger" | "violet";
  /** Métricas de custo (CAC, CPL…): queda é boa notícia — inverte a cor da variação. */
  lowerIsBetter?: boolean;
}) {
  const accentBar = {
    brand: "bg-brand-500",
    grow: "bg-grow-500",
    warn: "bg-warn",
    danger: "bg-danger",
    violet: "bg-violet",
  }[accent];

  return (
    <div data-tilt className="card group relative overflow-hidden p-5 animate-fade-up">
      <span className={cn("absolute left-0 top-4 h-8 w-1 rounded-r-full opacity-80", accentBar)} />
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-100">{value}</p>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        {typeof delta === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-semibold",
              (lowerIsBetter ? delta <= 0 : delta >= 0) ? "text-grow-400" : "text-danger"
            )}
          >
            {delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
          </span>
        )}
        {hint && <span className="text-slate-500">{hint}</span>}
      </div>
    </div>
  );
}
