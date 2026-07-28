import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CrmDashboard } from "@/components/crm/crm-dashboard";
import { CrmFunnel } from "@/components/crm/crm-funnel";
import { CrmLeadsView } from "@/components/crm/crm-leads-view";
import { CrmLeadDetail } from "@/components/crm/crm-lead-detail";
import { CrmAgenda } from "@/components/crm/crm-agenda";
import { CrmTeam } from "@/components/crm/crm-team";
import { CrmSettings } from "@/components/crm/crm-settings";
import { CrmLeadForm } from "@/components/crm/crm-lead-form";
import { requireCrm, isCrmError, ensureStages } from "@/lib/crm-tenant";
import { getLead } from "@/lib/crm-repo";
import {
  loadBase, loadFunnelLeads, loadLeadOptions, loadMetrics, loadTeamPerformance, toLeadDto,
} from "@/lib/crm-page-data";
import { brl } from "@/lib/utils";
import type { ActivityDto, TaskDto } from "@/components/crm/types";

/**
 * Todas as abas do CRM de um cliente, no painel da FortGrow.
 *
 * Rota coringa em vez de seis arquivos: as telas são exatamente as mesmas
 * do Portal, só muda o `scope`. Duplicar as páginas garantiria que uma
 * mudança futura fosse aplicada em um lado e esquecida no outro.
 */

export const dynamic = "force-dynamic";

export default async function AdminCrmTabPage({
  params,
}: {
  params: { id: string; tab?: string[] };
}) {
  const ctx = await requireCrm(params.id);
  if (isCrmError(ctx)) redirect("/admin/crm-clientes");

  const base = `/admin/crm-clientes/${params.id}`;
  const scope = { clientId: params.id };
  const somenteLeitura = !ctx.canEdit;
  const [aba, sub] = params.tab ?? [];

  await ensureStages(ctx.clientId);

  // ── Ficha de um lead ──
  if (aba === "leads" && sub) {
    const [lead, b] = await Promise.all([getLead(ctx, sub), loadBase(ctx)]);
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
        id: t.id, type: t.type, title: t.title, notes: t.notes,
        start: t.start.toISOString(), end: t.end.toISOString(),
        done: t.done, remindMin: t.remindMin,
        ownerId: t.ownerId, ownerName: t.owner?.name ?? null,
        leadId: lead.id, leadName: lead.name,
      }));

    return (
      <CrmLeadDetail
        lead={toLeadDto(lead)}
        activities={activities}
        tasks={tasks}
        stages={b.stages}
        members={b.members}
        tags={b.tags}
        scope={scope}
        basePath={base}
        readOnly={somenteLeitura}
      />
    );
  }

  if (aba === "funil") {
    const [b, leads] = await Promise.all([loadBase(ctx), loadFunnelLeads(ctx)]);
    const emAberto = leads.filter((l) => l.stageKind === "ABERTO").reduce((s, l) => s + l.estimatedValue, 0);
    return (
      <>
        <PageHeader
          title="Funil de vendas"
          subtitle={`${leads.length} lead(s) · ${brl(emAberto)} em negociação`}
        >
          {!somenteLeitura && (
            <CrmLeadForm stages={b.stages} members={b.members} tags={b.tags} scope={scope} />
          )}
        </PageHeader>
        <CrmFunnel stages={b.stages} leads={leads} scope={scope} basePath={base} readOnly={somenteLeitura} />
      </>
    );
  }

  if (aba === "leads") {
    const b = await loadBase(ctx);
    return (
      <>
        <PageHeader title="Leads" subtitle="Base completa da empresa, com busca, filtros e exportação" />
        <CrmLeadsView
          stages={b.stages}
          members={b.members}
          tags={b.tags}
          sources={b.sources}
          scope={scope}
          basePath={base}
          readOnly={somenteLeitura}
        />
      </>
    );
  }

  if (aba === "agenda") {
    const [b, leads] = await Promise.all([loadBase(ctx), loadLeadOptions(ctx)]);
    return (
      <>
        <PageHeader title="Agenda" subtitle="Atividades comerciais agendadas pela equipe da empresa" />
        <CrmAgenda scope={scope} members={b.members} leads={leads} basePath={base} readOnly={somenteLeitura} />
      </>
    );
  }

  if (aba === "equipe") {
    const [b, desempenho] = await Promise.all([loadBase(ctx), loadTeamPerformance(ctx)]);
    return (
      <>
        <PageHeader title="Equipe" subtitle="Vendedores, departamentos e metas da empresa" />
        <CrmTeam
          members={b.members}
          logins={b.logins}
          desempenho={desempenho}
          scope={scope}
          readOnly={somenteLeitura}
        />
      </>
    );
  }

  if (aba === "config") {
    const b = await loadBase(ctx);
    return (
      <>
        <PageHeader title="Configurações do CRM" subtitle="Funil e etiquetas desta empresa" />
        <CrmSettings stages={b.stages} tags={b.tags} scope={scope} readOnly={somenteLeitura} />
      </>
    );
  }

  if (aba) notFound();

  const m = await loadMetrics(ctx);
  return (
    <>
      <PageHeader title="Painel do CRM" subtitle="Os mesmos números que a empresa enxerga no Portal" />
      <CrmDashboard m={m} basePath={base} />
    </>
  );
}
