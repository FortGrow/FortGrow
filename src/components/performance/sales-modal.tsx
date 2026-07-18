"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { cn, brl } from "@/lib/utils";
import type { PerfRow, SaleDetail } from "@/components/performance/performance-dashboard";

/**
 * Vendas detalhadas de um lançamento: quem fez a venda, valor, comprador e
 * observações. Ao adicionar/editar/excluir, a linha do dia é re-sincronizada
 * pelo servidor (Vendas = quantidade, Receita bruta = soma) e o dashboard
 * recebe o lançamento atualizado via onEntryUpdate.
 */
export function SalesModal({
  entry,
  editable,
  onClose,
  onEntryUpdate,
}: {
  entry: PerfRow;
  editable: boolean;
  onClose: () => void;
  onEntryUpdate: (entry: PerfRow) => void;
}) {
  const [form, setForm] = useState({ sellerName: "", amount: "", buyer: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const sales = entry.salesDetails;

  async function addSale(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sellerName.trim()) return;
    setBusy(true);
    setStatus("saving");
    try {
      const res = await fetch("/api/performance/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: entry.id,
          sellerName: form.sellerName.trim(),
          amount: form.amount === "" ? 0 : Number(form.amount),
          buyer: form.buyer.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      onEntryUpdate(d.entry as PerfRow);
      setForm({ sellerName: "", amount: "", buyer: "", notes: "" });
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  /* Edição inline dos detalhes com debounce (mesmo padrão do dashboard) */
  const pending = useRef<Map<string, Partial<SaleDetail>>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function editSale(id: string, patch: Partial<SaleDetail>) {
    pending.current.set(id, { ...pending.current.get(id), ...patch });
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const batch = [...pending.current.entries()];
      pending.current.clear();
      try {
        let latest: PerfRow | null = null;
        for (const [saleId, p] of batch) {
          const res = await fetch("/api/performance/sales", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: saleId, ...p }),
          });
          if (!res.ok) throw new Error();
          latest = (await res.json()).entry as PerfRow;
        }
        if (latest) onEntryUpdate(latest);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, 700);
  }

  async function removeSale(id: string) {
    setStatus("saving");
    const res = await fetch(`/api/performance/sales?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      onEntryUpdate(d.entry as PerfRow);
      setStatus("saved");
    } else {
      setStatus("error");
    }
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-ink-900 px-2.5 py-1.5 text-sm text-slate-200 outline-none transition focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20";

  return (
    <Overlay>
      <div className="card w-full max-w-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center gap-3">
          <h2 className="text-base font-bold text-slate-100">
            Vendas de {entry.date.split("-").reverse().join("/")}
          </h2>
          <span className="text-xs text-slate-500">
            {sales.length > 0 ? `${sales.length} venda${sales.length > 1 ? "s" : ""} · ${brl(entry.revenue)}` : "nenhuma venda detalhada"}
          </span>
          <span className={cn("text-xs", status === "error" ? "font-semibold text-danger" : "text-slate-500")}>
            {status === "saving" && "Salvando…"}
            {status === "error" && "Erro ao salvar."}
          </span>
          <button onClick={onClose} className="ml-auto rounded-lg p-2 text-slate-500 transition hover:bg-ink-800 hover:text-slate-200">
            <X size={17} />
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          {editable
            ? "Registre quem fez cada venda. Vendas e Receita bruta da linha são atualizadas automaticamente a partir daqui."
            : "Detalhes registrados pela equipe FortGrow."}
        </p>

        {sales.length > 0 && (
          <div className="space-y-2">
            {sales.map((s) => (
              <div key={s.id} className="rounded-xl border border-line/60 bg-ink-900/50 p-3">
                {editable ? (
                  <div className="grid gap-2 sm:grid-cols-[1fr_130px_1fr_36px]">
                    <input
                      defaultValue={s.sellerName}
                      placeholder="Quem vendeu"
                      onChange={(e) => e.target.value.trim() && editSale(s.id, { sellerName: e.target.value.trim() })}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      defaultValue={s.amount || ""}
                      placeholder="Valor (R$)"
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        editSale(s.id, { amount: Number.isFinite(v) && v >= 0 ? v : 0 });
                      }}
                      className={inputCls}
                    />
                    <input
                      defaultValue={s.buyer ?? ""}
                      placeholder="Comprador (opcional)"
                      onChange={(e) => editSale(s.id, { buyer: e.target.value.trim() || null })}
                      className={inputCls}
                    />
                    <button
                      onClick={() => removeSale(s.id)}
                      title="Excluir venda"
                      className="justify-self-end rounded-lg p-2 text-slate-600 transition hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 size={15} />
                    </button>
                    <input
                      defaultValue={s.notes ?? ""}
                      placeholder="Observações (opcional)"
                      onChange={(e) => editSale(s.id, { notes: e.target.value.trim() || null })}
                      className={cn(inputCls, "sm:col-span-3")}
                    />
                  </div>
                ) : (
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                    <span className="font-semibold text-slate-200">{s.sellerName}</span>
                    <span className="font-semibold text-grow-400">{brl(s.amount)}</span>
                    {s.buyer && <span className="text-slate-400">para {s.buyer}</span>}
                    {s.notes && <span className="w-full text-xs text-slate-500">{s.notes}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {editable && (
          <form onSubmit={addSale} className="mt-4 rounded-xl border border-dashed border-line p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Nova venda</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={form.sellerName}
                onChange={(e) => setForm((f) => ({ ...f, sellerName: e.target.value }))}
                placeholder="Quem fez a venda *"
                required
                className={inputCls}
              />
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="Valor da venda (R$)"
                className={inputCls}
              />
              <input
                value={form.buyer}
                onChange={(e) => setForm((f) => ({ ...f, buyer: e.target.value }))}
                placeholder="Comprador / cliente final (opcional)"
                className={inputCls}
              />
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Observações (opcional)"
                className={inputCls}
              />
            </div>
            <button type="submit" disabled={busy || !form.sellerName.trim()} className="btn-primary mt-3 !px-3.5 !py-2 text-xs">
              <Plus size={14} /> Adicionar venda
            </button>
          </form>
        )}

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="btn-ghost !py-2 text-xs">Fechar</button>
        </div>
      </div>
    </Overlay>
  );
}
