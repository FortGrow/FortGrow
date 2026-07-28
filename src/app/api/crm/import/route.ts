import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrm, requireCrmEdit, isCrmError, ensureStages } from "@/lib/crm-tenant";
import { refreshScore } from "@/lib/crm-repo";
import { parseCsv, slugHeader } from "@/lib/csv";

/**
 * Importação de leads por CSV.
 *
 * As colunas são reconhecidas pelo nome do cabeçalho, em português ou
 * inglês — ninguém deveria ter que renomear a planilha antes de subir. O
 * que a rota não reconhece ela ignora, e devolve um relatório do que
 * entrou, do que foi pulado e por quê.
 *
 * Duas travas de segurança: o `clientId` vem da sessão (nunca da planilha)
 * e a etapa de destino é validada dentro do tenant.
 */

export const dynamic = "force-dynamic";

/** Cabeçalho normalizado → campo do lead. */
const MAPA: Record<string, string> = {
  nome: "name", name: "name", contato: "name", nomedocontato: "name", lead: "name",
  empresa: "company", company: "company", razaosocial: "company", organizacao: "company",
  cargo: "jobTitle", jobtitle: "jobTitle", funcao: "jobTitle", title: "jobTitle",
  email: "email", mail: "email", enderecodeemail: "email",
  telefone: "phone", phone: "phone", fone: "phone", tel: "phone", celular: "phone",
  whatsapp: "whatsapp", wpp: "whatsapp", zap: "whatsapp",
  cidade: "city", city: "city", municipio: "city",
  estado: "state", uf: "state", state: "state",
  origem: "source", source: "source", canal: "source", fonte: "source",
  valor: "estimatedValue", valorestimado: "estimatedValue", value: "estimatedValue",
  oportunidade: "estimatedValue", ticket: "estimatedValue",
  observacoes: "notes", observacao: "notes", notes: "notes", obs: "notes", anotacoes: "notes",
  responsavel: "__owner", owner: "__owner", vendedor: "__owner",
  etapa: "__stage", stage: "__stage", status: "__stage", fase: "__stage",
  tags: "__tags", etiquetas: "__tags", marcadores: "__tags",
  proximocontato: "nextContactAt", nextcontact: "nextContactAt",
};

/** Converte "1.234,56", "1234.56" e "R$ 1.234,56" no número certo. */
function parseMoney(v: string): number {
  const s = v.replace(/[^\d,.-]/g, "").trim();
  if (!s) return 0;
  // pt-BR: vírgula decimal e ponto de milhar
  const ptbr = /,\d{1,2}$/.test(s);
  const limpo = ptbr ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  const n = Number(limpo);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Aceita dd/mm/aaaa e aaaa-mm-dd. */
function parseDate(v: string): Date | null {
  const s = v.trim();
  if (!s) return null;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : s.slice(0, 10);
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ctx = await requireCrm(body?.clientId ?? null);
  if (isCrmError(ctx)) return ctx;
  const bloqueio = requireCrmEdit(ctx);
  if (bloqueio) return bloqueio;

  const texto = typeof body?.csv === "string" ? body.csv : "";
  if (!texto.trim()) return NextResponse.json({ error: "Envie o conteúdo do CSV." }, { status: 400 });
  if (texto.length > 8_000_000) {
    return NextResponse.json({ error: "Arquivo muito grande (limite ~8 MB)." }, { status: 413 });
  }

  const linhas = parseCsv(texto);
  if (linhas.length < 2) {
    return NextResponse.json({ error: "O CSV precisa de cabeçalho e ao menos uma linha." }, { status: 400 });
  }

  const cabecalho = linhas[0].map((h) => MAPA[slugHeader(h)] ?? null);
  if (!cabecalho.includes("name")) {
    return NextResponse.json(
      { error: 'Não achei a coluna de nome. O cabeçalho precisa ter "Nome" (ou "Name"/"Contato").' },
      { status: 400 }
    );
  }

  await ensureStages(ctx.clientId);
  const [etapas, membros, tagsExistentes] = await Promise.all([
    prisma.crmStage.findMany({ where: ctx.where, orderBy: { position: "asc" } }),
    prisma.crmMember.findMany({ where: ctx.where }),
    prisma.crmTag.findMany({ where: ctx.where }),
  ]);
  const etapaPadraoId = body?.stageId
    ? etapas.find((e) => e.id === body.stageId)?.id ?? etapas[0].id
    : etapas[0].id;

  const acharEtapa = (v: string) =>
    etapas.find((e) => slugHeader(e.name) === slugHeader(v))?.id ?? etapaPadraoId;
  const acharMembro = (v: string) =>
    membros.find((m) => slugHeader(m.name) === slugHeader(v))?.id ?? null;

  const tagPorNome = new Map(tagsExistentes.map((t) => [slugHeader(t.name), t.id]));
  const criados: string[] = [];
  const erros: { linha: number; motivo: string }[] = [];
  let ignorados = 0;

  // Limite de segurança por importação — evita travar o banco num arquivo gigante
  const corpo = linhas.slice(1, 5001);
  if (linhas.length - 1 > 5000) ignorados = linhas.length - 1 - 5000;

  for (let i = 0; i < corpo.length; i++) {
    const celulas = corpo[i];
    const campos: Record<string, string> = {};
    cabecalho.forEach((campo, col) => {
      if (campo) campos[campo] = (celulas[col] ?? "").trim();
    });

    const nome = campos.name?.trim();
    if (!nome || nome.length < 2) {
      erros.push({ linha: i + 2, motivo: "sem nome" });
      continue;
    }

    // Etiquetas: cria as que ainda não existem, dentro do tenant
    const tagIds: string[] = [];
    for (const bruto of (campos.__tags ?? "").split(/[;,|]/)) {
      const nomeTag = bruto.trim();
      if (!nomeTag) continue;
      const chave = slugHeader(nomeTag);
      let id = tagPorNome.get(chave);
      if (!id) {
        const nova = await prisma.crmTag.create({
          data: { clientId: ctx.clientId, name: nomeTag.slice(0, 30) },
        });
        id = nova.id;
        tagPorNome.set(chave, id);
      }
      tagIds.push(id);
    }

    try {
      const lead = await prisma.crmLead.create({
        data: {
          clientId: ctx.clientId,
          name: nome.slice(0, 120),
          company: campos.company?.slice(0, 160) || null,
          jobTitle: campos.jobTitle?.slice(0, 80) || null,
          email: campos.email?.slice(0, 160) || null,
          phone: campos.phone?.slice(0, 30) || null,
          whatsapp: campos.whatsapp?.slice(0, 30) || null,
          city: campos.city?.slice(0, 80) || null,
          state: campos.state ? campos.state.slice(0, 2).toUpperCase() : null,
          source: campos.source?.slice(0, 60) || null,
          notes: campos.notes?.slice(0, 4000) || null,
          estimatedValue: parseMoney(campos.estimatedValue ?? ""),
          nextContactAt: parseDate(campos.nextContactAt ?? ""),
          stageId: campos.__stage ? acharEtapa(campos.__stage) : etapaPadraoId,
          ownerId: campos.__owner ? acharMembro(campos.__owner) : null,
          createdById: ctx.session.sub,
          updatedById: ctx.session.sub,
          ...(tagIds.length ? { tags: { connect: tagIds.map((id) => ({ id })) } } : {}),
        },
      });
      criados.push(lead.id);
    } catch {
      erros.push({ linha: i + 2, motivo: "dados inválidos" });
    }
  }

  // Histórico e score: em lote, depois da carga, para não multiplicar idas ao banco
  if (criados.length) {
    await prisma.crmActivity.createMany({
      data: criados.map((leadId) => ({
        clientId: ctx.clientId,
        leadId,
        type: "CRIACAO",
        content: "Lead importado de planilha",
        authorId: ctx.session.sub,
        authorName: ctx.staff ? `${ctx.session.name} (FortGrow)` : ctx.session.name,
      })),
    });
    for (const id of criados) await refreshScore(id, ctx.clientId);
  }

  return NextResponse.json({
    importados: criados.length,
    falhas: erros.length,
    ignorados,
    erros: erros.slice(0, 20),
  });
}
