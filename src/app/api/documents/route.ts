import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const DOC_TYPES = new Set([
  "CONTRATO", "BRIEFING", "CRIATIVO", "RELATORIO", "APRESENTACAO", "NOTA_FISCAL", "PLANEJAMENTO", "VIDEO", "IMAGEM", "OUTRO",
]);

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

/** Upload de documento para um cliente (equipe interna). */
export async function POST(req: NextRequest) {
  const session = await requireStaff("clientes", "edit");
  if (isResponse(session)) return session;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Envie como multipart/form-data." }, { status: 400 });

  const file = form.get("file");
  const clientId = String(form.get("clientId") ?? "");
  const type = String(form.get("type") ?? "OUTRO");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Arquivo não informado." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo excede 10 MB." }, { status: 400 });
  }
  if (!DOC_TYPES.has(type)) {
    return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  const safeName = `${Date.now()}-${sanitize(file.name || "arquivo")}`;
  const dir = path.join(process.cwd(), "uploads", clientId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safeName), Buffer.from(await file.arrayBuffer()));

  const doc = await prisma.document.create({
    data: {
      clientId,
      name: file.name || safeName,
      type: type as never,
      // Servido por /api/files com controle de acesso por tenant
      url: `/api/files/${clientId}/${safeName}`,
      sizeKb: Math.round(file.size / 1024),
      uploadedBy: session.name,
    },
  });

  // Notifica os usuários do cliente sobre o novo documento
  const clientUsers = await prisma.user.findMany({ where: { clientId, active: true }, select: { id: true } });
  if (clientUsers.length) {
    await prisma.notification.createMany({
      data: clientUsers.map((u) => ({
        userId: u.id,
        title: "Novo documento disponível",
        body: doc.name,
        href: "/portal/documentos",
      })),
    });
  }

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "document.upload", entity: "Document", entityId: doc.id },
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}
