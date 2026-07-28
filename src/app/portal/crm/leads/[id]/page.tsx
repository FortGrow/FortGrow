import { notFound, redirect } from "next/navigation";
import { CrmLeadDetail } from "@/components/crm/crm-lead-detail";
import { requireCrm, isCrmError } from "@/lib/crm-tenant";
import { getLead } from "@/lib/crm-repo";
import { loadBase, toLeadDto } from "@/lib/crm-page-data";
import type { ActivityDto, TaskDto } from "@/components/crm/types";

export const dynamic = "force-dynamic";

export default async function LeadPage({ params }: { params: { id: string } }) {
  const ctx = await requireCrm();
  if (isCrmError(ctx)) redirect("/portal");

  // getLead filtra por clientId: id de outra empresa devolve 404, não os dados
  const [lead, base] = await Promise.all([getLead(ctx, params.id), loadBase(ctx)]);
  if (!lead) notFound();

  const activities: ActivityDto[] = lead.activities.map((a) => ({
    id: a.id,
    type: a.type,
    content: a.content,
    meta: (a.meta as Record<string, unknown>) ?? {},
    authorName: a.authorName,
    createdAt: a.createdAt.toISOString(),
  }));

  const tasks: TaskDto[] = lead.tasks
    .filter((t) => !t.deletedAt)
    .map((t) => ({
      id: t.id,
      type: t.type,
      title: t.title,
      notes: t.notes,
      start: t.start.toISOString(),
      end: t.end.toISOString(),
      done: t.done,
      remindMin: t.remindMin,
      ownerId: t.ownerId,
      ownerName: t.owner?.name ?? null,
      leadId: lead.id,
      leadName: lead.name,
    }));

  return (
    <CrmLeadDetail
      lead={toLeadDto(lead)}
      activities={activities}
      tasks={tasks}
      stages={base.stages}
      members={base.members}
      tags={base.tags}
      scope={{}}
      basePath="/portal/crm"
    />
  );
}
