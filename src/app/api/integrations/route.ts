import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { encryptSecret } from "@/lib/crypto";

const connectSchema = z.object({
  provider: z.string().min(1).max(60),
  apiKey: z.string().min(4).max(500),
  accountId: z.string().max(120).optional(),
});

/** Conecta uma integração salvando a credencial (usada pelos syncs). */
export async function POST(req: NextRequest) {
  const session = await requireStaff("integracoes", "edit");
  if (isResponse(session)) return session;

  const parsed = connectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe a credencial da plataforma." }, { status: 400 });

  const { provider, apiKey, accountId } = parsed.data;

  // Meta Ads: valida o token na hora — evita salvar credencial inválida em silêncio
  let validatedAs: string | null = null;
  if (provider === "meta_ads") {
    try {
      const graph = process.env.META_GRAPH_URL ?? "https://graph.facebook.com/v19.0";
      const res = await fetch(`${graph}/me?access_token=${encodeURIComponent(apiKey)}`, {
        signal: AbortSignal.timeout(15000),
      });
      const json = (await res.json().catch(() => null)) as { name?: string; error?: { message?: string } } | null;
      if (!res.ok) {
        return NextResponse.json(
          {
            error: `Token recusado pelo Meta: ${json?.error?.message ?? `HTTP ${res.status}`}. Gere um novo token (com permissão ads_read) em developers.facebook.com e tente de novo.`,
          },
          { status: 400 }
        );
      }
      validatedAs = json?.name ?? null;
    } catch {
      return NextResponse.json(
        { error: "Não foi possível validar o token com o Meta agora — tente novamente em instantes." },
        { status: 502 }
      );
    }
  }

  // Token criptografado em repouso (AES-256-GCM)
  const config = { apiKey: encryptSecret(apiKey), accountId: accountId ?? null };
  const integration = await prisma.integration.upsert({
    where: { provider },
    create: { provider, connected: true, config },
    update: { connected: true, config },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "integration.connect", entity: "Integration", entityId: provider },
  });

  return NextResponse.json({ ok: true, provider: integration.provider, validatedAs });
}

const disconnectSchema = z.object({ provider: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const session = await requireStaff("integracoes", "delete");
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
