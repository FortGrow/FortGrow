import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CrmDashboard } from "./crm-dashboard";
import { CrmFunnel } from "./crm-funnel";
import { CrmLeadsView } from "./crm-leads-view";
import { CrmLeadDetail } from "./crm-lead-detail";
import { CrmAgenda } from "./crm-agenda";
import { CrmTeam } from "./crm-team";
import { CrmSettings } from "./crm-settings";
import { CrmLeadForm } from "./crm-lead-form";
import type { CrmScope } from "./api";
import type { ActivityDto, TaskDto } from "./types";
import type { CrmContext } from "@/lib/crm-tenant";
import { ensureStages } from "@/lib/crm-tenant";
import { getLead } from "@/lib/crm-repo";
import {
  loadBase, loadFunnelLeads, loadLeadOptions, loadMetrics, loadTeamPerformance, toLeadDto,
} from "@/lib/crm-page-data";
import { brl } from "@/lib/utils";

/**
 * As abas do CRM, num lugar só.
 *
 * Portal do cliente, CRM Comercial da FortGrow e a visão da agência sobre o
 * CRM de um cliente renderizam exatamente isto — muda apenas o `ctx` (de
 * qual espaço vêm os dados) e o `basePath` (para onde os links apontam).
 * Se cada área tivesse a própria cópia, a primeira melhoria seria aplicada
 * num lugar e esquecida nos outros.
 */
export async function CrmWorkspace({
  ctx,
  scope,
  basePath,
  tab,
  titulos,
}: {
  ctx: CrmContext;
  scope: CrmScope;
  basePath: string;
  /** Segmentos após o basePath: [] | ["funil"] | ["leads"] | ["leads", id] … */
  tab?: string[];
  /** Título e subtítulo do painel — a única coisa que muda de área para área */
  titulos?: { titulo: string; subtitulo: string };
}) {
  const somenteLeitura = !ctx.canEdit;
  const [aba, sub] = tab ?? [];

  await ensureStages(ctx.clientId);

  // ── Ficha de um lead ──
  if (aba === "leads" && sub) {
    const [lead, base] = await Promise.all([getLead(ctx, sub), loadBase(ctx)]);
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
        stages={base.stages}
        members={base.members}
        tags={base.tags}
        scope={scope}
        basePath={basePath}
        readOnly={somenteLeitura}
      />
    );
  }

  if (aba === "funil") {
    const [base, leads] = await Promise.all([loadBase(ctx), loadFunnelLeads(ctx)]);
    const emAberto = leads.filter((l) => l.stageKind === "ABERTO").reduce((s, l) => s + l.estimatedValue, 0);
    return (
      <>
        <PageHeader
          title="Funil de vendas"
          subtitle={`${leads.length} lead(s) · ${brl(emAberto)} em negociação — arraste os cartões entre as etapas`}
        >
          {!somenteLeitura && (
            <CrmLeadForm stages={base.stages} members={base.members} tags={base.tags} scope={scope} />
          )}
        </PageHeader>
        <CrmFunnel stages={base.stages} leads={leads} scope={scope} basePath={basePath} readOnly={somenteLeitura} />
      </>
    );
  }

  if (aba === "leads") {
    const base = await loadBase(ctx);
    return (
      <>
        <PageHeader title="Leads" subtitle="Busque, filtre, importe e exporte a base completa" />
        <CrmLeadsView
          stages={base.stages}
          members={base.members}
          tags={base.tags}
          sources={base.sources}
          scope={scope}
          basePath={basePath}
          readOnly={somenteLeitura}
        />
      </>
    );
  }

  if (aba === "agenda") {
    const [base, leads] = await Promise.all([loadBase(ctx), loadLeadOptions(ctx)]);
    return (
      <>
        <PageHeader
          title="Agenda"
          subtitle="Ligações, reuniões, tarefas e follow-ups — o que é agendado num lead aparece aqui"
        />
        <CrmAgenda scope={scope} members={base.members} leads={leads} basePath={basePath} readOnly={somenteLeitura} />
      </>
    );
  }

  if (aba === "equipe") {
    const [base, desempenho] = await Promise.all([loadBase(ctx), loadTeamPerformance(ctx)]);
    return (
      <>
        <PageHeader title="Equipe" subtitle="Quem atende os leads, em que departamento e com qual meta mensal" />
        <CrmTeam
          members={base.members}
          logins={base.logins}
          desempenho={desempenho}
          scope={scope}
          readOnly={somenteLeitura}
        />
      </>
    );
  }

  if (aba === "config") {
    const base = await loadBase(ctx);
    return (
      <>
        <PageHeader
          title="Configurações do CRM"
          subtitle="Desenhe o funil e as etiquetas do jeito que a operação funciona"
        />
        <CrmSettings stages={base.stages} tags={base.tags} scope={scope} readOnly={somenteLeitura} />
      </>
    );
  }

  if (aba) notFound();

  const m = await loadMetrics(ctx);
  return (
    <>
      <PageHeader
        title={titulos?.titulo ?? "Painel do CRM"}
        subtitle={titulos?.subtitulo ?? "Seus leads, seu funil e seus números"}
      />
      <CrmDashboard m={m} basePath={basePath} />
    </>
  );
}
