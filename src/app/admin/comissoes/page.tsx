import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { PeriodSelect } from "@/components/ui/period-select";
import { BarsChart } from "@/components/charts/bars-chart";
import { DataTable, Td } from "@/components/ui/table";
import { commissionReport } from "@/lib/commissions";
import { parsePeriod, MONTHS_PT, MONTHS_SHORT } from "@/lib/period";
import { brl } from "@/lib/utils";
import { initials, fullDate } from "@/lib/utils";
import { PayCommissionButton } from "./pay-button";
import { PaymentActions } from "./payment-actions";

export const dynamic = "force-dynamic";

export default async function ComissoesPage({ searchParams }: { searchParams: { ano?: string; mes?: string } }) {
  const session = (await getSession())!;
  const isAdmin = session.role === "ADMIN";

  const { year, month } = parsePeriod(searchParams);
  const [report, allPayments] = await Promise.all([
    commissionReport(year, month),
    prisma.expense.findMany({
      where: { category: "comissoes" },
      orderBy: { date: "desc" },
      take: 100,
    }),
  ]);

  // Colaborador vê SOMENTE a própria comissão; o admin vê tudo
  const collaborators = isAdmin
    ? report.collaborators
    : report.collaborators.filter((c) => c.userId === session.sub);
  const own = collaborators[0];
  const ownName = own?.userName ?? session.name;

  const monthTotal = isAdmin ? report.monthTotal : own?.monthTotal ?? 0;
  const yearTotal = isAdmin ? report.yearTotal : own?.yearTotal ?? 0;
  const chartMonths = isAdmin ? report.byMonth : own?.byMonth ?? Array(12).fill(0);
  const chartData = MONTHS_SHORT.map((label, i) => ({ label, comissao: Math.round(chartMonths[i]) }));

  const payments = (
    isAdmin ? allPayments : allPayments.filter((p) => p.description.startsWith(`Comissão ${ownName} `))
  ).slice(0, 24);
  const paymentByDescription = new Map(payments.map((p) => [p.description, p]));

  return (
    <>
      <PageHeader
        title={isAdmin ? "Comissões" : "Minhas comissões"}
        subtitle={
          isAdmin
            ? "Cálculo automático por colaborador sobre a receita paga de cada cliente"
            : "Suas comissões calculadas automaticamente sobre a receita paga dos seus clientes"
        }
      >
        <PeriodSelect year={year} month={month} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label={`Comissão de ${MONTHS_PT[month - 1]}`} value={brl(monthTotal)} accent="grow" />
        <StatCard label={`Comissão anual (${year})`} value={brl(yearTotal)} accent="violet" />
        {isAdmin ? (
          <StatCard
            label="Colaboradores comissionados"
            value={String(report.collaborators.length)}
            hint="cadastre na ficha de cada cliente"
            accent="brand"
          />
        ) : (
          <StatCard
            label="Clientes comissionados"
            value={String(own?.rows.length ?? 0)}
            hint="clientes vinculados a você"
            accent="brand"
          />
        )}
      </div>

      <div className="card mt-6 p-5">
        <h2 className="mb-4 text-sm font-bold text-slate-300">
          {isAdmin ? `Comissões por mês · ${year}` : `Suas comissões por mês · ${year}`}
        </h2>
        <BarsChart data={chartData} series={[{ key: "comissao", label: "Comissão" }]} format="brl" height={220} />
      </div>

      {collaborators.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-sm text-slate-500">
          {isAdmin ? (
            <>
              Nenhum colaborador comissionado ainda — abra a ficha de um cliente e use o bloco
              <span className="font-semibold text-slate-400"> Comissões</span> para adicionar.
            </>
          ) : (
            "Você ainda não tem comissões configuradas — fale com o administrador."
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {collaborators.map((c) => {
            const payDescription = `Comissão ${c.userName} — ${MONTHS_PT[month - 1]}/${year}`;
            const paidEntry = paymentByDescription.get(payDescription);
            return (
              <div key={c.userId} className="card p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-700 text-sm font-bold text-brand-300">
                      {initials(c.userName)}
                    </span>
                    <div>
                      <p className="font-bold text-slate-100">{c.userName}</p>
                      <p className="text-xs text-slate-500">
                        {c.rows.length} cliente(s) · ano: <span className="font-semibold text-slate-400">{brl(c.yearTotal)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">{MONTHS_PT[month - 1]}</p>
                      <p className="text-lg font-bold text-grow-400">{brl(c.monthTotal)}</p>
                    </div>
                    {isAdmin ? (
                      <>
                        <PayCommissionButton
                          userName={c.userName}
                          year={year}
                          month={month}
                          amount={Math.round(c.monthTotal * 100) / 100}
                          alreadyPaid={Boolean(paidEntry)}
                        />
                        {paidEntry && (
                          <PaymentActions
                            expenseId={paidEntry.id}
                            description={payDescription}
                            amount={Number(paidEntry.amount)}
                            date={paidEntry.date.toISOString()}
                            compact
                          />
                        )}
                      </>
                    ) : (
                      paidEntry && (
                        <span className="inline-flex items-center rounded-lg bg-grow-500/10 px-3 py-1.5 text-xs font-semibold text-grow-400 ring-1 ring-inset ring-grow-500/20">
                          Paga em {fullDate(paidEntry.date)}
                        </span>
                      )
                    )}
                  </div>
                </div>
                <DataTable
                  headers={
                    isAdmin
                      ? ["Cliente", "Receita do mês", "Comissão", "Valor", "Lucro restante"]
                      : ["Cliente", "Receita do mês", "Comissão", "Valor"]
                  }
                >
                  {c.rows.map((r) => (
                    <tr key={r.clientId}>
                      <Td className="font-medium text-slate-200">{r.clientName}</Td>
                      <Td>{brl(r.revenue)}</Td>
                      <Td>{r.type === "PERCENTUAL" ? `${r.value}%` : `${brl(r.value)}/mês (fixo)`}</Td>
                      <Td className="font-semibold text-grow-400">{brl(r.commission)}</Td>
                      {isAdmin && <Td>{brl(r.revenue - r.commission)}</Td>}
                    </tr>
                  ))}
                </DataTable>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-slate-300">
          {isAdmin ? "Histórico de pagamentos" : "Seus pagamentos recebidos"}
        </h2>
        {payments.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-600">Nenhum pagamento registrado ainda.</div>
        ) : (
          <DataTable headers={isAdmin ? ["Descrição", "Valor", "Data do pagamento", ""] : ["Descrição", "Valor", "Data do pagamento"]}>
            {payments.map((p) => (
              <tr key={p.id}>
                <Td className="font-medium text-slate-200">{p.description}</Td>
                <Td>{brl(p.amount)}</Td>
                <Td className="text-slate-500">{fullDate(p.date)}</Td>
                {isAdmin && (
                  <Td>
                    <PaymentActions
                      expenseId={p.id}
                      description={p.description}
                      amount={Number(p.amount)}
                      date={p.date.toISOString()}
                    />
                  </Td>
                )}
              </tr>
            ))}
          </DataTable>
        )}
      </div>
    </>
  );
}
