import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/shell";
import type { NavItem } from "@/components/layout/nav";
import { allowedPortalModules, type PortalModuleKey } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/** Cada item carrega a área que o libera — o menu é filtrado por ela. */
const ITEMS: (NavItem & { perm: PortalModuleKey })[] = [
  { perm: "portal.visao", href: "/portal", label: "Visão geral", icon: "visao" },
  { perm: "portal.resultados", href: "/portal/resultados", label: "Resultados", icon: "resultados", group: "Canais & Resultados" },
  { perm: "portal.google-ads", href: "/portal/google-ads", label: "Google Ads", icon: "google-ads", group: "Canais & Resultados" },
  { perm: "portal.meta-ads", href: "/portal/meta-ads", label: "Meta Ads", icon: "meta-ads", group: "Canais & Resultados" },
  { perm: "portal.instagram", href: "/portal/instagram", label: "Instagram", icon: "instagram", group: "Canais & Resultados" },
  { perm: "portal.seo", href: "/portal/seo", label: "SEO", icon: "seo", group: "Canais & Resultados" },
  { perm: "portal.financeiro", href: "/portal/financeiro", label: "Financeiro", icon: "portalfinanceiro", group: "Financeiro" },
  { perm: "portal.documentos", href: "/portal/documentos", label: "Documentos", icon: "documentos", group: "Financeiro" },
  { perm: "portal.calendario", href: "/portal/calendario", label: "Calendário", icon: "calendario", group: "Minha empresa" },
  { perm: "portal.dados", href: "/portal/dados", label: "Dados do Cliente", icon: "dados", group: "Minha empresa" },
  { perm: "portal.treinamentos", href: "/portal/treinamentos", label: "Treinamentos", icon: "treinamentos", group: "Minha empresa" },
  { perm: "portal.chamados", href: "/portal/chamados", label: "Chamados", icon: "portalchamados", group: "Minha empresa" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const raw = await getSession();
  const session = raw ? await (await import("@/lib/api-guard")).verifyLiveSession(raw) : null;
  // Sessão revogada com cookie ainda no navegador → login com limpeza de cookie (evita loop)
  if (!session) redirect(raw ? "/login?expirada=1" : "/login");
  if (session.role !== "CLIENTE") redirect("/admin");
  // Acesso de cliente sem empresa vinculada: conta mal configurada — não pode
  // cair na área administrativa nem entrar em loop; volta ao login limpando o cookie
  if (!session.clientId) redirect("/login?expirada=1");

  // Menu só com as áreas liberadas para este acesso (o middleware barra a URL direta)
  const liberadas = allowedPortalModules(session);
  const itens = ITEMS.filter((i) => liberadas.includes(i.perm));

  return (
    <AppShell session={session} items={itens} areaLabel="Portal do Cliente">
      {children}
    </AppShell>
  );
}
