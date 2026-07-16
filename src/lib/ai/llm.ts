/**
 * Redação de resumos executivos via LLM (opcional).
 * Com OPENAI_API_KEY configurada, envia os insights ao modelo e retorna um
 * parágrafo executivo. Sem chave (ou em caso de erro), retorna null e a UI
 * usa o resumo determinístico gerado pelo motor de insights.
 */
import type { ClientIntelligence } from "./insights";

export async function generateExecutiveSummary(data: ClientIntelligence): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content:
              "Você é um consultor de marketing sênior da agência FortGrow. Escreva um resumo executivo curto (1 parágrafo, pt-BR) sobre a conta do cliente, com tom profissional e direto, citando números.",
          },
          { role: "user", content: JSON.stringify(data) },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

/** Resumo determinístico usado quando não há LLM configurado. */
export function fallbackSummary(data: ClientIntelligence): string {
  const critical = data.insights.filter((i) => i.severity === "critico").length;
  const positive = data.insights.filter((i) => i.severity === "positivo").length;
  const parts = [
    `Risco de cancelamento ${data.churnLabel.toLowerCase()} (${data.churnRisk}/100): ${data.churnFactors.join("; ")}.`,
  ];
  if (critical > 0) parts.push(`${critical} ponto(s) crítico(s) exigem ação imediata.`);
  if (positive > 0) parts.push(`${positive} indicador(es) em evolução positiva no período.`);
  if (data.insights.length === 0) parts.push("Desempenho estável, sem variações relevantes nos últimos 30 dias.");
  return parts.join(" ");
}
