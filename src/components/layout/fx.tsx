"use client";

import { useEffect } from "react";

/**
 * Parallax do fundo (desktop apenas): as orbes de luz e a grade seguem o
 * mouse suavemente, via transform (GPU) e requestAnimationFrame.
 *
 * A inclinação dos cards ficava aqui também, em `[data-tilt]`. Saiu para o
 * material de vidro (GlassPointer): eram dois sistemas escrevendo
 * `transform` no mesmo elemento, e o antigo — mais específico — anulava a
 * rotação do novo.
 */
export function FxLayer() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let mx = 0;
    let my = 0;

    const onMove = (e: PointerEvent) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          document.documentElement.style.setProperty("--par-x", `${(-mx * 24).toFixed(1)}px`);
          document.documentElement.style.setProperty("--par-y", `${(-my * 16).toFixed(1)}px`);
          // camada mais lenta (grade de pontos) — sensação de profundidade real
          document.documentElement.style.setProperty("--par2-x", `${(-mx * 9).toFixed(1)}px`);
          document.documentElement.style.setProperty("--par2-y", `${(-my * 6).toFixed(1)}px`);
        });
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="hidden lg:block">
      <div className="fx-grid" />
      <div
        className="fx-orb"
        style={{ top: "-140px", right: "-120px", width: "420px", height: "420px", background: "rgba(2,132,199,0.11)" }}
      />
      <div
        className="fx-orb"
        style={{ bottom: "-160px", left: "-140px", width: "380px", height: "380px", background: "rgba(5,150,105,0.09)" }}
      />
      <div
        className="fx-orb"
        style={{ top: "40%", right: "18%", width: "300px", height: "300px", background: "rgba(139,92,246,0.07)" }}
      />
    </div>
  );
}
