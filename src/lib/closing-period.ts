/**
 * Período de apuração dos contratos por comissão.
 *
 * Nem todo cliente variável fecha do dia 1 ao fim do mês: a Axton, por
 * exemplo, fecha do dia 20 ao dia 20 — a comissão da competência de julho
 * apura as vendas de 21/06 a 20/07. O `closingDay` do cliente guarda esse
 * dia; null significa mês civil.
 *
 * Convenção adotada (e mostrada por extenso na tela): o dia de fechamento
 * é o ÚLTIMO dia incluído. Fechamento 20 → o período vai do dia 21 do mês
 * anterior até o dia 20 do mês da competência. Assim uma venda do próprio
 * dia 20 conta uma vez só, na competência que fecha nela.
 *
 * Módulo puro (sem I/O): usado no servidor para calcular e no navegador
 * para pré-visualizar o período no formulário.
 */

export type Periodo = {
  /** Primeiro dia incluído na apuração */
  from: Date;
  /** Último dia incluído na apuração */
  to: Date;
};

/**
 * Janela de apuração da competência `year`/`month` (mês 1–12).
 *
 * Com `closingDay` (1–28): de (closingDay+1)/mês-anterior a closingDay/mês.
 * Sem: o mês civil inteiro.
 */
export function closingPeriod(year: number, month: number, closingDay: number | null | undefined): Periodo {
  const m0 = month - 1;
  if (!closingDay || closingDay < 1 || closingDay > 28) {
    return {
      from: new Date(year, m0, 1, 12),
      to: new Date(year, m0 + 1, 0, 12), // dia 0 do mês seguinte = último dia do mês
    };
  }
  return {
    from: new Date(year, m0 - 1, closingDay + 1, 12),
    to: new Date(year, m0, closingDay, 12),
  };
}

const dmy = (d: Date) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

/** "21/06/2026 a 20/07/2026" — como o período aparece em tela e na fatura. */
export function periodoLabel(p: Periodo): string {
  return `${dmy(p.from)} a ${dmy(p.to)}`;
}

export const MONTH_NAMES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
] as const;

/** "julho/2026" — rótulo da competência. */
export function competenciaLabel(year: number, month: number): string {
  return `${MONTH_NAMES_PT[month - 1]}/${year}`;
}
