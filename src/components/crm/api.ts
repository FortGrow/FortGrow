"use client";

/**
 * Cliente HTTP do CRM.
 *
 * O mesmo componente serve o Portal (empresa logada) e o painel da FortGrow
 * (admin olhando o CRM de um cliente). A única diferença é o `clientId`, que
 * o admin precisa informar e o cliente não — do lado do servidor o valor é
 * ignorado para quem é CLIENTE, então mandar junto não abre brecha.
 */

export type CrmScope = { clientId?: string | null };

function comEscopo(url: string, scope: CrmScope) {
  if (!scope.clientId) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}clientId=${encodeURIComponent(scope.clientId)}`;
}

export async function crmGet<T>(path: string, scope: CrmScope): Promise<T> {
  const res = await fetch(comEscopo(path, scope), { cache: "no-store" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Falha ao carregar.");
  return res.json();
}

async function enviar<T>(path: string, method: string, body: unknown, scope: CrmScope): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...(body as object), ...(scope.clientId ? { clientId: scope.clientId } : {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Não foi possível salvar.");
  return data as T;
}

export const crmPost = <T,>(path: string, body: unknown, scope: CrmScope) =>
  enviar<T>(path, "POST", body, scope);

export const crmPatch = <T,>(path: string, body: unknown, scope: CrmScope) =>
  enviar<T>(path, "PATCH", body, scope);

export async function crmDelete(path: string, params: Record<string, string>, scope: CrmScope) {
  const qs = new URLSearchParams(params);
  if (scope.clientId) qs.set("clientId", scope.clientId);
  const res = await fetch(`${path}?${qs}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Não foi possível excluir.");
  return data;
}

/** URL de download da exportação, já com filtros e escopo. */
export function exportUrl(format: string, filtros: Record<string, string>, scope: CrmScope) {
  const qs = new URLSearchParams({ format });
  for (const [k, v] of Object.entries(filtros)) if (v) qs.set(k, v);
  if (scope.clientId) qs.set("clientId", scope.clientId);
  return `/api/crm/export?${qs}`;
}
