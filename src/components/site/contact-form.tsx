"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    contactName: "",
    companyName: "",
    phone: "",
    email: "",
    segment: "",
    message: "",
    website: "", // honeypot (escondido)
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/site/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não foi possível enviar. Tente novamente.");
        return;
      }
      setDone(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-grow-500/25 bg-grow-500/5 p-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-grow-500/15 text-grow-400">
          <CheckCircle2 size={30} />
        </span>
        <h3 className="mt-5 text-xl font-bold text-white">Recebemos seu contato!</h3>
        <p className="mt-2 max-w-xs text-sm text-slate-400">
          Um especialista da FortGrow vai falar com você em breve para entender
          seu momento e o potencial de crescimento do seu negócio.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7">
      {/* honeypot: invisível para humanos */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        value={form.website}
        onChange={(e) => set("website", e.target.value)}
        className="hidden"
      />

      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cf-name">Seu nome *</label>
          <input
            id="cf-name"
            required
            value={form.contactName}
            onChange={(e) => set("contactName", e.target.value)}
            placeholder="Como podemos te chamar"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="cf-company">Empresa</label>
          <input
            id="cf-company"
            value={form.companyName}
            onChange={(e) => set("companyName", e.target.value)}
            placeholder="Nome da sua empresa"
            className="input"
          />
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cf-phone">WhatsApp / Telefone *</label>
          <input
            id="cf-phone"
            required
            inputMode="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="(00) 00000-0000"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="cf-email">E-mail</label>
          <input
            id="cf-email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="voce@empresa.com"
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="cf-segment">Segmento do negócio</label>
        <input
          id="cf-segment"
          value={form.segment}
          onChange={(e) => set("segment", e.target.value)}
          placeholder="Ex.: imóveis, e-commerce, serviços…"
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="cf-message">Como podemos ajudar?</label>
        <textarea
          id="cf-message"
          rows={3}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="Conte rapidamente seu momento e seu objetivo de crescimento."
          className="input resize-none"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger ring-1 ring-inset ring-danger/20">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full text-base">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        Quero falar com um especialista
      </button>
      <p className="text-center text-[11px] text-slate-500">
        Resposta rápida · Sem compromisso
      </p>
    </form>
  );
}
