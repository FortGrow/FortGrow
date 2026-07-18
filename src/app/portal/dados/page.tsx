import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { brl, fullDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Dados do Cliente — área separada do dashboard: cadastro, operação e
 * contrato ficam aqui, nunca na visão geral de performance.
 */
export default async function PortalDadosPage() {
  const session = (await getSession())!;
  const client = await prisma.client.findUnique({
    where: { id: session.clientId! },
    include: { accountManager: { select: { name: true } } },
  });
  if (!client) return null;

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
      ],
    },
  ];

  const strategicNotes = client.strategicNotes;

  return (
    <>
      <PageHeader title="Dados do Cliente" subtitle="Cadastro, operação e contrato — separados do dashboard de performance" />
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
      {strategicNotes && (
        <div className="card mt-4 p-5">
          <h2 className="mb-2 text-sm font-bold text-slate-200">Observações estratégicas</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{strategicNotes}</p>
        </div>
      )}
    </>
  );
}
