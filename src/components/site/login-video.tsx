"use client";

import { useEffect, useRef } from "react";

/**
 * Fundo em vídeo do login, em laço contínuo.
 *
 * O atributo `loop` sozinho não basta na prática: há várias situações em
 * que o navegador simplesmente para o vídeo e não volta — e o que sobra
 * na tela é o pôster parado, com cara de travado. As três que importam:
 *
 *  - Autoplay bloqueado. O Modo de Baixo Consumo do iPhone recusa
 *    `play()` mesmo com o vídeo mudo; o Safari também recusa antes de
 *    qualquer interação em algumas versões.
 *  - Aba em segundo plano. O navegador pausa para poupar bateria e nem
 *    sempre retoma sozinho ao voltar.
 *  - `loop` ignorado. Alguns navegadores disparam `ended` mesmo com o
 *    atributo presente, e o vídeo para no último quadro.
 *
 * Então a reprodução é reafirmada: na montagem, ao voltar para a aba, na
 * primeira interação do usuário e sempre que o vídeo pausar ou terminar
 * sem ter sido mandado parar.
 */
export function LoginVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    /** Tenta tocar; se o navegador recusar, não quebra nada. */
    const tocar = () => {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    /* `loop` cobre o caso normal; isto cobre quem dispara `ended` assim
       mesmo, e garante que o laço recomece do zero. */
    const aoTerminar = () => {
      v.currentTime = 0;
      tocar();
    };

    /* Pausa que ninguém pediu (economia de energia, troca de aba) —
       retoma. Só quando a aba está visível, para não brigar com o
       navegador enquanto a página está em segundo plano. */
    const aoPausar = () => {
      if (!document.hidden) tocar();
    };

    const aoVoltarParaAba = () => {
      if (!document.hidden) tocar();
    };

    /* Autoplay bloqueado cai aqui: o primeiro toque ou clique em qualquer
       lugar da página libera a reprodução. */
    const naPrimeiraInteracao = () => {
      tocar();
      document.removeEventListener("pointerdown", naPrimeiraInteracao);
      document.removeEventListener("keydown", naPrimeiraInteracao);
    };

    tocar();
    v.addEventListener("ended", aoTerminar);
    v.addEventListener("pause", aoPausar);
    v.addEventListener("stalled", tocar);
    document.addEventListener("visibilitychange", aoVoltarParaAba);
    document.addEventListener("pointerdown", naPrimeiraInteracao, { passive: true });
    document.addEventListener("keydown", naPrimeiraInteracao);

    return () => {
      v.removeEventListener("ended", aoTerminar);
      v.removeEventListener("pause", aoPausar);
      v.removeEventListener("stalled", tocar);
      document.removeEventListener("visibilitychange", aoVoltarParaAba);
      document.removeEventListener("pointerdown", naPrimeiraInteracao);
      document.removeEventListener("keydown", naPrimeiraInteracao);
    };
  }, []);

  return (
    <video
      ref={ref}
      className="absolute inset-0 h-full w-full object-cover"
      autoPlay
      muted
      loop
      playsInline
      /* `auto`: com `metadata` o navegador buscava o restante só na hora
         de tocar, e o laço engasgava na virada. São 860 KB — cabe. */
      preload="auto"
      poster="/site/video/login-bg.jpg"
      aria-hidden
      tabIndex={-1}
    >
      <source src="/site/video/login-bg.webm" type="video/webm" />
      <source src="/site/video/login-bg.mp4" type="video/mp4" />
    </video>
  );
}
