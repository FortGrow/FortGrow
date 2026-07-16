import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAuth, isResponse } from "@/lib/api-guard";

const MAX_SIZE = 4 * 1024 * 1024; // 4 MB
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Upload da foto de perfil do próprio usuário. */
export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Imagem não informada." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Imagem excede 4 MB." }, { status: 400 });
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Use PNG, JPG ou WebP." }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const name = `${session.sub}-${Date.now()}.${ext}`;
  const dir = path.join(process.cwd(), "uploads", "avatars");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  const avatarUrl = `/api/files/avatars/${name}`;
  await prisma.user.update({ where: { id: session.sub }, data: { avatarUrl } });

  return NextResponse.json({ ok: true, avatarUrl });
}
