import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Td } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { fullDate } from "@/lib/utils";
import { PlansPanel } from "./plans-panel";
import { ServicesPanel } from "./services-panel";

export const dynamic = "force-dynamic";

export default async function ServicosPage() {
  const [services, clientServices, plans] = await Promise.all([
    prisma.service.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { clients: true } } } }),
    prisma.clientService.findMany({
      orderBy: { createdAt: "desc" },
      include: { client: { select: { companyName: true } }, service: { select: { name: true } } },
    }),
    prisma.plan.findMany({ where: { active: true }, orderBy: { price: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Serviços & Planos" subtitle="Pacotes comerciais, catálogo da agência e serviços em execução" />

      <PlansPanel
        plans={plans.map((p) => ({
          id: p.id,
          name: p.name,
          pricingModel: p.pricingModel,
          price: Number(p.price),
          variablePercent: p.variablePercent === null ? null : Number(p.variablePercent),
          variableBasis: p.variableBasis,
          description: p.description,
          deliverables: (p.deliverables as string[]) ?? [],
        }))}
      />

      <ServicesPanel
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          pricingModel: s.pricingModel,
          basePrice: Number(s.basePrice),
          variablePercent: s.variablePercent === null ? null : Number(s.variablePercent),
          variableBasis: s.variableBasis,
          clientCount: s._count.clients,
        }))}
      />

      <h2 className="mb-3 text-sm font-bold text-slate-300">Serviços em execução</h2>
      <DataTable headers={["Cliente", "Serviço", "Responsável", "Início", "Prazo", "Checklist", "Status"]}>
        {clientServices.map((cs) => {
          const checklist = (cs.checklist as { label: string; done: boolean }[]) ?? [];
          const done = checklist.filter((c) => c.done).length;
          return (
            <tr key={cs.id} className="transition hover:bg-ink-800/50">
              <Td className="font-semibold text-slate-200">{cs.client.companyName}</Td>
              <Td>{cs.service.name}</Td>
              <Td>{cs.responsible ?? "—"}</Td>
              <Td className="text-slate-500">{fullDate(cs.startDate)}</Td>
              <Td className="text-slate-500">{fullDate(cs.deadline)}</Td>
              <Td>
                {checklist.length > 0 ? (
                  <span className="text-xs font-medium text-slate-400">
                    {done}/{checklist.length} concluídos
                  </span>
                ) : (
                  "—"
                )}
              </Td>
              <Td><StatusBadge status={cs.status} /></Td>
            </tr>
          );
        })}
      </DataTable>
    </>
  );
}
