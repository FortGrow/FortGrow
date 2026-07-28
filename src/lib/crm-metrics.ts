/**
 * Indicadores do CRM do Cliente.
 *
 * Tudo é calculado a partir dos leads e das etapas na hora da consulta —
 * não há tabela de métricas materializada. Motivo: com CRM de cliente, os
 * números precisam bater com o quadro na mesma hora em que o cartão é
 * arrastado; uma tabela agregada criaria uma janela em que o dashboard
 * mostra um número e o funil mostra outro. Os índices por
 * (clientId, stageId) e (clientId, createdAt) sustentam isso com folga no
 * volume de um CRM por empresa.
 */

export type MetricLead = {
  stage: { id: string; name: string; color: string; kind: string; position: number };
  owner: { id: string; name: string } | null;
  source: string | null;
  estimatedValue: unknown;
  wonValue: unknown;
  createdAt: Date;
  closedAt: Date | null;
  lastContactAt: Date | null;
  nextContactAt: Date | null;
  score: number;
};

const n = (v: unknown) => Number(v ?? 0);
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export type CrmMetrics = ReturnType<typeof computeMetrics>;

export function computeMetrics(leads: MetricLead[], stages: { id: string; name: string; color: string; kind: string }[]) {
  const abertos = leads.filter((l) => l.stage.kind === "ABERTO");
  const ganhos = leads.filter((l) => l.stage.kind === "GANHO");
  const perdidos = leads.filter((l) => l.stage.kind === "PERDIDO");
  const fechados = ganhos.length + perdidos.length;

  // Primeira etapa do funil = "leads novos" (o que entrou e ninguém tocou)
  const primeira = stages.find((s) => s.kind === "ABERTO");
  const novos = leads.filter((l) => l.stage.id === primeira?.id).length;
  // "Em negociação" = aberto e já saiu da primeira etapa
  const emNegociacao = abertos.filter((l) => l.stage.id !== primeira?.id).length;

  const receitaPrevista = abertos.reduce((s, l) => s + n(l.estimatedValue), 0);
  const receitaFechada = ganhos.reduce((s, l) => s + (l.wonValue !== null ? n(l.wonValue) : n(l.estimatedValue)), 0);
  const valorPerdido = perdidos.reduce((s, l) => s + n(l.estimatedValue), 0);

  const conversao = fechados > 0 ? (ganhos.length / fechados) * 100 : 0;
  const ticketMedio = ganhos.length > 0 ? receitaFechada / ganhos.length : 0;

  // Tempo médio de conversão: só leads ganhos que têm data de fechamento
  const ciclos = ganhos
    .filter((l) => l.closedAt)
    .map((l) => (l.closedAt!.getTime() - l.createdAt.getTime()) / 86400000);
  const cicloMedio = ciclos.length ? ciclos.reduce((s, d) => s + d, 0) / ciclos.length : 0;

  // ── Distribuições ──
  const porOrigem = agrupar(leads, (l) => l.source?.trim() || "Sem origem");
  const ganhosPorOrigem = agrupar(ganhos, (l) => l.source?.trim() || "Sem origem");
  const melhorCanal = [...ganhosPorOrigem].sort((a, b) => b.value - a.value)[0] ?? null;

  const porVendedor = agrupar(ganhos, (l) => l.owner?.name ?? "Sem responsável");
  const melhorVendedor = [...porVendedor].sort((a, b) => b.value - a.value)[0] ?? null;

  const funil = stages
    .filter((s) => s.kind !== "PERDIDO")
    .map((s) => ({ label: s.name, value: leads.filter((l) => l.stage.id === s.id).length }));

  const porEtapa = stages.map((s) => ({
    label: s.name,
    color: s.color,
    value: leads.filter((l) => l.stage.id === s.id).length,
    receita: leads
      .filter((l) => l.stage.id === s.id)
      .reduce((acc, l) => acc + n(l.estimatedValue), 0),
  }));

  // ── Série mensal dos últimos 12 meses ──
  const hoje = new Date();
  const meses: { label: string; criados: number; ganhos: number; receita: number; conversao: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const fim = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
    const dentro = (d: Date | null) => !!d && d >= ref && d < fim;

    const criados = leads.filter((l) => dentro(l.createdAt)).length;
    const g = ganhos.filter((l) => dentro(l.closedAt));
    const p = perdidos.filter((l) => dentro(l.closedAt)).length;
    meses.push({
      label: `${MES[ref.getMonth()]}/${String(ref.getFullYear()).slice(2)}`,
      criados,
      ganhos: g.length,
      receita: g.reduce((s, l) => s + (l.wonValue !== null ? n(l.wonValue) : n(l.estimatedValue)), 0),
      conversao: g.length + p > 0 ? Math.round((g.length / (g.length + p)) * 100) : 0,
    });
  }

  // ── Alertas operacionais ──
  const agora = Date.now();
  const semContato = abertos.filter(
    (l) => agora - (l.lastContactAt ?? l.createdAt).getTime() > 7 * 86400000
  ).length;
  const atrasados = leads.filter((l) => l.nextContactAt && l.nextContactAt.getTime() < agora).length;
  const quentes = abertos.filter((l) => l.score >= 65).length;

  return {
    total: leads.length,
    novos,
    emNegociacao,
    ganhos: ganhos.length,
    perdidos: perdidos.length,
    conversao,
    ticketMedio,
    receitaPrevista,
    receitaFechada,
    valorPerdido,
    cicloMedio,
    melhorCanal,
    melhorVendedor,
    porOrigem,
    porVendedor,
    porEtapa,
    funil,
    meses,
    semContato,
    atrasados,
    quentes,
  };
}

function agrupar<T>(rows: T[], key: (r: T) => string) {
  const map = new Map<string, number>();
  for (const r of rows) map.set(key(r), (map.get(key(r)) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}
