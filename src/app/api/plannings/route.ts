import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { lerPlanejamento, PLANO_VAZIO, type PlanoLido } from "@/lib/planning-parser";
import { invalidResponse } from "@/lib/validation";

/**
 * PDF de planejamento: anexo, leitura automática e publicação para o cliente.
 *
 * A leitura roda no upload, mas o resultado entra como RASCUNHO. Publicar é
 * um segundo passo, explícito: planejamento é o que o cliente vai cobrar da
 * agência, e nenhuma leitura automática é boa o bastante para ir ao ar sem
 * alguém olhar.
 */

export const dynamic = "force-dynamic";
// A extração de PDF + IA passa do limite padrão de tempo de resposta
export const maxDuration = 60;

const MAX_SIZE = 20 * 1024 * 1024;

const sanitize = (n: string) => n.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);

export async function POST(req: NextRequest) {
  const session = await requireStaff("projetos", "edit");
  if (isResponse(session)) return session;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Envie como multipart/form-data." }, { status: 400 });

  const file = form.get("file");
  const clientId = String(form.get("clientId") ?? "");
  const projectId = String(form.get("projectId") ?? "") || null;

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Anexe o PDF do planejamento." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "O PDF excede 20 MB." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Envie um arquivo .pdf." }, { status: 400 });
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, archivedAt: null },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Selecione o cliente." }, { status: 400 });

  if (projectId) {
    const projeto = await prisma.project.findFirst({
      where: { id: projectId, clientId: client.id },
      select: { id: true },
    });
    if (!projeto) {
      return NextResponse.json({ error: "O projeto não é deste cliente." }, { status: 400 });
    }
  }

  // ── Grava o arquivo na pasta do cliente ──
  // O servidor de arquivos isola pelo primeiro segmento da URL (o clientId),
  // então guardar aqui é o que garante que um cliente não baixe o PDF de outro.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "uploads", client.id);
  await mkdir(dir, { recursive: true });
  const nomeDisco = `plano-${Date.now()}-${sanitize(file.name)}`;
  await writeFile(path.join(dir, nomeDisco), bytes);
  const fileUrl = `/api/files/${client.id}/${nomeDisco}`;

  // ── Extrai o texto ──
  let texto = "";
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const out = await extractText(pdf, { mergePages: true });
    texto = String(out.text ?? "");
  } catch {
    return NextResponse.json(
      { error: "Não consegui ler este PDF. Se ele for digitalizado (imagem), exporte uma versão com texto." },
      { status: 422 }
    );
  }

  if (texto.replace(/\s/g, "").length < 40) {
    return NextResponse.json(
      { error: "O PDF não tem texto selecionável — parece um documento escaneado. Envie a versão original." },
      { status: 422 }
    );
  }

  const { plano, metodo } = await lerPlanejamento(texto);

  const registro = await prisma.projectPlan.create({
    data: {
      clientId: client.id,
      projectId,
      fileName: file.name.slice(0, 160),
      fileUrl,
      fileSize: file.size,
      rawText: texto.slice(0, 400000),
      parsed: plano as object,
      method: metodo,
      status: "RASCUNHO",
      uploadedById: session.sub,
      uploadedByName: session.name,
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "plan.upload", entity: "ProjectPlan", entityId: registro.id },
  });

  return NextResponse.json({ plan: { ...registro, rawText: undefined } }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string().min(1),
  /// Conteúdo revisado pelo admin antes de publicar
  parsed: z
    .object({
      objetivos: z.array(z.string().max(400)).max(30).optional(),
      conteudos: z.array(z.object({ titulo: z.string().max(200), descricao: z.string().max(800).optional() })).max(60).optional(),
      roteiros: z.array(z.object({ titulo: z.string().max(200), texto: z.string().max(6000) })).max(60).optional(),
      calendario: z
        .array(
          z.object({
            data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            titulo: z.string().max(240),
            formato: z.string().max(30).optional(),
            roteiro: z.string().max(6000).optional(),
          })
        )
        .max(300)
        .optional(),
      resumo: z.string().max(600).optional(),
    })
    .optional(),
  status: z.enum(["RASCUNHO", "PUBLICADO"]).optional(),
  /// Reprocessa o texto já guardado (útil depois de configurar a chave da IA)
  reprocessar: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await requireStaff("projetos", "edit");
  if (isResponse(session)) return session;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const atual = await prisma.projectPlan.findUnique({ where: { id: parsed.data.id } });
  if (!atual) return NextResponse.json({ error: "Planejamento não encontrado." }, { status: 404 });

  const data: Record<string, unknown> = {};
  let conteudo = (atual.parsed as unknown as PlanoLido) ?? PLANO_VAZIO;

  if (parsed.data.reprocessar) {
    const { plano, metodo } = await lerPlanejamento(atual.rawText);
    conteudo = plano;
    data.parsed = plano as object;
    data.method = metodo;
  } else if (parsed.data.parsed) {
    conteudo = { ...PLANO_VAZIO, ...conteudo, ...parsed.data.parsed } as PlanoLido;
    data.parsed = conteudo as object;
  }

  if (parsed.data.status) {
    data.status = parsed.data.status;
    data.publishedAt = parsed.data.status === "PUBLICADO" ? new Date() : null;
  }

  const plan = await prisma.projectPlan.update({ where: { id: atual.id }, data });

  // ── Publicar reflete o calendário para o cliente ──
  if (parsed.data.status === "PUBLICADO") {
    await sincronizarCalendario(plan.id, plan.clientId, conteudo);
  }
  if (parsed.data.status === "RASCUNHO") {
    // Despublicar tira as postagens do portal, mas só as geradas por este plano
    await prisma.contentPost.deleteMany({ where: { sourcePlanId: plan.id } });
  }

  await prisma.activityLog.create({
    data: {
      userId: session.sub,
      action: parsed.data.status === "PUBLICADO" ? "plan.publish" : "plan.update",
      entity: "ProjectPlan",
      entityId: plan.id,
    },
  });

  return NextResponse.json({ plan: { ...plan, rawText: undefined } });
}

export async function DELETE(req: NextRequest) {
  const session = await requireStaff("projetos", "edit");
  if (isResponse(session)) return session;

  const id = req.nextUrl.searchParams.get("id");
  const atual = id ? await prisma.projectPlan.findUnique({ where: { id } }) : null;
  if (!atual) return NextResponse.json({ error: "Planejamento não encontrado." }, { status: 404 });

  // As postagens geradas somem junto (onDelete: SetNull não serve aqui:
  // ficariam órfãs no calendário do cliente sem ninguém saber de onde vieram)
  await prisma.contentPost.deleteMany({ where: { sourcePlanId: atual.id } });
  await prisma.projectPlan.delete({ where: { id: atual.id } });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "plan.delete", entity: "ProjectPlan", entityId: atual.id },
  });

  return NextResponse.json({ ok: true });
}

/**
 * Espelha o calendário lido nas postagens que o cliente vê.
 *
 * Substitui apenas o que veio deste plano: o que a equipe criou na mão no
 * calendário continua lá. Republicar depois de uma correção não duplica.
 */
async function sincronizarCalendario(planId: string, clientId: string, plano: PlanoLido) {
  await prisma.contentPost.deleteMany({ where: { sourcePlanId: planId } });
  if (!plano.calendario?.length) return;

  // Roteiro do item, ou o roteiro solto com título parecido
  const roteiroDe = (titulo: string, proprio?: string) => {
    if (proprio) return proprio;
    const alvo = titulo.toLowerCase();
    return plano.roteiros?.find((r) => alvo.includes(r.titulo.toLowerCase()) || r.titulo.toLowerCase().includes(alvo))
      ?.texto;
  };

  await prisma.contentPost.createMany({
    data: plano.calendario.map((c) => ({
      clientId,
      sourcePlanId: planId,
      date: new Date(`${c.data}T12:00:00`),
      title: c.titulo.slice(0, 200),
      format: c.formato ?? null,
      script: roteiroDe(c.titulo, c.roteiro)?.slice(0, 6000) ?? null,
      status: "PLANEJADO",
    })),
  });
}
