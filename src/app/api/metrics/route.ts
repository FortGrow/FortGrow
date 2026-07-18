import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";

const schema = z.object({
  clientId: z.string().min(1),
  channel: z.enum(["GOOGLE_ADS", "META_ADS", "INSTAGRAM", "SEO", "LINKEDIN", "TIKTOK", "EMAIL", "OUTRO"]),
  date: z.string().min(8),
  impressions: z.coerce.number().min(0).optional(),
  clicks: z.coerce.number().min(0).optional(),
  reach: z.coerce.number().min(0).optional(),
  leads: z.coerce.number().min(0).optional(),
  conversions: z.coerce.number().min(0).optional(),
  spend: z.coerce.number().min(0).optional(),
  revenue: z.coerce.number().min(0).optional(),
  followers: z.coerce.number().min(0).optional(),
  engagement: z.coerce.number().min(0).optional(),
});

/**
 * Lançamento manual de métricas de campanha por cliente/canal/dia —
 * alimenta os mesmos dashboards da sincronização automática.
 */
export async function POST(req: NextRequest) {
  const session = await requireStaff("campanhas", "edit");
  if (isResponse(session)) return session;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { clientId, channel, date, ...metrics } = parsed.data;
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);

  const data = Object.fromEntries(Object.entries(metrics).filter(([, v]) => v !== undefined));

  const snapshot = await prisma.metricSnapshot.upsert({
    where: { clientId_channel_date: { clientId, channel, date: day } },
    create: { clientId, channel, date: day, ...data },
    update: data,
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "metrics.manual", entity: "MetricSnapshot", entityId: snapshot.id },
  });

  return NextResponse.json({ snapshot }, { status: 201 });
}
