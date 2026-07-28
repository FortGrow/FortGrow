import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, CheckCircle2, Cpu, Database, ExternalLink, Gauge, HardDrive, Rocket, Wifi,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { loadRenderSnapshot, projetarMes, situacao } from "@/lib/render-api";
import { PlanoForm } from "./plano-form";

/**
 * Hospedagem — quanto o sistema está consumindo do plano contratado no Render.
 *
 * A pergunta que esta tela responde é uma só: "está perto do limite?". Por
 * isso o topo não é uma lista de métricas, é um veredito em uma frase, com
 * a projeção até o fim do mês — que é o número que dá tempo de reagir.
 */
export const dynamic = "force-dynamic";

const NIVEL = {
  tranquilo: { cor: "#059669", texto: "Folgado", tom: "grow" as const },
  atencao: { cor: "#d97706", texto: "Atenção", tom: "warn" as const },
  critico: { cor: "#e11d48", texto: "Perto do limite", tom: "danger" as const },
  estourado: { cor: "#e11d48", texto: "Limite estourado", tom: "danger" as const },
  "sem-franquia": { cor: "#64748b", texto: "Sem franquia definida", tom: "slate" as const },
};

const gb = (v: number) =>
  v >= 1024
    ? `${(v / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} TB`
    : `${v.toLocaleString("pt-BR", { maximumFractionDigits: v < 10 ? 2 : 1 })} GB`;

export default async function HospedagemPage() {
  const session = (await getSession())!;
  if (!can(session, "hospedagem", "view")) redirect("/admin");

  const s = await loadRenderSnapshot();
  const { nivel, percent } = situacao(s.banda.totalGB, s.plano.francaGB);
  const projecao = projetarMes(s.banda.totalGB, s.periodo.diaAtual, s.periodo.diasNoMes);
  const proj = situacao(projecao, s.plano.francaGB);
  const n = NIVEL[nivel];

  return (
    <>
      <PageHeader
        title="Hospedagem"
        subtitle={`Consumo do mês no Render · plano ${s.plano.label} · dia ${s.periodo.diaAtual} de ${s.periodo.diasNoMes}`}
      >
        <PlanoForm plano={s.plano.chave} francaGB={s.plano.francaGB} podeEditar={can(session, "hospedagem", "edit")} />
      </PageHeader>

      {!s.configurado ? (
        <ComoConfigurar />
      ) : s.erro ? (
        <div className="card border-danger/25 bg-danger/5 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-danger">
            <AlertTriangle size={15} /> Não consegui falar com o Render
          </p>
          <p className="mt-1.5 text-xs text-slate-400">{s.erro}</p>
          <p className="mt-2 text-xs text-slate-500">
            Confira se a chave em <span className="font-mono">RENDER_API_KEY</span> ainda é válida no
            painel do Render (Account Settings → API Keys).
          </p>
        </div>
      ) : (
        <>
          {/* ── Veredito ── */}
          <div
            className="card mb-6 p-6"
            style={{ borderColor: `${n.cor}59`, background: `linear-gradient(140deg, ${n.cor}1a, rgba(11,14,20,0.6) 60%)` }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: n.cor }}>
                  {nivel === "tranquilo" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {n.texto}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-100">
                  {gb(s.banda.totalGB)}
                  {s.plano.francaGB > 0 && (
                    <span className="text-base font-medium text-slate-500"> de {gb(s.plano.francaGB)} usados</span>
                  )}
                </p>
                <p className="mt-1.5 max-w-2xl text-sm text-slate-400">{frase(nivel, proj.nivel, projecao, s.plano.francaGB)}</p>
              </div>
              {s.plano.francaGB > 0 && (
                <div className="text-right">
                  <p className="text-3xl font-bold" style={{ color: n.cor }}>
                    {percent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">da franquia</p>
                </div>
              )}
            </div>

            {s.plano.francaGB > 0 && (
              <div className="mt-5">
                <div className="relative h-3 overflow-hidden rounded-full bg-ink-700/60">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${Math.min(100, percent)}%`, backgroundColor: n.cor }}
                  />
                  {/* marca onde a projeção do mês deve chegar */}
                  {projecao > s.banda.totalGB && (
                    <span
                      className="absolute top-0 h-full w-[2px] bg-white/70"
                      style={{ left: `${Math.min(99.5, (projecao / s.plano.francaGB) * 100)}%` }}
                      title={`Projeção do mês: ${gb(projecao)}`}
                    />
                  )}
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                  <span>usado até agora</span>
                  <span>
                    projeção do mês fechado: <strong className="text-slate-300">{gb(projecao)}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Números ── */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Banda usada no mês"
              value={gb(s.banda.totalGB)}
              hint={s.plano.francaGB > 0 ? `franquia ${gb(s.plano.francaGB)}` : "franquia não definida"}
              accent={nivel === "tranquilo" ? "grow" : nivel === "atencao" ? "warn" : "danger"}
            />
            <StatCard
              label="Sobra estimada"
              value={s.plano.francaGB > 0 ? gb(Math.max(0, s.plano.francaGB - s.banda.totalGB)) : "—"}
              hint={`faltam ${s.periodo.diasNoMes - s.periodo.diaAtual} dia(s) para virar o mês`}
              accent="brand"
            />
            <StatCard
              label="Serviços ativos"
              value={String(s.services.filter((x) => x.suspended !== "suspended").length)}
              hint={`${s.services.length} no total`}
              accent="violet"
            />
            <StatCard
              label="Memória em uso"
              value={s.instancia?.memoriaMB ? `${Math.round(s.instancia.memoriaMB)} MB` : "—"}
              hint={s.instancia?.cpu !== null && s.instancia?.cpu !== undefined ? `CPU ${(s.instancia.cpu * 100).toFixed(0)}%` : "sem leitura"}
              accent="warn"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Banda por serviço */}
            <div className="card p-5">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-300">
                <Wifi size={14} className="text-brand-400" /> Banda por serviço
              </h2>
              <p className="mb-4 text-xs text-slate-500">Quem está consumindo a franquia do mês</p>
              {s.banda.porServico.length === 0 ? (
                <p className="text-xs text-slate-600">Sem tráfego registrado neste mês.</p>
              ) : (
                <div className="space-y-2.5">
                  {s.banda.porServico.map((b) => (
                    <div key={b.id} className="flex items-center gap-3">
                      <span className="w-36 shrink-0 truncate text-xs font-medium text-slate-300">{b.nome}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-700/60">
                        <span
                          className="block h-full rounded-full bg-brand-500"
                          style={{ width: `${Math.min(100, (b.gb / Math.max(0.0001, s.banda.totalGB)) * 100)}%` }}
                        />
                      </span>
                      <span className="w-20 shrink-0 text-right text-xs font-semibold text-slate-300">{gb(b.gb)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Disco */}
            <div className="card p-5">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-300">
                <HardDrive size={14} className="text-brand-400" /> Disco de arquivos
              </h2>
              <p className="mb-4 text-xs text-slate-500">Onde ficam os uploads (documentos, criativos, PDFs)</p>
              {s.disco.length === 0 ? (
                <p className="text-xs text-slate-600">Nenhum disco anexado.</p>
              ) : (
                <div className="space-y-4">
                  {s.disco.map((d) => {
                    const pctDisco = d.totalGB > 0 ? (d.usadoGB / d.totalGB) * 100 : 0;
                    return (
                      <div key={d.nome}>
                        <div className="mb-1 flex items-baseline justify-between text-xs">
                          <span className="font-medium text-slate-300">{d.nome}</span>
                          <span className="text-slate-400">
                            {gb(d.usadoGB)} de {gb(d.totalGB)}
                          </span>
                        </div>
                        <span className="block h-2 overflow-hidden rounded-full bg-ink-700/60">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${Math.min(100, pctDisco)}%`,
                              backgroundColor: pctDisco >= 85 ? "#e11d48" : pctDisco >= 60 ? "#d97706" : "#059669",
                            }}
                          />
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bancos */}
          {s.bancos.length > 0 && (
            <div className="mt-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-300">
                <Database size={14} className="text-brand-400" /> Bancos de dados
              </h2>
              <DataTable headers={["Banco", "Plano", "Status", "Armazenamento"]}>
                {s.bancos.map((b) => (
                  <tr key={b.id} className="transition hover:bg-ink-800/50">
                    <Td className="font-semibold text-slate-200">{b.nome}</Td>
                    <Td className="text-xs uppercase">{b.plano}</Td>
                    <Td>
                      <Badge tone={b.status === "available" ? "grow" : "warn"}>{b.status}</Badge>
                    </Td>
                    <Td className="text-xs">{b.usadoGB === null ? "—" : gb(b.usadoGB)}</Td>
                  </tr>
                ))}
              </DataTable>
            </div>
          )}

          {/* Serviços */}
          <div className="mt-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-300">
              <Gauge size={14} className="text-brand-400" /> Serviços
            </h2>
            <DataTable headers={["Serviço", "Tipo", "Instância", "Status", ""]}>
              {s.services.map((sv) => (
                <tr key={sv.id} className="transition hover:bg-ink-800/50">
                  <Td>
                    <p className="font-semibold text-slate-200">{sv.name}</p>
                    {sv.branch && <p className="text-xs text-slate-500">branch {sv.branch}</p>}
                  </Td>
                  <Td className="text-xs">{sv.type.replaceAll("_", " ")}</Td>
                  <Td className="text-xs uppercase">{sv.plan ?? "—"}</Td>
                  <Td>
                    <Badge tone={sv.suspended === "suspended" ? "danger" : "grow"}>
                      {sv.suspended === "suspended" ? "SUSPENSO" : "ATIVO"}
                    </Badge>
                  </Td>
                  <Td>
                    {sv.dashboardUrl && (
                      <a
                        href={sv.dashboardUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-300 hover:underline"
                      >
                        Abrir no Render <ExternalLink size={11} />
                      </a>
                    )}
                  </Td>
                </tr>
              ))}
            </DataTable>
          </div>

          {s.ultimoDeploy && (
            <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Rocket size={12} />
              Último deploy: <strong className="text-slate-300">{s.ultimoDeploy.status}</strong>
              {s.ultimoDeploy.quando && ` · ${new Date(s.ultimoDeploy.quando).toLocaleString("pt-BR")}`}
              {s.ultimoDeploy.commit && ` · ${s.ultimoDeploy.commit.split("\n")[0].slice(0, 70)}`}
            </p>
          )}

          <p className="mt-6 text-[11px] leading-relaxed text-slate-600">
            A franquia de banda é do workspace inteiro, não de um serviço — e a API do Render não informa
            qual plano está contratado, por isso ele é escolhido aqui em cima. Passando da franquia, o
            Render cobra por GB adicional; sem forma de pagamento cadastrada, ele suspende os serviços até
            o mês virar.{" "}
            <Link href="https://render.com/docs/outbound-bandwidth" target="_blank" className="text-brand-400 hover:underline">
              Regras oficiais
            </Link>
          </p>
        </>
      )}
    </>
  );
}

/** Frase única de veredito — o usuário não deveria precisar interpretar barras. */
function frase(agora: string, projetado: string, projecao: number, franca: number): string {
  if (agora === "sem-franquia") {
    return "Defina o plano do workspace acima para eu comparar o consumo com a franquia contratada.";
  }
  if (agora === "estourado") {
    return "A franquia do mês já foi ultrapassada. O Render passa a cobrar por GB adicional — ou suspende os serviços, se não houver forma de pagamento cadastrada.";
  }
  if (projetado === "estourado") {
    return `No ritmo atual o mês fecha em ${gb(projecao)}, acima da franquia de ${gb(franca)}. Vale subir o plano do workspace ou reduzir tráfego antes de virar o mês.`;
  }
  if (agora === "critico") {
    return "O consumo passou de 85% da franquia. Acompanhe de perto nos próximos dias.";
  }
  if (agora === "atencao") {
    return "Mais da metade da franquia já foi usada, mas a projeção fecha o mês dentro do contratado.";
  }
  return "Consumo bem abaixo do contratado — nenhuma ação necessária.";
}

function ComoConfigurar() {
  return (
    <div className="card p-6">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-200">
        <Cpu size={15} className="text-brand-400" /> Falta conectar a API do Render
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Para eu ler o consumo real, preciso de uma chave de leitura da sua conta. É rápido:
      </p>
      <ol className="mt-4 max-w-2xl space-y-2.5 text-sm text-slate-300">
        {[
          <>
            No painel do Render, abra{" "}
            <a href="https://dashboard.render.com/u/settings#api-keys" target="_blank" rel="noreferrer" className="text-brand-300 hover:underline">
              Account Settings → API Keys
            </a>{" "}
            e clique em <strong>Create API Key</strong>.
          </>,
          <>Copie a chave gerada (ela só aparece uma vez).</>,
          <>
            No serviço <strong>fortgrow-crm</strong>, vá em <strong>Environment</strong> e crie a variável{" "}
            <span className="rounded bg-ink-700 px-1.5 py-0.5 font-mono text-xs">RENDER_API_KEY</span> com esse valor.
          </>,
          <>Salve — o Render reinicia o serviço e esta tela passa a mostrar o consumo.</>,
        ].map((passo, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-[11px] font-bold text-brand-300">
              {i + 1}
            </span>
            <span>{passo}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-slate-500">
        A chave só é lida no servidor e nunca chega ao navegador. Enquanto ela não existir, esta tela
        fica assim — nada quebra no resto do sistema.
      </p>
    </div>
  );
}
