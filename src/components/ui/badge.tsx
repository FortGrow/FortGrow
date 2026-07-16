import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  slate: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
  brand: "bg-brand-500/10 text-brand-400 ring-brand-500/20",
  grow: "bg-grow-500/10 text-grow-400 ring-grow-500/20",
  warn: "bg-warn/10 text-warn ring-warn/20",
  danger: "bg-danger/10 text-danger ring-danger/20",
  violet: "bg-violet/10 text-violet ring-violet/20",
};

/** Mapeia status do domínio para uma cor. */
export function toneFor(status: string): string {
  const s = status.toUpperCase();
  if (["ATIVO", "PAGO", "FECHADO", "CONCLUIDO", "CONCLUIDA", "ACEITA", "RESOLVIDO", "ALTA_PERFORMANCE"].includes(s)) return "grow";
  if (["EM_ABERTO", "EM_ANDAMENTO", "EM_ATENDIMENTO", "ABERTO", "ABERTA", "ONBOARDING", "ENVIADA", "EM_REVISAO", "REVISAO"].includes(s)) return "brand";
  if (["ATRASADO", "ATRASADA", "PERDIDO", "CANCELADO", "INATIVO", "RECUSADA", "URGENTE"].includes(s)) return "danger";
  if (["PAUSADO", "RENOVACAO", "AGUARDANDO_CLIENTE", "ALTA", "A_FAZER", "BACKLOG"].includes(s)) return "warn";
  return "slate";
}

export function Badge({ children, tone = "slate", className }: { children: React.ReactNode; tone?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        TONES[tone] ?? TONES.slate,
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={toneFor(status)}>{status.replaceAll("_", " ")}</Badge>;
}
