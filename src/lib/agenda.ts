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

export const RECURRENCE_LABELS: Record<string, string> = {
  NENHUMA: "Não se repete",
  SEMANAL: "Toda semana",
  MENSAL: "Todo mês",
  ANUAL: "Todo ano",
};

/**
 * Expande as ocorrências de um evento (com ou sem recorrência) dentro da
 * janela [from, to). Meses curtos: dia 31 vira o último dia do mês.
 */
export function expandOccurrences(
  event: { start: Date; end: Date; recurrence: string; recurrenceUntil: Date | null },
  from: Date,
  to: Date
): { start: Date; end: Date }[] {
  const duration = event.end.getTime() - event.start.getTime();
  const until = event.recurrenceUntil ?? to;
  const out: { start: Date; end: Date }[] = [];
  const push = (start: Date) => {
    if (start >= from && start < to && start <= until) out.push({ start, end: new Date(start.getTime() + duration) });
  };

  if (event.recurrence === "SEMANAL") {
    const start = new Date(event.start);
    // pula direto para perto da janela (evita iterar anos de semanas)
    if (start < from) {
      const weeks = Math.floor((from.getTime() - start.getTime()) / (7 * 86400000));
      start.setDate(start.getDate() + weeks * 7);
    }
    for (let i = 0; i < 400 && start < to && start <= until; i++) {
      push(new Date(start));
      start.setDate(start.getDate() + 7);
    }
  } else if (event.recurrence === "MENSAL") {
    const base = new Date(event.start);
    const cursor = new Date(base);
    for (let i = 0; i < 240 && cursor < to && cursor <= until; i++) {
      push(new Date(cursor));
      const next = new Date(base);
      next.setMonth(base.getMonth() + i + 1);
      // dia 31 em mês curto → último dia do mês
      if (next.getDate() !== base.getDate()) next.setDate(0);
      cursor.setTime(next.getTime());
    }
  } else if (event.recurrence === "ANUAL") {
    const cursor = new Date(event.start);
    for (let i = 0; i < 30 && cursor < to && cursor <= until; i++) {
      push(new Date(cursor));
      cursor.setFullYear(cursor.getFullYear() + 1);
    }
  } else {
    push(new Date(event.start));
  }
  return out;
}

/** Token estável do feed iCalendar (derivado do AUTH_SECRET) — sem estado no banco. */
export function icsToken(): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "fortgrow-dev-secret")
    .update("fortgrow-agenda-ics")
    .digest("hex")
    .slice(0, 32);
}
