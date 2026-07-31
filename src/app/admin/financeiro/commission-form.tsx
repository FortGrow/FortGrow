"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Loader2, Percent, RefreshCw } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { closingPeriod, competenciaLabel, MONTH_NAMES_PT } from "@/lib/closing-period";

export type CommissionClient = {
  id: string;
  name: string;
  share: number; // % da FortGrow sobre a receita real
  /// Dia de fechamento do período de apuração (null = mês civil)
  closingDay: number | null;
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const isoDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Lançamento de faturamento por comissão, com período de apuração explícito.
 *
 * Clientes como a Axton não fecham do dia 1 ao 30: a comissão de julho apura
 * as vendas de 21/06 a 20/07. O período nasce do dia de fechamento do
 * cliente e da competência escolhida — e continua editável, porque um mês ou
 * outro o fechamento muda por feriado ou acordo.
 *
 * O volume vendido é buscado dos lançamentos de Performance dentro do
 * período (não digitado de memória), mas o campo permanece aberto: se as
 * vendas ainda não estão todas lançadas, o admin pode sobrescrever.
 */
export function CommissionForm({ clients }: { clients: CommissionClient[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [volume, setVolume] = useState("");
  /// Receita REAL do período — a base da comissão (pré-buscada, editável)
  const [real, setReal] = useState("");
  const [share, setShare] = useState(String(clients[0]?.share ?? ""));

  // Competência padrão: o mês atual
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [apuracao, setApuracao] = useState<{ volume: number; lancamentos: number } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const router = useRouter();

  const cliente = clients.find((c) => c.id === clientId);

  // Competência ou cliente mudou → recalcula o período pelo dia de fechamento
  useEffect(() => {
    if (!cliente) return;
    const p = closingPeriod(ano, mes, cliente.closingDay);
    setDe(isoDia(p.from));
    setAte(isoDia(p.to));
  }, [clientId, ano, mes, cliente]);

  // Período definido → busca as vendas lançadas em Performance na janela
  useEffect(() => {
    if (!clientId || !de || !ate) return;
    let ativo = true;
    setBuscando(true);
    fetch(`/api/commissions?clientId=${clientId}&from=${de}&to=${ate}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!ativo || !j) return;
        setApuracao({ volume: j.volume, lancamentos: j.lancamentos });
        // Pré-preenche sem brigar com quem já digitou outro valor
        setVolume((v) => (v === "" || Number(v) === 0 ? (j.volume > 0 ? String(j.volume) : v) : v));
        setReal((v) => (v === "" || Number(v) === 0 ? (j.real > 0 ? String(j.real) : v) : v));
      })
      .finally(() => ativo && setBuscando(false));
    return () => {
      ativo = false;
    };
  }, [clientId, de, ate]);

  const preview = useMemo(() => {
    const r = Number(real);
    const s = Number(share);
    if (!(r > 0 && s > 0)) return null;
    // Comissão FortGrow = receita REAL × repasse %
    return { clientCommission: r, amount: r * (s / 100) };
  }, [real, share]);

  function selectClient(id: string) {
    // Reselecionar o mesmo cliente não pode limpar o volume: o período não
    // muda, a busca não dispara de novo, e o campo ficaria vazio para sempre
    if (id === clientId) return;
    setClientId(id);
    setVolume("");
    setReal("");
    setApuracao(null);
    const c = clients.find((c) => c.id === id);
    if (c) setShare(String(c.share));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          salesVolume: volume,
          realValue: real,
          sharePercent: share,
          reference: competenciaLabel(ano, mes),
          dueDate: form.get("dueDate") || undefined,
          periodStart: de,
          periodEnd: ate,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível lançar.");
        return;
      }
      setOpen(false);
      setVolume("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (clients.length === 0) return null;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Percent size={15} /> Lançar comissão
      </button>
    );
  }

  const fmtBR = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  return (
    <Overlay>
      <form onSubmit={onSubmit} className="card w-full max-w-lg animate-fade-up p-6">
        <h2 className="mb-1 text-lg font-bold text-slate-100">Lançar faturamento por comissão</h2>
        <p className="mb-4 text-sm text-slate-500">
          Escolha a competência — o período de apuração vem do dia de fechamento do cliente, e as
          vendas lançadas em Performance preenchem o volume.
        </p>

        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="cf-client">Cliente *</label>
            <select id="cf-client" value={clientId} onChange={(e) => selectClient(e.target.value)} className="input">
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.closingDay ? ` · fecha dia ${c.closingDay}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="cf-mes">Competência *</label>
              <select
                id="cf-mes"
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="input"
              >
                {MONTH_NAMES_PT.map((nome, i) => (
                  <option key={nome} value={i + 1}>{nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="cf-ano">Ano</label>
              <select id="cf-ano" value={ano} onChange={(e) => setAno(Number(e.target.value))} className="input">
                {[hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Período de apuração — nasce do fechamento, mas é editável */}
          <div className="rounded-xl border border-line bg-ink-850 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <CalendarRange size={12} /> Período de apuração das vendas
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="cf-de">De</label>
                <input id="cf-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} className="input py-2" />
              </div>
              <div>
                <label className="label" htmlFor="cf-ate">Até</label>
                <input id="cf-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="input py-2" />
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
              {cliente?.closingDay
                ? `Fechamento do cliente: dia ${cliente.closingDay} — a competência de ${MONTH_NAMES_PT[mes - 1]} apura ${de && fmtBR(de)} a ${ate && fmtBR(ate)}.`
                : "Cliente sem dia de fechamento definido: vale o mês civil. Defina o dia no cadastro do cliente para o período vir certo sozinho."}
            </p>
            {buscando ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Loader2 size={12} className="animate-spin" /> Somando as vendas do período…
              </p>
            ) : apuracao ? (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs">
                <span className="font-semibold text-grow-400">{brl(apuracao.volume)}</span>
                <span className="text-slate-500">
                  em {apuracao.lancamentos} lançamento(s) de Performance no período
                </span>
                {apuracao.volume > 0 && Number(volume) !== apuracao.volume && (
                  <button
                    type="button"
                    onClick={() => setVolume(String(apuracao.volume))}
                    className="inline-flex items-center gap-1 font-semibold text-brand-300 hover:underline"
                  >
                    <RefreshCw size={11} /> usar este valor
                  </button>
                )}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="cf-volume">Volume vendido (R$) *</label>
              <input
                id="cf-volume"
                type="number"
                min="1"
                step="0.01"
                required
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="input"
                placeholder="1000000"
              />
              <p className="mt-1 text-[11px] text-slate-600">editável — ajuste se nem tudo foi lançado</p>
            </div>
            <div>
              <label className="label" htmlFor="cf-due">Vencimento</label>
              <input id="cf-due" name="dueDate" type="date" className="input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="cf-real">Receita real do período (R$) *</label>
              <input
                id="cf-real"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={real}
                onChange={(e) => setReal(e.target.value)}
                className="input"
              />
              <p className="mt-1 text-[11px] text-slate-600">
                bruto × base de cálculo do cliente — buscada dos lançamentos, editável
              </p>
            </div>
            <div>
              <label className="label" htmlFor="cf-share">Repasse FortGrow (%) *</label>
              <input
                id="cf-share"
                type="number"
                min="0.001"
                max="100"
                step="0.001"
                required
                value={share}
                onChange={(e) => setShare(e.target.value)}
                className="input"
              />
              <p className="mt-1 text-[11px] text-slate-600">comissão = receita real × este %</p>
            </div>
          </div>

          {preview && (
            <div className="rounded-xl bg-grow-500/10 px-4 py-3 text-sm ring-1 ring-inset ring-grow-500/20">
              <p className="text-slate-400">
                Receita real (base): <span className="font-semibold text-slate-200">{brl(preview.clientCommission)}</span>
              </p>
              <p className="mt-0.5 text-slate-400">
                Faturamento FortGrow ({competenciaLabel(ano, mes)}):{" "}
                <span className="text-base font-bold text-grow-400">{brl(preview.amount)}</span>
              </p>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading && <Loader2 size={15} className="animate-spin" />} Lançar fatura
          </button>
        </div>
      </form>
    </Overlay>
  );
}
