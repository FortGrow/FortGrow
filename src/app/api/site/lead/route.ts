import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeInstagram } from "@/lib/validation";
import { REVENUE_RANGES } from "@/lib/site-config";
import { ensureStages } from "@/lib/crm-tenant";

/**
 * Faturamento maior → etiqueta de potencial maior.
 *
 * No modelo novo o "potencial" virou etiqueta: o score do lead é calculado
 * (valor, avanço no funil, completude, tempo sem contato), então guardar
 * também uma nota manual no mesmo campo criaria duas verdades.
 */
function tagFromRevenue(revenue?: string): { nome: string; cor: string } | null {
  if (!revenue) return null;
  const i = REVENUE_RANGES.indexOf(revenue);
  if (i < 0) return null;
  if (i >= 3) return { nome: "Potencial alto", cor: "#059669" };
  if (i >= 1) return null;
  return { nome: "Potencial baixo", cor: "#e11d48" };
}

/**
 * Endpoint PÚBLICO do formulário da página inicial.
 * Cria um Lead novo na Prospecção/CRM com origem "Site" — sem dono, status
 * NOVO, para a equipe abordar. Não exige autenticação (é o site institucional).
 *
 * Proteções básicas: honeypot anti-bot, limites de tamanho e validação.
 */
const schema = z.object({
  // honeypot: bots preenchem; humanos não veem o campo (checado após o parse)
  website: z.string().max(200).optional(),
  contactName: z.string().min(2, "Informe seu nome").max(120),
  companyName: z.string().max(160).optional().or(z.literal("")),
  phone: z.string().min(8, "Informe um telefone/WhatsApp válido").max(30),
  email: z.string().email("E-mail inválido").max(160).optional().or(z.literal("")),
  segment: z.string().max(120).optional().or(z.literal("")),
  revenue: z.string().max(60).optional().or(z.literal("")),
  message: z.string().max(1000).optional().or(z.literal("")),
  instagram: z.preprocess(normalizeInstagram, z.string().max(80).optional()),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Dados inválidos";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  // Honeypot preenchido → provavelmente bot. Responde sucesso silenciosamente.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  const { contactName, companyName, phone, email, segment, revenue, message, instagram } = parsed.data;

  // Observações do lead: faturamento informado + mensagem (o que houver)
  const noteParts: string[] = [];
  if (revenue) noteParts.push(`Faturamento: ${revenue}`);
  if (message) noteParts.push(`Mensagem do site: ${message}`);
  const notes = noteParts.join("\n") || "Contato recebido pelo formulário da página inicial.";

  try {
    // Entra no CRM Comercial da FortGrow (espaço interno), na primeira etapa
    await ensureStages(null);
    const primeira = await prisma.crmStage.findFirst({
      where: { clientId: null },
      orderBy: { position: "asc" },
    });
    if (!primeira) throw new Error("funil interno ausente");

    const etiqueta = tagFromRevenue(revenue);
    let tagId: string | null = null;
    if (etiqueta) {
      const existente = await prisma.crmTag.findFirst({ where: { clientId: null, name: etiqueta.nome } });
      tagId =
        existente?.id ??
        (await prisma.crmTag.create({ data: { clientId: null, name: etiqueta.nome, color: etiqueta.cor } })).id;
    }

    const lead = await prisma.crmLead.create({
      data: {
        clientId: null,
        name: contactName,
        company: companyName || null,
        phone,
        whatsapp: phone,
        email: email || null,
        segment: segment || null,
        instagram: instagram || null,
        source: "Site (formulário)",
        stageId: primeira.id,
        lastContactAt: new Date(),
        notes,
        ...(tagId ? { tags: { connect: { id: tagId } } } : {}),
        activities: {
          create: {
            type: "CRIACAO",
            content: "Lead recebido pelo formulário do site",
            authorName: "Site FortGrow",
          },
        },
      },
    });

    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível enviar agora. Tente novamente em instantes." },
      { status: 500 },
    );
  }
}
