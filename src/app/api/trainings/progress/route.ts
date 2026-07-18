import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, isResponse } from "@/lib/api-guard";
import { invalidResponse } from "@/lib/validation";

export const dynamic = "force-dynamic";

const schema = z.object({
  trainingId: z.string().min(1),
  watched: z.boolean(),
});

/** Marca/desmarca um treinamento como assistido por completo (por usuário). */
export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { trainingId, watched } = parsed.data;
  const training = await prisma.training.findUnique({ where: { id: trainingId }, select: { id: true } });
  if (!training) return NextResponse.json({ error: "Treinamento não encontrado." }, { status: 404 });

  if (watched) {
    await prisma.trainingProgress.upsert({
      where: { userId_trainingId: { userId: session.sub, trainingId } },
      create: { userId: session.sub, trainingId },
      update: {},
    });
  } else {
    await prisma.trainingProgress.deleteMany({ where: { userId: session.sub, trainingId } });
  }
  return NextResponse.json({ ok: true, watched });
}
