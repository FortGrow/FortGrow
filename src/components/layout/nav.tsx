"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  type LucideIcon,
  BarChart3,
  Brain,
  ChevronDown,
  GraduationCap,
  HandCoins,
  Receipt,
  Briefcase,
  Building2,
  CalendarCheck2,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Headphones,
  KanbanSquare,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  PlugZap,
  ScrollText,
  Search,
  Settings2,
  Sparkles,
  Target,
  Users,
  Wallet,
  FolderOpen,
  Instagram,
  LineChart,
  TrendingUp,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  agenda: CalendarDays,
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
  auditoria: ScrollText,
  // portal
  visao: LayoutDashboard,
  resultados: TrendingUp,
  performance: LineChart,
  calendario: CalendarCheck2,
  "google-ads": Target,
  "meta-ads": Megaphone,
  instagram: Instagram,
  seo: Search,
  portalfinanceiro: CircleDollarSign,
  documentos: FolderOpen,
  portalchamados: LifeBuoy,
  dados: Building2,
  config: Settings2,
};

export type NavItem = { href: string; label: string; icon: string; group?: string };

/** Itens do menu com preview flutuante ao passar o mouse. */
const PREVIEWABLE: Record<string, string> = { clientes: "clientes", prospeccao: "prospeccao", tarefas: "tarefas" };

type PreviewData = {
  title: string;
  stats: { label: string; value: string }[];
  rows: { label: string; badge: string }[];
  footer: string;
};

/** É a rota ativa? Dashboard/Visão geral exigem match exato; o resto, prefixo. */
function isActiveHref(pathname: string, href: string) {
  return href === "/admin" || href === "/portal" ? pathname === href : pathname.startsWith(href);
}

/** Agrupa itens soltos (sem `group`) e em seções, preservando a ordem de chegada. */
function groupItems(items: NavItem[]) {
  const buckets: { group?: string; items: NavItem[] }[] = [];
  for (const item of items) {
    if (!item.group) {
      buckets.push({ items: [item] });
      continue;
    }
    let bucket = buckets.find((b) => b.group === item.group);
    if (!bucket) {
      bucket = { group: item.group, items: [] };
      buckets.push(bucket);
    }
    bucket.items.push(item);
  }
  return buckets;
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [preview, setPreview] = useState<{ key: string; top: number; data: PreviewData } | null>(null);
  const cache = useRef<Map<string, PreviewData>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Seções suspensas: abre por padrão só o grupo da página atual, mantendo o menu enxuto
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = items.find((item) => isActiveHref(pathname, item.href));
    return new Set(active?.group ? [active.group] : []);
  });

  function toggleGroup(group: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  function enter(key: string, el: HTMLElement) {
    if (!PREVIEWABLE[key]) return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    const top = el.getBoundingClientRect().top;
    if (timer.current) clearTimeout(timer.current);
    // delay leve — antecipação sem agressividade
    timer.current = setTimeout(async () => {
      let data = cache.current.get(key);
      if (!data) {
        const res = await fetch(`/api/nav-preview?m=${key}`).catch(() => null);
        if (!res?.ok) return;
        data = (await res.json()) as PreviewData;
        cache.current.set(key, data);
      }
      setPreview({ key, top, data });
    }, 280);
  }

  function leave() {
    if (timer.current) clearTimeout(timer.current);
    setPreview(null);
  }

  function renderLink(item: NavItem) {
    const Icon = ICONS[item.icon] ?? LayoutDashboard;
    const active = isActiveHref(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onMouseEnter={(e) => enter(item.icon, e.currentTarget)}
        onMouseLeave={() => timer.current && clearTimeout(timer.current)}
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
  }

  return (
    <nav className="relative flex-1 space-y-0.5 overflow-y-auto px-3 py-4" onMouseLeave={leave}>
      {groupItems(items).map((bucket, i) => {
        if (!bucket.group) return renderLink(bucket.items[0]);

        const open = openGroups.has(bucket.group);
        const hasActive = bucket.items.some((it) => isActiveHref(pathname, it.href));
        return (
          <div key={bucket.group ?? i} className="pt-1 first:pt-0">
            <button
              type="button"
              onClick={() => toggleGroup(bucket.group!)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition",
                hasActive ? "text-slate-400" : "text-slate-600 hover:text-slate-400"
              )}
            >
              {bucket.group}
              <ChevronDown size={13} className={cn("transition-transform", open ? "rotate-180" : "")} />
            </button>
            {open && <div className="space-y-0.5">{bucket.items.map(renderLink)}</div>}
          </div>
        );
      })}

      {preview && (
        <div
          className="nav-preview fixed left-[296px] z-50 hidden w-60 rounded-2xl border border-line-strong bg-ink-900/95 p-4 shadow-2xl ring-1 ring-brand-500/10 backdrop-blur-md lg:block"
          style={{ top: Math.min(preview.top, typeof window !== "undefined" ? window.innerHeight - 240 : preview.top) }}
          onMouseLeave={leave}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{preview.data.title}</p>
          <div className="mt-2 flex gap-4">
            {preview.data.stats.map((s) => (
              <div key={s.label}>
                <p className="text-lg font-bold text-brand-300">{s.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1.5 border-t border-line/60 pt-2.5">
            {preview.data.rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-slate-300">{r.label}</span>
                <span className="shrink-0 rounded-full bg-ink-700 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                  {r.badge}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-600">{preview.data.footer}</p>
        </div>
      )}
    </nav>
  );
}
