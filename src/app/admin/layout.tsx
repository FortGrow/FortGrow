import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { verifyLiveSession } from "@/lib/api-guard";
import { allowedModules, MODULES, MODULE_NAV_GROUP } from "@/lib/rbac";
import { AppShell } from "@/components/layout/shell";
import type { NavItem } from "@/components/layout/nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const raw = await getSession();
  const session = raw ? await verifyLiveSession(raw) : null;
  // Sessão revogada com cookie ainda no navegador → login com limpeza de cookie (evita loop)
  if (!session) redirect(raw ? "/login?expirada=1" : "/login");
  if (session.role === "CLIENTE") redirect("/portal");

  const modules = allowedModules(session);
  const items: NavItem[] = modules.map((key) => ({
    href: key === "dashboard" ? "/admin" : `/admin/${key}`,
    label: MODULES[key],
    icon: key,
    group: MODULE_NAV_GROUP[key],
  }));

  return (
    <AppShell session={session} items={items} areaLabel="Área administrativa">
      {children}
    </AppShell>
  );
}
