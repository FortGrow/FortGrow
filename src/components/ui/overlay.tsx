"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Overlay de modal renderizado em portal no <body>.
 * Evita que efeitos como backdrop-filter/transform em ancestrais criem um
 * containing block e aprisionem o position:fixed (modais "presos"/cortados).
 * Rolagem própria em telas pequenas; trava o scroll da página enquanto aberto.
 */
export function Overlay({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!mounted) return null;
  /* Duas camadas de propósito: a de fora rola, a de dentro centraliza com
     `min-h-full`. Centralizar direto na camada rolável (`items-center` +
     overflow) corta o TOPO de um modal mais alto que a tela em região
     inalcançável — não existe rolagem para cima do início do conteúdo. Com
     `min-h-full`, a camada interna cresce junto com o modal e a rolagem
     alcança tudo; modais baixos continuam centralizados. */
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink-950/80 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4 py-10">
        {children}
      </div>
    </div>,
    document.body
  );
}
