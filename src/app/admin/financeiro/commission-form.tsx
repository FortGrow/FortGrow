"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Percent } from "lucide-react";

export type CommissionClient = {
  id: string;
  name: string;
  base: number; // % de comissão do cliente
  share: number; // % da FortGrow
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Lançamento de faturamento para contratos por comissão, com prévia do cálculo. */
export function CommissionForm({ clients }: { clients: CommissionClient[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [volume, setVolume] = useState("");
  const [base, setBase] = useState(String(clients[0]?.base ?? ""));
  const [share, setShare] = useState(String(clients[0]?.share ?? ""));
  const router = useRouter();

  const preview = useMemo(() => {
    const v = Number(volume);
    const b = Number(base);
    const s = Number(share);
    if (!(v > 0 && b > 0 && s > 0)) return null;
    const clientCommission = v * (b / 100);
    return { clientCommission, amount: clientCommission * (s / 100) };
  }, [volume, base, share]);

  function selectClient(id: string) {
    setClientId(id);
    const c = clients.find((c) => c.id === id);
    if (c) {
      setBase(String(c.base));
      setShare(String(c.share));
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          salesVolume: volume,
          basePercent: base,
          sharePercent: share,
          reference: form.get("reference"),
          dueDate: form.get("dueDate") || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível lançar.");
        return;
      }
      setOpen(false);
      setVolume("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (clients.length === 0) return null;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Percent size={15} /> Lançar comissão
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="card w-full max-w-lg animate-fade-up p-6">
        <h2 className="mb-1 text-lg font-bold text-slate-100">Lançar faturamento por comissão</h2>
        <p className="mb-4 text-sm text-slate-500">
          Informe o volume vendido pelo cliente no período — o valor da FortGrow é calculado automaticamente.
        </p>

        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="cf-client">Cliente *</label>
            <select id="cf-client" value={clientId} onChange={(e) => selectClient(e.target.value)} className="input">
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="cf-volume">Volume vendido (R$) *</label>
              <input
                id="cf-volume"
                type="number"
                min="1"
                step="0.01"
                required
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="input"
                placeholder="1000000"
              />
            </div>
            <div>
              <label className="label" htmlFor="cf-reference">Competência *</label>
              <input id="cf-reference" name="reference" required className="input" placeholder="julho/2026" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label" htmlFor="cf-base">Base do cliente (%)</label>
              <input
                id="cf-base"
                type="number"
                min="0.001"
                max="100"
                step="0.001"
                required
                value={base}
                onChange={(e) => setBase(e.target.value)}
                className="input"
              />
              <p className="mt-1 text-[11px] text-slate-600">ajuste se a parcela variar (ex.: 1,5)</p>
            </div>
            <div>
              <label className="label" htmlFor="cf-share">FortGrow (%)</label>
              <input
                id="cf-share"
                type="number"
                min="0.001"
                max="100"
                step="0.001"
                required
                value={share}
                onChange={(e) => setShare(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="cf-due">Vencimento</label>
              <input id="cf-due" name="dueDate" type="date" className="input" />
            </div>
          </div>

          {preview && (
            <div className="rounded-xl bg-grow-500/10 px-4 py-3 text-sm ring-1 ring-inset ring-grow-500/20">
              <p className="text-slate-400">
                Comissão do cliente: <span className="font-semibold text-slate-200">{brl(preview.clientCommission)}</span>
              </p>
              <p className="mt-0.5 text-slate-400">
                Faturamento FortGrow: <span className="text-base font-bold text-grow-400">{brl(preview.amount)}</span>
              </p>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading && <Loader2 size={15} className="animate-spin" />} Lançar fatura
          </button>
        </div>
      </form>
    </div>
  );
}
