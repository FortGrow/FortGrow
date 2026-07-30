/**
 * Consumo da infraestrutura no Render.
 *
 * Lê a API oficial (https://api.render.com/v1) para responder a pergunta
 * prática: "estou perto de estourar o que contratei?".
 *
 * Duas coisas moldam este módulo:
 *
 *  1. A franquia de banda é do WORKSPACE, não do serviço, e a API **não**
 *     expõe qual plano de workspace está contratado. Então o consumo vem da
 *     API e a franquia é configurada na tela (Hospedagem → plano), guardada
 *     em `Setting`. Chutar o plano daria um número errado com cara de certo.
 *  2. Sem `RENDER_API_KEY` nada quebra: a tela explica como gerar a chave em
 *     vez de mostrar erro.
 */
import { prisma } from "./prisma";

const BASE = "https://api.render.com/v1";

/**
 * Franquia mensal de banda por plano de workspace (Render, jul/2026).
 * Fonte: https://render.com/docs/outbound-bandwidth
 */
export const WORKSPACE_PLANS = {
  hobby: { label: "Hobby", bandwidthGB: 5 },
  pro: { label: "Pro", bandwidthGB: 25 },
  scale: { label: "Scale", bandwidthGB: 1024 },
  custom: { label: "Enterprise / personalizado", bandwidthGB: 0 },
} as const;

export type WorkspacePlan = keyof typeof WORKSPACE_PLANS;

export type RenderService = {
  id: string;
  name: string;
  type: string;
  suspended: string;
  dashboardUrl: string;
  plan: string | null;
  branch: string | null;
  updatedAt: string;
};

export type SerieValor = { timestamp: string; value: number };

export type DominioCustom = {
  nome: string;
  tipo: string;
  verificado: boolean;
  servico: string;
};

export type RenderSnapshot = {
  configurado: boolean;
  erro: string | null;
  /** Plano de workspace informado pelo admin e franquia correspondente */
  plano: { chave: WorkspacePlan; label: string; francaGB: number };
  periodo: { de: string; ate: string; diasNoMes: number; diaAtual: number };
  services: RenderService[];
  /** Banda de saída no mês corrente, em GB, por serviço e total */
  banda: { porServico: { id: string; nome: string; gb: number }[]; totalGB: number };
  disco: { nome: string; usadoGB: number; totalGB: number }[];
  bancos: { id: string; nome: string; plano: string; status: string; usadoGB: number | null }[];
  /** Domínios apontados para o serviço (fortgrow.com.br e afins) */
  dominios: DominioCustom[];
  /** Último uso de CPU/memória do serviço web principal */
  instancia: { cpu: number | null; memoriaMB: number | null } | null;
  ultimoDeploy: { status: string; quando: string; commit: string | null } | null;
};

async function apiGet<T>(caminho: string, key: string): Promise<T> {
  const res = await fetch(`${BASE}${caminho}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    // Dado de infraestrutura muda devagar; 60s evita bater na API a cada F5
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    throw new Error(`Render respondeu ${res.status}${corpo ? ` — ${corpo.slice(0, 160)}` : ""}`);
  }
  return res.json() as Promise<T>;
}

/** As séries do Render vêm como [{ labels, unit, values: [{timestamp, value}] }]. */
type Serie = { labels?: { field: string; value: string }[]; unit?: string; values?: SerieValor[] };

const somaSerie = (s: Serie[]) =>
  s.reduce((total, serie) => total + (serie.values ?? []).reduce((a, v) => a + (v.value ?? 0), 0), 0);

const ultimoDaSerie = (s: Serie[]) => {
  const vals = s.flatMap((x) => x.values ?? []);
  return vals.length ? vals[vals.length - 1].value : null;
};

const GB = 1024 ** 3;

/** Plano de workspace escolhido pelo admin (padrão: Hobby, o mais restrito). */
export async function getWorkspacePlan(): Promise<WorkspacePlan> {
  const row = await prisma.setting.findUnique({ where: { key: "renderPlan" } });
  const v = String(row?.value ?? "hobby");
  return v in WORKSPACE_PLANS ? (v as WorkspacePlan) : "hobby";
}

/** Franquia personalizada em GB (só usada no plano `custom`). */
export async function getCustomBandwidth(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: "renderBandwidthGB" } });
  const v = Number(row?.value ?? 0);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export async function loadRenderSnapshot(): Promise<RenderSnapshot> {
  const chave = await getWorkspacePlan();
  const custom = await getCustomBandwidth();
  const francaGB = chave === "custom" ? custom : WORKSPACE_PLANS[chave].bandwidthGB;

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const diasNoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate();

  const base: RenderSnapshot = {
    configurado: false,
    erro: null,
    plano: { chave, label: WORKSPACE_PLANS[chave].label, francaGB },
    periodo: {
      de: inicioMes.toISOString(),
      ate: agora.toISOString(),
      diasNoMes,
      diaAtual: agora.getDate(),
    },
    services: [],
    banda: { porServico: [], totalGB: 0 },
    disco: [],
    bancos: [],
    dominios: [],
    instancia: null,
    ultimoDeploy: null,
  };

  const key = process.env.RENDER_API_KEY;
  if (!key) return base;
  base.configurado = true;

  try {
    // A listagem vem embrulhada: [{ service: {...}, cursor }]
    const servicosRaw = await apiGet<{ service: Record<string, unknown> }[]>(
      "/services?limit=50",
      key
    );
    const services: RenderService[] = servicosRaw.map(({ service: s }) => ({
      id: String(s.id),
      name: String(s.name),
      type: String(s.type),
      suspended: String(s.suspended ?? "not_suspended"),
      dashboardUrl: String(s.dashboardUrl ?? ""),
      plan: ((s.serviceDetails as Record<string, unknown>)?.plan as string) ?? null,
      branch: (s.branch as string) ?? null,
      updatedAt: String(s.updatedAt ?? ""),
    }));
    base.services = services;

    const janela = `startTime=${encodeURIComponent(inicioMes.toISOString())}&endTime=${encodeURIComponent(agora.toISOString())}`;
    const ativos = services.filter((s) => s.suspended !== "suspended");

    // ── Banda do mês, por serviço ──
    const bandas = await Promise.all(
      ativos.map(async (s) => {
        try {
          const series = await apiGet<Serie[]>(`/metrics/bandwidth?${janela}&resource=${s.id}`, key);
          return { id: s.id, nome: s.name, gb: somaSerie(series) / GB };
        } catch {
          return { id: s.id, nome: s.name, gb: 0 };
        }
      })
    );
    base.banda = {
      porServico: bandas.sort((a, b) => b.gb - a.gb),
      totalGB: bandas.reduce((a, b) => a + b.gb, 0),
    };

    // ── Discos: capacidade e uso ──
    const discos = await apiGet<{ disk: Record<string, unknown> }[]>("/disks?limit=20", key).catch(
      () => [] as { disk: Record<string, unknown> }[]
    );
    base.disco = await Promise.all(
      discos.map(async ({ disk: d }) => {
        let usadoGB = 0;
        try {
          const series = await apiGet<Serie[]>(
            `/metrics/disk-usage?${janela}&resource=${String(d.serviceId ?? "")}`,
            key
          );
          usadoGB = (ultimoDaSerie(series) ?? 0) / GB;
        } catch {
          /* sem métrica de disco: mostra só a capacidade */
        }
        return { nome: String(d.name ?? "disco"), usadoGB, totalGB: Number(d.sizeGB ?? 0) };
      })
    );

    // ── Bancos de dados ──
    const bancos = await apiGet<{ postgres: Record<string, unknown> }[]>("/postgres?limit=20", key).catch(
      () => [] as { postgres: Record<string, unknown> }[]
    );
    base.bancos = await Promise.all(
      bancos.map(async ({ postgres: p }) => {
        let usadoGB: number | null = null;
        try {
          const series = await apiGet<Serie[]>(
            `/metrics/disk-usage?${janela}&resource=${String(p.id)}`,
            key
          );
          const ultimo = ultimoDaSerie(series);
          usadoGB = ultimo === null ? null : ultimo / GB;
        } catch {
          /* nem todo plano expõe uso de disco do banco */
        }
        return {
          id: String(p.id),
          nome: String(p.name ?? "banco"),
          plano: String(p.plan ?? "—"),
          status: String(p.status ?? "—"),
          usadoGB,
        };
      })
    );

    // ── Domínios apontados para os serviços web ──
    // É o que confirma que fortgrow.com.br está de fato servido por aqui, e
    // que o certificado/DNS foi verificado pelo Render.
    const webs = ativos.filter((s) => s.type === "web_service" || s.type === "static_site");
    const dominios = await Promise.all(
      webs.map(async (s) => {
        try {
          const lista = await apiGet<{ customDomain: Record<string, unknown> }[]>(
            `/services/${s.id}/custom-domains?limit=20`,
            key
          );
          return lista.map(({ customDomain: d }) => ({
            nome: String(d.name ?? ""),
            tipo: String(d.domainType ?? ""),
            verificado: String(d.verificationStatus ?? "") === "verified",
            servico: s.name,
          }));
        } catch {
          return [];
        }
      })
    );
    base.dominios = dominios.flat();

    // ── CPU/memória e último deploy do serviço web principal ──
    const web = ativos.find((s) => s.type === "web_service") ?? ativos[0];
    if (web) {
      const [cpu, mem, deploys] = await Promise.all([
        apiGet<Serie[]>(`/metrics/cpu?${janela}&resource=${web.id}`, key).catch(() => []),
        apiGet<Serie[]>(`/metrics/memory?${janela}&resource=${web.id}`, key).catch(() => []),
        apiGet<{ deploy: Record<string, unknown> }[]>(
          `/services/${web.id}/deploys?limit=1`,
          key
        ).catch(() => []),
      ]);
      base.instancia = {
        cpu: ultimoDaSerie(cpu),
        memoriaMB: ultimoDaSerie(mem) === null ? null : (ultimoDaSerie(mem) as number) / 1024 ** 2,
      };
      const d = deploys[0]?.deploy;
      if (d) {
        base.ultimoDeploy = {
          status: String(d.status ?? "—"),
          quando: String(d.finishedAt ?? d.createdAt ?? ""),
          commit: ((d.commit as Record<string, unknown>)?.message as string) ?? null,
        };
      }
    }
  } catch (e) {
    base.erro = e instanceof Error ? e.message : "Falha ao consultar a API do Render.";
  }

  return base;
}

/**
 * Projeção do consumo até o fim do mês, na média observada até agora.
 * É o número que responde "vou estourar?" antes de estourar.
 */
export function projetarMes(usadoGB: number, diaAtual: number, diasNoMes: number): number {
  if (diaAtual <= 0) return usadoGB;
  return (usadoGB / diaAtual) * diasNoMes;
}

/** Situação em uma palavra, para colorir a tela sem o usuário fazer conta. */
export function situacao(usadoGB: number, francaGB: number): {
  nivel: "tranquilo" | "atencao" | "critico" | "estourado" | "sem-franquia";
  percent: number;
} {
  if (francaGB <= 0) return { nivel: "sem-franquia", percent: 0 };
  const percent = (usadoGB / francaGB) * 100;
  if (percent >= 100) return { nivel: "estourado", percent };
  if (percent >= 85) return { nivel: "critico", percent };
  if (percent >= 60) return { nivel: "atencao", percent };
  return { nivel: "tranquilo", percent };
}
