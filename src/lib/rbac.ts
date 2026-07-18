import type { SessionPayload } from "./auth";

/** Chaves de módulo da área administrativa. */
export const MODULES = {
  dashboard: "Dashboard",
  crm: "CRM Comercial",
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
} as const;

export type ModuleKey = keyof typeof MODULES;

/** Permissões padrão por papel — o admin pode sobrescrever por usuário. */
export const ROLE_DEFAULTS: Record<string, ModuleKey[]> = {
  ADMIN: Object.keys(MODULES) as ModuleKey[],
  FINANCEIRO: ["dashboard", "financeiro", "comissoes", "custos", "contratos", "relatorios", "clientes"],
  COMERCIAL: ["dashboard", "crm", "prospeccao", "clientes", "relatorios"],
  GESTOR: ["dashboard", "crm", "clientes", "projetos", "tarefas", "campanhas", "ia", "relatorios", "chamados"],
  SOCIAL_MEDIA: ["dashboard", "tarefas", "projetos", "campanhas"],
  DESIGNER: ["dashboard", "tarefas", "projetos"],
  TRAFEGO_PAGO: ["dashboard", "campanhas", "tarefas", "relatorios"],
  CONSULTOR: ["dashboard", "clientes", "projetos", "tarefas", "chamados"],
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
