"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";

export function RunAutomationsButton() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    setLoading(true);
    setSummary(null);
    try {
      const res = await fetch("/api/automations/run", { method: "POST" });
      if (res.ok) {
        const { result } = await res.json();
        setSummary(
          `${result.notificationsCreated} notificação(ões) criada(s) · ${result.invoicesMarkedOverdue} fatura(s) marcada(s) como atrasada(s)`
        );
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {summary && <span className="text-xs font-medium text-grow-400">{summary}</span>}
      <button onClick={run} disabled={loading} className="btn-primary">
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} Executar agora
      </button>
    </div>
  );
}
