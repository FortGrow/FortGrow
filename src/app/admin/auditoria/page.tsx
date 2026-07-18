import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import { UserFilter } from "./user-filter";

export const dynamic = "force-dynamic";

/** Rótulos pt-BR das ações registradas na trilha de auditoria. */
const ACTION_LABELS: Record<string, string> = {
  login: "Entrou no sistema",
  logout: "Saiu do sistema",
  "system.bootstrap": "Configuração inicial do sistema",
  "profile.update": "Atualizou o próprio perfil",
  "profile.password_change": "Trocou a própria senha",
  "client.create": "Criou cliente",
  "client.update": "Editou cliente",
  "client.archive": "Enviou cliente para a Lixeira",
  "client.purge": "Excluiu cliente definitivamente",
  "client.auto_purge": "Lixeira: exclusão automática (30 dias)",
  "lead.create": "Criou lead",
  "lead.update": "Editou lead",
  "lead.stage": "Moveu lead no funil",
  "user.create": "Criou usuário",
  "user.update": "Editou acesso de usuário",
  "user.delete": "Excluiu usuário",
  "user.permissions": "Alterou permissões de usuário",
  "commission_payment.update": "Corrigiu pagamento de comissão",
  "commission_payment.delete": "Desfez pagamento de comissão",
  "permission_template.save": "Salvou template de permissão",
  "event.create": "Criou evento na agenda",
  "event.update": "Editou evento da agenda",
  "event.delete": "Excluiu evento da agenda",
  "document.upload": "Enviou documento",
  "campaign.create": "Criou campanha",
  "post.create": "Agendou postagem",
  "subscription.create": "Criou mensalidade",
  "subscription.update": "Editou mensalidade",
  "subscription.delete": "Excluiu mensalidade",
  "invoice.create": "Lançou cobrança",
  "invoice.update": "Editou cobrança",
  "invoice.paid": "Marcou cobrança como paga",
  "invoice.delete": "Excluiu cobrança",
  "cost.create": "Lançou custo",
  "cost.delete": "Excluiu custo",
  "plan.create": "Criou/atualizou plano",
  "plan.delete": "Excluiu plano",
  "project.status": "Alterou status de projeto",
  "training.create": "Publicou treinamento",
  "metrics.manual": "Lançou métricas manualmente",
  "commission.launch": "Lançou comissão de cliente",
  "commission.launch_update": "Corrigiu lançamento de comissão",
  "commission_payment": "Registrou pagamento de comissão",
  "staff_commission.set": "Configurou comissão de colaborador",
  "integration.connect": "Conectou integração",
  "integration.disconnect": "Desconectou integração",
  "automations.run": "Rodou as automações",
  "sync.run": "Sincronizou campanhas (Meta Ads)",
};

function labelFor(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  if (action.startsWith("report.export.")) return `Exportou relatório (${action.split(".").pop()})`;
  return action;
}

const DANGER_ACTIONS = new Set(["client.purge", "client.auto_purge", "user.delete", "cost.delete", "plan.delete"]);
const SECURITY_ACTIONS = new Set(["user.permissions", "permission_template.save", "profile.password_change", "system.bootstrap"]);

export default async function AuditoriaPage({ searchParams }: { searchParams: { usuario?: string } }) {
  const session = await getSession();
  if (!can(session, "auditoria", "view")) redirect("/admin");

  const filter = searchParams.usuario;
  const where = filter === "sistema" ? { userId: null } : filter ? { userId: filter } : {};

  const [logs, staff] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { name: true, email: true, role: true } } },
    }),
    prisma.user.findMany({
      where: { role: { not: "CLIENTE" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const fmt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <PageHeader
        title="Auditoria"
        subtitle="Trilha de tudo que aconteceu no CRM — quem fez o quê e quando (últimos 200 eventos)"
      >
        <UserFilter users={staff} />
      </PageHeader>

      <DataTable headers={["Quando", "Quem", "Ação", "Registro", "IP"]}>
        {logs.map((log) => (
          <tr key={log.id} className="transition hover:bg-ink-800/50">
            <Td className="whitespace-nowrap text-xs text-slate-500">{fmt.format(log.createdAt)}</Td>
            <Td>
              {log.user ? (
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-700 text-[10px] font-bold text-brand-300">
                    {initials(log.user.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">{log.user.name}</p>
                    <p className="truncate text-[11px] text-slate-500">{log.user.email}</p>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-500">Sistema</span>
              )}
            </Td>
            <Td>
              <Badge
                tone={DANGER_ACTIONS.has(log.action) ? "danger" : SECURITY_ACTIONS.has(log.action) ? "violet" : "brand"}
              >
                {labelFor(log.action)}
              </Badge>
            </Td>
            <Td className="text-xs text-slate-500">
              {log.entity ? `${log.entity}${log.entityId ? ` · ${log.entityId.slice(0, 10)}…` : ""}` : "—"}
            </Td>
            <Td className="text-xs text-slate-600">{log.ip ?? "—"}</Td>
          </tr>
        ))}
        {logs.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
              Nenhum evento registrado para este filtro.
            </td>
          </tr>
        )}
      </DataTable>
    </>
  );
}
