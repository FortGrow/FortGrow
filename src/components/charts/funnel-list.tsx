import { CHART_COLORS } from "./theme";
import { num } from "@/lib/utils";

/** Funil comercial como barras horizontais proporcionais com rótulos diretos. */
export function FunnelList({ steps }: { steps: { label: string; value: number }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={s.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-400">{s.label}</span>
            <span className="font-semibold text-slate-200">{num(s.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink-700/60">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(s.value / max) * 100}%`, backgroundColor: CHART_COLORS[i % 4] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
