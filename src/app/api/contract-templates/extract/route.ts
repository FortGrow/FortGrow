import { NextRequest, NextResponse } from "next/server";
import { requireStaff, isResponse } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Extrai o texto de um PDF de contrato para virar modelo editável — a
 * estrutura que o admin já tem em PDF entra no editor sem redigitação.
 * Nada é gravado em disco: o retorno é só o texto.
 */
export async function POST(req: NextRequest) {
  const session = await requireStaff("contratos", "edit");
  if (isResponse(session)) return session;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Envie o PDF da sua estrutura de contrato." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo excede 10 MB." }, { status: 400 });
  }
  if (!(file.type === "application/pdf" || /\.pdf$/i.test(file.name))) {
    return NextResponse.json({ error: "Envie um arquivo PDF." }, { status: 400 });
  }

  let texto = "";
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
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

  // Normaliza sem mexer na estrutura: espaços à direita fora, 3+ quebras viram
  // parágrafo (linha em branco), que é o que o gerador de PDF entende.
  const limpo = texto
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return NextResponse.json({ text: limpo });
}
