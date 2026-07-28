import Link from "next/link";
import { AlertTriangle, Award, Clock, Flame, Radio, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { TrendChart } from "@/components/charts/trend-chart";
import { BarsChart } from "@/components/charts/bars-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { FunnelList } from "@/components/charts/funnel-list";
import { brl, num, pct } from "@/lib/utils";
import type { CrmMetrics } from "@/lib/crm-metrics";

/**
 * Painel do CRM da empresa.
 *
 * Componente de servidor puro: recebe as métricas já calculadas e só
 * desenha. Assim o mesmo painel serve o Portal do cliente e a visão da
 * FortGrow sem duplicar uma linha de cálculo — e sem risco de os dois
 * mostrarem números diferentes.
 */
export function CrmDashboard({ m, basePath }: { m: CrmMetrics; basePath: string }) {
  const vazio = m.total === 0;

  return (
    <div className="space-y-6">
      {/* ── Indicadores principais ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total de leads" value={num(m.total)} hint={`${num(m.novos)} novos aguardando`} accent="brand" />
        <StatCard label="Em negociação" value={num(m.emNegociacao)} hint="avançaram do primeiro contato" accent="violet" />
        <StatCard label="Ganhos" value={num(m.ganhos)} hint={`${num(m.perdidos)} perdidos`} accent="grow" />
        <StatCard
          label="Taxa de conversão"
          value={pct(m.conversao)}
          hint="ganhos ÷ negócios fechados"
          accent={m.conversao >= 30 ? "grow" : "warn"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Receita prevista" value={brl(m.receitaPrevista)} hint="soma do funil em aberto" accent="brand" />
        <StatCard label="Receita fechada" value={brl(m.receitaFechada)} hint="negócios ganhos" accent="grow" />
        <StatCard label="Ticket médio" value={brl(m.ticketMedio)} hint="por negócio ganho" accent="violet" />
        <StatCard
          label="Tempo médio de conversão"
          value={m.cicloMedio > 0 ? `${m.cicloMedio.toFixed(0)} dias` : "—"}
          hint="da criação ao fechamento"
          accent="warn"
        />
      </div>

      {/* ── Destaques e alertas ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Destaque
          icon={<Radio size={15} className="text-brand-400" />}
          titulo="Melhor canal"
          valor={m.melhorCanal?.label ?? "—"}
          detalhe={m.melhorCanal ? `${num(m.melhorCanal.value)} negócio(s) ganho(s)` : "sem negócios ganhos ainda"}
        />
        <Destaque
          icon={<Award size={15} className="text-grow-400" />}
          titulo="Melhor vendedor"
          valor={m.melhorVendedor?.label ?? "—"}
          detalhe={m.melhorVendedor ? `${num(m.melhorVendedor.value)} negócio(s) ganho(s)` : "sem responsável definido"}
        />
        <Destaque
          icon={<Flame size={15} className="text-danger" />}
          titulo="Leads quentes"
          valor={num(m.quentes)}
          detalhe="score 65+ e ainda em aberto"
        />
      </div>

      {(m.semContato > 0 || m.atrasados > 0) && (
        <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-warn">
            <AlertTriangle size={14} /> Precisa de atenção
          </span>
          {m.semContato > 0 && (
            <Link href={`${basePath}/leads`} className="text-sm text-slate-300 hover:text-brand-300">
              <strong className="text-warn">{num(m.semContato)}</strong> lead(s) em aberto sem contato há mais de 7 dias
            </Link>
          )}
          {m.atrasados > 0 && (
            <Link href={`${basePath}/agenda`} className="text-sm text-slate-300 hover:text-brand-300">
              <strong className="text-danger">{num(m.atrasados)}</strong> com próximo contato vencido
            </Link>
          )}
        </div>
      )}

      {vazio ? (
        <div className="card p-10 text-center">
          <p className="text-sm font-semibold text-slate-300">Seu CRM está pronto — falta o primeiro lead.</p>
          <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
            Cadastre manualmente ou importe uma planilha CSV. Assim que os primeiros negócios entrarem,
            este painel passa a mostrar conversão, receita prevista, origem dos leads e desempenho por
            vendedor.
          </p>
          <Link href={`${basePath}/leads`} className="btn-primary mx-auto mt-4 w-fit">
            Cadastrar primeiro lead
          </Link>
        </div>
      ) : (
        <>
          {/* ── Gráficos ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Painel titulo="Funil de vendas" hint="quantos leads em cada etapa">
              <FunnelList steps={m.funil} />
            </Painel>

            <Painel titulo="Origem dos leads" hint="de onde vem a demanda">
              <DonutChart
                data={m.porOrigem.slice(0, 8).map((o) => ({ label: o.label, value: o.value }))}
                format="number"
                height={240}
              />
            </Painel>
          </div>

          <Painel titulo="Volume por mês" hint="leads criados x negócios ganhos nos últimos 12 meses">
            <BarsChart
              data={m.meses as unknown as Record<string, unknown>[]}
              series={[
                { key: "criados", label: "Leads criados" },
                { key: "ganhos", label: "Ganhos" },
              ]}
              height={260}
            />
          </Painel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Painel titulo="Receita fechada por mês" hint="valor dos negócios ganhos">
              <TrendChart
                data={m.meses as unknown as Record<string, unknown>[]}
                series={[{ key: "receita", label: "Receita" }]}
                format="brl"
                height={240}
              />
            </Painel>

            <Painel titulo="Conversão por mês" hint="% de ganhos entre os negócios fechados no mês">
              <TrendChart
                data={m.meses as unknown as Record<string, unknown>[]}
                series={[{ key: "conversao", label: "Conversão" }]}
                format="pct"
                height={240}
              />
            </Painel>
          </div>

          <Painel titulo="Valor por etapa" hint="quanto dinheiro está parado em cada fase">
            <div className="space-y-2.5">
              {m.porEtapa.map((e) => (
                <div key={e.label} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-xs font-medium" style={{ color: e.color }}>
                    {e.label}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-700/60">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (e.receita / Math.max(1, ...m.porEtapa.map((x) => x.receita))) * 100)}%`,
                        backgroundColor: e.color,
                      }}
                    />
                  </span>
                  <span className="w-28 shrink-0 text-right text-xs font-semibold text-slate-300">
                    {brl(e.receita)}
                  </span>
                  <span className="w-10 shrink-0 text-right text-[11px] text-slate-500">{num(e.value)}</span>
                </div>
              ))}
            </div>
          </Painel>
        </>
      )}
    </div>
  );
}

function Painel({ titulo, hint, children }: { titulo: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-300">
          <TrendingUp size={14} className="text-brand-400" /> {titulo}
        </h2>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Destaque({
  icon,
  titulo,
  valor,
  detalhe,
}: {
  icon: React.ReactNode;
  titulo: string;
  valor: string;
  detalhe: string;
}) {
  return (
    <div className="card p-5">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
        {icon} {titulo}
      </p>
      <p className="mt-2 truncate text-xl font-bold tracking-tight text-slate-100">{valor}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
        <Clock size={11} /> {detalhe}
      </p>
    </div>
  );
}
