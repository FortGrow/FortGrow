import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".zip": "application/zip",
  ".csv": "text/csv",
  ".txt": "text/plain",
};

/**
 * Servidor de arquivos enviados — com isolamento por tenant:
 * equipe interna acessa tudo; usuário CLIENTE só arquivos da própria empresa.
 * URL: /api/files/<clientId>/<arquivo>
 */
export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const [clientId, ...rest] = params.path;
  const fileName = rest.join("/");
  if (!clientId || !fileName || fileName.includes("..") || clientId.includes("..")) {
    return NextResponse.json({ error: "Caminho inválido." }, { status: 400 });
  }

  // "avatars" é um espaço comum: qualquer usuário autenticado pode ver fotos de perfil
  if (clientId !== "avatars" && session.role === "CLIENTE" && session.clientId !== clientId) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const filePath = path.join(process.cwd(), "uploads", clientId, fileName);
  try {
    const data = await readFile(filePath);
    const ext = path.extname(fileName).toLowerCase();
    return new NextResponse(data, {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }
}
