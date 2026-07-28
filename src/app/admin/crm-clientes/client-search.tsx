"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

/** Busca de empresas — navega por querystring para o filtro sobreviver ao F5. */
export function CrmClientSearch({ inicial }: { inicial: string }) {
  const [q, setQ] = useState(inicial);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      if (q === inicial) return;
      router.push(q.trim() ? `/admin/crm-clientes?q=${encodeURIComponent(q.trim())}` : "/admin/crm-clientes");
    }, 350);
    return () => clearTimeout(t);
  }, [q, inicial, router]);

  return (
    <div className="card mb-4 p-3">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar empresa…"
          className="input py-2 pl-9"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-300"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
