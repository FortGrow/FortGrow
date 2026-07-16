/**
 * Paleta categórica dos gráficos — validada para superfície escura (#10141c):
 * lightness band, chroma, separação CVD e contraste ≥ 3:1.
 * Ordem fixa: nunca ciclar nem reordenar por ranking.
 */
export const CHART_COLORS = ["#0284c7", "#059669", "#8b5cf6", "#d97706"] as const;

export const GRID_STROKE = "rgba(148,163,184,0.08)";
export const AXIS_TICK = { fill: "#64748b", fontSize: 11 } as const;

export const TOOLTIP_STYLE = {
  backgroundColor: "#141926",
  border: "1px solid rgba(148,163,184,0.2)",
  borderRadius: 12,
  fontSize: 12,
  color: "#e2e8f0",
} as const;
