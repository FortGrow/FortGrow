"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

/** Registra o pagamento da comissão do colaborador na competência (vira custo "comissoes"). */
export function PayCommissionButton({
  userName,
  year,
  month,
  amount,
  alreadyPaid,
}: {
  userName: string;
  year: number;
  month: number;
  amount: number;
  alreadyPaid: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/commission-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, year, month, amount }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Falha ao registrar.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (alreadyPaid) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-grow-500/10 px-3 py-1.5 text-xs font-semibold text-grow-400 ring-1 ring-inset ring-grow-500/20">
        <CheckCircle2 size={13} /> Pago
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={pay} disabled={loading || amount <= 0} className="btn-ghost py-1.5 text-xs">
        {loading && <Loader2 size={13} className="animate-spin" />} Registrar pagamento
      </button>
      {error && <span className="text-[11px] font-medium text-danger">{error}</span>}
    </div>
  );
}
