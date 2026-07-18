import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Somente administradores." }, { status: 403 });
  }
  return null;
}

/** Lista os templates de permissão. */
export async function GET() {
  const session = await getSession();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const templates = await prisma.permissionTemplate.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ templates });
}

const createSchema = z.object({
  name: z.string().min(2).max(60),
  matrix: z.record(z.string().regex(/^[ved]{0,3}$/)),
});

/** Salva (cria/atualiza) um template de permissão nomeado. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const matrix = Object.fromEntries(Object.entries(parsed.data.matrix).filter(([, f]) => f.length > 0));
  const template = await prisma.permissionTemplate.upsert({
    where: { name: parsed.data.name },
    create: { name: parsed.data.name, matrix },
    update: { matrix },
  });

  await prisma.activityLog.create({
    data: { userId: session!.sub, action: "permission_template.save", entity: "PermissionTemplate", entityId: template.id },
  });

  return NextResponse.json({ template }, { status: 201 });
}

/** Remove um template (id pela querystring). */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  await prisma.permissionTemplate.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
