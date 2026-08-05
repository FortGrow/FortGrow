/**
 * Leva o CRM Comercial da FortGrow (tabela `Lead`) para o motor do CRM
 * multi-tenant, no espaço interno (`clientId = null`).
 *
 * Depois desta migração a agência opera exatamente a mesma ferramenta que
 * entrega aos clientes: funil configurável, etiquetas, agenda, equipe,
 * score, importação e exportação.
 *
 * Idempotente: reconhece o que já foi migrado pelo par (nome, empresa,
 * data de criação) e não duplica. Roda no build do Render, então precisa
 * ser seguro executar a cada deploy.
 *
 * A tabela `Lead` NÃO é apagada — fica como cópia de segurança do estado
 * anterior. Nada mais no sistema lê dela depois desta migração.
 */
import { PrismaClient } from "@prisma/client";
import { computeScore, daysSince, temperatureOf } from "../src/lib/crm";

/**
 * O funil que a FortGrow já usava, agora como etapas editáveis. Não forçamos
 * as 7 etapas padrão do CRM de cliente: estas 8 são o processo real da
 * agência, e depois da migração dá para renomear/reordenar pela tela.
 */
const FUNIL_FORTGROW = [
  { key: "LEAD", label: "Lead", color: "#64748b", kind: "ABERTO" },
  { key: "CONTATO", label: "Contato iniciado", color: "#0284c7", kind: "ABERTO" },
  { key: "DIAGNOSTICO", label: "Diagnóstico", color: "#06b6d4", kind: "ABERTO" },
  { key: "REUNIAO", label: "Reunião agendada", color: "#8b5cf6", kind: "ABERTO" },
  { key: "PROPOSTA", label: "Proposta enviada", color: "#6366f1", kind: "ABERTO" },
  { key: "NEGOCIACAO", label: "Negociação", color: "#d97706", kind: "ABERTO" },
  { key: "FECHADO", label: "Fechado (ganho)", color: "#059669", kind: "GANHO" },
  { key: "PERDIDO", label: "Perdido", color: "#e11d48", kind: "PERDIDO" },
] as const;

/** Tipo de atividade antigo → tipo da linha do tempo. */
const TIPO: Record<string, string> = {
  nota: "NOTA",
  mudanca_etapa: "ETAPA",
  ligacao: "CONTATO",
  email: "CONTATO",
  reuniao: "CONTATO",
  whatsapp: "CONTATO",
};

export async function migrarCrmInterno(prisma: PrismaClient) {
  const leads = await prisma.lead.findMany({
    include: { owner: { select: { id: true, name: true } }, activities: true },
    orderBy: { createdAt: "asc" },
  });

  // ── Funil interno: preserva as etapas que a FortGrow já usava ──
  // Não forçamos as 7 etapas padrão do CRM de cliente: o pipeline da agência
  // tem 8 e é o processo real dela. Como agora as etapas são editáveis, dá
  // para ajustar pela tela quando quiser.
  let stages = await prisma.crmStage.findMany({
    where: { clientId: null },
    orderBy: { position: "asc" },
  });
  if (stages.length === 0) {
    await prisma.crmStage.createMany({
      data: FUNIL_FORTGROW.map((s, i) => ({
        clientId: null,
        name: s.label,
        color: s.color,
        kind: s.kind,
        position: i,
      })),
    });
    stages = await prisma.crmStage.findMany({ where: { clientId: null }, orderBy: { position: "asc" } });
    console.log(`✓ Funil interno criado com ${stages.length} etapas`);
  }
  const stagePorChave = new Map(FUNIL_FORTGROW.map((s, i) => [s.key, stages[i]?.id ?? stages[0].id]));

  if (leads.length === 0) {
    console.log("Nada a migrar — nenhum lead na tabela antiga.");
    return;
  }

  // ── Equipe interna: os colaboradores que já são donos de leads ──
  const donos = new Map<string, { id: string; name: string }>();
  for (const l of leads) if (l.owner) donos.set(l.owner.id, l.owner);

  const memberPorUser = new Map<string, string>();
  for (const dono of donos.values()) {
    const existente = await prisma.crmMember.findFirst({
      where: { clientId: null, OR: [{ userId: dono.id }, { name: dono.name }] },
    });
    if (existente) {
      memberPorUser.set(dono.id, existente.id);
      continue;
    }
    const criado = await prisma.crmMember.create({
      data: { clientId: null, name: dono.name, department: "Comercial", userId: dono.id },
    });
    memberPorUser.set(dono.id, criado.id);
  }

  // ── Etiquetas que preservam a classificação manual antiga ──
  const tagCache = new Map<string, string>();
  async function tag(nome: string, cor: string) {
    if (tagCache.has(nome)) return tagCache.get(nome)!;
    const existente = await prisma.crmTag.findFirst({ where: { clientId: null, name: nome } });
    const t = existente ?? (await prisma.crmTag.create({ data: { clientId: null, name: nome, color: cor } }));
    tagCache.set(nome, t.id);
    return t.id;
  }

  let migrados = 0;
  let pulados = 0;

  for (const l of leads) {
    // Lead antigo era centrado na empresa; o novo, na pessoa
    const nome = l.contactName?.trim() || l.companyName;

    const jaExiste = await prisma.crmLead.findFirst({
      where: { clientId: null, name: nome, company: l.companyName, createdAt: l.createdAt },
      select: { id: true },
    });
    if (jaExiste) {
      pulados++;
      continue;
    }

    const etiquetas: string[] = [];
    if (l.potential === "Alto") etiquetas.push(await tag("Potencial alto", "#059669"));
    if (l.potential === "Baixo") etiquetas.push(await tag("Potencial baixo", "#e11d48"));
    if (l.prospectStatus === "QUALIFICADO") etiquetas.push(await tag("Qualificado", "#0284c7"));

    const fechado = l.stage === "FECHADO" || l.stage === "PERDIDO";
    const criado = await prisma.crmLead.create({
      data: {
        clientId: null,
        name: nome,
        company: l.companyName,
        email: l.email,
        phone: l.phone,
        whatsapp: l.whatsapp,
        city: l.city,
        state: l.state,
        source: l.source,
        segment: l.segment,
        website: l.website,
        instagram: l.instagram,
        facebook: l.facebook,
        linkedin: l.linkedin,
        notes: l.notes,
        stageId: stagePorChave.get(l.stage) ?? stages[0].id,
        estimatedValue: l.estimatedValue,
        wonValue: l.stage === "FECHADO" ? l.estimatedValue : null,
        ownerId: l.ownerId ? memberPorUser.get(l.ownerId) ?? null : null,
        // O "primeiro contato" da prospecção é o que alimenta o esfriamento do score
        lastContactAt: l.firstContactAt,
        stageSince: l.updatedAt,
        closedAt: fechado ? l.updatedAt : null,
        createdAt: l.createdAt,
        ...(etiquetas.length ? { tags: { connect: etiquetas.map((id) => ({ id })) } } : {}),
      },
    });

    if (l.activities.length) {
      await prisma.crmActivity.createMany({
        data: l.activities.map((a) => ({
          clientId: null,
          leadId: criado.id,
          type: TIPO[a.type] ?? "NOTA",
          content: a.content,
          authorName: a.author,
          createdAt: a.createdAt,
        })),
      });
    } else {
      await prisma.crmActivity.create({
        data: {
          clientId: null,
          leadId: criado.id,
          type: "CRIACAO",
          content: "Lead cadastrado",
          authorName: l.owner?.name ?? null,
          createdAt: l.createdAt,
        },
      });
    }

    migrados++;
  }

  // ── Score de todo mundo, com a mesma regra do CRM de cliente ──
  const abertas = stages.filter((s) => s.kind === "ABERTO").length;
  const novos = await prisma.crmLead.findMany({
    where: { clientId: null },
    include: { stage: { select: { kind: true, position: true } } },
  });
  for (const l of novos) {
    const prob =
      l.stage.kind === "GANHO" ? 100
      : l.stage.kind === "PERDIDO" ? 0
      : Math.round(((l.stage.position + 1) / Math.max(1, abertas)) * 90);
    const score = computeScore({
      estimatedValue: Number(l.estimatedValue),
      stageProbability: prob,
      email: l.email,
      phone: l.phone,
      whatsapp: l.whatsapp,
      company: l.company,
      daysSinceContact: daysSince(l.lastContactAt ?? l.createdAt),
    });
    await prisma.crmLead.update({
      where: { id: l.id },
      data: { score, temperature: temperatureOf(score), probability: prob },
    });
  }

  console.log(`✓ ${migrados} lead(s) migrados, ${pulados} já estavam no novo CRM`);
  return { migrados, pulados };
}

/**
 * Normalização ÚNICA: mensalidades de clientes variáveis (comissão) ficam
 * sem replicação automática — a comissão sai do Lançar comissão, e só a
 * parte fixa marcada à mão replica. Roda uma vez (flag em Setting) para não
 * desfazer escolhas manuais em deploys futuros.
 */
async function normalizarMensalidadesVariaveis(prisma: PrismaClient) {
  const FLAG = "normalizacaoAutoGenerateVariaveis";
  const feita = await prisma.setting.findUnique({ where: { key: FLAG } }).catch(() => null);
  if (feita) return;
  const r = await prisma.subscription.updateMany({
    where: { client: { billingType: "COMISSAO" } },
    data: { autoGenerate: false },
  });
  await prisma.setting.create({ data: { key: FLAG, value: new Date().toISOString() } });
  console.log(`✓ ${r.count} mensalidade(s) de clientes variáveis sem replicação automática`);
}

/** Execução direta (build do Render e linha de comando). */
if (require.main === module) {
  const prisma = new PrismaClient();
  migrarCrmInterno(prisma)
    .then(() => normalizarMensalidadesVariaveis(prisma))
    .catch((e) => {
      console.error("Falha na migração do CRM interno:", e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
