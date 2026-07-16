import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session) {
    await prisma.activityLog.create({ data: { userId: session.sub, action: "logout" } }).catch(() => {});
  }
  const res = NextResponse.redirect(new URL("/login", req.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
