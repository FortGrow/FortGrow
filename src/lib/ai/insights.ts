/**
 * Módulo de Inteligência — motor de análise do FortGrow.
 *
 * Gera insights determinísticos a partir dos dados do banco (funil, campanhas,
 * financeiro) e calcula forecast de faturamento e risco de churn por cliente.
 * Quando OPENAI_API_KEY está configurada, o resumo executivo é redigido pelo
 * LLM (ver llm.ts); sem chave, o resumo usa os próprios insights.
 */
import { prisma } from "@/lib/prisma";
import { sumTotals, kpis, type ChannelTotals } from "@/lib/metrics";

export type Insight = {
  severity: "positivo" | "atencao" | "critico";
  title: string;
  detail: string;
};

export type ClientIntelligence = {
  clientId: string;
  companyName: string;
  churnRisk: number; // 0–100
  churnLabel: "Baixo" | "Médio" | "Alto";
  churnFactors: string[];
  insights: Insight[];
};

const pctDelta = (cur: number, prev: number) =>
  prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0;

function label(risk: number): "Baixo" | "Médio" | "Alto" {
  return risk >= 60 ? "Alto" : risk >= 30 ? "Médio" : "Baixo";
}

/** Compara os últimos 30 dias com os 30 anteriores e aponta variações relevantes. */
function performanceInsights(cur: ChannelTotals, prev: ChannelTotals): Insight[] {
  const out: Insight[] = [];
  const leadsDelta = pctDelta(cur.leads, prev.leads);
  const cplCur = kpis.cpl(cur);
  const cplPrev = kpis.cpl(prev);
  const roasCur = kpis.roas(cur);

  if (leadsDelta <= -20) {
    out.push({
      severity: "critico",
      title: "Queda na geração de leads",
      detail: `Leads caíram ${Math.abs(leadsDelta).toFixed(0)}% vs. período anterior (${prev.leads} → ${cur.leads}). Revisar segmentações e criativos.`,
    });
  } else if (leadsDelta >= 20) {
    out.push({
      severity: "positivo",
      title: "Crescimento na geração de leads",
      detail: `Leads cresceram ${leadsDelta.toFixed(0)}% vs. período anterior (${prev.leads} → ${cur.leads}).`,
    });
  }

  if (cplPrev > 0 && pctDelta(cplCur, cplPrev) >= 25) {
    out.push({
      severity: "atencao",
      title: "CPL em alta",
      detail: `Custo por lead subiu ${pctDelta(cplCur, cplPrev).toFixed(0)}% (R$ ${cplPrev.toFixed(2)} → R$ ${cplCur.toFixed(2)}). Vale otimizar campanhas de pior desempenho.`,
    });
  }

  if (cur.spend > 0 && roasCur < 1) {
    out.push({
      severity: "critico",
      title: "ROAS abaixo de 1x",
      detail: `Cada real investido retorna R$ ${roasCur.toFixed(2)}. Pausar campanhas deficitárias e realocar verba.`,
    });
  } else if (roasCur >= 4) {
    out.push({
      severity: "positivo",
      title: "ROAS saudável",
      detail: `Retorno de ${roasCur.toFixed(1)}x sobre o investimento em mídia no período.`,
    });
  }

  const convRate = kpis.convRate(cur);
  if (cur.leads >= 30 && convRate < 10) {
    out.push({
      severity: "atencao",
      title: "Gargalo na conversão de leads",
      detail: `Apenas ${convRate.toFixed(1)}% dos leads convertem. O gargalo está pós-captação: revisar velocidade de atendimento e follow-up.`,
    });
  }

  return out;
}

/** Análise completa de um cliente: insights de performance + risco de churn. */
export async function analyzeClient(clientId: string): Promise<ClientIntelligence | null> {
  const now = Date.now();
  const d30 = new Date(now - 30 * 86400000);
  const d60 = new Date(now - 60 * 86400000);

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      metrics: { where: { date: { gte: d60 } } },
      invoices: { where: { dueDate: { gte: new Date(now - 120 * 86400000) } } },
      tickets: { where: { status: { in: ["ABERTO", "EM_ATENDIMENTO"] } } },
      contracts: { where: { status: "ATIVO" } },
      projects: true,
    },
  });
  if (!client) return null;

  const cur = sumTotals(client.metrics.filter((m) => m.date >= d30) as never[]);
  const prev = sumTotals(client.metrics.filter((m) => m.date < d30) as never[]);
  const insights = performanceInsights(cur, prev);

  // ── Risco de churn ────────────────────────────────────────────────
  let risk = 0;
  const factors: string[] = [];

  const overdue = client.invoices.filter((i) => i.status === "ATRASADO").length;
  if (overdue > 0) {
    risk += Math.min(50, overdue * 25);
    factors.push(`${overdue} fatura(s) em atraso`);
  }

  const hotTickets = client.tickets.filter((t) => ["ALTA", "URGENTE"].includes(t.priority)).length;
  if (hotTickets > 0) {
    risk += hotTickets * 10;
    factors.push(`${hotTickets} chamado(s) de alta prioridade aberto(s)`);
  }

  if (pctDelta(cur.leads, prev.leads) <= -20) {
    risk += 20;
    factors.push("resultados em queda no último mês");
  }

  const soon = new Date(now + 45 * 86400000);
  const expiring = client.contracts.some((c) => c.endDate && c.endDate <= soon && !c.autoRenew);
  if (expiring) {
    risk += 25;
    factors.push("contrato vence em até 45 dias sem renovação automática");
  }

  const lateProjects = client.projects.filter(
    (p) => p.status === "ATRASADO" || (p.deadline && p.deadline < new Date() && p.status !== "CONCLUIDO")
  ).length;
  if (lateProjects > 0) {
    risk += 10;
    factors.push(`${lateProjects} projeto(s) atrasado(s)`);
  }

  risk = Math.min(100, risk);
  if (factors.length === 0) factors.push("nenhum fator de risco identificado");

  return {
    clientId: client.id,
    companyName: client.companyName,
    churnRisk: risk,
    churnLabel: label(risk),
    churnFactors: factors,
    insights,
  };
}

export type ForecastPoint = { label: string; realizado: number | null; previsto: number | null };

/**
 * Forecast de faturamento: regressão linear sobre os recebimentos dos últimos
 * 6 meses, projetando os próximos 3 (nunca abaixo de 60% do MRR contratado).
 */
export async function revenueForecast(): Promise<{ points: ForecastPoint[]; next3Total: number }> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [invoices, activeClients] = await Promise.all([
    prisma.invoice.findMany({ where: { status: "PAGO", paidAt: { gte: start } }, select: { amount: true, paidAt: true } }),
    prisma.client.aggregate({ where: { status: "ATIVO" }, _sum: { monthlyValue: true } }),
  ]);
  const mrr = Number(activeClients._sum.monthlyValue ?? 0);

  const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const series: { key: string; label: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    series.push({ key: monthKey(d), label: d.toLocaleDateString("pt-BR", { month: "short" }), total: 0 });
  }
  for (const inv of invoices) {
    const k = monthKey(inv.paidAt!);
    const bucket = series.find((s) => s.key === k);
    if (bucket) bucket.total += Number(inv.amount);
  }

  // Regressão linear simples (x = índice do mês)
  const n = series.length;
  const xs = series.map((_, i) => i);
  const ys = series.map((s) => s.total);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  const slope =
    xs.reduce((acc, x, i) => acc + (x - xMean) * (ys[i] - yMean), 0) /
    (xs.reduce((acc, x) => acc + (x - xMean) ** 2, 0) || 1);
  const intercept = yMean - slope * xMean;

  const points: ForecastPoint[] = series.map((s) => ({ label: s.label, realizado: s.total, previsto: null }));
  let next3Total = 0;
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
    const projected = Math.max(intercept + slope * (n + i), mrr * 0.6);
    next3Total += projected;
    points.push({
      label: d.toLocaleDateString("pt-BR", { month: "short" }),
      realizado: null,
      previsto: Math.round(projected),
    });
  }
  // Liga a linha prevista ao último realizado
  const lastReal = points.filter((p) => p.realizado !== null).at(-1);
  if (lastReal) lastReal.previsto = lastReal.realizado;

  return { points, next3Total };
}

/** Roda a análise para todos os clientes ativos, ordenando por risco. */
export async function analyzePortfolio(): Promise<ClientIntelligence[]> {
  const clients = await prisma.client.findMany({ where: { status: "ATIVO" }, select: { id: true } });
  const results = await Promise.all(clients.map((c) => analyzeClient(c.id)));
  return (results.filter(Boolean) as ClientIntelligence[]).sort((a, b) => b.churnRisk - a.churnRisk);
}
