"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MONTHS_PT } from "@/lib/period";

/** Seletor de mês/ano compartilhado (querystring ?ano=YYYY&mes=M). */
export function PeriodSelect({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const currentYear = new Date().getFullYear();

  function update(key: "ano" | "mes", value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex gap-2">
      <select value={month} onChange={(e) => update("mes", e.target.value)} className="input w-40 py-2">
        {MONTHS_PT.map((label, i) => (
          <option key={label} value={i + 1}>{label}</option>
        ))}
      </select>
      <select value={year} onChange={(e) => update("ano", e.target.value)} className="input w-28 py-2">
        {Array.from({ length: 5 }, (_, i) => currentYear - 3 + i).map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
