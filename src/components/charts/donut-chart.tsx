"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { TOOLTIP_STYLE } from "./theme";

export type DonutSlice = { label: string; value: number };

/** Paleta estendida para fatias (deriva da categórica, com variações). */
const SLICE_COLORS = [
  "#0284c7", "#059669", "#8b5cf6", "#d97706", "#0ea5e9",
  "#10b981", "#a78bfa", "#f59e0b", "#38bdf8", "#64748b",
];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Rosca de participação (% + valor) com legenda lateral.
 * Usada para mostrar quanto cada cliente representa no faturamento.
 */
export function DonutChart({ data, height = 260 }: { data: DonutSlice[]; height?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return <p className="text-sm text-slate-500">Sem dados no período.</p>;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-[220px] w-full max-w-[260px] shrink-0" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number, name: string) => [
                `${brl(value)} · ${((value / total) * 100).toFixed(1)}%`,
                name,
              ]}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="55%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-slate-300">{d.label}</span>
            <span className="shrink-0 font-semibold text-slate-200">{brl(d.value)}</span>
            <span className="w-14 shrink-0 text-right text-xs font-bold text-slate-400">
              {((d.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
