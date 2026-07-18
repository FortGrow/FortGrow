/**
 * Executor CLI da sincronização de campanhas — para agendamento via cron:
 *   0 6 * * *  cd /app && npm run sync:run
 */
import { runSync } from "../src/lib/sync";
import { prisma } from "../src/lib/prisma";

runSync()
  .then((r) => {
    console.log(
      `Sync: ${r.clientsProcessed} cliente(s), ${r.campaignsSynced} campanha(s), ${r.insightsUpserted} métrica(s), ${r.errors} erro(s).`
    );
    for (const d of r.details) console.log("  •", d);
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
