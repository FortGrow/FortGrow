"use client";

import { useState } from "react";
import { BarChart3, BrainCircuit, Check, Clapperboard, Megaphone, Minus, PenLine, ShoppingCart, Sparkles, Users } from "lucide-react";
import { CLIENT_PLANS, PLAN_TOPICS } from "@/lib/site-config";

/**
 * Comparativo dos planos personalizados.
 *
 * As logos dos clientes funcionam como abas: clicar em uma seleciona o
 * plano, que passa a ficar em destaque na tabela e tem as entregas
 * detalhadas no painel abaixo.
 *
 * No desktop as três colunas ficam lado a lado (dá para comparar de
 * relance). No celular não cabe tabela de quatro colunas, então aparece
 * só a lista de entregas do plano selecionado — a aba continua sendo o
 * jeito de trocar de cliente.
 */

const ICONS: Record<string, React.ReactNode> = {
  diagnostico: <BrainCircuit size={16} />,
  posicionamento: <Sparkles size={16} />,
  conteudo: <PenLine size={16} />,
  audiovisual: <Clapperboard size={16} />,
  trafego: <Megaphone size={16} />,
  demanda: <Users size={16} />,
  vendas: <ShoppingCart size={16} />,
  dashboards: <BarChart3 size={16} />,
};

/** Marca de inclusão: check verde quando entra no plano, traço quando não. */
function Mark({ on, accent, forte }: { on: boolean; accent: string; forte: boolean }) {
  if (!on) return <Minus size={16} className="mx-auto text-slate-600" aria-label="não incluso" />;
  return (
    <span
      className="mx-auto flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300"
      style={{
        background: forte ? "#16a34a" : "rgba(22,163,74,0.22)",
        border: `1px solid ${forte ? "#22c55e" : "rgba(34,197,94,0.45)"}`,
        boxShadow: forte ? `0 0 16px -3px #22c55e` : "none",
        color: forte ? "#fff" : "#4ade80",
      }}
      aria-label="incluso"
    >
      <Check size={13} strokeWidth={3.5} />
    </span>
  );
}

/** Aba com a logo do cliente (ou selo tipográfico, quando não há arquivo). */
function LogoTab({
  plano,
  ativo,
  onClick,
}: {
  plano: (typeof CLIENT_PLANS)[number];
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className="group relative flex flex-1 flex-col items-center gap-2 rounded-t-2xl px-3 pb-5 pt-4 transition-all duration-300 sm:px-5"
      style={{
        background: ativo
          ? `linear-gradient(180deg, ${plano.accent}26, rgba(5,9,15,0) 90%)`
          : "transparent",
        borderTop: `1px solid ${ativo ? plano.accent : "transparent"}`,
        borderLeft: `1px solid ${ativo ? plano.accent : "transparent"}`,
        borderRight: `1px solid ${ativo ? plano.accent : "transparent"}`,
      }}
    >
      <span className="text-[10px] font-medium italic tracking-wide text-slate-500">Cliente:</span>
      {plano.logo ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={plano.logo}
          alt={plano.name}
          className="h-11 w-auto max-w-[170px] object-contain transition-all duration-300 sm:h-14"
          style={{ opacity: ativo ? 1 : 0.55, filter: ativo ? "none" : "grayscale(1)" }}
        />
      ) : (
        <span
          className="flex h-11 items-center text-base font-black uppercase tracking-[0.14em] transition-all duration-300 sm:h-14 sm:text-lg"
          style={{ color: ativo ? "#fff" : "rgba(148,163,184,0.55)" }}
        >
          {plano.name}
        </span>
      )}
      <span
        className="text-[11px] font-semibold transition-colors duration-300"
        style={{ color: ativo ? plano.accent : "rgb(100,116,139)" }}
      >
        {plano.plan}
      </span>
    </button>
  );
}

export function PlansTable() {
  const [ativo, setAtivo] = useState(CLIENT_PLANS.length - 1); // começa no plano 360
  const sel = CLIENT_PLANS[ativo];

  return (
    <div>
      {/* abas com as logos */}
      <div className="flex items-end gap-1 sm:gap-2">
        {CLIENT_PLANS.map((p, i) => (
          <LogoTab key={p.slug} plano={p} ativo={i === ativo} onClick={() => setAtivo(i)} />
        ))}
      </div>

      <div
        className="overflow-hidden rounded-2xl rounded-tl-none border transition-colors duration-300"
        style={{ borderColor: `${sel.accent}59`, background: "rgba(4,8,14,0.6)" }}
      >
        {/* ── tabela comparativa (desktop) ── */}
        <table className="hidden w-full border-collapse text-sm sm:table">
          <thead>
            <tr>
              <th className="w-[38%] px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Entregas do plano
              </th>
              {CLIENT_PLANS.map((p, i) => (
                <th
                  key={p.slug}
                  className="px-3 py-4 text-center transition-colors duration-300"
                  style={{ background: i === ativo ? `${p.accent}1a` : "transparent" }}
                >
                  <span
                    className="text-xs font-bold uppercase tracking-wider transition-colors duration-300"
                    style={{ color: i === ativo ? p.accent : "rgb(100,116,139)" }}
                  >
                    {p.plan}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_TOPICS.map((t, linha) => (
              <tr
                key={t.key}
                className="border-t border-white/[0.06]"
                style={{ background: linha % 2 ? "rgba(255,255,255,0.015)" : "transparent" }}
              >
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-300"
                      style={{
                        background: `${sel.accent}1f`,
                        border: `1px solid ${sel.accent}44`,
                        color: sel.accent,
                      }}
                    >
                      {ICONS[t.key]}
                    </span>
                    <span className="font-semibold text-slate-200">{t.label}</span>
                  </span>
                </td>
                {CLIENT_PLANS.map((p, i) => (
                  <td
                    key={p.slug}
                    className="px-3 py-3.5 text-center transition-colors duration-300"
                    style={{ background: i === ativo ? `${p.accent}14` : "transparent" }}
                  >
                    <Mark on={p.includes.includes(t.key)} accent={p.accent} forte={i === ativo} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── lista do plano selecionado (celular) ── */}
        <ul className="divide-y divide-white/[0.06] sm:hidden">
          {PLAN_TOPICS.map((t) => {
            const on = sel.includes.includes(t.key);
            return (
              <li key={t.key} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: on ? `${sel.accent}1f` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${on ? `${sel.accent}44` : "rgba(255,255,255,0.06)"}`,
                    color: on ? sel.accent : "rgb(71,85,105)",
                  }}
                >
                  {ICONS[t.key]}
                </span>
                <span className={`flex-1 text-sm font-semibold ${on ? "text-slate-200" : "text-slate-600"}`}>
                  {t.label}
                </span>
                <Mark on={on} accent={sel.accent} forte />
              </li>
            );
          })}
        </ul>

        {/* resumo do plano selecionado */}
        <div
          className="border-t px-5 py-4 transition-colors duration-300"
          style={{ borderColor: `${sel.accent}33`, background: `${sel.accent}12` }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: sel.accent }}>
            {sel.name} · {sel.plan}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{sel.summary}</p>
          <p className="mt-2 text-xs text-slate-500">
            {sel.includes.length} de {PLAN_TOPICS.length} frentes ativas neste plano.
          </p>
        </div>
      </div>
    </div>
  );
}
