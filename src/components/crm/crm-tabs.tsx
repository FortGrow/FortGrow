"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, KanbanSquare, LayoutDashboard, Settings2, Users2, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadBar } from "@/components/ui/load-bar";

/**
 * Navegação interna do CRM.
 *
 * Fica dentro da área em vez de virar seis itens no menu lateral: o CRM é
 * um produto dentro do Portal, e espalhá-lo pelo menu principal afogaria
 * as outras áreas do cliente.
 */
const ABAS = [
  { slug: "", label: "Painel", icon: LayoutDashboard },
  { slug: "funil", label: "Funil", icon: KanbanSquare },
  { slug: "leads", label: "Leads", icon: List },
  { slug: "agenda", label: "Agenda", icon: CalendarDays },
  { slug: "equipe", label: "Equipe", icon: Users2 },
  { slug: "config", label: "Configurações", icon: Settings2 },
];

export function CrmTabs({ basePath }: { basePath: string }) {
  const pathname = usePathname();

  return (
    <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
      {ABAS.map(({ slug, label, icon: Icon }) => {
        const href = slug ? `${basePath}/${slug}` : basePath;
        // "Leads" continua ativo na ficha de um lead (/leads/<id>)
        const ativo = slug ? pathname.startsWith(href) : pathname === basePath;
        return (
          <Link
            key={slug}
            href={href}
            className={cn(
              "group relative inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
              ativo
                ? "border-brand-500/40 bg-brand-500/15 text-brand-300"
                : "border-line text-slate-400 hover:border-line-strong hover:text-slate-200"
            )}
          >
            <Icon size={13} /> {label}
            {!ativo && <LoadBar tone="brand" className="inset-x-3 bottom-[3px]" />}
          </Link>
        );
      })}
    </div>
  );
}
