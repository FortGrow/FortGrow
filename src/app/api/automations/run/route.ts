import { NextResponse } from "next/server";
import { runAutomations } from "@/lib/automations";
import { requireStaff, isResponse } from "@/lib/api-guard";

/** Executa o ciclo de automações sob demanda (em produção, agendar via cron). */
export async function POST() {
  const session = await requireStaff("automacoes");
  if (isResponse(session)) return session;

  const result = await runAutomations();
  return NextResponse.json({ result });
}
