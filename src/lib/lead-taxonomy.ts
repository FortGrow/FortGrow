/**
 * Taxonomia unificada de Prospecção + CRM Comercial: origens, status de
 * prospecção e etapas do funil compartilham o mesmo padrão visual de cards
 * (cor de fundo pela etapa/status). Módulo puro — usável em server e client.
 */

export const LEAD_SOURCES = [
  { key: "INDICACAO", label: "Indicação" },
  { key: "TRAFEGO_PAGO", label: "Tráfego Pago" },
  { key: "ORGANICO", label: "Orgânico" },
  { key: "SOCIAL", label: "Social" },
  { key: "OUTRO", label: "Outro" },
] as const;

/** Origens antigas eram texto livre — mapeia para a lista fixa (sem perder o valor salvo). */
export function normalizeLeadSource(raw: string | null | undefined): string {
  if (!raw) return "OUTRO";
  const v = raw.trim().toUpperCase();
  const byKey = LEAD_SOURCES.find((s) => s.key === v);
  if (byKey) return byKey.key;
  const flat = v.normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (flat.includes("INDICA")) return "INDICACAO";
  if (flat.includes("TRAFEGO") || flat.includes("ADS") || flat.includes("PAGO")) return "TRAFEGO_PAGO";
  if (flat.includes("ORGANIC") || flat.includes("SEO") || flat.includes("GOOGLE")) return "ORGANICO";
  if (flat.includes("SOCIAL") || flat.includes("INSTAGRAM") || flat.includes("FACEBOOK") || flat.includes("LINKEDIN")) return "SOCIAL";
  return "OUTRO";
}

export const sourceLabel = (raw: string | null | undefined) =>
  LEAD_SOURCES.find((s) => s.key === normalizeLeadSource(raw))?.label ?? "Outro";

export const PROSPECT_STATUSES = [
  { key: "NOVO", label: "Novo", color: "#64748b" },
  { key: "CONTATADO", label: "Contatado", color: "#0284c7" },
  { key: "EM_CONVERSA", label: "Em conversa", color: "#8b5cf6" },
  { key: "QUALIFICADO", label: "Qualificado", color: "#059669" },
] as const;

export const FUNNEL_STAGES = [
  { key: "LEAD", label: "Lead", color: "#64748b" },
  { key: "CONTATO", label: "Contato iniciado", color: "#0284c7" },
  { key: "DIAGNOSTICO", label: "Diagnóstico", color: "#06b6d4" },
  { key: "REUNIAO", label: "Reunião agendada", color: "#8b5cf6" },
  { key: "PROPOSTA", label: "Proposta enviada", color: "#6366f1" },
  { key: "NEGOCIACAO", label: "Negociação", color: "#d97706" },
  { key: "FECHADO", label: "Fechado (ganho)", color: "#059669" },
  { key: "PERDIDO", label: "Perdido", color: "#e11d48" },
] as const;

/** Fundo do card no mesmo estilo dos boards coloridos (gradiente sobre o tema escuro). */
export const cardGradient = (hex: string) => `linear-gradient(140deg, ${hex}d9, ${hex}8c)`;
