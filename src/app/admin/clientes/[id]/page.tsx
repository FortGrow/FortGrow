import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { allowedClientIds, canSeeClient } from "@/lib/client-scope";
import { LineChart, Megaphone } from "lucide-react";
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
import { EditClientForm } from "./edit-client-form";
import { BillingPanel } from "./billing-panel";
import { DeleteClientButton } from "../delete-client-button";

export const dynamic = "force-dynamic";

export default async function ClienteDetalhe({ params }: { params: { id: string } }) {
  const session = (await getSession())!;
  const scope = await allowedClientIds(session);
  if (!canSeeClient(scope, params.id)) {
    return (
      <div className="card mx-auto mt-16 max-w-md p-8 text-center">
        <h1 className="text-lg font-bold text-danger">Acesso negado</h1>
        <p className="mt-2 text-sm text-slate-400">
          Você só pode ver os clientes vinculados a você por comissão.
        </p>
        <Link href="/admin/clientes" className="btn-ghost mt-5 inline-flex">Voltar para meus clientes</Link>
      </div>
    );
  }

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      accountManager: { select: { name: true } },
      consultant: { select: { name: true } },
      services: { include: { service: true } },
      contracts: true,
      projects: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { dueDate: "desc" }, take: 24 },
      subscriptions: { orderBy: { createdAt: "asc" } },
      events: { where: { private: false }, orderBy: { start: "desc" }, take: 10 },
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

  const [paidAgg, pendingAgg] = await Promise.all([
    prisma.invoice.aggregate({ where: { clientId: client.id, status: "PAGO" }, _sum: { amount: true } }),
    prisma.invoice.aggregate({
      where: { clientId: client.id, status: { in: ["EM_ABERTO", "ATRASADO"] } },
      _sum: { amount: true },
    }),
  ]);

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
            ? `${client.plan ?? "Contrato por comissão"} · comissão ${Number(client.commissionBase)}% × ${Number(client.commissionShare)}% FortGrow${Number(client.monthlyValue) > 0 ? ` + ${brl(client.monthlyValue)}/mês` : ""} · desde ${fullDate(client.contractStart)}`
            : `${client.plan ?? "Sem plano"} · ${brl(client.monthlyValue)}/mês · desde ${fullDate(client.contractStart)}`
        }
      >
        <StatusBadge status={client.status} />
        <Link href={`/admin/clientes/${client.id}/performance`} className="btn-ghost">
          <LineChart size={15} /> Performance
        </Link>
        <Link href={`/admin/clientes/${client.id}/campanhas`} className="btn-ghost">
          <Megaphone size={15} /> Campanhas Meta
        </Link>
        <EditClientForm
          client={{
            id: client.id,
            companyName: client.companyName,
            cnpj: client.cnpj,
            segment: client.segment,
            city: client.city,
            state: client.state,
            website: client.website,
            instagram: client.instagram,
            email: client.email,
            phone: client.phone,
            status: client.status,
            plan: client.plan,
            billingType: client.billingType,
            monthlyValue: Number(client.monthlyValue),
            commissionBase: Number(client.commissionBase),
            commissionShare: Number(client.commissionShare),
            contractStart: client.contractStart?.toISOString().slice(0, 10) ?? null,
            contractMonths: client.contractMonths,
            projectStatus: client.projectStatus,
            operationType: client.operationType,
            strategicNotes: client.strategicNotes,
            notes: client.notes,
          }}
        />
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
                ? `Comissão: cliente fatura ${Number(client.commissionBase)}% do volume · FortGrow recebe ${Number(client.commissionShare)}% disso${Number(client.monthlyValue) > 0 ? ` · + mensalidade ${brl(client.monthlyValue)}/mês` : ""}`
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
            ["Tipo de operação", client.operationType],
            ["Observações", client.notes],
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
        <BillingPanel
          clientId={client.id}
          subscriptions={client.subscriptions.map((s) => ({
            id: s.id,
            description: s.description,
            amount: Number(s.amount),
            frequency: s.frequency,
            startDate: s.startDate.toISOString(),
            dueDay: s.dueDay,
            status: s.status,
            paymentMethod: s.paymentMethod,
            notes: s.notes,
          }))}
          charges={client.invoices.map((i) => ({
            id: i.id,
            description: i.description,
            amount: Number(i.amount),
            dueDate: i.dueDate.toISOString(),
            paidAt: i.paidAt?.toISOString() ?? null,
            status: i.status,
            method: i.method,
          }))}
          totalPaid={Number(paidAgg._sum.amount ?? 0)}
          totalPending={Number(pendingAgg._sum.amount ?? 0)}
        />
      </div>

      {client.events.length > 0 && (
        <div className="card mt-6 p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-300">
            Reuniões & eventos ·{" "}
            <Link href="/admin/agenda" className="text-brand-400 hover:text-brand-300">abrir Agenda →</Link>
          </h2>
          <div className="divide-y divide-line/60">
            {client.events.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-200">{e.title}</p>
                  <p className="text-xs text-slate-500">
                    {e.start.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    {e.type.replaceAll("_", " ").toLowerCase()}
                  </p>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </div>
        </div>
      )}

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
