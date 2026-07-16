import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";

const createSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  linkedin: z.string().optional(),
  website: z.string().optional(),
  source: z.string().optional(),
  segment: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  potential: z.string().optional(),
  estimatedValue: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await requireStaff("crm");
  if (isResponse(session)) return session;
  const leads = await prisma.lead.findMany({ orderBy: { updatedAt: "desc" }, take: 500 });
  return NextResponse.json({ leads });
}

export async function POST(req: NextRequest) {
  const session = await requireStaff("crm");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { email, estimatedValue, ...rest } = parsed.data;
  const lead = await prisma.lead.create({
    data: {
      ...rest,
      email: email || null,
      estimatedValue: estimatedValue ?? 0,
      ownerId: session.sub,
      activities: { create: { type: "nota", content: "Lead criado", author: session.name } },
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "lead.create", entity: "Lead", entityId: lead.id },
  });

  return NextResponse.json({ lead }, { status: 201 });
}

const stageSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(["LEAD", "CONTATO", "DIAGNOSTICO", "REUNIAO", "PROPOSTA", "NEGOCIACAO", "FECHADO", "PERDIDO"]),
});

/** Move um lead de etapa no pipeline (Kanban). */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("crm");
  if (isResponse(session)) return session;

  const parsed = stageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const lead = await prisma.lead.update({
    where: { id: parsed.data.id },
    data: {
      stage: parsed.data.stage,
      activities: {
        create: { type: "mudanca_etapa", content: `Movido para ${parsed.data.stage}`, author: session.name },
      },
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "lead.stage", entity: "Lead", entityId: lead.id },
  });

  return NextResponse.json({ lead });
}
