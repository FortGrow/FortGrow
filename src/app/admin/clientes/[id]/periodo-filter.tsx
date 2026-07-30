"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const OPCOES = [
  { key: "7", label: "7 dias" },
  { key: "30", label: "30 dias" },
  { key: "90", label: "90 dias" },
  { key: "tudo", label: "Tudo" },
] as const;

/**
 * Filtro de período do Resumo do cliente. A página é um server component,
 * então a seleção vira query string (?periodo=...) e o servidor recalcula
 * os cards — nada de estado duplicado entre cliente e servidor.
 */
export function PeriodoFilter({ periodo, de, ate }: { periodo: string; de: string; ate: string }) {
  const router = useRouter();
  const [custom, setCustom] = useState(periodo === "custom");
  const [from, setFrom] = useState(de);
  const [to, setTo] = useState(ate);

  const pill = (ativo: boolean) =>
    cn(
      "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
      ativo
        ? "border-brand-500/40 bg-brand-500/15 text-brand-300"
        : "border-line text-slate-400 hover:border-line-strong hover:text-slate-200"
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Período:</span>
      {OPCOES.map((o) => (
        <button
          key={o.key}
          onClick={() => {
            setCustom(false);
            router.push(`?periodo=${o.key}`, { scroll: false });
          }}
          className={pill(!custom && periodo === o.key)}
        >
          {o.label}
        </button>
      ))}
      <button onClick={() => setCustom((c) => !c)} className={pill(custom || periodo === "custom")}>
        Personalizado
      </button>
      {custom && (
        <span className="flex items-center gap-2 text-xs text-slate-400">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input !w-auto !py-1.5 text-xs"
          />
          até
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input !w-auto !py-1.5 text-xs"
          />
          <button
            onClick={() => from && to && router.push(`?periodo=custom&de=${from}&ate=${to}`, { scroll: false })}
            disabled={!from || !to}
            className="btn-primary !px-3 !py-1.5 text-xs disabled:opacity-50"
          >
            Aplicar
          </button>
        </span>
      )}
    </div>
  );
}
