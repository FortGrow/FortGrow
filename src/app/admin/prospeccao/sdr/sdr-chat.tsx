"use client";

import { FormEvent, Fragment, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, Copy, Loader2, RotateCcw, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

/** Atalhos que preenchem o campo com pedidos prontos pro SDR IA */
const QUICK_PROMPTS: { label: string; text: string }[] = [
  {
    label: "Analisar empresa",
    text: "Analise esta empresa para prospecção e responda no Formato de Entrega completo.\n\nEmpresa: \nCidade: \nSegmento: \nSite: \nInstagram: \nWhatsApp: \nO que encontrei na pesquisa: ",
  },
  {
    label: "Primeira mensagem",
    text: "Crie uma primeira mensagem de WhatsApp curta e personalizada para esta empresa:\n\nEmpresa: \nSegmento: \nO que sei sobre ela: ",
  },
  {
    label: "Tratar objeção",
    text: "O lead respondeu com esta objeção — me ajude a responder de forma consultiva:\n\n\"\"",
  },
  {
    label: "Follow-up",
    text: "O lead não respondeu minha última mensagem. Contexto da conversa até agora:\n\n\nCrie o próximo follow-up.",
  },
  {
    label: "Agendar reunião",
    text: "O lead demonstrou interesse. Crie a mensagem de agendamento oferecendo opções de horário. Contexto:\n\n",
  },
];

/** Renderiza o texto do assistente com **negrito** e quebras de linha preservadas */
function RichText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-bold text-slate-100">{part}</strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </span>
  );
}

/** Chat com o SDR IA — a conversa vive na tela (recarregar começa uma nova). */
export function SdrChat({ hasKey }: { hasKey: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const content = input.trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/sdr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Janela das últimas 30 mensagens — mantém o contexto sem estourar o limite
        body: JSON.stringify({ messages: next.slice(-30) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não foi possível falar com a IA.");
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply as string }]);
    } catch {
      setError("Não foi possível falar com a IA — confira a conexão e tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  function applyQuickPrompt(text: string) {
    setInput(text);
    inputRef.current?.focus();
  }

  async function copyMessage(i: number, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(i);
      setTimeout(() => setCopied((c) => (c === i ? null : c)), 1500);
    } catch {
      /* clipboard indisponível — sem drama */
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-190px)] min-h-[420px] max-w-4xl flex-col">
      {!hasKey && (
        <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            O SDR IA precisa da variável <code className="font-mono text-xs">OPENAI_API_KEY</code> configurada no
            servidor (Render → Environment). Sem ela, o assistente não responde.
          </span>
        </div>
      )}

      <div className="card flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
              <Bot size={24} />
            </span>
            <p className="text-sm font-semibold text-slate-200">SDR IA da FortGrow</p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
              Cole o que você encontrou sobre a empresa (Instagram, site, segmento, cidade…) e peça a análise, a
              primeira mensagem, o tratamento de uma objeção ou o follow-up. A IA trabalha só com o que você informar —
              ela não navega na internet.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-brand-500/15 text-slate-200 ring-1 ring-inset ring-brand-500/25"
                  : "bg-ink-800/80 text-slate-300 ring-1 ring-inset ring-line"
              )}
            >
              {m.role === "assistant" && (
                <button
                  onClick={() => copyMessage(i, m.content)}
                  title="Copiar resposta"
                  className="absolute -right-2 -top-2 hidden rounded-lg border border-line bg-ink-900 p-1.5 text-slate-400 transition hover:text-slate-200 group-hover:block"
                >
                  {copied === i ? <Sparkles size={12} className="text-grow-400" /> : <Copy size={12} />}
                </button>
              )}
              <RichText text={m.content} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-ink-800/80 px-4 py-3 text-sm text-slate-500 ring-1 ring-inset ring-line">
              <Loader2 size={14} className="animate-spin" /> SDR IA está escrevendo…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="mt-2 text-sm font-medium text-danger">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q.label}
            onClick={() => applyQuickPrompt(q.text)}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-line-strong hover:text-slate-200"
          >
            {q.label}
          </button>
        ))}
        {messages.length > 0 && (
          <button
            onClick={() => {
              setMessages([]);
              setError(null);
            }}
            className="ml-auto flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-line-strong hover:text-slate-300"
          >
            <RotateCcw size={12} /> Nova conversa
          </button>
        )}
      </div>

      <form onSubmit={send} className="mt-3 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={Math.min(8, Math.max(2, input.split("\n").length))}
          placeholder="Escreva para o SDR IA… (Enter envia · Shift+Enter quebra linha)"
          className="input flex-1 resize-none"
        />
        <button type="submit" disabled={loading || !input.trim()} className="btn-primary !px-4 !py-3">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}
