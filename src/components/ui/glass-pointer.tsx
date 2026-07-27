"use client";

import { useEffect } from "react";

/**
 * Iluminação dinâmica do material Liquid Glass.
 *
 * Monta-se uma única vez no layout raiz e atende todo o vidro da página
 * por delegação: um só `pointermove` no documento, em vez de um listener
 * por card (são mais de cem no dashboard).
 *
 * O que ele escreve são apenas variáveis CSS — `--glass-mx/my` (posição
 * do brilho), `--glass-lit` (intensidade) e, nas peças que pedem
 * inclinação, `--glass-rx/ry`. Nenhuma propriedade que force reflow: a
 * pintura fica toda a cargo do compositor.
 *
 * Desliga sozinho em ponteiro grosso (toque) e para quem pede menos
 * movimento — nesses casos a profundidade vem só da luz e das sombras.
 */

/** Inclinação máxima, em graus. Deliberadamente discreta. */
const TILT = 3.2;

export function GlassPointer() {
  useEffect(() => {
    const fino = window.matchMedia("(hover: hover) and (pointer: fine)");
    const menosMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fino.matches || menosMovimento.matches) return;

    let atual: HTMLElement | null = null;
    let rect: DOMRect | null = null;
    let px = 0;
    let py = 0;
    let raf = 0;

    function limpar() {
      if (!atual) return;
      atual.style.setProperty("--glass-lit", "0");
      atual.style.removeProperty("--glass-rx");
      atual.style.removeProperty("--glass-ry");
      atual.classList.remove("glass-tracking");
      atual = null;
      rect = null;
    }

    function pintar() {
      raf = 0;
      if (!atual || !rect) return;
      const x = (px - rect.left) / rect.width;
      const y = (py - rect.top) / rect.height;
      atual.style.setProperty("--glass-mx", `${(x * 100).toFixed(1)}%`);
      atual.style.setProperty("--glass-my", `${(y * 100).toFixed(1)}%`);
      atual.style.setProperty("--glass-lit", "1");
      if (atual.classList.contains("glass-interactive")) {
        atual.style.setProperty("--glass-ry", `${((x - 0.5) * 2 * TILT).toFixed(2)}deg`);
        atual.style.setProperty("--glass-rx", `${((0.5 - y) * 2 * TILT).toFixed(2)}deg`);
      }
    }

    function onMove(e: PointerEvent) {
      const alvo = (e.target as Element | null)?.closest?.(".card, .glass") as HTMLElement | null;
      if (alvo !== atual) {
        limpar();
        atual = alvo;
        // uma única medição por peça: o retângulo só muda com scroll/resize
        rect = alvo ? alvo.getBoundingClientRect() : null;
        if (alvo) alvo.classList.add("glass-tracking");
      }
      if (!atual) return;
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(pintar);
    }

    /* O retângulo em cache envelhece quando a página rola ou muda de
       tamanho — invalidar é mais barato que remedir a cada quadro. */
    function invalidar() {
      if (atual) rect = atual.getBoundingClientRect();
    }

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", limpar, { passive: true });
    window.addEventListener("scroll", invalidar, { passive: true });
    window.addEventListener("resize", invalidar);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      limpar();
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", limpar);
      window.removeEventListener("scroll", invalidar);
      window.removeEventListener("resize", invalidar);
    };
  }, []);

  return null;
}
