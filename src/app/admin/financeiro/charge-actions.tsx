"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, CheckCircle2, Loader2, Plus } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

/** Marca uma cobrança como paga direto da tabela do Faturamento. */
export function MarkPaidButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function markPaid() {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invoiceId, status: "PAGO" }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={markPaid}
      disabled={loading}
      title="Marcar como paga"
      className="inline-flex items-center gap-1 rounded-lg bg-grow-500/10 px-2 py-1 text-[11px] font-semibold text-grow-400 ring-1 ring-inset ring-grow-500/20 transition hover:bg-grow-500/20 disabled:opacity-40"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <BadgeCheck size={12} />} Pago
    </button>
  );
}

/** Lançamento de cobrança avulsa (fora das mensalidades). */
export function NewChargeForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível salvar.");
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => { setOpen(false); setSaved(false); }, 800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost">
        <Plus size={15} /> Cobrança avulsa
      </button>

      {open && (
        <Overlay>
          <form onSubmit={onSubmit} className="card w-full max-w-md animate-fade-up p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-100">Nova cobrança avulsa</h2>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="ch-client">Cliente *</label>
                <select id="ch-client" name="clientId" required className="input">
                  <option value="">Selecione…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="ch-description">Descrição *</label>
                <input id="ch-description" name="description" required minLength={2} className="input" placeholder="ex.: Job extra — landing page" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="ch-amount">Valor (R$) *</label>
                  <input id="ch-amount" name="amount" type="number" min="0.01" step="0.01" required className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="ch-dueDate">Vencimento *</label>
                  <input id="ch-dueDate" name="dueDate" type="date" required className="input" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="ch-method">Forma de pagamento</label>
                <select id="ch-method" name="method" className="input">
                  <option value="">—</option>
                  <option value="PIX">PIX</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="CARTAO">Cartão</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                </select>
              </div>
            </div>
            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-5 flex items-center justify-end gap-3">
              {saved && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-grow-400">
                  <CheckCircle2 size={15} /> Cobrança criada!
                </span>
              )}
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 size={15} className="animate-spin" />} Lançar cobrança
              </button>
            </div>
          </form>
        </Overlay>
      )}
    </>
  );
}
