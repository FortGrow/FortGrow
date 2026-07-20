"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LogoutButton } from "./logout-button";
import { FgMark, FgWordmark } from "@/components/brand/logo";
import { NavLinks, type NavItem } from "./nav";
import { cn, initials } from "@/lib/utils";

/* eslint-disable @next/next/no-img-element */
/**
 * Menu de navegação em gaveta — recolhido por padrão em qualquer tamanho de
 * tela; abre deslizando da esquerda só quando o usuário clica no hambúrguer,
 * para não ocupar espaço fixo na lateral.
 */
export function SidebarDrawer({
  items,
  areaLabel,
  profileHref,
  name,
  role,
  avatarUrl,
}: {
  items: NavItem[];
  areaLabel: string;
  profileHref: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // Fecha a gaveta ao navegar
  useEffect(() => setOpen(false), [pathname]);

  // Trava o scroll do body com a gaveta aberta
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        title="Menu"
        className="rounded-xl border border-line p-2.5 text-slate-400 transition hover:bg-ink-800 hover:text-slate-200"
      >
        <Menu size={16} />
      </button>

      {/* Portal no body: o backdrop-blur do header criaria um containing block e prenderia o fixed.
          Sempre montado (quando client-side) para a gaveta deslizar suavemente ao abrir/fechar. */}
      {mounted && createPortal(
        <div className={cn("fixed inset-0 z-50 flex", !open && "pointer-events-none")} aria-hidden={!open}>
          <div
            className={cn(
              "flex w-72 max-w-[85vw] flex-col border-r border-line bg-ink-900 shadow-2xl transition-transform duration-300 ease-out",
              open ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-2.5">
                <FgMark size={34} />
                <div>
                  <p className="text-sm">
                    <FgWordmark />
                  </p>
                  <p className="text-[11px] text-slate-500">{areaLabel}</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-ink-800 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <NavLinks items={items} />

            <div className="border-t border-line p-3">
              <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                <Link href={profileHref} className="flex min-w-0 flex-1 items-center gap-3">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-line" />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-700 text-xs font-bold text-brand-300">
                      {initials(name)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">{name}</p>
                    <p className="truncate text-[11px] text-slate-500">{role.replaceAll("_", " ")} · editar perfil</p>
                  </div>
                </Link>
                <LogoutButton />
              </div>
            </div>
          </div>
          <button
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className={cn(
              "flex-1 bg-ink-950/70 backdrop-blur-sm transition-opacity duration-300",
              open ? "opacity-100" : "opacity-0"
            )}
          />
        </div>,
        document.body
      )}
    </>
  );
}
