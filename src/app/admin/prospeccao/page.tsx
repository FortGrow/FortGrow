import Link from "next/link";
import { Bot } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { NewLeadForm } from "./new-lead-form";
import { ProspectingBoard } from "./prospecting-board";
import { LeadCardGrid } from "@/components/leads/lead-card-grid";
import { leadToDto } from "@/lib/lead-dto";

export const dynamic = "force-dynamic";

export default async function ProspeccaoPage() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { name: true } } },
  });
  const dto = leads.map(leadToDto);

  return (
    <>
      <PageHeader
        title="Prospecção"
        subtitle="Entrada de leads: origem, primeiro contato e status — edite direto no card"
      >
        <Link href="/admin/prospeccao/sdr" className="btn-ghost">
          <Bot size={15} /> SDR IA
        </Link>
        <NewLeadForm />
      </PageHeader>

      {dto.length === 0 ? (
        <EmptyState title="Nenhuma empresa cadastrada" hint="Cadastre a primeira empresa para começar a prospecção." />
      ) : (
        <div className="space-y-5">
          <ProspectingBoard leads={dto} />
          <LeadCardGrid leads={dto} mode="prospeccao" />
        </div>
      )}
    </>
  );
}
