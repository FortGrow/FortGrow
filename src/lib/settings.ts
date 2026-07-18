import { prisma } from "@/lib/prisma";

/** Percentual de imposto sobre a receita (Simples/ISS etc.) — configurável no Faturamento. */
export async function getTaxPercent(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: "taxPercent" } });
  const v = Number(row?.value ?? 0);
  return Number.isFinite(v) && v >= 0 && v <= 100 ? v : 0;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await prisma.setting.upsert({ where: { key }, create: { key, value: value as never }, update: { value: value as never } });
}
