import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { extrairTextoDocx } from "@/lib/docx-text";

export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Extrai o texto de um PDF ou Word (.docx) de contrato para virar modelo
 * editável — a estrutura que o admin já tem entra no editor sem
 * redigitação. Nada é gravado em disco: o retorno é só o texto.
 */
export async function POST(req: NextRequest) {
  const session = await requireStaff("contratos", "edit");
  if (isResponse(session)) return session;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Envie o PDF ou Word (.docx) da sua estrutura de contrato." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo excede 10 MB." }, { status: 400 });
  }
  const ehPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const ehDocx =
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.docx$/i.test(file.name);
  if (!ehPdf && !ehDocx) {
    if (/\.doc$/i.test(file.name)) {
      return NextResponse.json(
        { error: "Formato .doc antigo não é suportado — abra no Word e salve como .docx (ou exporte em PDF)." },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "Envie um arquivo PDF ou Word (.docx)." }, { status: 400 });
  }

  let texto = "";
  let docxPath: string | null = null;
  if (ehDocx) {
    const bytes = Buffer.from(await file.arrayBuffer());
    texto = extrairTextoDocx(bytes) ?? "";
    if (!texto) {
      return NextResponse.json(
        { error: "Não consegui ler este .docx — confira se o arquivo abre no Word e tente de novo." },
        { status: 422 }
      );
    }
    // Guarda o ARQUIVO original: com ele, a geração do contrato edita o
    // próprio Word (marcadores preenchidos em-place, layout intacto) em vez
    // de montar um documento novo a partir do texto.
    const nome = `${Date.now()}-${(file.name || "modelo.docx").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80)}`;
    const dir = path.join(process.cwd(), "uploads", "contract-templates");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, nome), bytes);
    docxPath = `contract-templates/${nome}`;
  } else {
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
  }

  if (texto.replace(/\s/g, "").length < 40) {
    return NextResponse.json(
      { error: "O arquivo não tem texto legível — se for um PDF escaneado (imagem), envie a versão original." },
      { status: 422 }
    );
  }

  // Normaliza sem mexer na estrutura: espaços à direita fora, 3+ quebras viram
  // parágrafo (linha em branco), que é o que o gerador de PDF entende.
  const limpo = texto
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return NextResponse.json({ text: limpo, docxPath });
}
