import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { brl, fullDate, initials } from "@/lib/utils";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Dados do Cliente — área separada do dashboard: cadastro, operação,
 * contrato, entregas do plano e serviços ficam aqui, nunca na Visão geral.
 */
export default async function PortalDadosPage() {
  const session = (await getSession())!;
  const client = await prisma.client.findUnique({
    where: { id: session.clientId! },
    include: {
      accountManager: { select: { name: true } },
      consultant: { select: { name: true } },
      services: { include: { service: true }, where: { status: { not: "CONCLUIDO" } } },
      planRef: true,
    },
  });
  if (!client) return null;

  const deliverables = (client.planRef?.deliverables as string[] | undefined) ?? [];

  const contractEnd =
    client.contractStart && client.contractMonths
      ? new Date(new Date(client.contractStart).setMonth(client.contractStart.getMonth() + client.contractMonths))
      : null;

  const monetizacao =
    client.billingType === "COMISSAO"
      ? `Comissão sobre vendas — ${Number(client.commissionBase)}% do volume × ${Number(client.commissionShare)}% FortGrow${
          Number(client.monthlyValue) > 0 ? ` + ${brl(client.monthlyValue)}/mês` : ""
        }`
      : `Mensalidade fixa — ${brl(client.monthlyValue)}/mês`;

  const groups: { title: string; rows: [string, string | null][] }[] = [
    {
      title: "Empresa",
      rows: [
        ["Nome da empresa", client.companyName],
        ["Nome fantasia", client.tradeName],
        ["Segmento", client.segment],
        ["Cidade / UF", client.city ? `${client.city}${client.state ? ` / ${client.state}` : ""}` : null],
      ],
    },
    {
      title: "Operação",
      rows: [
        ["Responsável FortGrow", client.accountManager?.name ?? null],
        ["Consultor", client.consultant?.name ?? null],
        ["Tipo de operação", client.operationType],
        ["Modelo de monetização", monetizacao],
        ["Status do projeto", client.projectStatus],
      ],
    },
    {
      title: "Informações contratuais",
      rows: [
        ["Plano / contrato", client.plan],
        ["Início do contrato", client.contractStart ? fullDate(client.contractStart) : null],
        ["Duração", client.contractMonths ? `${client.contractMonths} meses` : null],
        ["Vigência até", contractEnd ? fullDate(contractEnd) : null],
      ],
    },
  ];

  return (
    <>
      <PageHeader title="Dados do Cliente" subtitle="Cadastro, operação e contrato — separados da Visão geral de resultados" />

      {/* Identidade da empresa */}
      <div className="card mb-4 flex flex-wrap items-center gap-5 p-6">
        {client.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={client.logoUrl} alt={client.companyName} className="h-16 w-16 rounded-2xl object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/30 to-grow-500/30 text-xl font-bold text-brand-300">
            {initials(client.companyName)}
          </span>
        )}
        <div className="flex-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-100">{client.companyName}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <Building2 size={14} /> {client.segment ?? "—"}
            {client.city ? ` · ${client.city}/${client.state ?? ""}` : ""}
          </p>
        </div>
        <StatusBadge status={client.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map((g) => (
          <div key={g.title} className="card p-5">
            <h2 className="mb-3 text-sm font-bold text-slate-200">{g.title}</h2>
            <dl className="space-y-2.5">
              {g.rows.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
                  <dd className="text-sm text-slate-300">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {deliverables.length > 0 && (
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold text-slate-200">Entregas do seu plano · {client.plan}</h2>
            <ul className="space-y-1.5">
              {deliverables.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-grow-500" /> {d}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-200">Serviços em execução</h2>
          <div className="space-y-3">
            {client.services.length === 0 && <p className="text-sm text-slate-500">Nenhum serviço ativo no momento.</p>}
            {client.services.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-line bg-ink-900/50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{s.service.name}</p>
                  <p className="text-xs text-slate-500">
                    {s.responsible ? `Responsável: ${s.responsible}` : ""}
                    {s.deadline ? ` · prazo ${fullDate(s.deadline)}` : ""}
                  </p>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {client.strategicNotes && (
        <div className="card mt-4 p-5">
          <h2 className="mb-2 text-sm font-bold text-slate-200">Observações estratégicas</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{client.strategicNotes}</p>
        </div>
      )}
    </>
  );
}
