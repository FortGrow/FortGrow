import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, Td } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { TrendChart } from "@/components/charts/trend-chart";
import { brl, fullDate, num } from "@/lib/utils";
import { kpis, sumTotals } from "@/lib/metrics";
import { UploadDocForm } from "./upload-doc-form";
import { PortalAccessPanel } from "./portal-access";
import { CampaignIntegrationPanel, type AdAccounts } from "./campaign-integration";
import { ContentCalendarPanel } from "./content-calendar";
import { StaffCommissionsPanel } from "./staff-commissions";
import { DeleteClientButton } from "../delete-client-button";

export const dynamic = "force-dynamic";

export default async function ClienteDetalhe({ params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      accountManager: { select: { name: true } },
      consultant: { select: { name: true } },
      services: { include: { service: true } },
      contracts: true,
      projects: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { dueDate: "desc" }, take: 12 },
      documents: { orderBy: { createdAt: "desc" }, take: 10 },
      metrics: { where: { date: { gte: new Date(Date.now() - 90 * 86400000) } } },
      users: {
        where: { role: "CLIENTE" },
        select: { id: true, name: true, email: true, active: true },
        orderBy: { name: "asc" },
      },
      contentPosts: {
        where: { date: { gte: new Date(Date.now() - 30 * 86400000) } },
        orderBy: { date: "asc" },
        take: 60,
      },
      staffCommissions: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!client) notFound();

  const staff = await prisma.user.findMany({
    where: { active: true, role: { not: "CLIENTE" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const totals = sumTotals(client.metrics as never[]);
  const byWeek = new Map<string, { leads: number; conversions: number }>();
  for (const m of client.metrics) {
    const week = new Date(m.date);
    week.setDate(week.getDate() - week.getDay());
    const key = week.toISOString().slice(0, 10);
    const cur = byWeek.get(key) ?? { leads: 0, conversions: 0 };
    cur.leads += m.leads;
    cur.conversions += m.conversions;
    byWeek.set(key, cur);
  }
  const trend = [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({ label: new Date(k).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), ...v }));

  return (
    <>
      <PageHeader
        title={client.companyName}
        subtitle={
          client.billingType === "COMISSAO"
            ? `${client.plan ?? "Contrato por comissão"} · comissão ${Number(client.commissionBase)}% × ${Number(client.commissionShare)}% FortGrow · desde ${fullDate(client.contractStart)}`
            : `${client.plan ?? "Sem plano"} · ${brl(client.monthlyValue)}/mês · desde ${fullDate(client.contractStart)}`
        }
      >
        <StatusBadge status={client.status} />
        <DeleteClientButton clientId={client.id} companyName={client.companyName} />
      </PageHeader>

      <div className="mb-6 space-y-4">
        <PortalAccessPanel clientId={client.id} users={client.users} />
        <StaffCommissionsPanel
          clientId={client.id}
          staff={staff}
          commissions={client.staffCommissions.map((c) => ({
            id: c.id,
            userId: c.userId,
            userName: c.user.name,
            type: c.type,
            value: Number(c.value),
            note: c.note,
          }))}
        />
        <CampaignIntegrationPanel clientId={client.id} accounts={(client.adAccounts as AdAccounts) ?? {}} />
        <ContentCalendarPanel
          clientId={client.id}
          posts={client.contentPosts.map((p) => ({
            id: p.id,
            date: p.date.toISOString(),
            title: p.title,
            format: p.format,
            script: p.script,
            expectedMetrics: p.expectedMetrics,
            status: p.status,
          }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Leads (90d)" value={num(totals.leads)} accent="brand" />
        <StatCard label="Conversões (90d)" value={num(totals.conversions)} accent="grow" />
        <StatCard label="Investimento (90d)" value={brl(totals.spend)} accent="warn" />
        <StatCard label="ROAS (90d)" value={`${kpis.roas(totals).toFixed(2)}x`} accent="violet" />
        <StatCard label="Valor por lead" value={brl(kpis.valuePerLead(totals))} hint="receita / leads" accent="grow" />
        <StatCard label="Ticket médio" value={brl(kpis.avgTicket(totals))} hint="receita / vendas" accent="brand" />
        <StatCard label="Custo por venda" value={brl(kpis.costPerSale(totals))} hint="investimento / vendas" accent="warn" />
        <StatCard label="Receita (90d)" value={brl(totals.revenue)} accent="grow" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-bold text-slate-300">Leads e conversões · últimas 12 semanas</h2>
          <TrendChart
            data={trend}
            series={[
              { key: "leads", label: "Leads" },
              { key: "conversions", label: "Conversões" },
            ]}
          />
        </div>
        <div className="card space-y-3 p-5 text-sm">
          <h2 className="text-sm font-bold text-slate-300">Ficha da conta</h2>
          {[
            [
              "Modelo de cobrança",
              client.billingType === "COMISSAO"
                ? `Comissão: cliente fatura ${Number(client.commissionBase)}% do volume · FortGrow recebe ${Number(client.commissionShare)}% disso`
                : `Fixo: ${brl(client.monthlyValue)}/mês`,
            ],
            ["CNPJ", client.cnpj],
            ["Segmento", client.segment],
            ["Cidade", client.city ? `${client.city}/${client.state ?? ""}` : null],
            ["Site", client.website],
            ["Instagram", client.instagram],
            ["E-mail", client.email],
            ["Telefone", client.phone],
            ["Responsável da conta", client.accountManager?.name],
            ["Consultor", client.consultant?.name],
            ["Tempo de contrato", client.contractMonths ? `${client.contractMonths} meses` : null],
            ["Status do projeto", client.projectStatus],
          ].map(([k, v]) => (
            <div key={k as string} className="flex justify-between gap-4 border-b border-line/60 pb-2 last:border-0">
              <span className="text-slate-500">{k}</span>
              <span className="text-right font-medium text-slate-300">{v ?? "—"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-bold text-slate-300">Serviços contratados</h2>
          <DataTable headers={["Serviço", "Responsável", "Prazo", "Status"]}>
            {client.services.map((s) => (
              <tr key={s.id}>
                <Td className="font-medium text-slate-200">{s.service.name}</Td>
                <Td>{s.responsible ?? "—"}</Td>
                <Td className="text-slate-500">{fullDate(s.deadline)}</Td>
                <Td><StatusBadge status={s.status} /></Td>
              </tr>
            ))}
          </DataTable>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold text-slate-300">Faturas recentes</h2>
          <DataTable headers={["Descrição", "Valor", "Vencimento", "Status"]}>
            {client.invoices.map((i) => (
              <tr key={i.id}>
                <Td className="font-medium text-slate-200">{i.description}</Td>
                <Td>{brl(i.amount)}</Td>
                <Td className="text-slate-500">{fullDate(i.dueDate)}</Td>
                <Td><StatusBadge status={i.status} /></Td>
              </tr>
            ))}
          </DataTable>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <h2 className="mb-4 text-sm font-bold text-slate-300">Enviar documento para o portal do cliente</h2>
        <UploadDocForm clientId={client.id} />
        {client.documents.length > 0 && (
          <div className="mt-4 divide-y divide-line/60 border-t border-line pt-2">
            {client.documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <a href={d.url} target="_blank" rel="noreferrer" className="truncate font-medium text-brand-400 hover:text-brand-300">
                  {d.name}
                </a>
                <span className="shrink-0 text-xs text-slate-500">
                  {d.type.replaceAll("_", " ")} · {fullDate(d.createdAt)}
                  {d.uploadedBy ? ` · ${d.uploadedBy}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-slate-300">Projetos</h2>
        <DataTable headers={["Projeto", "Prioridade", "Prazo", "Progresso", "Status"]}>
          {client.projects.map((p) => (
            <tr key={p.id}>
              <Td className="font-medium text-slate-200">{p.name}</Td>
              <Td><StatusBadge status={p.priority} /></Td>
              <Td className="text-slate-500">{fullDate(p.deadline)}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-700">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${p.progress}%` }} />
                  </div>
                  <span className="text-xs text-slate-500">{p.progress}%</span>
                </div>
              </Td>
              <Td><StatusBadge status={p.status} /></Td>
            </tr>
          ))}
        </DataTable>
      </div>
    </>
  );
}
