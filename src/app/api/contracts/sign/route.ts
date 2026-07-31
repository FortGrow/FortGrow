import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAuth, isResponse } from "@/lib/api-guard";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Devolução do contrato assinado (PDF do gov.br).
 * Cliente do portal envia o do próprio contrato; equipe com módulo
 * Contratos pode anexar em nome do cliente (ex.: recebido por e-mail).
 */
export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Envie como multipart/form-data." }, { status: 400 });

  const contractId = String(form.get("contractId") ?? "");
  const file = form.get("file");
  if (!contractId || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Contrato e arquivo são obrigatórios." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo excede 10 MB." }, { status: 400 });
  }
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!isPdf) {
    return NextResponse.json({ error: "Envie o PDF assinado (arquivo .pdf do gov.br)." }, { status: 400 });
  }

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });

  // Cliente só assina o contrato da própria empresa; equipe precisa do módulo
  if (session.role === "CLIENTE") {
    if (!session.clientId || session.clientId !== contract.clientId) {
      return NextResponse.json({ error: "Sem permissão para este contrato." }, { status: 403 });
    }
  } else if (!can(session, "contratos", "edit")) {
    return NextResponse.json({ error: "Sem permissão para acessar neste módulo." }, { status: 403 });
  }

  const fileName = `contrato-assinado-${Date.now()}.pdf`;
  const dir = path.join(process.cwd(), "uploads", contract.clientId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));
  const signedFileUrl = `/api/files/${contract.clientId}/${fileName}`;

  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: { signedFileUrl, signedAt: new Date() },
  });

  // O assinado também fica na área Documentos das duas pontas
  await prisma.document.create({
    data: {
      clientId: contract.clientId,
      name: `${contract.title} (assinado).pdf`,
      type: "CONTRATO",
      url: signedFileUrl,
      sizeKb: Math.round(file.size / 1024),
      uploadedBy: session.name,
    },
  });

  // Avisa os administradores que o contrato voltou assinado
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } });
  if (admins.length) {
    const clientName = (
      await prisma.client.findUnique({ where: { id: contract.clientId }, select: { companyName: true } })
    )?.companyName;
    await prisma.notification.createMany({
      data: admins.map((u) => ({
        userId: u.id,
        title: "Contrato assinado recebido",
        body: `${clientName ?? "Cliente"} devolveu "${contract.title}" assinado via gov.br.`,
        href: "/admin/contratos",
      })),
    });
  }

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "contract.signed", entity: "Contract", entityId: contract.id },
  });

  return NextResponse.json({ contract: updated });
}
