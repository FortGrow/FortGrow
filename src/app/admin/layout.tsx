import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { allowedModules, MODULES } from "@/lib/rbac";
import { AppShell } from "@/components/layout/shell";
import type { NavItem } from "@/components/layout/nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENTE") redirect("/portal");

  const modules = allowedModules(session);
  const items: NavItem[] = modules.map((key) => ({
    href: key === "dashboard" ? "/admin" : `/admin/${key}`,
    label: MODULES[key],
    icon: key,
  }));

  return (
    <AppShell session={session} items={items} areaLabel="Área administrativa">
      {children}
    </AppShell>
  );
}
