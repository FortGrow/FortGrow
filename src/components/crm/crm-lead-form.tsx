"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { CRM_SOURCES } from "@/lib/crm";
import { crmPatch, crmPost, type CrmScope } from "./api";
import type { LeadDto, MemberDto, StageDto, TagDto } from "./types";

/**
 * Cadastro e edição de lead.
 *
 * Um formulário só para os dois casos: sem `lead` cria, com `lead` edita.
 * Duplicar a tela levaria os dois lados a divergir na primeira mudança de
 * campo.
 */
export function CrmLeadForm({
  stages,
  members,
  tags,
  scope,
  lead,
  stageId,
  trigger,
  onDone,
}: {
  stages: StageDto[];
  members: MemberDto[];
  tags: TagDto[];
  scope: CrmScope;
  /** Ausente = novo lead */
  lead?: LeadDto;
  /** Etapa sugerida ao criar (coluna de onde o botão foi clicado) */
  stageId?: string;
  trigger?: React.ReactNode;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionadas, setSelecionadas] = useState<string[]>(lead?.tags.map((t) => t.id) ?? []);
  const router = useRouter();

  const editando = !!lead;
  const dateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    const f = new FormData(e.currentTarget);
    const texto = (k: string) => String(f.get(k) ?? "").trim();

    const corpo: Record<string, unknown> = {
      name: texto("name"),
      company: texto("company"),
      jobTitle: texto("jobTitle"),
      email: texto("email"),
      phone: texto("phone"),
      whatsapp: texto("whatsapp"),
      city: texto("city"),
      state: texto("state"),
      source: texto("source"),
      notes: texto("notes"),
      estimatedValue: Number(texto("estimatedValue").replace(/\./g, "").replace(",", ".") || 0),
      ownerId: texto("ownerId") || null,
      stageId: texto("stageId") || undefined,
      nextContactAt: texto("nextContactAt") ? `${texto("nextContactAt")}T12:00:00` : null,
      tagIds: selecionadas,
    };

    try {
      if (editando) await crmPatch("/api/crm/leads", { id: lead!.id, ...corpo }, scope);
      else await crmPost("/api/crm/leads", corpo, scope);
      setOpen(false);
      onDone?.();
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <button className="btn-primary">
            <Plus size={15} /> Novo lead
          </button>
        )}
      </span>

      {open && (
        <Overlay>
          <form onSubmit={onSubmit} className="card max-h-[92vh] w-full max-w-3xl animate-fade-up overflow-y-auto p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">
                  {editando ? `Editar ${lead!.name}` : "Novo lead"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Só o nome é obrigatório — o resto pode ser completado depois.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-ink-800">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Nome *" name="name" defaultValue={lead?.name} required minLength={2} />
              <Campo label="Empresa" name="company" defaultValue={lead?.company ?? ""} />
              <Campo label="Cargo" name="jobTitle" defaultValue={lead?.jobTitle ?? ""} />
              <Campo label="E-mail" name="email" type="email" defaultValue={lead?.email ?? ""} />
              <Campo label="Telefone" name="phone" defaultValue={lead?.phone ?? ""} />
              <Campo label="WhatsApp" name="whatsapp" defaultValue={lead?.whatsapp ?? ""} />
              <Campo label="Cidade" name="city" defaultValue={lead?.city ?? ""} />
              <Campo label="Estado (UF)" name="state" maxLength={2} defaultValue={lead?.state ?? ""} />

              <div>
                <label className="label" htmlFor="lf-source">Origem do lead</label>
                <input
                  id="lf-source"
                  name="source"
                  list="crm-sources"
                  defaultValue={lead?.source ?? ""}
                  className="input"
                  placeholder="De onde veio?"
                />
                <datalist id="crm-sources">
                  {CRM_SOURCES.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <Campo
                label="Valor estimado (R$)"
                name="estimatedValue"
                inputMode="decimal"
                defaultValue={lead ? String(lead.estimatedValue).replace(".", ",") : ""}
                placeholder="0,00"
              />

              <div>
                <label className="label" htmlFor="lf-stage">Etapa do funil</label>
                <select id="lf-stage" name="stageId" defaultValue={lead?.stageId ?? stageId ?? ""} className="input">
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="lf-owner">Responsável interno</label>
                <select id="lf-owner" name="ownerId" defaultValue={lead?.ownerId ?? ""} className="input">
                  <option value="">Sem responsável</option>
                  {members.filter((m) => m.active).map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="lf-next">Próximo contato</label>
                <input
                  id="lf-next"
                  name="nextContactAt"
                  type="date"
                  defaultValue={dateInput(lead?.nextContactAt)}
                  className="input"
                />
              </div>
            </div>

            {tags.length > 0 && (
              <div className="mt-4">
                <span className="label">Etiquetas</span>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => {
                    const on = selecionadas.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setSelecionadas((prev) =>
                            on ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                          )
                        }
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition"
                        style={
                          on
                            ? { backgroundColor: t.color, color: "#0b0e14" }
                            : { backgroundColor: `${t.color}1f`, color: t.color }
                        }
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="label" htmlFor="lf-notes">Observações</label>
              <textarea
                id="lf-notes"
                name="notes"
                rows={3}
                defaultValue={lead?.notes ?? ""}
                className="input resize-y"
                placeholder="Contexto da conversa, necessidade, objeções…"
              />
            </div>

            {erro && <p className="mt-3 text-sm font-medium text-danger">{erro}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 size={15} className="animate-spin" />}
                {editando ? "Salvar alterações" : "Cadastrar lead"}
              </button>
            </div>
          </form>
        </Overlay>
      )}
    </>
  );
}

function Campo({
  label,
  name,
  ...props
}: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={`lf-${name}`}>{label}</label>
      <input id={`lf-${name}`} name={name} className="input" {...props} />
    </div>
  );
}
