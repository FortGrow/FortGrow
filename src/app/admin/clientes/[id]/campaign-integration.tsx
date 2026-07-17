"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlugZap, Save, TrendingUp } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

export type AdAccounts = {
  googleAdsId?: string;
  metaAdsId?: string;
  instagram?: string;
  ga4PropertyId?: string;
};

const CHANNELS = [
  ["META_ADS", "Meta Ads"],
  ["GOOGLE_ADS", "Google Ads"],
  ["INSTAGRAM", "Instagram"],
  ["SEO", "SEO"],
  ["LINKEDIN", "LinkedIn"],
  ["TIKTOK", "TikTok Ads"],
  ["OUTRO", "Outro"],
] as const;

const METRIC_FIELDS = [
  ["leads", "Leads"],
  ["conversions", "Vendas / conversões"],
  ["spend", "Investimento (R$)"],
  ["revenue", "Receita gerada (R$)"],
  ["impressions", "Impressões"],
  ["clicks", "Cliques"],
  ["reach", "Alcance"],
  ["followers", "Seguidores"],
] as const;

/**
 * Integração de campanhas do cliente: vincula as contas de anúncio
 * (sincronização automática) e permite lançar métricas manualmente.
 */
export function CampaignIntegrationPanel({ clientId, accounts }: { clientId: string; accounts: AdAccounts }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function saveAccounts(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: clientId,
          adAccounts: {
            metaAdsId: form.get("metaAdsId"),
            googleAdsId: form.get("googleAdsId"),
            instagram: form.get("instagram"),
            ga4PropertyId: form.get("ga4PropertyId"),
          },
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function postMetrics(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPosting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = { clientId };
    for (const [k, v] of form.entries()) if (String(v).trim() !== "") payload[k] = v;
    try {
      const res = await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível lançar.");
        return;
      }
      setMetricsOpen(false);
      router.refresh();
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-300">
            <PlugZap size={15} className="text-violet" /> Integração de campanhas
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Vincule as contas de anúncio — as métricas passam a alimentar os dashboards deste cliente automaticamente
            (sincronização diária ou botão &quot;Sincronizar&quot; em Integrações).
          </p>
        </div>
        <button onClick={() => setMetricsOpen(true)} className="btn-ghost">
          <TrendingUp size={15} /> Lançar métricas
        </button>
      </div>

      <form onSubmit={saveAccounts} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="ci-meta">Meta Ads · ID da conta</label>
          <input id="ci-meta" name="metaAdsId" defaultValue={accounts.metaAdsId ?? ""} className="input" placeholder="act_123456789" />
        </div>
        <div>
          <label className="label" htmlFor="ci-google">Google Ads · ID do cliente</label>
          <input id="ci-google" name="googleAdsId" defaultValue={accounts.googleAdsId ?? ""} className="input" placeholder="123-456-7890" />
        </div>
        <div>
          <label className="label" htmlFor="ci-ig">Instagram · @perfil</label>
          <input id="ci-ig" name="instagram" defaultValue={accounts.instagram ?? ""} className="input" placeholder="@empresa" />
        </div>
        <div>
          <label className="label" htmlFor="ci-ga4">GA4 · Property ID</label>
          <input id="ci-ga4" name="ga4PropertyId" defaultValue={accounts.ga4PropertyId ?? ""} className="input" placeholder="1234567" />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar vínculos
          </button>
          {saved && <span className="text-xs font-medium text-grow-400">Vínculos salvos!</span>}
        </div>
      </form>

      {metricsOpen && (
        <Overlay>
          <form onSubmit={postMetrics} className="card w-full max-w-lg animate-fade-up p-6">
            <h2 className="mb-1 text-lg font-bold text-slate-100">Lançar métricas do cliente</h2>
            <p className="mb-4 text-sm text-slate-500">
              Lançamento manual por canal e dia — os dashboards (e o valor por lead, ticket médio e custo por venda)
              são atualizados na hora. Campos vazios não sobrescrevem dados existentes.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="lm-channel">Canal *</label>
                <select id="lm-channel" name="channel" required className="input">
                  {CHANNELS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="lm-date">Dia *</label>
                <input id="lm-date" name="date" type="date" required className="input" defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              {METRIC_FIELDS.map(([name, label]) => (
                <div key={name}>
                  <label className="label" htmlFor={`lm-${name}`}>{label}</label>
                  <input id={`lm-${name}`} name={name} type="number" min="0" step="0.01" className="input" />
                </div>
              ))}
            </div>
            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setMetricsOpen(false)} className="btn-ghost">Cancelar</button>
              <button type="submit" disabled={posting} className="btn-primary">
                {posting && <Loader2 size={15} className="animate-spin" />} Lançar métricas
              </button>
            </div>
          </form>
        </Overlay>
      )}
    </div>
  );
}
