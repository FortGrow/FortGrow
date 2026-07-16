import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { KanbanBoard, type KanbanColumn } from "@/components/kanban/kanban";
import { brl } from "@/lib/utils";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

const STAGES: { key: string; label: string; accent: string }[] = [
  { key: "LEAD", label: "Lead", accent: "#64748b" },
  { key: "CONTATO", label: "Contato", accent: "#0284c7" },
  { key: "DIAGNOSTICO", label: "Diagnóstico", accent: "#0284c7" },
  { key: "REUNIAO", label: "Reunião", accent: "#8b5cf6" },
  { key: "PROPOSTA", label: "Proposta", accent: "#8b5cf6" },
  { key: "NEGOCIACAO", label: "Negociação", accent: "#d97706" },
  { key: "FECHADO", label: "Fechado", accent: "#059669" },
  { key: "PERDIDO", label: "Perdido", accent: "#f43f5e" },
];

export default async function CrmPage() {
  const leads = await prisma.lead.findMany({
    orderBy: { updatedAt: "desc" },
    include: { owner: { select: { name: true } } },
  });

  const columns: KanbanColumn[] = STAGES.map((s) => ({
    key: s.key,
    label: s.label,
    accent: s.accent,
    cards: leads
      .filter((l) => l.stage === s.key)
      .map((l) => ({
        id: l.id,
        title: l.companyName,
        subtitle: l.contactName ?? l.segment ?? undefined,
        meta: Number(l.estimatedValue) > 0 ? brl(l.estimatedValue) : undefined,
        badge: l.potential ?? undefined,
        badgeTone: l.potential === "Alto" ? "grow" : l.potential === "Baixo" ? "slate" : "brand",
      })),
  }));

  const pipelineValue = leads
    .filter((l) => !["FECHADO", "PERDIDO"].includes(l.stage))
    .reduce((s, l) => s + Number(l.estimatedValue), 0);

  return (
    <>
      <PageHeader title="CRM Comercial" subtitle={`Pipeline aberto: ${brl(pipelineValue)} · arraste os cartões entre as etapas`}>
        <Link href="/admin/prospeccao" className="btn-primary">
          <Plus size={15} /> Novo lead
        </Link>
      </PageHeader>
      <KanbanBoard columns={columns} endpoint="/api/leads" />
    </>
  );
}
