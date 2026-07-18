"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { MODULES, type ModuleKey } from "@/lib/rbac";

const LEVELS = [
  ["v", "Ver"],
  ["e", "Editar"],
  ["d", "Excluir"],
] as const;

/**
 * Editor da matriz de permissões por usuário:
 * cada módulo × (ver / editar / excluir), salvo no banco vinculado ao usuário.
 */
export type PermTemplate = { id: string; name: string; matrix: Record<string, string> };

export function PermissionsEditor({
  userId,
  userName,
  matrix: initial,
  templates = [],
}: {
  userId: string;
  userName: string;
  matrix: Record<string, string>;
  templates?: PermTemplate[];
}) {
  const [open, setOpen] = useState(false);
  const [matrix, setMatrix] = useState<Record<string, string>>(initial);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateMsg, setTemplateMsg] = useState<string | null>(null);
  const router = useRouter();

  function applyTemplate(id: string) {
    const t = templates.find((t) => t.id === id);
    if (t) {
      setMatrix({ ...t.matrix });
      setSaved(false);
      setTemplateMsg(`Template "${t.name}" aplicado — clique em Salvar para confirmar.`);
    }
  }

  async function saveAsTemplate() {
    if (templateName.trim().length < 2) {
      setTemplateMsg("Dê um nome ao template (mín. 2 caracteres).");
      return;
    }
    const res = await fetch("/api/permission-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: templateName.trim(), matrix }),
    });
    if (res.ok) {
      setTemplateMsg(`Template "${templateName.trim()}" salvo!`);
      setTemplateName("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setTemplateMsg(data.error ?? "Falha ao salvar template.");
    }
  }

  function toggle(module: string, flag: string) {
    setSaved(false);
    setMatrix((prev) => {
      let flags = prev[module] ?? "";
      if (flags.includes(flag)) {
        flags = flags.replace(flag, "");
        // sem "ver", os demais não fazem sentido
        if (flag === "v") flags = "";
      } else {
        flags += flag;
        // editar/excluir implicam ver
        if ((flag === "e" || flag === "d") && !flags.includes("v")) flags += "v";
      }
      const ordered = ["v", "e", "d"].filter((f) => flags.includes(f)).join("");
      return { ...prev, [module]: ordered };
    });
  }

  async function save() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, permissionsMatrix: matrix }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível salvar.");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Configurar permissões"
        className="inline-flex items-center gap-1.5 rounded-lg bg-violet/10 px-2.5 py-1.5 text-[11px] font-semibold text-violet ring-1 ring-inset ring-violet/20 transition hover:bg-violet/20"
      >
        <ShieldCheck size={13} /> Permissões
      </button>

      {open && (
        <Overlay>
          <div className="card w-full max-w-xl animate-fade-up p-6">
            <h2 className="text-lg font-bold text-slate-100">Permissões de {userName}</h2>
            <p className="mb-4 mt-1 text-xs text-slate-500">
              Marque o que este colaborador pode fazer em cada módulo. Editar/Excluir habilitam Ver automaticamente.
              Sem nenhuma marcação, valem os padrões do papel. As mudanças valem no próximo login do colaborador.
            </p>

            {templates.length > 0 && (
              <div className="mb-3">
                <label className="label" htmlFor={`tpl-${userId}`}>Aplicar template</label>
                <select
                  id={`tpl-${userId}`}
                  defaultValue=""
                  onChange={(e) => e.target.value && applyTemplate(e.target.value)}
                  className="input"
                >
                  <option value="">Selecione um template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-ink-850">
                  <tr className="border-b border-line text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2.5 text-left font-semibold">Módulo</th>
                    {LEVELS.map(([, label]) => (
                      <th key={label} className="px-3 py-2.5 text-center font-semibold">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {(Object.keys(MODULES) as ModuleKey[]).map((key) => (
                    <tr key={key} className="transition hover:bg-ink-800/50">
                      <td className="px-4 py-2 font-medium text-slate-300">{MODULES[key]}</td>
                      {LEVELS.map(([flag]) => (
                        <td key={flag} className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={(matrix[key] ?? "").includes(flag)}
                            onChange={() => toggle(key, flag)}
                            className="h-4 w-4 cursor-pointer accent-sky-500"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Nome do template (ex.: Vendedor Jr)"
                className="input flex-1 py-2"
              />
              <button type="button" onClick={saveAsTemplate} className="btn-ghost py-2 text-xs">
                Salvar como template
              </button>
            </div>
            {templateMsg && <p className="mt-2 text-xs font-medium text-brand-400">{templateMsg}</p>}

            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-5 flex items-center justify-end gap-3">
              {saved && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-grow-400">
                  <CheckCircle2 size={15} /> Permissões atualizadas com sucesso!
                </span>
              )}
              <button onClick={() => setOpen(false)} className="btn-ghost">Fechar</button>
              <button onClick={save} disabled={loading} className="btn-primary">
                {loading && <Loader2 size={15} className="animate-spin" />} Salvar permissões
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}
