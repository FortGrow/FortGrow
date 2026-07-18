"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RefreshCw } from "lucide-react";

/**
 * "Atualizar agora" + sincronização automática: ao montar, dispara um sync
 * respeitando o cache (ifStale=1) — os dados se mantêm frescos sem input manual.
 */
export function SyncNow({ clientId, lastSyncedAt }: { clientId?: string; lastSyncedAt: string | null }) {
  const [syncing, setSyncing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fired = useRef(false);
  const router = useRouter();

  async function sync(force: boolean) {
    setSyncing(true);
    setError(null);
    setDone(false);
    try {
      const qs = new URLSearchParams();
      if (clientId) qs.set("clientId", clientId);
      if (!force) qs.set("ifStale", "1");
      const res = await fetch(`/api/sync/run?${qs}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Falha ao sincronizar.");
        return;
      }
      if ((data.result?.insightsUpserted ?? 0) > 0 || (data.result?.campaignsSynced ?? 0) > 0) {
        setDone(true);
        router.refresh();
        setTimeout(() => setDone(false), 3000);
      } else if (force) {
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }
    } finally {
      setSyncing(false);
    }
  }

  // Auto-sync (com cache) uma vez por carregamento da página
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void sync(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <span className="inline-flex items-center gap-2">
      {done && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-grow-400">
          <CheckCircle2 size={13} /> Atualizado!
        </span>
      )}
      {error && <span className="text-xs font-medium text-danger">{error}</span>}
      {lastLabel && !done && !error && (
        <span className="hidden text-[11px] text-slate-500 sm:inline">sync {lastLabel}</span>
      )}
      <button
        onClick={() => sync(true)}
        disabled={syncing}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-brand-300 ring-1 ring-inset ring-brand-500/20 transition hover:bg-brand-500/20 disabled:opacity-50"
      >
        <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
        {syncing ? "Sincronizando…" : "Atualizar agora"}
      </button>
    </span>
  );
}
