/**
 * Domínio do CRM do Cliente — taxonomia e regras puras.
 *
 * Módulo sem I/O: roda no servidor e no navegador, então rótulos, cores e
 * cálculos ficam idênticos nos dois lados (a métrica do dashboard e o
 * chip do cartão nunca divergem).
 */

/** Etapas criadas para toda empresa nova. `kind` é o que o dashboard lê. */
export const DEFAULT_STAGES = [
  { name: "Novos Leads", color: "#64748b", kind: "ABERTO", probability: 10 },
  { name: "Primeiro Contato", color: "#0284c7", kind: "ABERTO", probability: 20 },
  { name: "Qualificação", color: "#06b6d4", kind: "ABERTO", probability: 35 },
  { name: "Proposta Enviada", color: "#6366f1", kind: "ABERTO", probability: 55 },
  { name: "Negociação", color: "#d97706", kind: "ABERTO", probability: 75 },
  { name: "Fechado", color: "#059669", kind: "GANHO", probability: 100 },
  { name: "Perdido", color: "#e11d48", kind: "PERDIDO", probability: 0 },
] as const;

export const STAGE_KINDS = ["ABERTO", "GANHO", "PERDIDO"] as const;
export type StageKind = (typeof STAGE_KINDS)[number];

export const STAGE_KIND_LABELS: Record<string, string> = {
  ABERTO: "Em aberto",
  GANHO: "Ganho",
  PERDIDO: "Perdido",
};

/** Origens sugeridas — o campo aceita texto livre, isto é só o atalho. */
export const CRM_SOURCES = [
  "Indicação",
  "Tráfego Pago",
  "Orgânico / SEO",
  "Instagram",
  "WhatsApp",
  "Site",
  "Evento",
  "Prospecção Ativa",
  "Outro",
] as const;

/** Tipos de atividade agendável — cada um com cor e rótulo no calendário. */
export const TASK_TYPES: Record<string, { label: string; color: string; icon: string }> = {
  LIGACAO: { label: "Ligação", color: "#0284c7", icon: "phone" },
  REUNIAO: { label: "Reunião", color: "#8b5cf6", icon: "users" },
  TAREFA: { label: "Tarefa", color: "#64748b", icon: "check" },
  FOLLOW_UP: { label: "Follow-up", color: "#d97706", icon: "repeat" },
  PROPOSTA: { label: "Envio de proposta", color: "#059669", icon: "file" },
  LEMBRETE: { label: "Lembrete", color: "#e11d48", icon: "bell" },
};

export const TASK_TYPE_KEYS = Object.keys(TASK_TYPES);

/** Tipos de evento da linha do tempo do lead. */
export const ACTIVITY_TYPES: Record<string, { label: string; color: string }> = {
  CRIACAO: { label: "Criação", color: "#059669" },
  ETAPA: { label: "Mudança de etapa", color: "#0284c7" },
  NOTA: { label: "Observação", color: "#8b5cf6" },
  EDICAO: { label: "Alteração", color: "#64748b" },
  ARQUIVO: { label: "Arquivo", color: "#06b6d4" },
  TAREFA: { label: "Atividade", color: "#d97706" },
  CONTATO: { label: "Contato", color: "#6366f1" },
  EXCLUSAO: { label: "Exclusão", color: "#e11d48" },
};

/** Antecedências de lembrete oferecidas na interface. */
export const REMINDERS = [
  { min: 0, label: "Na hora" },
  { min: 15, label: "15 minutos antes" },
  { min: 60, label: "1 hora antes" },
  { min: 1440, label: "1 dia antes" },
] as const;

export const TEMPERATURES: Record<string, { label: string; color: string }> = {
  QUENTE: { label: "Quente", color: "#e11d48" },
  MORNO: { label: "Morno", color: "#d97706" },
  FRIO: { label: "Frio", color: "#0284c7" },
};

/**
 * Lead Score 0–100.
 *
 * Soma sinais de que o negócio anda: quanto ele vale, quão fundo está no
 * funil, quão completo é o cadastro (dá para falar com a pessoa?) e há
 * quanto tempo ninguém encosta nele. O último termo é negativo de
 * propósito — lead parado esfria, e o score precisa mostrar isso sozinho,
 * sem alguém lembrar de rebaixar na mão.
 */
export function computeScore(lead: {
  estimatedValue: number;
  stageProbability: number;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  company?: string | null;
  daysSinceContact: number | null;
}): number {
  // Valor (0–30): R$ 50k+ satura a faixa
  const valor = Math.min(30, Math.round((lead.estimatedValue / 50000) * 30));
  // Avanço no funil (0–35)
  const funil = Math.round((lead.stageProbability / 100) * 35);
  // Cadastro completo (0–20): 5 por canal de contato + empresa
  const contato =
    (lead.email ? 5 : 0) + (lead.phone ? 5 : 0) + (lead.whatsapp ? 5 : 0) + (lead.company ? 5 : 0);
  // Aquecimento (−25 a +15): recém-tocado sobe, esquecido derruba
  const d = lead.daysSinceContact;
  const calor = d === null ? 0 : d <= 2 ? 15 : d <= 7 ? 8 : d <= 14 ? 0 : d <= 30 ? -12 : -25;

  return Math.max(0, Math.min(100, valor + funil + contato + calor));
}

export function temperatureOf(score: number): string {
  return score >= 65 ? "QUENTE" : score >= 35 ? "MORNO" : "FRIO";
}

/** Dias corridos desde uma data (null quando nunca houve contato). */
export function daysSince(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const ms = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

/** Rótulo curto de "há quanto tempo" para cartões e listas. */
export function agoLabel(days: number | null): string {
  if (days === null) return "sem contato";
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const meses = Math.floor(days / 30);
  return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
}
