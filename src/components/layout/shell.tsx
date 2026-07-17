import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { FgMark, FgWordmark } from "@/components/brand/logo";
import type { SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initials } from "@/lib/utils";
import { NavLinks, type NavItem } from "./nav";
import { GlobalSearch } from "./global-search";
import { MobileMenu } from "./mobile-menu";

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
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-ink-900/80 backdrop-blur lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <FgMark size={38} />
          <div>
            <p className="text-sm">
              <FgWordmark /> <span className="font-semibold text-slate-400">CRM</span>
            </p>
            <p className="text-[11px] text-slate-500">{areaLabel}</p>
          </div>
        </div>
        <NavLinks items={items} />
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Link href={profileHref} title="Meu perfil" className="flex min-w-0 flex-1 items-center gap-3 transition hover:opacity-80">
              {me?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-line" />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-700 text-xs font-bold text-brand-300">
                  {initials(displayName)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-200">{displayName}</p>
                <p className="truncate text-[11px] text-slate-500">{session.role.replaceAll("_", " ")} · editar perfil</p>
              </div>
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button title="Sair" className="rounded-lg p-1.5 text-slate-500 transition hover:bg-ink-700 hover:text-danger">
                <LogOut size={15} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-ink-950/70 px-4 py-3 backdrop-blur sm:px-6">
          <MobileMenu
            items={items}
            areaLabel={areaLabel}
            profileHref={profileHref}
            name={displayName}
            role={session.role}
            avatarUrl={me?.avatarUrl ?? null}
          />
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
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
