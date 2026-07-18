/**
 * Motor de automações do FortGrow CRM.
 *
 * Executa os gatilhos ativos da tabela Automation e gera notificações
 * (canal "notificacao"/"email"/"whatsapp" — os canais externos ficam
 * registrados como notificação até as integrações de envio serem conectadas).
 * Idempotente por 24h: não repete o mesmo aviso para o mesmo destinatário no dia.
 */
import { prisma } from "@/lib/prisma";
import { generateSubscriptionCharges } from "@/lib/billing";

export type AutomationRunResult = {
  chargesGenerated: number;
  invoicesMarkedOverdue: number;
  clientsPurged: number;
  notificationsCreated: number;
  triggersRun: string[];
};

async function notifyOnce(userId: string, title: string, body: string, href: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dup = await prisma.notification.findFirst({
    where: { userId, title, body, createdAt: { gte: since } },
    select: { id: true },
  });
  if (dup) return false;
  await prisma.notification.create({ data: { userId, title, body, href } });
  return true;
}

export async function runAutomations(): Promise<AutomationRunResult> {
  const now = new Date();
  const result: AutomationRunResult = {
    chargesGenerated: 0,
    invoicesMarkedOverdue: 0,
    clientsPurged: 0,
    notificationsCreated: 0,
    triggersRun: [],
  };

  // Passo de manutenção: gera as cobranças do mês das mensalidades ativas
  result.chargesGenerated = await generateSubscriptionCharges();

  const [automations, admins] = await Promise.all([
    prisma.automation.findMany({ where: { active: true } }),
    prisma.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } }),
  ]);
  const activeTriggers = new Set(automations.map((a) => a.trigger));

  // Passo de manutenção: marca faturas vencidas como ATRASADO
  const overdueUpdate = await prisma.invoice.updateMany({
    where: { status: "EM_ABERTO", dueDate: { lt: now } },
    data: { status: "ATRASADO" },
  });
  result.invoicesMarkedOverdue = overdueUpdate.count;

  // Passo de manutenção: esvazia a Lixeira — clientes arquivados há mais de 30 dias
  const purgeBefore = new Date(now.getTime() - 30 * 86400000);
  const expired = await prisma.client.findMany({
    where: { archivedAt: { not: null, lt: purgeBefore } },
    select: { id: true, companyName: true },
  });
  for (const c of expired) {
    await prisma.$transaction([
      prisma.user.deleteMany({ where: { clientId: c.id, role: "CLIENTE" } }),
      prisma.client.delete({ where: { id: c.id } }),
      prisma.activityLog.create({ data: { action: "client.auto_purge", entity: "Client", entityId: c.id } }),
    ]);
    result.clientsPurged++;
  }

  // ── vencimento_fatura: avisa admins e usuários do cliente ──────────
  if (activeTriggers.has("vencimento_fatura")) {
    result.triggersRun.push("vencimento_fatura");
    const in3days = new Date(now.getTime() + 3 * 86400000);
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [{ status: "EM_ABERTO", dueDate: { lte: in3days } }, { status: "ATRASADO" }],
      },
      include: { client: { select: { companyName: true, users: { where: { active: true }, select: { id: true } } } } },
    });
    for (const inv of invoices) {
      const late = inv.status === "ATRASADO";
      const title = late ? "Fatura em atraso" : "Fatura próxima do vencimento";
      const body = `${inv.client.companyName} — ${inv.description} (vence ${inv.dueDate.toLocaleDateString("pt-BR")})`;
      for (const admin of admins) {
        if (await notifyOnce(admin.id, title, body, "/admin/financeiro")) result.notificationsCreated++;
      }
      for (const u of inv.client.users) {
        if (await notifyOnce(u.id, title, `${inv.description} — vencimento ${inv.dueDate.toLocaleDateString("pt-BR")}`, "/portal/financeiro"))
          result.notificationsCreated++;
      }
    }
  }

  // ── contrato_renovacao: contratos ativos que terminam em 30 dias ───
  if (activeTriggers.has("contrato_renovacao")) {
    result.triggersRun.push("contrato_renovacao");
    const in30days = new Date(now.getTime() + 30 * 86400000);
    const contracts = await prisma.contract.findMany({
      where: { status: "ATIVO", endDate: { not: null, lte: in30days, gte: now } },
      include: { client: { select: { companyName: true } } },
    });
    for (const c of contracts) {
      const body = `${c.client.companyName} — ${c.title} termina em ${c.endDate!.toLocaleDateString("pt-BR")}${c.autoRenew ? " (renovação automática)" : ""}`;
      for (const admin of admins) {
        if (await notifyOnce(admin.id, "Contrato próximo da renovação", body, "/admin/contratos"))
          result.notificationsCreated++;
      }
    }
  }

  // ── tarefa_atrasada: avisa o responsável ───────────────────────────
  if (activeTriggers.has("tarefa_atrasada")) {
    result.triggersRun.push("tarefa_atrasada");
    const tasks = await prisma.task.findMany({
      where: { status: { not: "CONCLUIDA" }, dueDate: { not: null, lt: now }, assigneeId: { not: null } },
    });
    for (const t of tasks) {
      if (
        await notifyOnce(
          t.assigneeId!,
          "Tarefa atrasada",
          `"${t.title}" venceu em ${t.dueDate!.toLocaleDateString("pt-BR")}`,
          "/admin/tarefas"
        )
      )
        result.notificationsCreated++;
    }
  }

  await prisma.activityLog.create({
    data: {
      action: "automations.run",
      entity: "Automation",
      entityId: result.triggersRun.join(","),
    },
  });

  return result;
}
