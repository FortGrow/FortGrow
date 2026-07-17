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
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/80 p-4 py-10 backdrop-blur-sm sm:items-center">
      {children}
    </div>,
    document.body
  );
}
