"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
  { days: 365, label: "12 meses" },
];

/** Filtro de período compartilhado pelos dashboards (querystring ?days=N). */
export function PeriodFilter({ current }: { current: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <div className="flex rounded-xl border border-line bg-ink-900 p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.days}
          onClick={() => {
            const next = new URLSearchParams(params.toString());
            next.set("days", String(o.days));
            router.push(`${pathname}?${next.toString()}`);
          }}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
            current === o.days ? "bg-brand-500/15 text-brand-300" : "text-slate-500 hover:text-slate-300"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
