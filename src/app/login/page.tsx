"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Lock, Mail, Rocket } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível entrar.");
        return;
      }
      router.replace(params.get("next") ?? data.home);
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-sm"
    >
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-grow-500 shadow-glow">
          <Rocket size={26} className="text-ink-950" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">FortGrow CRM</h1>
        <p className="mt-1 text-sm text-slate-500">Acesse sua conta para continuar</p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <div className="relative">
            <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              className="input pl-10"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <div className="relative">
            <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input pl-10"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger ring-1 ring-inset ring-danger/20">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading && <Loader2 size={15} className="animate-spin" />}
          Entrar
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-600">
        Área administrativa e Portal do Cliente · Acesso protegido por JWT
      </p>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
