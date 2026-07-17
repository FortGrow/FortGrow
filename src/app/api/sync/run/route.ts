import { NextResponse } from "next/server";
import { runSync } from "@/lib/sync";
import { requireStaff, isResponse } from "@/lib/api-guard";

export const maxDuration = 60;

/** Dispara a sincronização de campanhas sob demanda (em produção, agendar via cron). */
export async function POST() {
  const session = await requireStaff("integracoes");
  if (isResponse(session)) return session;

  const result = await runSync();
  return NextResponse.json({ result });
}
