import Link from "next/link";
import { Bell } from "lucide-react";
import { FgMark, FgWordmark } from "@/components/brand/logo";
import type { SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NavItem } from "./nav";
import { FxLayer } from "./fx";
import { GlobalSearch } from "./global-search";
import { SidebarDrawer } from "./sidebar-drawer";

/** Shell compartilhado entre área administrativa e portal do cliente. */
export async function AppShell({
  session,
  items,
  areaLabel,
  children,
}: {
  session: SessionPayload;
  items: NavItem[];
  areaLabel: string;
  children: React.ReactNode;
}) {
  const [unread, me] = await Promise.all([
    prisma.notification.count({ where: { userId: session.sub, read: false } }),
    prisma.user.findUnique({ where: { id: session.sub }, select: { avatarUrl: true, name: true } }),
  ]);
  const profileHref = session.role === "CLIENTE" ? "/portal/perfil" : "/admin/perfil";
  const displayName = me?.name ?? session.name;

  return (
    <div className="relative flex min-h-screen">
      <FxLayer />
      {/* Main — o menu fica recolhido em gaveta (SidebarDrawer), sem ocupar espaço fixo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-ink-950/70 px-4 py-3 backdrop-blur sm:px-6">
          <SidebarDrawer
            items={items}
            areaLabel={areaLabel}
            profileHref={profileHref}
            name={displayName}
            role={session.role}
            avatarUrl={me?.avatarUrl ?? null}
          />
          <Link href={profileHref === "/portal/perfil" ? "/portal" : "/admin"} className="hidden shrink-0 items-center gap-2 sm:flex">
            <FgMark size={26} />
            <span className="text-sm"><FgWordmark /></span>
          </Link>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={session.role === "CLIENTE" ? "/portal/notificacoes" : "/admin/notificacoes"}
              className="relative rounded-xl border border-line p-2.5 text-slate-400 transition hover:bg-ink-800 hover:text-slate-200"
            >
              <Bell size={16} />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-ink-950">
                  {unread}
                </span>
              )}
            </Link>
          </div>
        </header>
        <main className="animate-page mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
