"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  type LucideIcon,
  BarChart3,
  Brain,
  GraduationCap,
  HandCoins,
  Receipt,
  Briefcase,
  Building2,
  CalendarCheck2,
  CircleDollarSign,
  FileText,
  Headphones,
  KanbanSquare,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  PlugZap,
  Search,
  Settings2,
  Sparkles,
  Target,
  Users,
  Wallet,
  FolderOpen,
  Instagram,
  TrendingUp,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  crm: KanbanSquare,
  prospeccao: Search,
  clientes: Building2,
  servicos: Briefcase,
  contratos: FileText,
  projetos: Target,
  tarefas: CalendarCheck2,
  campanhas: Megaphone,
  ia: Brain,
  financeiro: Wallet,
  comissoes: HandCoins,
  custos: Receipt,
  treinamentos: GraduationCap,
  relatorios: BarChart3,
  chamados: Headphones,
  automacoes: Sparkles,
  integracoes: PlugZap,
  equipe: Users,
  // portal
  visao: LayoutDashboard,
  resultados: TrendingUp,
  calendario: CalendarCheck2,
  "google-ads": Target,
  "meta-ads": Megaphone,
  instagram: Instagram,
  seo: Search,
  portalfinanceiro: CircleDollarSign,
  documentos: FolderOpen,
  portalchamados: LifeBuoy,
  config: Settings2,
};

export type NavItem = { href: string; label: string; icon: string };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active =
          item.href === "/admin" || item.href === "/portal"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-brand-500/10 text-brand-300 ring-1 ring-inset ring-brand-500/20"
                : "text-slate-400 hover:bg-ink-800 hover:text-slate-200"
            )}
          >
            <Icon size={17} className={cn(active ? "text-brand-400" : "text-slate-500 group-hover:text-slate-300")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
