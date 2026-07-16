import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";

const createSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(2),
  channel: z.enum(["GOOGLE_ADS", "META_ADS", "INSTAGRAM", "SEO", "LINKEDIN", "TIKTOK", "EMAIL", "OUTRO"]),
  budget: z.coerce.number().min(0).optional(),
  objective: z.string().max(120).optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireStaff("campanhas");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const campaign = await prisma.campaign.create({
    data: {
      clientId: parsed.data.clientId,
      name: parsed.data.name,
      channel: parsed.data.channel,
      budget: parsed.data.budget ?? 0,
      objective: parsed.data.objective || null,
      startDate: new Date(),
      active: true,
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "campaign.create", entity: "Campaign", entityId: campaign.id },
  });

  return NextResponse.json({ campaign }, { status: 201 });
}

const toggleSchema = z.object({ id: z.string().min(1), active: z.boolean() });

/** Ativa/pausa uma campanha. */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("campanhas");
  if (isResponse(session)) return session;

  const parsed = toggleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const campaign = await prisma.campaign.update({
    where: { id: parsed.data.id },
    data: { active: parsed.data.active, endDate: parsed.data.active ? null : new Date() },
  });

  return NextResponse.json({ campaign });
}
