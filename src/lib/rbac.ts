import type { SessionPayload } from "./auth";

/** Chaves de módulo da área administrativa. */
export const MODULES = {
  dashboard: "Dashboard",
  agenda: "Agenda",
  crm: "CRM Comercial",
  "crm-clientes": "CRMs dos clientes",
  prospeccao: "Prospecção",
  clientes: "Clientes",
  servicos: "Serviços",
  contratos: "Contratos",
  projetos: "Projetos",
  tarefas: "Tarefas",
  campanhas: "Campanhas",
  ia: "Inteligência",
  financeiro: "Faturamento",
  comissoes: "Comissões",
  custos: "Custos",
  treinamentos: "Treinamentos",
  relatorios: "Relatórios",
  chamados: "Chamados",
  automacoes: "Automações",
  integracoes: "Integrações",
  equipe: "Equipe & Permissões",
  auditoria: "Auditoria",
} as const;

export type ModuleKey = keyof typeof MODULES;

/**
 * Áreas do Portal do Cliente — o que cada acesso de cliente pode abrir.
 *
 * As chaves levam o prefixo `portal.` de propósito: portal e admin dividem a
 * mesma matriz (`User.permissionsMatrix`), e sem o prefixo um "financeiro"
 * liberado no portal viraria o Faturamento interno caso o mesmo login fosse
 * promovido a colaborador. O sufixo é o segmento da URL (`/portal/seo` →
 * `portal.seo`), o que mantém rota e permissão sempre em sincronia.
 */
export const PORTAL_MODULES = {
  "portal.visao": "Visão geral",
  "portal.crm": "Meu CRM",
  "portal.resultados": "Resultados",
  "portal.google-ads": "Google Ads",
  "portal.meta-ads": "Meta Ads",
  "portal.instagram": "Instagram",
  "portal.seo": "SEO",
  "portal.financeiro": "Financeiro",
  "portal.documentos": "Documentos",
  "portal.calendario": "Calendário",
  "portal.dados": "Dados do Cliente",
  "portal.treinamentos": "Treinamentos",
  "portal.chamados": "Chamados",
} as const;

export type PortalModuleKey = keyof typeof PORTAL_MODULES;

export const PORTAL_MODULE_KEYS = Object.keys(PORTAL_MODULES) as PortalModuleKey[];

/** Segmento da URL do portal → chave da área (`""` é a visão geral). */
export function portalModuleOf(segment: string): PortalModuleKey | undefined {
  const key = `portal.${segment || "visao"}`;
  return key in PORTAL_MODULES ? (key as PortalModuleKey) : undefined;
}

/** Chave da área → rota do portal. */
export function portalHref(key: PortalModuleKey): string {
  return key === "portal.visao" ? "/portal" : `/portal/${key.slice("portal.".length)}`;
}

/**
 * Áreas liberadas para um acesso de cliente.
 *
 * Sem nenhuma marcação vale o portal inteiro — era assim antes de existirem
 * permissões de cliente, então ninguém perde acesso ao ligar o recurso. A
 * restrição só começa quando o admin marca a primeira área.
 */
export function allowedPortalModules(session: SessionPayload | null): PortalModuleKey[] {
  if (!session) return [];
  const marcadas = PORTAL_MODULE_KEYS.filter((k) => session.perms?.[k]?.includes("v"));
  return marcadas.length > 0 ? marcadas : PORTAL_MODULE_KEYS;
}

export function canAccessPortal(session: SessionPayload | null, key: PortalModuleKey): boolean {
  return allowedPortalModules(session).includes(key);
}

/**
 * Agrupamento visual do menu lateral — cada grupo vira uma seção suspensa
 * (colapsável) para reduzir a poluição visual. Módulos sem grupo (ex.:
 * dashboard) ficam soltos, sempre visíveis no topo.
 */
export const MODULE_NAV_GROUP: Record<ModuleKey, string | undefined> = {
  dashboard: undefined,
  agenda: undefined,
  crm: "Comercial",
  "crm-clientes": "Comercial",
  prospeccao: "Comercial",
  clientes: "Comercial",
  campanhas: "Comercial",
  servicos: "Operação",
  contratos: "Operação",
  projetos: "Operação",
  tarefas: "Operação",
  financeiro: "Financeiro",
  comissoes: "Financeiro",
  custos: "Financeiro",
  treinamentos: "Equipe",
  equipe: "Equipe",
  ia: "Sistema",
  relatorios: "Sistema",
  chamados: "Sistema",
  automacoes: "Sistema",
  integracoes: "Sistema",
  auditoria: "Sistema",
};

/** Permissões padrão por papel — o admin pode sobrescrever por usuário. */
export const ROLE_DEFAULTS: Record<string, ModuleKey[]> = {
  ADMIN: Object.keys(MODULES) as ModuleKey[],
  FINANCEIRO: ["dashboard", "agenda", "financeiro", "comissoes", "custos", "contratos", "relatorios", "clientes"],
  COMERCIAL: ["dashboard", "agenda", "crm", "prospeccao", "clientes", "relatorios"],
  GESTOR: ["dashboard", "agenda", "crm", "crm-clientes", "clientes", "projetos", "tarefas", "campanhas", "ia", "relatorios", "chamados"],
  SOCIAL_MEDIA: ["dashboard", "agenda", "tarefas", "projetos", "campanhas"],
  DESIGNER: ["dashboard", "agenda", "tarefas", "projetos"],
  TRAFEGO_PAGO: ["dashboard", "agenda", "campanhas", "tarefas", "relatorios"],
  CONSULTOR: ["dashboard", "agenda", "clientes", "projetos", "tarefas", "chamados"],
};

export type PermLevel = "view" | "edit" | "delete";
/** Matriz granular por módulo: flags "ved" (v=ver, e=editar, d=excluir). */
export type PermMatrix = Record<string, string>;

const LEVEL_FLAG: Record<PermLevel, string> = { view: "v", edit: "e", delete: "d" };

export function allowedModules(session: SessionPayload): ModuleKey[] {
  if (session.role === "ADMIN") return Object.keys(MODULES) as ModuleKey[];
  // Matriz granular por usuário tem precedência
  if (session.perms && Object.keys(session.perms).length > 0) {
    return (Object.keys(MODULES) as ModuleKey[]).filter((k) => session.perms![k]?.includes("v"));
  }
  if (session.permissions?.length) return session.permissions as ModuleKey[];
  return ROLE_DEFAULTS[session.role] ?? ["dashboard"];
}

/**
 * Verificação granular: o usuário pode {ver|editar|excluir} neste módulo?
 * ADMIN sempre pode tudo. Com matriz definida, ela manda. Sem matriz,
 * os padrões do papel dão ver+editar; excluir fica restrito a ADMIN.
 */
export function can(session: SessionPayload | null, module: ModuleKey, level: PermLevel = "view"): boolean {
  if (!session || session.role === "CLIENTE") return false;
  if (session.role === "ADMIN") return true;
  if (session.perms && Object.keys(session.perms).length > 0) {
    return session.perms[module]?.includes(LEVEL_FLAG[level]) ?? false;
  }
  const modules = session.permissions?.length
    ? (session.permissions as ModuleKey[])
    : ROLE_DEFAULTS[session.role] ?? ["dashboard"];
  if (!modules.includes(module)) return false;
  return level !== "delete"; // sem matriz: ver e editar sim, excluir não
}

export function canAccess(session: SessionPayload | null, module: ModuleKey): boolean {
  return can(session, module, "view");
}

export function isStaff(session: SessionPayload | null): boolean {
  return !!session && session.role !== "CLIENTE";
}

export function isClient(session: SessionPayload | null): boolean {
  return !!session && session.role === "CLIENTE" && !!session.clientId;
}
