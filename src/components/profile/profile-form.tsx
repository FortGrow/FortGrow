"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { initials } from "@/lib/utils";
import { Camera, Check, Loader2 } from "lucide-react";

/* eslint-disable @next/next/no-img-element */
export function ProfileForm({
  user,
}: {
  user: { name: string; email: string; phone: string | null; avatarUrl: string | null; role: string };
}) {
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [infoMsg, setInfoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function saveInfo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingInfo(true);
    setInfoMsg(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), phone: form.get("phone") }),
      });
      const data = await res.json().catch(() => ({}));
      setInfoMsg(res.ok ? { ok: true, text: "Dados atualizados!" } : { ok: false, text: data.error ?? "Erro ao salvar." });
      if (res.ok) router.refresh();
    } finally {
      setSavingInfo(false);
    }
  }

  async function savePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingPwd(true);
    setPwdMsg(null);
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("newPassword"));
    if (newPassword !== String(form.get("confirmPassword"))) {
      setPwdMsg({ ok: false, text: "A confirmação não confere com a nova senha." });
      setSavingPwd(false);
      return;
    }
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      setPwdMsg(res.ok ? { ok: true, text: "Senha alterada com sucesso!" } : { ok: false, text: data.error ?? "Erro ao alterar." });
      if (res.ok) (e.target as HTMLFormElement).reset();
    } finally {
      setSavingPwd(false);
    }
  }

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    const form = new FormData();
    form.set("file", file);
    try {
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.avatarUrl);
        router.refresh();
      }
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Foto + dados */}
      <form onSubmit={saveInfo} className="card space-y-5 p-6">
        <h2 className="text-sm font-bold text-slate-300">Informações pessoais</h2>

        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-line transition hover:ring-brand-500/60"
            title="Alterar foto"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-ink-700 text-xl font-bold text-brand-300">
                {initials(user.name)}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-ink-950/60 opacity-0 transition group-hover:opacity-100">
              {uploadingAvatar ? <Loader2 size={18} className="animate-spin text-white" /> : <Camera size={18} className="text-white" />}
            </span>
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-200">Foto de perfil</p>
            <p className="text-xs text-slate-500">PNG, JPG ou WebP · máx. 4 MB · clique na foto para alterar</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
          />
        </div>

        <div>
          <label className="label" htmlFor="name">Nome completo</label>
          <input id="name" name="name" defaultValue={user.name} required minLength={2} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Telefone / WhatsApp</label>
          <input id="phone" name="phone" defaultValue={user.phone ?? ""} className="input" placeholder="+55 (41) 99999-0000" />
        </div>
        <div>
          <label className="label">E-mail de acesso</label>
          <input value={user.email} disabled className="input opacity-60" />
          <p className="mt-1 text-xs text-slate-600">O e-mail de login não pode ser alterado por aqui.</p>
        </div>

        {infoMsg && (
          <p className={`text-sm font-medium ${infoMsg.ok ? "text-grow-400" : "text-danger"}`}>{infoMsg.text}</p>
        )}
        <button type="submit" disabled={savingInfo} className="btn-primary">
          {savingInfo ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Salvar dados
        </button>
      </form>

      {/* Senha */}
      <form onSubmit={savePassword} className="card space-y-5 p-6">
        <h2 className="text-sm font-bold text-slate-300">Alterar senha</h2>
        <div>
          <label className="label" htmlFor="currentPassword">Senha atual</label>
          <input id="currentPassword" name="currentPassword" type="password" required className="input" autoComplete="current-password" />
        </div>
        <div>
          <label className="label" htmlFor="newPassword">Nova senha</label>
          <input id="newPassword" name="newPassword" type="password" required minLength={8} className="input" autoComplete="new-password" />
          <p className="mt-1 text-xs text-slate-600">Mínimo de 8 caracteres.</p>
        </div>
        <div>
          <label className="label" htmlFor="confirmPassword">Confirmar nova senha</label>
          <input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} className="input" autoComplete="new-password" />
        </div>

        {pwdMsg && (
          <p className={`text-sm font-medium ${pwdMsg.ok ? "text-grow-400" : "text-danger"}`}>{pwdMsg.text}</p>
        )}
        <button type="submit" disabled={savingPwd} className="btn-primary">
          {savingPwd ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Alterar senha
        </button>
      </form>
    </div>
  );
}
