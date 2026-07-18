import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { icsToken, EVENT_TYPES } from "@/lib/agenda";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/**
 * Feed iCalendar da Agenda FortGrow (eventos não privados e não cancelados).
 * Assine no Google Calendar: Outras agendas → + → "A partir do URL".
 */
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("t") !== icsToken()) {
    return NextResponse.json({ error: "Token do feed inválido." }, { status: 401 });
  }

  const events = await prisma.event.findMany({
    where: {
      private: false,
      status: { not: "CANCELADO" },
      start: { gte: new Date(Date.now() - 90 * 86400000) },
    },
    include: { client: { select: { companyName: true } } },
    orderBy: { start: "asc" },
    take: 500,
  });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FortGrow CRM//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:FortGrow CRM",
  ];
  for (const e of events) {
    const desc = [EVENT_TYPES[e.type]?.label ?? e.type, e.client ? `Cliente: ${e.client.companyName}` : null, e.description]
      .filter(Boolean)
      .join("\n");
    const freq = { SEMANAL: "WEEKLY", MENSAL: "MONTHLY", ANUAL: "YEARLY" }[e.recurrence];
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@fortgrow-crm`,
      `DTSTAMP:${fmt(e.updatedAt)}`,
      `DTSTART:${fmt(e.start)}`,
      `DTEND:${fmt(e.end)}`,
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(desc)}`,
      `STATUS:${e.status === "PENDENTE" ? "TENTATIVE" : "CONFIRMED"}`,
      ...(freq ? [`RRULE:FREQ=${freq}${e.recurrenceUntil ? `;UNTIL=${fmt(e.recurrenceUntil)}` : ""}`] : []),
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="fortgrow-agenda.ics"',
      "Cache-Control": "no-store",
    },
  });
}
