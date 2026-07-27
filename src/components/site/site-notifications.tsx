"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";

/**
 * Micro-cards de notificação — a mesma prova social que roda na tela de
 * login, agora espalhada pela home inteira.
 *
 * Ficam numa camada fixa (acompanham a rolagem, então "pipocam" em qualquer
 * ponto da página) e são puramente decorativos: `pointer-events-none`, fora
 * da ordem de leitura e desligados para quem pede menos movimento.
 *
 * Sem `backdrop-blur` de propósito: o pentágono da metodologia gira em
 * paralelo e o blur de fundo obriga o navegador a re-rasterizar a cada
 * quadro — o fundo sólido mantém a animação fluida.
 */

type Notice = {
  icon: string;
  title: string;
  detail: string;
  time: string;
};

const NOTICES: Notice[] = [
  { icon: "💰", title: "Venda realizada", detail: "R$ 4.750 · plano performance", time: "agora mesmo" },
  { icon: "🛒", title: "Novo pedido no site", detail: "R$ 1.290 · via tráfego pago", time: "há 2 min" },
  { icon: "📞", title: "Lead agendou reunião", detail: "origem: Meta Ads", time: "há 4 min" },
  { icon: "📈", title: "ROAS subiu para 5.2x", detail: "campanha de conversão", time: "há 6 min" },
  { icon: "🎯", title: "Novo lead qualificado", detail: "formulário do site", time: "há 8 min" },
  { icon: "💰", title: "Venda realizada", detail: "R$ 12.400 · contrato anual", time: "há 11 min" },
  { icon: "📊", title: "CPL caiu 21%", detail: "otimização da semana", time: "há 14 min" },
  { icon: "🎬", title: "Campanha no ar", detail: "3 criativos publicados", time: "há 18 min" },
  { icon: "⭐", title: "Contrato renovado", detail: "mais 12 meses de operação", time: "há 23 min" },
  { icon: "🚀", title: "Verba escalada", detail: "+40% no criativo campeão", time: "há 27 min" },
];

/**
 * Pontos de aparição: sempre colados nas laterais, longe da barra de menu
 * (topo) e do botão flutuante "Contrate a FortGrow" (canto inferior direito).
 */
const SPOTS = [
  { top: "17%", side: "left" },
  { top: "26%", side: "right" },
  { top: "31%", side: "left" },
  { top: "44%", side: "right" },
  { top: "52%", side: "left" },
  { top: "58%", side: "right" },
  { top: "70%", side: "left" },
  { top: "38%", side: "right" },
] as const;

type Spot = (typeof SPOTS)[number];
type Live = { id: number; notice: Notice; spot: Spot };

const DESKTOP = "(min-width: 1024px)";

export function SiteNotifications() {
  const [live, setLive] = useState<Live[]>([]);
  const [desktop, setDesktop] = useState(false);

  /* Largura da tela: no desktop os cards se espalham pelas laterais; no
     celular só há espaço numa faixa (rodapé esquerdo), um card por vez. */
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let seq = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const limite = () => (window.matchMedia(DESKTOP).matches ? 2 : 1);

    function pop() {
      const notice = NOTICES[Math.floor(Math.random() * NOTICES.length)];
      const id = ++seq;
      setLive((prev) => {
        // sorteia entre os pontos que ainda não estão ocupados
        const livres = SPOTS.filter((s) => !prev.some((l) => l.spot === s));
        const spot = livres[Math.floor(Math.random() * livres.length)] ?? SPOTS[0];
        return [...prev, { id, notice, spot }].slice(-limite());
      });
      // cada card vive ~5s antes de sair
      timers.push(setTimeout(() => setLive((prev) => prev.filter((l) => l.id !== id)), 5000));
    }

    timers.push(setTimeout(pop, 1600));
    const cycle = setInterval(pop, 2800);
    return () => {
      clearInterval(cycle);
      timers.forEach(clearTimeout);
    };
  }, []);

  function posicao(spot: Spot): React.CSSProperties {
    // celular: faixa única acima do botão flutuante "Contrate a FortGrow"
    if (!desktop) return { bottom: 96, left: 16 };
    return spot.side === "left" ? { top: spot.top, left: 20 } : { top: spot.top, right: 20 };
  }

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {/* No celular todos os cards ocupam o mesmo ponto: `wait` faz um sair
          antes do outro entrar, senão eles se empilhariam ilegíveis. */}
      <AnimatePresence mode={desktop ? "sync" : "wait"}>
        {live.map(({ id, notice, spot }) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={posicao(spot)}
            className="absolute w-[16rem] max-w-[74vw] rounded-2xl border border-[#2d7ef2]/30 bg-[#070c15]/95 p-3 shadow-[0_18px_45px_-18px_rgba(0,0,0,0.95)] ring-1 ring-[#2d7ef2]/10"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2d7ef2]/15 text-lg">
                {notice.icon}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-xs font-bold text-white">
                  {notice.title}
                  <BadgeCheck size={12} className="shrink-0 text-[#7fb0f8]" />
                </p>
                <p className="truncate text-[11px] text-slate-400">{notice.detail}</p>
                <p className="text-[10px] text-slate-600">{notice.time}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
