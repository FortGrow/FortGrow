import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { invalidResponse } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Modelos de contrato da FortGrow — o texto colado pelo admin, com marcadores. */
export async function GET() {
  const session = await requireStaff("contratos", "view");
  if (isResponse(session)) return session;
  const templates = await prisma.contractTemplate.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ templates });
}

/** Caminho gravado pelo /extract — só aceitamos o que ele gera. */
const docxPath = z
  .string()
  .regex(/^contract-templates\/[a-zA-Z0-9._-]+\.docx$/)
  .nullish();

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  body: z.string().trim().min(20).max(120_000),
  /** Presente = modo Word: a geração edita esse arquivo em vez de recriar */
  filePath: docxPath,
});

export async function POST(req: NextRequest) {
  const session = await requireStaff("contratos", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { filePath, ...rest } = parsed.data;
  const template = await prisma.contractTemplate.create({
    data: { ...rest, filePath: filePath ?? null, kind: filePath ? "DOCX" : "TEXTO" },
  });
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "contract-template.create", entity: "ContractTemplate", entityId: template.id },
  });
  return NextResponse.json({ template }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(120).optional(),
  body: z.string().trim().min(20).max(120_000).optional(),
  filePath: docxPath,
});

export async function PATCH(req: NextRequest) {
  const session = await requireStaff("contratos", "edit");
  if (isResponse(session)) return session;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);
  const { id, filePath, ...data } = parsed.data;

  const existing = await prisma.contractTemplate.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });

  const template = await prisma.contractTemplate.update({
    where: { id },
    // filePath só muda quando um novo arquivo é importado (undefined = mantém)
    data: filePath !== undefined ? { ...data, filePath, kind: filePath ? "DOCX" : "TEXTO" } : data,
  });
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "contract-template.update", entity: "ContractTemplate", entityId: id },
  });
  return NextResponse.json({ template });
}

export async function DELETE(req: NextRequest) {
  const session = await requireStaff("contratos", "edit");
  if (isResponse(session)) return session;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const existing = await prisma.contractTemplate.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });

  await prisma.contractTemplate.delete({ where: { id } });
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "contract-template.delete", entity: "ContractTemplate", entityId: id },
  });
  return NextResponse.json({ ok: true });
}
