import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";

const connectSchema = z.object({
  provider: z.string().min(1).max(60),
  apiKey: z.string().min(4).max(500),
  accountId: z.string().max(120).optional(),
});

/** Conecta uma integração salvando a credencial (usada pelos syncs). */
export async function POST(req: NextRequest) {
  const session = await requireStaff("integracoes");
  if (isResponse(session)) return session;

  const parsed = connectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe a credencial da plataforma." }, { status: 400 });

  const { provider, apiKey, accountId } = parsed.data;
  const integration = await prisma.integration.upsert({
    where: { provider },
    create: { provider, connected: true, config: { apiKey, accountId: accountId ?? null } },
    update: { connected: true, config: { apiKey, accountId: accountId ?? null } },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "integration.connect", entity: "Integration", entityId: provider },
  });

  return NextResponse.json({ ok: true, provider: integration.provider });
}

const disconnectSchema = z.object({ provider: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const session = await requireStaff("integracoes");
  if (isResponse(session)) return session;

  // provider via querystring — corpos de DELETE podem ser descartados por proxies
  const bodyProvider = (await req.json().catch(() => null))?.provider;
  const parsed = disconnectSchema.safeParse({
    provider: req.nextUrl.searchParams.get("provider") ?? bodyProvider,
  });
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  await prisma.integration.upsert({
    where: { provider: parsed.data.provider },
    create: { provider: parsed.data.provider, connected: false, config: {} },
    update: { connected: false, config: {} },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "integration.disconnect", entity: "Integration", entityId: parsed.data.provider },
  });

  return NextResponse.json({ ok: true });
}
