import { prisma } from "./prisma";
import { sumTotals, type ChannelTotals } from "./metrics";
import type { Channel } from "@prisma/client";

export function parseDays(value: string | undefined): number {
  const n = Number(value);
  return [7, 30, 90, 365].includes(n) ? n : 30;
}

/** Carrega snapshots do cliente no período, opcionalmente filtrando por canal. */
export async function loadMetrics(clientId: string, days: number, channel?: Channel) {
  const since = new Date(Date.now() - days * 86400000);
  return prisma.metricSnapshot.findMany({
    where: { clientId, date: { gte: since }, ...(channel ? { channel } : {}) },
    orderBy: { date: "asc" },
  });
}

type Snapshot = Awaited<ReturnType<typeof loadMetrics>>[number];

type Bucket = ChannelTotals & { label: string; organicTraffic: number };

/** Agrega snapshots por dia (períodos curtos) ou semana (períodos longos). */
export function bucketize(rows: Snapshot[], days: number): Bucket[] {
  const weekly = days > 31;
  const buckets = new Map<string, Bucket>();

  for (const r of rows) {
    const d = new Date(r.date);
    if (weekly) d.setDate(d.getDate() - d.getDay());
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const prev = buckets.get(key);
    const merged = sumTotals([...(prev ? [prev] : []), r as never]) as Bucket;
    merged.label = label;
    merged.organicTraffic = (prev?.organicTraffic ?? 0) + r.organicTraffic;
    buckets.set(key, merged);
  }

  return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
}

export function totalsOf(rows: Snapshot[]) {
  return sumTotals(rows as never[]);
}
