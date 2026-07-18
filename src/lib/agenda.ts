import { createHmac } from "crypto";

/** Tipos de evento da Agenda (rótulos pt-BR + cor no calendário). */
export const EVENT_TYPES: Record<string, { label: string; color: string }> = {
  REUNIAO_CLIENTE: { label: "Reunião com cliente", color: "#0284c7" },
  CAPTACAO: { label: "Captação / venda", color: "#059669" },
  ALINHAMENTO: { label: "Alinhamento interno", color: "#8b5cf6" },
  FOLLOW_UP: { label: "Tarefa / follow-up", color: "#d97706" },
};

export const EVENT_STATUS_LABELS: Record<string, string> = {
  CONFIRMADO: "Confirmado",
  PENDENTE: "Pendente",
  CANCELADO: "Cancelado",
};

/** Token estável do feed iCalendar (derivado do AUTH_SECRET) — sem estado no banco. */
export function icsToken(): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "fortgrow-dev-secret")
    .update("fortgrow-agenda-ics")
    .digest("hex")
    .slice(0, 32);
}
