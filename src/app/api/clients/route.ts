import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { getSession } from "@/lib/auth";
import { emptyToNull, invalidResponse, normalizeInstagram } from "@/lib/validation";

const createSchema = z.object({
  companyName: z.string().min(2),
  segment: z.string().max(80).optional(),
  plan: z.string().max(80).optional(),
  billingType: z.enum(["FIXO", "COMISSAO"]).optional(),
  monthlyValue: z.coerce.number().min(0).optional(),
  commissionBase: z.coerce.number().min(0).max(100).optional(),
  commissionShare: z.coerce.number().min(0).max(100).optional(),
  contractMonths: z.preprocess(emptyToNull, z.coerce.number().int().min(1).max(120).nullish()),
  contractStart: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  cnpj: z.string().max(30).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(2).optional(),
  website: z.string().max(200).optional(),
  instagram: z.preprocess(normalizeInstagram, z.string().max(80).optional()),
});

export async function POST(req: NextRequest) {
  const session = await requireStaff("clientes", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { email, contractStart, monthlyValue, billingType, commissionBase, commissionShare, ...rest } = parsed.data;

  if (billingType === "COMISSAO" && (!commissionBase || !commissionShare)) {
    return NextResponse.json(
      { error: "Contratos por comissão precisam da base de comissão do cliente e do percentual da FortGrow." },
      { status: 400 }
    );
  }

  const client = await prisma.client.create({
    data: {
      ...rest,
      email: email || null,
      billingType: billingType ?? "FIXO",
      monthlyValue: billingType === "COMISSAO" ? 0 : monthlyValue ?? 0,
      commissionBase: billingType === "COMISSAO" ? commissionBase! : 0,
      commissionShare: billingType === "COMISSAO" ? commissionShare! : 0,
      contractStart: contractStart ? new Date(contractStart) : new Date(),
      status: "ONBOARDING",
      accountManagerId: session.sub,
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "client.create", entity: "Client", entityId: client.id },
  });

  return NextResponse.json({ client }, { status: 201 });
}

const deleteSchema = z.object({ id: z.string().min(1) });

/**
 * Soft delete: arquiva o cliente (lixeira de 30 dias) e desativa os acessos
 * ao portal na hora. Com ?purge=1, exclui definitivamente (dados em cascata).
 * Requer permissão de exclusão no módulo Clientes (admins sempre têm).
 */
export async function DELETE(req: NextRequest) {
  const session = await requireStaff("clientes", "delete");
  if (isResponse(session)) return session;

  // id via querystring (?id=...) — corpos de DELETE podem ser descartados por proxies
  const bodyId = (await req.json().catch(() => null))?.id;
  const parsed = deleteSchema.safeParse({ id: req.nextUrl.searchParams.get("id") ?? bodyId });
  if (!parsed.success) return invalidResponse(parsed.error);

  const purge = req.nextUrl.searchParams.get("purge") === "1";
  const client = await prisma.client.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, companyName: true, archivedAt: true },
  });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  if (purge) {
    await prisma.$transaction([
      prisma.user.deleteMany({ where: { clientId: client.id, role: "CLIENTE" } }),
      prisma.client.delete({ where: { id: client.id } }),
      prisma.activityLog.create({
        data: { userId: session.sub, action: "client.purge", entity: "Client", entityId: client.id },
      }),
    ]);
    return NextResponse.json({ ok: true, purged: client.companyName });
  }

  await prisma.$transaction([
    prisma.client.update({
      where: { id: client.id },
      data: { archivedAt: new Date(), status: "INATIVO" },
    }),
    // Desativa os acessos ao portal e derruba as sessões imediatamente
    prisma.user.updateMany({
      where: { clientId: client.id, role: "CLIENTE" },
      data: { active: false, tokenVersion: { increment: 1 } },
    }),
    prisma.activityLog.create({
      data: { userId: session.sub, action: "client.archive", entity: "Client", entityId: client.id },
    }),
  ]);

  return NextResponse.json({ ok: true, archived: client.companyName });
}

const nullableStr = (max: number) => z.string().max(max).nullish();

const updateSchema = z.object({
  id: z.string().min(1),
  // Contas de anúncio (integração de campanhas)
  adAccounts: z
    .object({
      googleAdsId: z.string().max(60).optional(),
      metaAdsId: z.string().max(60).optional(),
      instagram: z.preprocess(normalizeInstagram, z.string().max(80).optional()),
      ga4PropertyId: z.string().max(60).optional(),
    })
    .optional(),
  // Edição completa do cadastro
  companyName: z.string().min(2).max(160).optional(),
  cnpj: nullableStr(30),
  segment: nullableStr(80),
  city: nullableStr(80),
  state: nullableStr(2),
  website: nullableStr(200),
  instagram: z.preprocess(normalizeInstagram, nullableStr(80)),
  email: z.string().email().nullish().or(z.literal("")),
  phone: nullableStr(30),
  status: z.enum(["ATIVO", "PAUSADO", "INATIVO", "ONBOARDING"]).optional(),
  plan: nullableStr(120),
  billingType: z.enum(["FIXO", "COMISSAO"]).optional(),
  monthlyValue: z.coerce.number().min(0).optional(),
  commissionBase: z.coerce.number().min(0).max(100).optional(),
  commissionShare: z.coerce.number().min(0).max(100).optional(),
  contractStart: z.string().nullish(),
  contractMonths: z.preprocess(emptyToNull, z.coerce.number().int().min(1).max(120).nullish()),
  projectStatus: nullableStr(80),
  notes: nullableStr(2000),
  /// Restaura um cliente da lixeira
  restore: z.boolean().optional(),
});

/** Edição completa do cliente (todos os campos) e vínculo de contas de anúncio. */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("clientes", "edit");
  if (isResponse(session)) return session;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { id, adAccounts, email, contractStart, restore, ...fields } = parsed.data;

  const data: Record<string, unknown> = {};
  if (restore) {
    data.archivedAt = null;
    data.status = "ATIVO";
    // Reativa os acessos ao portal
    await prisma.user.updateMany({
      where: { clientId: id, role: "CLIENTE" },
      data: { active: true, tokenVersion: { increment: 1 } },
    });
  }
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) data[k] = v === "" ? null : v;
  if (email !== undefined) data.email = email || null;
  if (contractStart !== undefined) data.contractStart = contractStart ? new Date(contractStart) : null;
  if (adAccounts !== undefined) {
    data.adAccounts = Object.fromEntries(
      Object.entries(adAccounts).filter(([, v]) => String(v ?? "").trim() !== "")
    );
  }

  const client = await prisma.client.update({ where: { id }, data });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "client.update", entity: "Client", entityId: client.id },
  });

  return NextResponse.json({ ok: true, client });
}
