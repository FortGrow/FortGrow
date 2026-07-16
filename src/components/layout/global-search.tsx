"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";

type Result = { type: string; label: string; href: string };

/** Pesquisa global (clientes, leads, projetos, tarefas) com atalho ⌘K. */
export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative w-full max-w-md">
      <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Pesquisar…  (⌘K)"
        className="input pl-10 pr-8 py-2"
      />
      {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-500" />}
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-ink-850 shadow-card">
          {results.slice(0, 8).map((r, i) => (
            <button
              key={i}
              onMouseDown={() => router.push(r.href)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-300 transition hover:bg-ink-800"
            >
              <span className="rounded-md bg-ink-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-400">
                {r.type}
              </span>
              <span className="truncate">{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
