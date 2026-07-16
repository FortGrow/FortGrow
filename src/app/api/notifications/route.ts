import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isResponse } from "@/lib/api-guard";

export async function GET() {
  const session = await requireAuth();
  if (isResponse(session)) return session;

  const notifications = await prisma.notification.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ notifications });
}

/** Marca todas como lidas. */
export async function PATCH() {
  const session = await requireAuth();
  if (isResponse(session)) return session;

  await prisma.notification.updateMany({
    where: { userId: session.sub, read: false },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
