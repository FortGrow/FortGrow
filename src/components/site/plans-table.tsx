"use client";

import { useState } from "react";
import { BarChart3, BrainCircuit, Check, Clapperboard, Megaphone, Minus, PenLine, ShoppingCart, Sparkles, Users } from "lucide-react";
import { CLIENT_PLANS, PLAN_TOPICS } from "@/lib/site-config";
import { hueOf } from "@/lib/glass";

/**
 * Comparativo dos planos personalizados.
 *
 * As logos dos clientes funcionam como abas: clicar em uma seleciona o
 * plano, que passa a ficar em destaque na tabela e tem as entregas
 * detalhadas no painel abaixo.
 *
 * A fila de logos usa a MESMA grade de colunas da tabela (primeira coluna
 * larga para as entregas + três colunas iguais), então cada logo cai
 * exatamente sobre a coluna do plano dela.
 *
 * No desktop as três colunas ficam lado a lado (dá para comparar de
 * relance). No celular não cabe tabela de quatro colunas, então aparece
 * só a lista de entregas do plano selecionado — a aba continua sendo o
 * jeito de trocar de cliente.
 */

/** Grade compartilhada entre a fila de logos e a tabela. */
const GRID = "38% repeat(3, 1fr)";

/** Azul da coluna de entregas. */
const ENTREGAS_BG = "rgba(45,126,242,0.13)";
const ENTREGAS_BORDA = "rgba(45,126,242,0.3)";

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
function Mark({ on, forte }: { on: boolean; forte: boolean }) {
  if (!on) return <Minus size={16} className="mx-auto text-slate-600" aria-label="não incluso" />;
  return (
    <span
      className="mx-auto flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300"
      style={{
        background: forte ? "#16a34a" : "rgba(22,163,74,0.22)",
        border: `1px solid ${forte ? "#22c55e" : "rgba(34,197,94,0.45)"}`,
        boxShadow: forte ? "0 0 16px -3px #22c55e" : "none",
        color: forte ? "#fff" : "#4ade80",
      }}
      aria-label="incluso"
    >
      <Check size={13} strokeWidth={3.5} />
    </span>
  );
}

/** Aba: só a logo do cliente (ou o nome, enquanto não houver arquivo). */
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
      aria-label={plano.name}
      className="flex items-center justify-center rounded-t-2xl px-2 pb-4 pt-4 transition-all duration-300 sm:px-4"
      style={{
        background: ativo
          ? `linear-gradient(180deg, ${plano.accent}2e, ${plano.accent}0d 90%)`
          : "transparent",
        borderTop: `1px solid ${ativo ? plano.accent : "transparent"}`,
        borderLeft: `1px solid ${ativo ? plano.accent : "transparent"}`,
        borderRight: `1px solid ${ativo ? plano.accent : "transparent"}`,
      }}
    >
      {plano.logo ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={plano.logo}
          alt={plano.name}
          className="h-12 w-auto max-w-full object-contain transition-all duration-300 sm:h-16"
          /* aba inativa só esmaece: dessaturar apagaria a cor da marca
             (a Strike Fire é laranja) e logos de traço fino somem */
          style={{ opacity: ativo ? 1 : 0.55 }}
        />
      ) : (
        <span
          className="flex h-12 items-center text-center text-sm font-black uppercase leading-tight tracking-[0.12em] transition-all duration-300 sm:h-16 sm:text-lg"
          style={{ color: ativo ? "#fff" : "rgba(148,163,184,0.5)" }}
        >
          {plano.name}
        </span>
      )}
    </button>
  );
}

export function PlansTable() {
  const [ativo, setAtivo] = useState(CLIENT_PLANS.length - 1); // começa no plano 360
  const sel = CLIENT_PLANS[ativo];

  return (
    <div>
      {/* Fila de logos — mesma grade da tabela, para cada logo ficar em cima
          da sua coluna. No celular não há coluna de entregas, então as três
          dividem a largura por igual. */}
      <div
        className="grid grid-cols-3 items-end sm:[grid-template-columns:var(--grid)]"
        style={{ ["--grid" as string]: GRID }}
      >
        <div className="hidden sm:block" aria-hidden />
        {CLIENT_PLANS.map((p, i) => (
          <LogoTab key={p.slug} plano={p} ativo={i === ativo} onClick={() => setAtivo(i)} />
        ))}
      </div>

      <div
        className="glass overflow-hidden"
        style={{ ["--glass-tint" as string]: hueOf(sel.accent) }}
      >
        {/* ── tabela comparativa (desktop) ── */}
        <table
          className="hidden w-full border-collapse text-sm sm:table"
          style={{ tableLayout: "fixed" }}
        >
          <colgroup>
            <col style={{ width: "38%" }} />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th
                className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{
                  background: ENTREGAS_BG,
                  borderRight: `1px solid ${ENTREGAS_BORDA}`,
                  color: "#9ec5fb",
                }}
              >
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
              <tr key={t.key} className="border-t border-white/[0.06]">
                <td
                  className="px-5 py-3.5"
                  style={{
                    background: linha % 2 ? "rgba(45,126,242,0.17)" : ENTREGAS_BG,
                    borderRight: `1px solid ${ENTREGAS_BORDA}`,
                  }}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        background: "rgba(45,126,242,0.22)",
                        border: "1px solid rgba(45,126,242,0.45)",
                        color: "#9ec5fb",
                      }}
                    >
                      {ICONS[t.key]}
                    </span>
                    <span className="font-semibold text-slate-100">{t.label}</span>
                  </span>
                </td>
                {CLIENT_PLANS.map((p, i) => (
                  <td
                    key={p.slug}
                    className="px-3 py-3.5 text-center transition-colors duration-300"
                    style={{
                      background:
                        i === ativo
                          ? `${p.accent}14`
                          : linha % 2
                            ? "rgba(255,255,255,0.015)"
                            : "transparent",
                    }}
                  >
                    <Mark on={p.includes.includes(t.key)} forte={i === ativo} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── lista do plano selecionado (celular) ── */}
        <ul className="divide-y divide-white/[0.06] sm:hidden">
          {PLAN_TOPICS.map((t, linha) => {
            const on = sel.includes.includes(t.key);
            return (
              <li
                key={t.key}
                className="flex items-center gap-3 px-4 py-3"
                style={{ background: linha % 2 ? "rgba(45,126,242,0.17)" : ENTREGAS_BG }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: "rgba(45,126,242,0.22)",
                    border: "1px solid rgba(45,126,242,0.45)",
                    color: "#9ec5fb",
                  }}
                >
                  {ICONS[t.key]}
                </span>
                <span className={`flex-1 text-sm font-semibold ${on ? "text-slate-100" : "text-slate-400"}`}>
                  {t.label}
                </span>
                <Mark on={on} forte />
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
