import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, Td } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { TrendChart } from "@/components/charts/trend-chart";
import { BarsChart } from "@/components/charts/bars-chart";
import { brl, num, pct } from "@/lib/utils";
import type { MetaDashData } from "@/lib/ads-dashboard";
import { SyncNow } from "./sync-now";

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Ativas", PAUSED: "Pausadas", ARCHIVED: "Arquivadas" };

/**
 * Dashboard Meta Ads compartilhado (admin por cliente + portal).
 * `basePath` monta os links de filtro; `syncClientId` restringe o sync.
 */
export function MetaAdsDashboard({
  data,
  basePath,
  days,
  campaignId,
  status,
  syncClientId,
}: {
  data: MetaDashData;
  basePath: string;
  days: number;
  campaignId?: string;
  status?: string;
  syncClientId?: string;
}) {
  const { totals } = data;
  const href = (over: { dias?: number; campanha?: string; status?: string }) => {
    const qs = new URLSearchParams();
    const d = over.dias ?? days;
    if (d !== 30) qs.set("dias", String(d));
    const c = "campanha" in over ? over.campanha : campaignId;
    if (c) qs.set("campanha", c);
    const s = "status" in over ? over.status : status;
    if (s) qs.set("status", s);
    const q = qs.toString();
    return q ? `${basePath}?${q}` : basePath;
  };

  const filterPill = (active: boolean) =>
    `rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
      active
        ? "bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/40"
        : "bg-ink-800 text-slate-500 hover:text-slate-300"
    }`;

  if (!data.hasAccount) {
    return (
      <div className="card p-6 text-sm text-slate-400">
        Nenhuma conta Meta Ads vinculada a este cliente ainda. Vincule o <span className="font-semibold text-slate-200">Ad Account ID (act_...)</span> na
        ficha do cliente (Integração de campanhas) e conecte o token em Integrações.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filtros + sync */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5">
            {[7, 30, 90].map((d) => (
              <Link key={d} href={href({ dias: d })} className={filterPill(days === d)}>
                {d} dias
              </Link>
            ))}
          </div>
          {data.statuses.length > 1 && (
            <div className="flex gap-1.5">
              <Link href={href({ status: undefined })} className={filterPill(!status)}>Todas</Link>
              {data.statuses.map((s) => (
                <Link key={s} href={href({ status: s })} className={filterPill(status === s)}>
                  {STATUS_LABELS[s] ?? s}
                </Link>
              ))}
            </div>
          )}
          {campaignId && (
            <Link href={href({ campanha: undefined })} className="text-[11px] font-semibold text-brand-400 hover:text-brand-300">
              ✕ limpar filtro de campanha
            </Link>
          )}
        </div>
        <SyncNow clientId={syncClientId} lastSyncedAt={data.lastSyncedAt?.toISOString() ?? null} />
      </div>

      {/* Visão geral */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Investimento total" value={brl(totals.spend)} accent="warn" />
        <StatCard label="Leads gerados" value={num(totals.leads)} hint={`${num(totals.conversions)} conversões`} accent="grow" />
        <StatCard label="Custo por lead" value={totals.leads > 0 ? brl(totals.cpl) : "—"} accent="violet" />
        <StatCard
          label="ROI"
          value={totals.roi !== null ? pct(totals.roi) : "—"}
          hint={totals.roi === null ? "informe a receita para calcular" : "receita vs. investimento"}
          accent={totals.roi !== null && totals.roi >= 0 ? "grow" : "danger"}
        />
        <StatCard label="Impressões" value={num(totals.impressions)} accent="brand" />
        <StatCard label="Alcance" value={num(totals.reach)} hint={`frequência ${totals.frequency.toFixed(2)}`} accent="brand" />
        <StatCard label="Cliques no link" value={num(totals.linkClicks || totals.clicks)} hint={`CTR ${pct(totals.ctr, 2)}`} accent="violet" />
        <StatCard label="CPC · CPM" value={`${brl(totals.cpc)} · ${brl(totals.cpm)}`} accent="warn" />
      </div>

      {/* Evolução diária */}
      <div className="card p-5">
        <h3 className="mb-4 text-sm font-bold text-slate-300">Evolução diária · últimos {days} dias</h3>
        {data.daily.length === 0 ? (
          <p className="text-sm text-slate-500">Sem métricas no período — clique em “Atualizar agora”.</p>
        ) : (
          <TrendChart
            data={data.daily}
            series={[
              { key: "investimento", label: "Investimento" },
              { key: "leads", label: "Leads" },
              { key: "cliques", label: "Cliques" },
            ]}
          />
        )}
      </div>

      {/* Comparação de campanhas */}
      {data.campaigns.length > 1 && (
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-bold text-slate-300">Comparação de campanhas · investimento e leads</h3>
          <BarsChart
            data={data.campaigns.slice(0, 8).map((c) => ({
              label: c.name.length > 16 ? `${c.name.slice(0, 15)}…` : c.name,
              investimento: Math.round(c.spend),
              leads: c.leads,
            }))}
            series={[
              { key: "investimento", label: "Investimento" },
              { key: "leads", label: "Leads" },
            ]}
          />
        </div>
      )}

      {/* Tabela de campanhas */}
      <div>
        <h3 className="mb-3 text-sm font-bold text-slate-300">Campanhas ({data.campaigns.length})</h3>
        <DataTable headers={["Campanha", "Objetivo", "Investido", "Leads", "CPL", "CTR", "CPC", "Status"]}>
          {data.campaigns.map((c) => (
            <tr key={c.id} className="transition hover:bg-ink-800/50">
              <Td>
                <Link href={href({ campanha: c.id })} className="font-medium text-slate-200 hover:text-brand-300">
                  {c.name}
                </Link>
                {c.dailyBudget > 0 && <p className="text-[11px] text-slate-500">orçamento {brl(c.dailyBudget)}/dia</p>}
              </Td>
              <Td className="text-xs text-slate-400">{c.objective?.replaceAll("_", " ").toLowerCase() ?? "—"}</Td>
              <Td className="font-semibold">{brl(c.spend)}</Td>
              <Td>{num(c.leads)}</Td>
              <Td>{c.leads > 0 ? brl(c.cpl) : "—"}</Td>
              <Td>{pct(c.ctr, 2)}</Td>
              <Td>{brl(c.cpc)}</Td>
              <Td>
                {c.status === "ACTIVE" ? <Badge tone="grow">ATIVA</Badge> : c.status === "PAUSED" ? <Badge tone="warn">PAUSADA</Badge> : <StatusBadge status={c.status ?? "—"} />}
              </Td>
            </tr>
          ))}
        </DataTable>
      </div>

      {/* Conjuntos de anúncios */}
      {data.adSets.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-slate-300">Conjuntos de anúncios ({data.adSets.length})</h3>
          <DataTable headers={["Conjunto", "Campanha", "Público", "Orçamento/dia", "Anúncios", "Status"]}>
            {data.adSets.map((s) => (
              <tr key={s.id} className="transition hover:bg-ink-800/50">
                <Td className="font-medium text-slate-200">{s.name}</Td>
                <Td className="max-w-40 truncate text-xs text-slate-400">{s.campaignName}</Td>
                <Td className="max-w-52 truncate text-xs text-slate-400">{s.audience ?? "—"}</Td>
                <Td>{s.budget > 0 ? brl(s.budget) : "—"}</Td>
                <Td>{s.adsCount}</Td>
                <Td>
                  {s.status === "ACTIVE" ? <Badge tone="grow">ATIVO</Badge> : s.status === "PAUSED" ? <Badge tone="warn">PAUSADO</Badge> : <StatusBadge status={s.status ?? "—"} />}
                </Td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}
    </div>
  );
}
