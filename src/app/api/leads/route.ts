import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { invalidResponse, normalizeInstagram } from "@/lib/validation";

const createSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  instagram: z.preprocess(normalizeInstagram, z.string().max(80).optional()),
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
  firstContactAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  prospectStatus: z.enum(["NOVO", "CONTATADO", "EM_CONVERSA", "QUALIFICADO"]).optional(),
});

export async function GET() {
  const session = await requireStaff("crm");
  if (isResponse(session)) return session;
  const leads = await prisma.lead.findMany({ orderBy: { updatedAt: "desc" }, take: 500 });
  return NextResponse.json({ leads });
}

export async function POST(req: NextRequest) {
  const session = await requireStaff("crm", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { email, estimatedValue, firstContactAt, ...rest } = parsed.data;
  const lead = await prisma.lead.create({
    data: {
      ...rest,
      email: email || null,
      estimatedValue: estimatedValue ?? 0,
      firstContactAt: firstContactAt ? new Date(`${firstContactAt}T12:00:00Z`) : new Date(),
      ownerId: session.sub,
      activities: { create: { type: "nota", content: "Lead criado", author: session.name } },
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "lead.create", entity: "Lead", entityId: lead.id },
  });

  return NextResponse.json({ lead }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(["LEAD", "CONTATO", "DIAGNOSTICO", "REUNIAO", "PROPOSTA", "NEGOCIACAO", "FECHADO", "PERDIDO"]).optional(),
  // Edição completa dos dados do lead
  companyName: z.string().min(1).max(160).optional(),
  contactName: z.string().max(120).nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  phone: z.string().max(30).nullish(),
  whatsapp: z.string().max(30).nullish(),
  instagram: z.preprocess(normalizeInstagram, z.string().max(80).nullish()),
  facebook: z.string().max(120).nullish(),
  linkedin: z.string().max(120).nullish(),
  website: z.string().max(200).nullish(),
  source: z.string().max(80).nullish(),
  segment: z.string().max(80).nullish(),
  city: z.string().max(80).nullish(),
  state: z.string().max(2).nullish(),
  potential: z.string().max(20).nullish(),
  estimatedValue: z.coerce.number().min(0).optional(),
  notes: z.string().max(2000).nullish(),
  firstContactAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish().or(z.literal("")),
  prospectStatus: z.enum(["NOVO", "CONTATADO", "EM_CONVERSA", "QUALIFICADO"]).optional(),
});

/** Atualiza um lead: mudança de etapa (Kanban) e/ou edição completa dos dados. */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("crm", "edit");
  if (isResponse(session)) return session;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { id, stage, email, firstContactAt, ...fields } = parsed.data;
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) data[k] = v === "" ? null : v;
  if (email !== undefined) data.email = email || null;
  if (firstContactAt !== undefined) {
    data.firstContactAt = firstContactAt ? new Date(`${firstContactAt}T12:00:00Z`) : null;
  }
  if (stage) {
    data.stage = stage;
    data.activities = {
      create: { type: "mudanca_etapa", content: `Movido para ${stage}`, author: session.name },
    };
  }

  const lead = await prisma.lead.update({ where: { id }, data });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: stage ? "lead.stage" : "lead.update", entity: "Lead", entityId: lead.id },
  });

  return NextResponse.json({ lead });
}
