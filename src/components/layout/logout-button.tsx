"use client";

import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";

/**
 * Sair sem depender de redirect do servidor: o POST limpa o cookie e a
 * navegação para /login é feita pelo navegador (window.location). Evita o
 * travamento atrás do proxy de produção, onde o Location do redirect era
 * montado com a URL interna do servidor.
 */
export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // mesmo com falha de rede, seguimos para o login — o middleware resolve
    }
    window.location.assign("/login");
  }

  return (
    <button
      onClick={logout}
      disabled={busy}
      title="Sair"
      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-ink-700 hover:text-danger disabled:opacity-60"
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
    </button>
  );
}
