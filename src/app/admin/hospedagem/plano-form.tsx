"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Settings2, X } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { WORKSPACE_PLANS, type WorkspacePlan } from "@/lib/render-api";

/**
 * Plano de workspace contratado no Render.
 *
 * A API do Render devolve o consumo, mas não diz qual plano está contratado
 * — e é o plano que define a franquia mensal de banda. Em vez de adivinhar
 * (e mostrar um percentual errado com cara de certo), o valor é informado
 * aqui uma vez e fica guardado.
 */
export function PlanoForm({
  plano,
  francaGB,
  podeEditar,
}: {
  plano: WorkspacePlan;
  francaGB: number;
  podeEditar: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [escolha, setEscolha] = useState<WorkspacePlan>(plano);
  const [custom, setCustom] = useState(String(francaGB || ""));
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  if (!podeEditar) return null;

  async function salvar() {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/render/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: escolha,
          bandwidthGB: escolha === "custom" ? Number(custom.replace(",", ".")) || 0 : undefined,
        }),
      });
      if (!res.ok) {
        setErro((await res.json().catch(() => ({}))).error ?? "Não foi possível salvar.");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost">
        <Settings2 size={15} /> Plano contratado
      </button>

      {open && (
        <Overlay>
          <div className="card w-full max-w-md animate-fade-up p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Plano do workspace</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Define a franquia mensal de banda usada na comparação.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-ink-800">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {(Object.keys(WORKSPACE_PLANS) as WorkspacePlan[]).map((k) => {
                const p = WORKSPACE_PLANS[k];
                return (
                  <label
                    key={k}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                      escolha === k ? "border-brand-500/50 bg-brand-500/10" : "border-line hover:border-line-strong"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="plano"
                        checked={escolha === k}
                        onChange={() => setEscolha(k)}
                        className="h-4 w-4 accent-sky-500"
                      />
                      <span className="text-sm font-medium text-slate-200">{p.label}</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {p.bandwidthGB > 0
                        ? p.bandwidthGB >= 1024
                          ? `${p.bandwidthGB / 1024} TB/mês`
                          : `${p.bandwidthGB} GB/mês`
                        : "informe abaixo"}
                    </span>
                  </label>
                );
              })}
            </div>

            {escolha === "custom" && (
              <div className="mt-3">
                <label className="label" htmlFor="gb">Franquia contratada (GB por mês)</label>
                <input
                  id="gb"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ex.: 500"
                  className="input"
                />
              </div>
            )}

            <p className="mt-3 text-[11px] text-slate-600">
              Franquias de referência do Render em julho/2026. Se o seu contrato for diferente, use
              &quot;Enterprise / personalizado&quot;.
            </p>

            {erro && <p className="mt-3 text-sm font-medium text-danger">{erro}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
              <button onClick={salvar} disabled={loading} className="btn-primary">
                {loading && <Loader2 size={15} className="animate-spin" />} Salvar
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}
