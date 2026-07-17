import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

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

  const [posts, plannings] = await Promise.all([
    prisma.contentPost.findMany({
      where: { clientId: session.clientId!, date: { gte: since } },
      orderBy: { date: "asc" },
    }),
    prisma.document.findMany({
      where: { clientId: session.clientId!, type: "PLANEJAMENTO" },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

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

      {posts.length === 0 && plannings.length === 0 && (
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
