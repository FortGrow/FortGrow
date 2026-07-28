import Link from "next/link";
import { Bell } from "lucide-react";
import { FgMark, FgWordmark } from "@/components/brand/logo";
import type { SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NavItem } from "./nav";
import { FxLayer } from "./fx";
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
        {/* Mesma barra azul da página inicial: quem entra no sistema reconhece
            a marca de imediato, sem a troca brusca de site escuro → app escuro. */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-[#1b5fd0] via-[#2d7ef2] to-[#1b5fd0] px-4 py-3 shadow-[0_6px_24px_-12px_rgba(0,0,0,0.6)] sm:px-6">
          <SidebarDrawer
            items={items}
            areaLabel={areaLabel}
            profileHref={profileHref}
            name={displayName}
            role={session.role}
            avatarUrl={me?.avatarUrl ?? null}
          />
          <Link href={profileHref === "/portal/perfil" ? "/portal" : "/admin"} className="hidden shrink-0 items-center gap-2 sm:flex">
            {/* monograma em branco: o azul original sumiria sobre a barra azul */}
            <FgMark size={26} className="brightness-0 invert drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]" />
            <span className="text-sm"><FgWordmark light /></span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={session.role === "CLIENTE" ? "/portal/notificacoes" : "/admin/notificacoes"}
              className="relative rounded-xl border border-white/30 p-2.5 text-white/90 transition hover:border-white/50 hover:bg-white/15 hover:text-white"
            >
              <Bell size={16} />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[#1b5fd0]">
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
