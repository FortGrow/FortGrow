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
  { href: "/portal/chamados", label: "Chamados", icon: "portalchamados" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENTE" || !session.clientId) redirect("/admin");

  return (
    <AppShell session={session} items={ITEMS} areaLabel="Portal do Cliente">
      {children}
    </AppShell>
  );
}
