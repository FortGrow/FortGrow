/**
 * Competência de uma cobrança: em que MÊS ela conta no faturamento.
 *
 * A receita entra no mês da competência, não do pagamento — a comissão de
 * julho recebida em agosto é faturamento de julho. A competência vem, nesta
 * ordem, do período apurado gravado na fatura (`periodEnd`), da marca
 * "· MM/AAAA" (mensalidades), ou do "Comissão <mês>/<ano>" da descrição
 * (nome ou número). Sem nada disso, vale a data do pagamento/vencimento.
 *
 * Regra única usada pelo Faturamento e pelo cálculo de comissões de
 * colaboradores, para os dois nunca discordarem sobre o mês de uma fatura.
 */

const MES_NOME: Record<string, number> = {
  janeiro: 0, fevereiro: 1, ["março"]: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

export type FaturaCompetencia = {
  periodEnd: Date | null;
  description: string;
  paidAt: Date | null;
  dueDate: Date;
};

export function competenciaDe(i: Pick<FaturaCompetencia, "periodEnd" | "description">): { y: number; m: number } | null {
  if (i.periodEnd) return { y: i.periodEnd.getFullYear(), m: i.periodEnd.getMonth() };
  const mm = i.description.match(/·\s*(\d{2})\/(\d{4})\b/);
  if (mm) return { y: Number(mm[2]), m: Number(mm[1]) - 1 };
  const nome = i.description.match(/^Comissão\s+([a-zç]+)\/(\d{4})/i);
  if (nome && MES_NOME[nome[1].toLowerCase()] !== undefined) {
    return { y: Number(nome[2]), m: MES_NOME[nome[1].toLowerCase()] };
  }
  const num = i.description.match(/^Comissão\s+(\d{1,2})\/(\d{4})/i);
  if (num && Number(num[1]) >= 1 && Number(num[1]) <= 12) {
    return { y: Number(num[2]), m: Number(num[1]) - 1 };
  }
  return null;
}

/** Mês (0–11) em que a fatura conta dentro do ano `year` sendo exibido. */
export function mesDaFatura(i: FaturaCompetencia, year: number): number {
  const comp = competenciaDe(i);
  if (comp && comp.y === year) return comp.m;
  return (i.paidAt ?? i.dueDate).getMonth();
}
