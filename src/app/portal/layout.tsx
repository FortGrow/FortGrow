import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/shell";
import type { NavItem } from "@/components/layout/nav";

export const dynamic = "force-dynamic";

const ITEMS: NavItem[] = [
  { href: "/portal", label: "Visão geral", icon: "visao" },
  { href: "/portal/resultados", label: "Resultados", icon: "resultados" },
  { href: "/portal/calendario", label: "Calendário", icon: "calendario" },
  { href: "/portal/google-ads", label: "Google Ads", icon: "google-ads" },
  { href: "/portal/meta-ads", label: "Meta Ads", icon: "meta-ads" },
  { href: "/portal/instagram", label: "Instagram", icon: "instagram" },
  { href: "/portal/seo", label: "SEO", icon: "seo" },
  { href: "/portal/financeiro", label: "Financeiro", icon: "portalfinanceiro" },
  { href: "/portal/documentos", label: "Documentos", icon: "documentos" },
  { href: "/portal/treinamentos", label: "Treinamentos", icon: "treinamentos" },
  { href: "/portal/chamados", label: "Chamados", icon: "portalchamados" },
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

  return (
    <AppShell session={session} items={ITEMS} areaLabel="Portal do Cliente">
      {children}
    </AppShell>
  );
}
