"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Play, Plus, Trash2, X } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

export const TRAINING_CATEGORIES = [
  "Comercial", "Atendimento", "Prospecção", "Vendas", "Gestão", "Processos",
  "CRM", "Marketing", "Inteligência Artificial", "Liderança", "Financeiro",
];

export function NewTrainingForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description") || undefined,
          category: form.get("category"),
          videoUrl: form.get("videoUrl"),
          thumbnailUrl: form.get("thumbnailUrl") || undefined,
          duration: form.get("duration") || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível publicar.");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus size={15} /> Novo treinamento
      </button>
    );
  }

  return (
    <Overlay>
      <form onSubmit={onSubmit} className="card w-full max-w-lg animate-fade-up p-6">
        <h2 className="mb-1 text-lg font-bold text-slate-100">Publicar treinamento</h2>
        <p className="mb-4 text-sm text-slate-500">
          Cole o link do YouTube ou Vimeo — o vídeo aparece na aba Treinamentos do portal na hora, sem alterar código.
        </p>
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="tr-title">Título *</label>
            <input id="tr-title" name="title" required minLength={2} className="input" placeholder="Ex.: Como qualificar leads em 5 minutos" />
          </div>
          <div>
            <label className="label" htmlFor="tr-description">Descrição</label>
            <textarea id="tr-description" name="description" rows={2} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="tr-category">Categoria *</label>
              <select id="tr-category" name="category" required className="input">
                {TRAINING_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="tr-duration">Duração</label>
              <input id="tr-duration" name="duration" className="input" placeholder="12 min" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="tr-video">Link do vídeo (YouTube/Vimeo) *</label>
            <input id="tr-video" name="videoUrl" type="url" required className="input" placeholder="https://youtube.com/watch?v=..." />
          </div>
          <div>
            <label className="label" htmlFor="tr-thumb">Thumbnail (URL da imagem — opcional)</label>
            <input id="tr-thumb" name="thumbnailUrl" type="url" className="input" placeholder="deixe vazio para usar a capa do YouTube" />
          </div>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading && <Loader2 size={15} className="animate-spin" />} Publicar
          </button>
        </div>
      </form>
    </Overlay>
  );
}

/**
 * Pré-visualização no admin: clicar na capa abre o vídeo no player.
 * Os botões de editar/excluir ficam por cima (z-10) e não disparam o preview.
 */
export function PreviewTraining({
  embedUrl,
  title,
  children,
}: {
  embedUrl: string | null;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Assistir vídeo"
        className="absolute inset-0 block h-full w-full cursor-pointer text-left"
      >
        {children}
        <span className="absolute inset-0 flex items-center justify-center bg-ink-950/0 opacity-0 transition group-hover:bg-ink-950/40 group-hover:opacity-100">
          <span className="rounded-full bg-brand-500 p-3 text-ink-950 shadow-glow">
            <Play size={18} />
          </span>
        </span>
      </button>

      {open && (
        <Overlay>
          <div className="card w-full max-w-3xl animate-fade-up overflow-hidden p-0">
            <div className="relative aspect-video w-full bg-black">
              {embedUrl ? (
                <iframe
                  src={`${embedUrl}?autoplay=1`}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
                  Link de vídeo não reconhecido — clique no lápis e confira o link (YouTube ou Vimeo).
                </div>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="absolute right-3 top-3 rounded-full bg-ink-950/80 p-2 text-white backdrop-blur transition hover:bg-danger"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold text-slate-200">{title}</p>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}

export type EditableTraining = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: string | null;
};

/** Edição completa do treinamento — formulário pré-preenchido, salva via PATCH. */
export function EditTrainingButton({ training }: { training: EditableTraining }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // A categoria atual pode não estar na lista fixa — inclui para não perder o valor
  const categories = TRAINING_CATEGORIES.includes(training.category)
    ? TRAINING_CATEGORIES
    : [training.category, ...TRAINING_CATEGORIES];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/trainings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: training.id,
          title: form.get("title"),
          description: form.get("description") || null,
          category: form.get("category"),
          videoUrl: form.get("videoUrl"),
          thumbnailUrl: form.get("thumbnailUrl") || null,
          duration: form.get("duration") || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível salvar.");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Editar treinamento"
        className="rounded-lg bg-ink-950/70 p-2 text-slate-300 backdrop-blur transition hover:bg-brand-500/80 hover:text-white"
      >
        <Pencil size={14} />
      </button>

      {open && (
        <Overlay>
          <form onSubmit={onSubmit} className="card w-full max-w-lg animate-fade-up p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-100">Editar treinamento</h2>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="et-title">Título *</label>
                <input id="et-title" name="title" required minLength={2} defaultValue={training.title} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="et-description">Descrição</label>
                <textarea id="et-description" name="description" rows={2} defaultValue={training.description ?? ""} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="et-category">Assunto *</label>
                  <select id="et-category" name="category" required defaultValue={training.category} className="input">
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="et-duration">Duração</label>
                  <input id="et-duration" name="duration" defaultValue={training.duration ?? ""} className="input" placeholder="12 min" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="et-video">Link do vídeo (YouTube/Vimeo) *</label>
                <input id="et-video" name="videoUrl" type="url" required defaultValue={training.videoUrl} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="et-thumb">Thumbnail (URL da imagem — opcional)</label>
                <input id="et-thumb" name="thumbnailUrl" type="url" defaultValue={training.thumbnailUrl ?? ""} className="input" />
              </div>
            </div>
            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 size={15} className="animate-spin" />} Salvar alterações
              </button>
            </div>
          </form>
        </Overlay>
      )}
    </>
  );
}

export function DeleteTrainingButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function remove() {
    setLoading(true);
    try {
      await fetch(`/api/trainings?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={remove}
      disabled={loading}
      title="Excluir treinamento"
      className="rounded-lg bg-ink-950/70 p-2 text-slate-300 backdrop-blur transition hover:bg-danger/80 hover:text-white"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    </button>
  );
}
