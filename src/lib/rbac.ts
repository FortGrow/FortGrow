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
  FINANCEIRO: ["dashboard", "financeiro", "contratos", "relatorios", "clientes"],
  COMERCIAL: ["dashboard", "crm", "prospeccao", "clientes", "relatorios"],
  GESTOR: ["dashboard", "crm", "clientes", "projetos", "tarefas", "campanhas", "ia", "relatorios", "chamados"],
  SOCIAL_MEDIA: ["dashboard", "tarefas", "projetos", "campanhas"],
  DESIGNER: ["dashboard", "tarefas", "projetos"],
  TRAFEGO_PAGO: ["dashboard", "campanhas", "tarefas", "relatorios"],
  CONSULTOR: ["dashboard", "clientes", "projetos", "tarefas", "chamados"],
};

export function allowedModules(session: SessionPayload): ModuleKey[] {
  if (session.role === "ADMIN") return Object.keys(MODULES) as ModuleKey[];
  if (session.permissions?.length) return session.permissions as ModuleKey[];
  return ROLE_DEFAULTS[session.role] ?? ["dashboard"];
}

export function canAccess(session: SessionPayload | null, module: ModuleKey): boolean {
  if (!session) return false;
  if (session.role === "CLIENTE") return false;
  return allowedModules(session).includes(module);
}

export function isStaff(session: SessionPayload | null): boolean {
  return !!session && session.role !== "CLIENTE";
}

export function isClient(session: SessionPayload | null): boolean {
  return !!session && session.role === "CLIENTE" && !!session.clientId;
}
