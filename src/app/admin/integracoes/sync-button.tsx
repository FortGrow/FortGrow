"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

/** Dispara a sincronização de campanhas de todos os clientes vinculados. */
export function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<string[] | null>(null);
  const router = useRouter();

  async function run() {
    setLoading(true);
    setDetails(null);
    try {
      const res = await fetch("/api/sync/run", { method: "POST" });
      if (res.ok) {
        const { result } = await res.json();
        setDetails(
          result.details.length
            ? result.details
            : ["Nenhum cliente com conta de anúncio vinculada — vincule na ficha do cliente (Integração de campanhas)."]
        );
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button onClick={run} disabled={loading} className="btn-primary">
        {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Sincronizar agora
      </button>
      {details && (
        <div className="max-w-md rounded-xl border border-line bg-ink-900 px-4 py-3 text-left">
          {details.map((d, i) => (
            <p key={i} className="text-xs leading-relaxed text-slate-400">• {d}</p>
          ))}
        </div>
      )}
    </div>
  );
}
