"use client";

import { useEffect } from "react";

/**
 * Camada de efeitos 3D leves (desktop apenas):
 *  - parallax do fundo: orbes de luz seguem o mouse suavemente (translate3d)
 *  - tilt: cards marcados com [data-tilt] inclinam levemente conforme o mouse
 * Tudo via transform (GPU) e requestAnimationFrame; desligado em telas touch
 * e quando o usuário prefere menos movimento.
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

    // Tilt por delegação: só em elementos [data-tilt]
    let tiltEl: HTMLElement | null = null;
    let tiltRaf = 0;
    const onTiltMove = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (target !== tiltEl) {
        if (tiltEl) {
          tiltEl.style.setProperty("--tilt-x", "0deg");
          tiltEl.style.setProperty("--tilt-y", "0deg");
          tiltEl.style.setProperty("--lift", "0px");
        }
        tiltEl = target;
      }
      if (!tiltEl) return;
      const el = tiltEl;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      if (!tiltRaf) {
        tiltRaf = requestAnimationFrame(() => {
          tiltRaf = 0;
          el.style.setProperty("--tilt-x", `${(-py * 4).toFixed(2)}deg`);
          el.style.setProperty("--tilt-y", `${(px * 5).toFixed(2)}deg`);
          el.style.setProperty("--lift", "-2px");
        });
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointermove", onTiltMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointermove", onTiltMove);
      if (raf) cancelAnimationFrame(raf);
      if (tiltRaf) cancelAnimationFrame(tiltRaf);
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
