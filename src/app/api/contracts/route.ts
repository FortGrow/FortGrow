import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { invalidResponse } from "@/lib/validation";
import {
  gerarContratoDeTemplate,
  gerarContratoPdf,
  valoresDoContrato,
  type DadosContratada,
} from "@/lib/contract-doc";
import { preencherDocx } from "@/lib/docx-fill";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().trim().min(3).max(160),
  value: z.coerce.number().min(0).default(0),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  autoRenew: z.boolean().default(false),
  /** Estrutura própria (ContractTemplate); null = texto padrão gerado */
  templateId: z.string().nullish(),
});

/** Dados da FortGrow para o texto do contrato (chaves contratada* em Setting). */
async function dadosContratada(): Promise<DadosContratada> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["contratadaRazao", "contratadaCnpj", "contratadaEndereco", "contratadaForo"] } },
  });
  const get = (k: string) => {
    const v = rows.find((r) => r.key === k)?.value;
    return typeof v === "string" ? v : null;
  };
  return {
    razao: get("contratadaRazao"),
    cnpj: get("contratadaCnpj"),
    endereco: get("contratadaEndereco"),
    foro: get("contratadaForo"),
  };
}

/**
 * Cria um contrato vinculado ao cliente e gera o PDF automaticamente a
 * partir do cadastro — o documento aparece no portal do cliente para
 * assinatura eletrônica no gov.br.
 */
export async function POST(req: NextRequest) {
  const session = await requireStaff("contratos", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);
  const { clientId, title, value, startDate, endDate, autoRenew, templateId } = parsed.data;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.archivedAt) {
    return NextResponse.json({ error: "Cliente não encontrado (ou na Lixeira)." }, { status: 404 });
  }

  const template = templateId
    ? await prisma.contractTemplate.findUnique({ where: { id: templateId } })
    : null;
  if (templateId && !template) {
    return NextResponse.json({ error: "Modelo de contrato não encontrado." }, { status: 404 });
  }

  const contrato = {
    title,
    value,
    startDate: new Date(`${startDate}T12:00:00`),
    endDate: endDate ? new Date(`${endDate}T12:00:00`) : null,
    autoRenew,
  };

  const dadosCliente = {
    companyName: client.companyName,
    cnpj: client.cnpj,
    email: client.email,
    phone: client.phone,
    city: client.city,
    state: client.state,
    plan: client.plan,
    billingType: client.billingType,
    monthlyValue: Number(client.monthlyValue),
    commissionBase: Number(client.commissionBase),
    commissionShare: Number(client.commissionShare),
    closingDay: client.closingDay,
  };

  /* Documento do contrato:
     — Modelo Word (kind DOCX): EDITA o arquivo original do admin — os
       marcadores são preenchidos dentro do próprio .docx, preservando o
       layout dele por completo. Nada é reformatado.
     — Modelo de texto: PDF gerado com a estrutura do modelo.
     — Sem modelo: PDF com o texto padrão do sistema. */
  let arquivo: Buffer;
  let extensao = "pdf";
  if (template?.kind === "DOCX" && template.filePath) {
    const original = await readFile(path.join(process.cwd(), "uploads", template.filePath)).catch(() => null);
    const preenchido = original ? preencherDocx(original, valoresDoContrato(dadosCliente, contrato)) : null;
    if (!preenchido) {
      return NextResponse.json(
        { error: "O arquivo Word deste modelo não pôde ser lido — importe-o novamente em Modelos de contrato." },
        { status: 422 }
      );
    }
    arquivo = preenchido;
    extensao = "docx";
  } else if (template) {
    arquivo = Buffer.from(gerarContratoDeTemplate(title, dadosCliente, contrato, template.body));
  } else {
    arquivo = Buffer.from(gerarContratoPdf(dadosCliente, contrato, await dadosContratada()));
  }

  const fileName = `contrato-${Date.now()}.${extensao}`;
  const dir = path.join(process.cwd(), "uploads", clientId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), arquivo);
  const fileUrl = `/api/files/${clientId}/${fileName}`;

  const created = await prisma.contract.create({
    data: { clientId, ...contrato, fileUrl },
  });

  // O documento também entra na área Documentos do portal
  await prisma.document.create({
    data: {
      clientId,
      name: `${title}.${extensao}`,
      type: "CONTRATO",
      url: fileUrl,
      sizeKb: Math.round(arquivo.length / 1024),
      uploadedBy: session.name,
    },
  });

  // Avisa os usuários do cliente que há contrato aguardando assinatura
  const clientUsers = await prisma.user.findMany({ where: { clientId, active: true }, select: { id: true } });
  if (clientUsers.length) {
    await prisma.notification.createMany({
      data: clientUsers.map((u) => ({
        userId: u.id,
        title: "Contrato disponível para assinatura",
        body: `${title} — baixe, assine com sua conta gov.br e devolva o PDF assinado.`,
        href: "/portal/documentos",
      })),
    });
  }

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "contract.create", entity: "Contract", entityId: created.id },
  });

  return NextResponse.json({ contract: created }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ATIVO", "ENCERRADO", "RENOVACAO", "CANCELADO"]).optional(),
  autoRenew: z.boolean().optional(),
});

/** Atualização pontual (status/renovação). */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("contratos", "edit");
  if (isResponse(session)) return session;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);
  const { id, ...data } = parsed.data;

  const existing = await prisma.contract.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });

  const contract = await prisma.contract.update({ where: { id }, data });
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "contract.update", entity: "Contract", entityId: id },
  });
  return NextResponse.json({ contract });
}

export async function DELETE(req: NextRequest) {
  const session = await requireStaff("contratos", "edit");
  if (isResponse(session)) return session;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const existing = await prisma.contract.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });

  await prisma.contract.delete({ where: { id } });
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "contract.delete", entity: "Contract", entityId: id },
  });
  return NextResponse.json({ ok: true });
}
