"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, GRID_STROKE, AXIS_TICK, TOOLTIP_STYLE } from "./theme";

export type Series = { key: string; label: string };
export type ValueFormat = "number" | "brl";

/** Formatação resolvida no cliente — props de gráfico precisam ser serializáveis. */
export function makeFormatter(format: ValueFormat | undefined, compact = false) {
  if (format === "brl") {
    return (v: number) =>
      Number(v).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
        ...(compact ? { notation: "compact" as const } : {}),
      });
  }
  return (v: number) => Number(v).toLocaleString("pt-BR", compact ? { notation: "compact" } : {});
}

/**
 * Gráfico de tendência (área) — 1 eixo Y, tooltip com crosshair,
 * legenda apenas quando há 2+ séries.
 */
export function TrendChart({
  data,
  series,
  height = 260,
  format,
}: {
  data: Record<string, unknown>[];
  series: Series[];
  height?: number;
  format?: ValueFormat;
}) {
  const formatter = makeFormatter(format);
  const axisFormatter = makeFormatter(format, true);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS[i % 4]} stopOpacity={0.25} />
              <stop offset="100%" stopColor={CHART_COLORS[i % 4]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v) => axisFormatter(Number(v))}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ stroke: "rgba(148,163,184,0.3)", strokeDasharray: "4 4" }}
          formatter={(v: number, name: string) => [formatter(v), name]}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />}
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={CHART_COLORS[i % 4]}
            strokeWidth={2}
            fill={`url(#grad-${s.key})`}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
