import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeInstagram } from "@/lib/validation";

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

  const { contactName, companyName, phone, email, segment, message, instagram } = parsed.data;

  try {
    const lead = await prisma.lead.create({
      data: {
        companyName: companyName || contactName,
        contactName,
        phone,
        whatsapp: phone,
        email: email || null,
        segment: segment || null,
        instagram: instagram || null,
        source: "Site (formulário)",
        prospectStatus: "NOVO",
        firstContactAt: new Date(),
        notes: message
          ? `Mensagem do site: ${message}`
          : "Contato recebido pelo formulário da página inicial.",
        activities: {
          create: {
            type: "nota",
            content: "Lead recebido pelo formulário do site",
            author: "Site FortGrow",
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
