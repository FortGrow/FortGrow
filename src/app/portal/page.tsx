import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { brl, fullDate, initials } from "@/lib/utils";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const session = (await getSession())!;
  const client = await prisma.client.findUnique({
    where: { id: session.clientId! },
    include: {
      accountManager: { select: { name: true } },
      consultant: { select: { name: true } },
      services: { include: { service: true }, where: { status: { not: "CONCLUIDO" } } },
      contracts: { where: { status: "ATIVO" }, take: 1 },
    },
  });
  if (!client) return null;

  const plan = client.plan
    ? await prisma.plan.findUnique({ where: { name: client.plan } })
    : null;
  const deliverables = (plan?.deliverables as string[] | undefined) ?? [];

  const contractEnd =
    client.contractStart && client.contractMonths
      ? new Date(new Date(client.contractStart).setMonth(client.contractStart.getMonth() + client.contractMonths))
      : null;

  const info: [string, React.ReactNode][] = [
    ["Plano contratado", client.plan ?? "—"],
    [
      client.billingType === "COMISSAO" ? "Modelo de cobrança" : "Valor mensal",
      client.billingType === "COMISSAO"
        ? `Comissão (${Number(client.commissionShare)}% sobre ${Number(client.commissionBase)}% do volume)`
        : brl(client.monthlyValue),
    ],
    ["Data de início", fullDate(client.contractStart)],
    ["Tempo de contrato", client.contractMonths ? `${client.contractMonths} meses` : "—"],
    ["Vigência até", fullDate(contractEnd)],
    ["Responsável da conta", client.accountManager?.name ?? "—"],
    ["Consultor", client.consultant?.name ?? "—"],
    ["Status do projeto", <StatusBadge key="s" status={client.projectStatus ?? "EM_ANDAMENTO"} />],
  ];

  return (
    <>
      <div className="card mb-6 flex flex-wrap items-center gap-5 p-6">
        {client.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={client.logoUrl} alt={client.companyName} className="h-16 w-16 rounded-2xl object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/30 to-grow-500/30 text-xl font-bold text-brand-300">
            {initials(client.companyName)}
          </span>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">{client.companyName}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <Building2 size={14} /> {client.segment ?? "—"} · {client.city ? `${client.city}/${client.state ?? ""}` : ""}
          </p>
        </div>
        <StatusBadge status={client.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-300">Sua conta</h2>
          <div className="space-y-3 text-sm">
            {info.map(([k, v]) => (
              <div key={k as string} className="flex items-center justify-between gap-4 border-b border-line/60 pb-2.5 last:border-0">
                <span className="text-slate-500">{k}</span>
                <span className="text-right font-medium text-slate-200">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          {deliverables.length > 0 && (
            <div className="mb-5">
              <h2 className="mb-3 text-sm font-bold text-slate-300">Entregas do seu plano · {client.plan}</h2>
              <ul className="space-y-1.5">
                {deliverables.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-grow-500" /> {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <h2 className="mb-4 text-sm font-bold text-slate-300">Serviços em execução</h2>
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
    </>
  );
}
