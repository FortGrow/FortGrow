import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { TrainingHero, TrainingShelf, type TrainingDTO } from "@/components/trainings/training-shelf";
import { toEmbedUrl, autoThumbnail } from "@/lib/video";

export const dynamic = "force-dynamic";

export default async function PortalTreinamentosPage() {
  const trainings = await prisma.training.findMany({
    where: { active: true },
    orderBy: { publishedAt: "desc" },
  });

  const dto: TrainingDTO[] = trainings.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    embedUrl: toEmbedUrl(t.videoUrl),
    thumbnailUrl: t.thumbnailUrl ?? autoThumbnail(t.videoUrl),
    duration: t.duration,
    publishedAt: t.publishedAt.toISOString(),
  }));

  const categories = [...new Set(dto.map((t) => t.category))];
  const hero = dto[0];

  return (
    <>
      <PageHeader title="Treinamentos" subtitle="Conteúdos exclusivos da FortGrow para acelerar o seu negócio" />

      {dto.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          Os treinamentos da FortGrow aparecerão aqui em breve. Fique de olho!
        </div>
      ) : (
        <>
          <TrainingHero t={hero} />
          {categories.map((cat) => (
            <TrainingShelf key={cat} category={cat} items={dto.filter((t) => t.category === cat)} />
          ))}
        </>
      )}
    </>
  );
}
