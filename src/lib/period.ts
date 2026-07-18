export const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function parsePeriod(searchParams: { ano?: string; mes?: string }) {
  const now = new Date();
  const year = Number(searchParams.ano) || now.getFullYear();
  const month = Math.min(12, Math.max(1, Number(searchParams.mes) || now.getMonth() + 1));
  return { year, month };
}
