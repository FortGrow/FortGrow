import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, Sparkles, Target } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  PLANEJADO: "brand",
  APROVADO: "warn",
  PUBLICADO: "grow",
};

export default async function CalendarioPage() {
  const session = (await getSession())!;
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [posts, plannings, planos] = await Promise.all([
    prisma.contentPost.findMany({
      where: { clientId: session.clientId!, date: { gte: since } },
      orderBy: { date: "asc" },
    }),
    prisma.document.findMany({
      where: { clientId: session.clientId!, type: "PLANEJAMENTO" },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    // Planejamentos lidos do PDF e publicados pela equipe. Rascunho não entra:
    // o cliente só vê o que já passou pela revisão.
    prisma.projectPlan.findMany({
      where: { clientId: session.clientId!, status: "PUBLICADO" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { id: true, fileName: true, fileUrl: true, parsed: true, publishedAt: true },
    }),
  ]);

  type Lido = {
    objetivos?: string[];
    conteudos?: { titulo: string; descricao?: string }[];
    roteiros?: { titulo: string; texto: string }[];
    resumo?: string;
  };

  // Agrupa por mês
  const byMonth = new Map<string, typeof posts>();
  for (const p of posts) {
    const key = p.date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    byMonth.set(key, [...(byMonth.get(key) ?? []), p]);
  }

  return (
    <>
      <PageHeader
        title="Calendário de postagens"
        subtitle="Planejamento de conteúdo da sua conta: datas, roteiros e métricas esperadas"
      />

      {/* Planejamento lido do PDF: objetivos, conteúdos e roteiros */}
      {planos.map((plano) => {
        const c = (plano.parsed as Lido) ?? {};
        if (!c.objetivos?.length && !c.conteudos?.length && !c.roteiros?.length) return null;
        return (
          <div key={plano.id} className="card mb-6 p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <Sparkles size={15} className="text-brand-400" /> Seu planejamento
                </h2>
                {c.resumo && <p className="mt-1 max-w-2xl text-sm text-slate-400">{c.resumo}</p>}
              </div>
              <a
                href={plano.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-brand-300 hover:underline"
              >
                <FileText size={13} /> Abrir PDF completo
              </a>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {!!c.objetivos?.length && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <Target size={12} /> Objetivos
                  </h3>
                  <ul className="space-y-1.5">
                    {c.objetivos.map((o, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-300">
                        <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-grow-400" />
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!!c.conteudos?.length && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <FileText size={12} /> Conteúdos e temas
                  </h3>
                  <ul className="space-y-2">
                    {c.conteudos.map((x, i) => (
                      <li key={i}>
                        <p className="text-sm font-medium text-slate-200">{x.titulo}</p>
                        {x.descricao && <p className="text-xs text-slate-500">{x.descricao}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {!!c.roteiros?.length && (
              <div className="mt-5 border-t border-line/60 pt-4">
                <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Sparkles size={12} /> Roteiros
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {c.roteiros.map((r, i) => (
                    <details key={i} className="rounded-xl border border-line bg-ink-850 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-slate-200">{r.titulo}</summary>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{r.texto}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {plannings.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-bold text-slate-300">Planejamentos (PDF)</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plannings.map((d) => (
              <a
                key={d.id}
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="card flex items-center gap-3 p-4 transition hover:border-line-strong"
              >
                <span className="rounded-xl bg-brand-500/10 p-2.5 text-brand-400">
                  <FileText size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-200">{d.name}</p>
                  <p className="text-xs text-slate-500">{d.createdAt.toLocaleDateString("pt-BR")}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {posts.length === 0 && plannings.length === 0 && planos.length === 0 && (
        <div className="card p-10 text-center text-sm text-slate-500">
          O planejamento de conteúdo da sua conta aparecerá aqui assim que for publicado pela equipe FortGrow.
        </div>
      )}

      {[...byMonth.entries()].map(([month, monthPosts]) => (
        <div key={month} className="mb-6">
          <h2 className="mb-3 text-sm font-bold capitalize text-slate-300">{month}</h2>
          <div className="space-y-3">
            {monthPosts.map((p) => {
              const isPast = p.date < new Date();
              return (
                <div key={p.id} className="card flex flex-wrap items-start gap-4 p-5">
                  <div className="w-16 shrink-0 rounded-xl bg-ink-900 py-2 text-center">
                    <p className="text-xl font-bold text-slate-100">{p.date.getDate()}</p>
                    <p className="text-[11px] uppercase text-slate-500">
                      {p.date.toLocaleDateString("pt-BR", { weekday: "short" })}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-100">{p.title}</p>
                      {p.format && <Badge tone="violet">{p.format}</Badge>}
                      <Badge tone={STATUS_TONE[p.status] ?? "slate"}>{p.status}</Badge>
                      {isPast && p.status !== "PUBLICADO" && <Badge tone="slate">passado</Badge>}
                    </div>
                    {p.script && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-400">{p.script}</p>
                    )}
                    {p.expectedMetrics && (
                      <p className="mt-2 rounded-lg bg-grow-500/10 px-3 py-1.5 text-xs font-medium text-grow-400 ring-1 ring-inset ring-grow-500/20">
                        Métricas esperadas: {p.expectedMetrics}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
