"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

/**
 * Gatilho fixo "Contrate a FortGrow" — acompanha o usuário em qualquer ponto
 * do site. Usa a mesma animação do botão do topo: o preenchimento (azul bebê
 * → azul escuro) começa assim que o cursor chega, sem precisar clicar.
 *
 * Aparece depois de sair do topo (onde o botão principal já está visível) e
 * some quando a seção de contato entra na tela — ali o formulário assume.
 */
export function FloatingCta({ href = "#contato" }: { href?: string }) {
  // Em páginas sem a seção de contato o botão fica sempre visível
  const [visible, setVisible] = useState(!href.startsWith("#"));
  const [filling, setFilling] = useState(false);

  useEffect(() => {
    if (!href.startsWith("#")) return; // fora da home: sempre visível
    const onScroll = () => {
      const passouTopo = window.scrollY > 560;
      const contato = document.getElementById("contato");
      const noContato = contato
        ? contato.getBoundingClientRect().top < window.innerHeight * 0.75
        : false;
      setVisible(passouTopo && !noContato);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [href]);

  return (
    <a
      href={href}
      onMouseEnter={() => setFilling(true)}
      onMouseLeave={() => setFilling(false)}
      onFocus={() => setFilling(true)}
      onBlur={() => setFilling(false)}
      onTouchStart={() => setFilling(true)}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 overflow-hidden rounded-full bg-[#a9cdfb] px-6 py-3.5 text-sm font-bold shadow-[0_10px_34px_-8px_rgba(45,126,242,0.75)] transition-all duration-300 active:scale-[0.97] sm:bottom-7 sm:right-7 sm:text-base ${
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-6 opacity-0"
      }`}
    >
      {/* preenchimento de carregamento: azul bebê → azul escuro */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#2d7ef2] to-[#123c8f] transition-[width] duration-[900ms] ease-out"
        style={{ width: filling ? "100%" : "0%" }}
      />
      <span
        className="relative inline-flex items-center gap-2 whitespace-nowrap transition-colors duration-500"
        style={{ color: filling ? "#ffffff" : "#0d2f6b" }}
      >
        Contrate a FortGrow <ArrowRight size={16} />
      </span>
    </a>
  );
}
