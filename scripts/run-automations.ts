/**
 * Executor CLI das automações — para agendamento via cron:
 *   0 8 * * *  cd /app && npm run automations:run
 */
import { runAutomations } from "../src/lib/automations";
import { prisma } from "../src/lib/prisma";

runAutomations()
  .then((r) => {
    console.log(
      `Automações executadas: ${r.triggersRun.join(", ") || "nenhum gatilho ativo"} · ` +
        `${r.notificationsCreated} notificação(ões) criada(s) · ` +
        `${r.invoicesMarkedOverdue} fatura(s) marcada(s) como atrasada(s)`
    );
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
