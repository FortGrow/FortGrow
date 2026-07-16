"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, GRID_STROKE, AXIS_TICK, TOOLTIP_STYLE } from "./theme";
import { makeFormatter, type Series, type ValueFormat } from "./trend-chart";

/** Gráfico de barras — pontas arredondadas, tooltip por marca, legenda p/ 2+ séries. */
export function BarsChart({
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
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v) => axisFormatter(Number(v))}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: "rgba(148,163,184,0.06)" }}
          formatter={(v: number, name: string) => [formatter(v), name]}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={CHART_COLORS[i % 4]} radius={[4, 4, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
