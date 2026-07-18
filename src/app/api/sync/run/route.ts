import { NextRequest, NextResponse } from "next/server";
import { runSync, lastSync, isStale } from "@/lib/sync";
import { getSession } from "@/lib/auth";
import { verifyLiveSession } from "@/lib/api-guard";
import { can } from "@/lib/rbac";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Situação da sincronização (última execução + se está desatualizada). */
export async function GET() {
  const raw = await getSession();
  const session = raw ? await verifyLiveSession(raw) : null;
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const last = await lastSync();
  return NextResponse.json({ lastSync: last, stale: isStale(last) });
}

/**
 * Dispara a sincronização de campanhas.
 * - Equipe (módulo campanhas/integrações): tudo ou ?clientId=...
 * - Cliente do portal: apenas os próprios dados
 * - ?ifStale=1 respeita o cache (só roda se passou o intervalo)
 */
export async function POST(req: NextRequest) {
  const raw = await getSession();
  const session = raw ? await verifyLiveSession(raw) : null;
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const onlyIfStale = req.nextUrl.searchParams.get("ifStale") === "1";
  let clientId = req.nextUrl.searchParams.get("clientId") ?? undefined;

  if (session.role === "CLIENTE") {
    if (!session.clientId) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    clientId = session.clientId; // portal: sempre restrito ao próprio cliente
  } else if (!can(session, "campanhas", "view") && !can(session, "integracoes", "view")) {
    return NextResponse.json({ error: "Sem permissão para sincronizar campanhas." }, { status: 403 });
  }

  const result = await runSync({ clientId, onlyIfStale });
  return NextResponse.json({ result, lastSync: await lastSync(clientId ?? "all") });
}
