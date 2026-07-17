"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { FgMark, FgWordmark } from "@/components/brand/logo";
import { NavLinks, type NavItem } from "./nav";
import { initials } from "@/lib/utils";

/* eslint-disable @next/next/no-img-element */
/** Menu de navegação mobile — hambúrguer com gaveta lateral. */
export function MobileMenu({
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
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className="rounded-xl border border-line p-2.5 text-slate-400 transition hover:bg-ink-800 hover:text-slate-200"
      >
        <Menu size={16} />
      </button>

      {/* Portal no body: o backdrop-blur do header criaria um containing block e prenderia o fixed */}
      {open && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex">
          <div className="flex w-72 max-w-[85vw] flex-col border-r border-line bg-ink-900">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-2.5">
                <FgMark size={34} />
                <div>
                  <p className="text-sm">
                    <FgWordmark /> <span className="font-semibold text-slate-400">CRM</span>
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
                <form action="/api/auth/logout" method="POST">
                  <button title="Sair" className="rounded-lg p-1.5 text-slate-500 transition hover:bg-ink-700 hover:text-danger">
                    <LogOut size={15} />
                  </button>
                </form>
              </div>
            </div>
          </div>
          <button aria-label="Fechar menu" onClick={() => setOpen(false)} className="flex-1 bg-ink-950/70 backdrop-blur-sm" />
        </div>,
        document.body
      )}
    </div>
  );
}
