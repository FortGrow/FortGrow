import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { costReport } from "@/lib/commissions";
import { brl, fullDate } from "@/lib/utils";
import { NewCostForm, CostRowActions } from "./cost-actions";
import { COST_CATEGORY_LABELS } from "@/lib/cost-categories";

export const dynamic = "force-dynamic";

export default async function CustosPage() {
  const now = new Date();
  const [costs, totals] = await Promise.all([
    prisma.expense.findMany({ orderBy: [{ recurring: "desc" }, { date: "desc" }], take: 200 }),
    costReport(now.getFullYear(), now.getMonth() + 1),
  ]);

  const active = costs.filter((c) => c.status !== "CANCELADO");
  const recurringMonthly = active
    .filter((c) => c.recurring && c.frequency === "mensal")
    .reduce((s, c) => s + Number(c.amount), 0);

  // agrupamento por categoria (custo mensal equivalente)
  const byCategory = new Map<string, number>();
  for (const c of active) {
    const monthlyEq =
      c.recurring && c.frequency === "mensal"
        ? Number(c.amount)
        : c.recurring && c.frequency === "anual"
          ? Number(c.amount) / 12
          : c.date.getFullYear() === now.getFullYear() && c.date.getMonth() === now.getMonth()
            ? Number(c.amount)
            : 0;
    if (monthlyEq > 0) byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + monthlyEq);
  }
  const topCategories = [...byCategory.entries()].sort(([, a], [, b]) => b - a).slice(0, 8);

  return (
    <>
      <PageHeader
        title="Custos"
        subtitle="Central de custos da FortGrow — recorrentes e pontuais, todos alimentam o painel financeiro"
      >
        <NewCostForm />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Custo mensal" value={brl(totals.monthly)} hint="recorrentes + únicos do mês" accent="warn" />
        <StatCard label="Custo anual (projeção)" value={brl(totals.yearly)} accent="danger" />
        <StatCard label="Recorrência mensal" value={brl(recurringMonthly)} hint="assinaturas e fixos" accent="brand" />
        <StatCard label="Custos cadastrados" value={String(active.length)} accent="violet" />
      </div>

      {topCategories.length > 0 && (
        <div className="card mt-6 p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-300">Custo mensal por categoria</h2>
          <div className="space-y-2.5">
            {topCategories.map(([cat, value]) => {
              const max = topCategories[0][1];
              return (
                <div key={cat}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-slate-400">{COST_CATEGORY_LABELS[cat] ?? cat}</span>
                    <span className="font-semibold text-slate-200">{brl(value)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink-700/60">
                    <div className="h-full rounded-full bg-warn" style={{ width: `${(value / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6">
        <DataTable headers={["Custo", "Categoria", "Valor", "Recorrência", "Vencimento", "Status", ""]}>
          {costs.map((c) => (
            <tr key={c.id} className="transition hover:bg-ink-800/50">
              <Td>
                <p className="font-medium text-slate-200">{c.description}</p>
                {c.notes && <p className="text-xs text-slate-500">{c.notes}</p>}
              </Td>
              <Td>{COST_CATEGORY_LABELS[c.category] ?? c.category}</Td>
              <Td>{brl(c.amount)}</Td>
              <Td>
                {c.recurring ? (
                  <Badge tone="brand">{c.frequency === "mensal" ? "Mensal" : "Anual"}</Badge>
                ) : (
                  <Badge tone="slate">Único</Badge>
                )}
              </Td>
              <Td className="text-slate-500">{fullDate(c.date)}</Td>
              <Td>
                <Badge tone={c.status === "PAGO" ? "grow" : c.status === "CANCELADO" ? "danger" : "brand"}>
                  {c.status}
                </Badge>
              </Td>
              <Td>
                <CostRowActions id={c.id} status={c.status} />
              </Td>
            </tr>
          ))}
        </DataTable>
      </div>
    </>
  );
}
