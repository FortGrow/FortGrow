"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FilePlus2, Loader2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { brl } from "@/lib/utils";

export type ContractClient = {
  id: string;
  companyName: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  billingType: string;
  monthlyValue: number;
  commissionBase: number;
  commissionShare: number;
  plan: string | null;
  contractStart: string | null; // yyyy-mm-dd
  contractMonths: number | null;
};

const hoje = () => new Date().toISOString().slice(0, 10);

/** startDate + N meses, no formato do input date. */
function somarMeses(inicio: string, meses: number): string {
  const d = new Date(`${inicio}T12:00:00`);
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

/**
 * Novo contrato vinculado ao cliente: ao escolher a empresa, título, valor e
 * vigência são preenchidos a partir do cadastro; se faltar CNPJ, e-mail ou
 * telefone (dados que entram no texto do contrato), o formulário pede na
 * hora e salva no cliente. O PDF é gerado no ato e aparece no portal do
 * cliente para assinatura eletrônica no gov.br.
 */
export type TemplateOption = { id: string; name: string };

export function NewContractForm({
  clients,
  templates = [],
}: {
  clients: ContractClient[];
  templates?: TemplateOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [startDate, setStartDate] = useState(hoje());
  const [endDate, setEndDate] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);
  // Estrutura do texto: modelo próprio (preferido quando existir) ou padrão
  const [templateId, setTemplateId] = useState("");
  // Dados faltantes do cliente, pedidos na hora
  const [fixCnpj, setFixCnpj] = useState("");
  const [fixEmail, setFixEmail] = useState("");
  const [fixPhone, setFixPhone] = useState("");

  const cliente = useMemo(() => clients.find((c) => c.id === clientId) ?? null, [clients, clientId]);
  const faltando = useMemo(
    () =>
      cliente
        ? ([
            !cliente.cnpj && ["cnpj", "CNPJ"],
            !cliente.email && ["email", "E-mail"],
            !cliente.phone && ["phone", "Telefone"],
          ].filter(Boolean) as [string, string][])
        : [],
    [cliente]
  );

  function selecionar(id: string) {
    setClientId(id);
    setFixCnpj("");
    setFixEmail("");
    setFixPhone("");
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    // Preenchimento automático a partir do cadastro do cliente
    setTitle(`Contrato de Prestação de Serviços — ${c.companyName}`);
    setValue(c.billingType === "COMISSAO" ? "" : String(c.monthlyValue || ""));
    const inicio = c.contractStart ?? hoje();
    setStartDate(inicio);
    setEndDate(c.contractMonths ? somarMeses(inicio, c.contractMonths) : "");
    setAutoRenew(Boolean(c.contractMonths));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cliente) return;
    setError(null);
    setLoading(true);
    try {
      // 1. Completa no cadastro o que estava faltando (entra no texto do PDF)
      if (faltando.length > 0) {
        const patch: Record<string, string> = { id: cliente.id };
        if (!cliente.cnpj && fixCnpj.trim()) patch.cnpj = fixCnpj.trim();
        if (!cliente.email && fixEmail.trim()) patch.email = fixEmail.trim();
        if (!cliente.phone && fixPhone.trim()) patch.phone = fixPhone.trim();
        if (Object.keys(patch).length > 1) {
          const r = await fetch("/api/clients", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          if (!r.ok) {
            const d = await r.json().catch(() => ({}));
            setError(d.error ?? "Não foi possível completar os dados do cliente.");
            return;
          }
        }
      }

      // 2. Cria o contrato — o PDF é gerado no servidor e vai para o portal
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: cliente.id,
          title: title.trim(),
          value: value ? Number(value) : 0,
          startDate,
          endDate: endDate || null,
          autoRenew,
          templateId: templateId || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Não foi possível criar o contrato.");
        return;
      }
      setOpen(false);
      setClientId("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setTemplateId(templates[0]?.id ?? "");
          setOpen(true);
        }}
        className="btn-primary"
      >
        <FilePlus2 size={15} /> Novo contrato
      </button>

      {open && (
        <Overlay>
          <form onSubmit={onSubmit} className="card w-full max-w-xl p-6">
            <h2 className="mb-1 text-base font-bold text-slate-100">Novo contrato</h2>
            <p className="mb-4 text-xs text-slate-500">
              Escolha o cliente e o contrato se preenche sozinho com os dados do cadastro. O PDF é gerado na hora e
              aparece no portal do cliente para ele assinar com a conta gov.br e devolver assinado.
            </p>

            <label className="label" htmlFor="nc-cliente">Cliente *</label>
            <select
              id="nc-cliente"
              required
              value={clientId}
              onChange={(e) => selecionar(e.target.value)}
              className="input mb-3"
            >
              <option value="">Selecione o cliente…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                  {c.billingType === "COMISSAO"
                    ? ` · comissão ${c.commissionBase}% × ${c.commissionShare}%`
                    : c.monthlyValue > 0
                      ? ` · ${brl(c.monthlyValue)}/mês`
                      : ""}
                </option>
              ))}
            </select>

            <label className="label" htmlFor="nc-modelo">Estrutura do contrato</label>
            <select
              id="nc-modelo"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="input mb-1"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} (seu modelo)</option>
              ))}
              <option value="">Texto padrão gerado pelo sistema</option>
            </select>
            <p className="mb-3 text-[11px] text-slate-500">
              {templates.length === 0
                ? "Você ainda não tem modelo próprio — cadastre um em “Modelos de contrato”, nesta mesma tela."
                : "O PDF sai com o texto do modelo escolhido, com os dados do cliente preenchidos nos marcadores."}
            </p>

            {cliente && (
              <>
                {faltando.length > 0 && (
                  <div className="mb-3 rounded-xl border border-warn/40 bg-warn/10 p-3.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-warn">
                      <AlertTriangle size={13} /> Faltam dados do cliente para o texto do contrato — complete agora
                      (serão salvos no cadastro):
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {!cliente.cnpj && (
                        <div>
                          <label className="label" htmlFor="nc-fix-cnpj">CNPJ *</label>
                          <input
                            id="nc-fix-cnpj"
                            required
                            value={fixCnpj}
                            onChange={(e) => setFixCnpj(e.target.value)}
                            placeholder="00.000.000/0001-00"
                            className="input"
                          />
                        </div>
                      )}
                      {!cliente.email && (
                        <div>
                          <label className="label" htmlFor="nc-fix-email">E-mail *</label>
                          <input
                            id="nc-fix-email"
                            required
                            type="email"
                            value={fixEmail}
                            onChange={(e) => setFixEmail(e.target.value)}
                            placeholder="contato@empresa.com.br"
                            className="input"
                          />
                        </div>
                      )}
                      {!cliente.phone && (
                        <div>
                          <label className="label" htmlFor="nc-fix-phone">Telefone *</label>
                          <input
                            id="nc-fix-phone"
                            required
                            value={fixPhone}
                            onChange={(e) => setFixPhone(e.target.value)}
                            placeholder="(41) 99999-9999"
                            className="input"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <label className="label" htmlFor="nc-titulo">Título do contrato *</label>
                <input
                  id="nc-titulo"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input mb-3"
                />

                <div className="mb-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="label" htmlFor="nc-valor">
                      {cliente.billingType === "COMISSAO" ? "Valor fixo (opcional)" : "Valor mensal (R$)"}
                    </label>
                    <input
                      id="nc-valor"
                      type="number"
                      min={0}
                      step={0.01}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="0,00"
                      className="input"
                    />
                    {cliente.billingType === "COMISSAO" && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Contrato por comissão: {cliente.commissionBase}% × {cliente.commissionShare}% entra no texto
                        automaticamente.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label" htmlFor="nc-inicio">Início *</label>
                    <input
                      id="nc-inicio"
                      required
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="nc-fim">Término</label>
                    <input
                      id="nc-fim"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="input"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">vazio = prazo indeterminado</p>
                  </div>
                </div>

                <label className="mb-4 flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoRenew}
                    onChange={(e) => setAutoRenew(e.target.checked)}
                    className="h-4 w-4 rounded border-line bg-ink-900 accent-brand-500"
                  />
                  Renovação automática ao fim da vigência
                </label>
              </>
            )}

            {error && <p className="mb-3 text-sm font-medium text-danger">{error}</p>}

            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
                Cancelar
              </button>
              <button type="submit" disabled={loading || !cliente} className="btn-primary">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />}
                Gerar contrato e enviar para assinatura
              </button>
            </div>
          </form>
        </Overlay>
      )}
    </>
  );
}
