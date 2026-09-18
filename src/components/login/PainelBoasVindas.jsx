import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FRASES } from './frases';

/**
 * Painel de boas-vindas da tela de entrada: a equipe, o lema e uma frase.
 *
 * O QUE ACONTECE AQUI
 *   - Os slides se revezam a cada 8s, numa dissolução com foco: o novo entra
 *     desfocado e levemente ampliado, e vai entrando em foco POR CIMA do
 *     anterior — que fica parado, inteiro, até ser coberto.
 *   - O slide ativo continua se aproximando devagar (efeito Ken Burns).
 *   - Com o mouse, a imagem e o fundo se movem alguns pixels em direções
 *     opostas: dá profundidade sem virar distração.
 *   - O lema entra linha por linha quando a tela abre.
 *   - A frase troca junto com o slide.
 *
 * DOIS TIPOS DE SLIDE, POR PASTA
 *   src/assets/equipe/     retratos em pé. Ficam inteiros, na altura do
 *                          painel, com o lema e a frase ao lado.
 *   src/assets/destaques/  imagens horizontais (ex.: o emblema M.E.T.E.O.R.O.).
 *                          Ocupam a largura toda, inteiras; o lema e a frase
 *                          saem de cena para a imagem falar sozinha.
 * Para incluir, coloque o arquivo na pasta certa e publique: entra sozinho, na
 * ordem do nome. Primeiro todos os retratos, depois os destaques.
 *
 * NADA É CORTADO. O espaço que sobra em volta da imagem é preenchido por ela
 * mesma, ampliada e desfocada.
 *
 * Quem pediu para reduzir movimento vê o primeiro slide e uma frase, parados:
 * sem revezamento, sem zoom, sem profundidade.
 *
 * Regras: documentacao/regras-ui-ux.md, seção 8.
 */

const carregar = (arquivos) => Object.entries(arquivos)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);

const SLIDES = [
  ...carregar(import.meta.glob('/src/assets/equipe/*.{webp,jpg,jpeg,png}', { eager: true, import: 'default' }))
    .map((src) => ({ src, tipo: 'retrato' })),
  ...carregar(import.meta.glob('/src/assets/destaques/*.{webp,jpg,jpeg,png}', { eager: true, import: 'default' }))
    .map((src) => ({ src, tipo: 'destaque' })),
];

const INTERVALO_MS = 8000;

function querMenosMovimento() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Ordem aleatória, sorteada uma vez por acesso (Fisher-Yates). */
function embaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/*
 * Três estados por slide, e por que são três:
 *   ativa    — por cima de todos, entrando em foco.
 *   anterior — logo abaixo, INTEIRO e com a animação intacta. Se ele perdesse
 *              o zoom ou a opacidade no momento da troca, daria um salto
 *              visível: era isso que parecia um "corte". Só depois que o novo
 *              terminou de entrar (1,6s) ele se apaga — senão continuaria
 *              aparecendo onde o novo não cobre (em volta de um retrato, ou
 *              acima e abaixo do emblema).
 *   oculta   — invisível; só aqui a animação é desligada, sem ninguém ver.
 */
const CAMADA = {
  ativa: 'z-20 opacity-100',
  anterior: 'z-10 opacity-0 transition-opacity duration-500 delay-[1600ms]',
  oculta: 'z-0 opacity-0',
};

export default function PainelBoasVindas() {
  const semMovimento = useMemo(querMenosMovimento, []);
  const painel = useRef(null);
  const quadro = useRef(0);

  // Clássicas e da equipe misturadas numa ordem nova a cada acesso: quem abre
  // o sistema todo dia não lê sempre a mesma sequência.
  const frases = useMemo(() => embaralhar(FRASES), []);
  const [passo, setPasso] = useState(0);

  useEffect(() => {
    if (semMovimento || SLIDES.length < 2) return undefined;
    // Sem pular o passo com a aba escondida: a frase e o traço de progresso
    // são animações de 8s presas a este relógio, e pular deixaria a frase
    // sumida até o próximo passo. O navegador já desacelera timers de abas
    // escondidas por conta própria.
    const t = setInterval(() => setPasso((p) => p + 1), INTERVALO_MS);
    return () => clearInterval(t);
  }, [semMovimento]);

  const ativo = SLIDES.length ? passo % SLIDES.length : 0;
  const anterior = passo > 0 && SLIDES.length > 1 ? (passo - 1) % SLIDES.length : -1;
  const estado = (i) => (i === ativo ? 'ativa' : i === anterior ? 'anterior' : 'oculta');

  const emDestaque = SLIDES[ativo]?.tipo === 'destaque';
  const frase = frases[passo % frases.length];

  /*
   * Profundidade: grava a posição do mouse em duas variáveis CSS, e o CSS
   * faz o resto. Nada é re-renderizado a cada movimento — só uma escrita por
   * quadro de animação.
   */
  const mover = (e) => {
    if (semMovimento || !painel.current) return;
    const { left, top, width, height } = painel.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 2 - 1;
    const y = ((e.clientY - top) / height) * 2 - 1;
    cancelAnimationFrame(quadro.current);
    quadro.current = requestAnimationFrame(() => {
      painel.current?.style.setProperty('--px', x.toFixed(3));
      painel.current?.style.setProperty('--py', y.toFixed(3));
    });
  };

  const centralizar = () => {
    painel.current?.style.setProperty('--px', '0');
    painel.current?.style.setProperty('--py', '0');
  };

  // Lema, frase e véu da direita saem de cena quando o slide é um destaque.
  const somemNoDestaque = `transition-opacity duration-700 ${emDestaque ? 'opacity-0' : 'opacity-100'}`;

  return (
    <aside
      ref={painel}
      onPointerMove={mover}
      onPointerLeave={centralizar}
      className="entrada-painel relative hidden overflow-hidden lg:block lg:w-[55%]"
      aria-hidden="true"
    >
      {/* Fundo: a mesma imagem, ampliada e desfocada. A nova surge por cima
          da anterior, em vez de as duas ficarem meio transparentes ao mesmo
          tempo — que deixava o marinho piscar no meio da troca. */}
      <div className="entrada-profundidade-fundo absolute -inset-[8%]">
        {SLIDES.map(({ src }, i) => (
          <img
            key={src}
            src={src}
            alt=""
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover blur-2xl brightness-[.45] saturate-[1.2]
              transition-opacity duration-[1600ms] ease-out ${CAMADA[estado(i)]}`}
          />
        ))}
      </div>

      {/* A imagem inteira: retrato na altura do painel; destaque na largura. */}
      <div className="entrada-profundidade-frente absolute inset-0">
        {SLIDES.map(({ src, tipo }, i) => (
          <div
            key={src}
            className={`absolute ${CAMADA[estado(i)]} ${tipo === 'retrato'
              ? 'inset-y-0 left-[3%] w-[62%]'
              : 'inset-0 flex items-center justify-center px-6'}`}
          >
            {/* O destaque traz o próprio fundo desfocado, cobrindo o painel
                inteiro: é o que esconde o slide anterior em volta dele. */}
            {tipo === 'destaque' && (
              <img
                src={src}
                alt=""
                decoding="async"
                className={`absolute inset-0 h-full w-full scale-125 object-cover blur-2xl brightness-[.45] saturate-[1.2]
                  ${estado(i) === 'oculta' ? '' : 'entrada-dissolver'}`}
              />
            )}
            <img
              src={src}
              alt=""
              decoding="async"
              className={`${tipo === 'retrato'
                ? 'absolute inset-y-0 left-0 h-full w-auto max-w-none object-contain'
                : 'entrada-bordas-suaves relative h-auto w-full object-contain'}
                ${estado(i) === 'oculta' ? '' : 'entrada-foto'}`}
            />
          </div>
        ))}
      </div>

      {/* Véus: escurecem a direita (para o lema e a frase) e o alto (para a
          marca). O da direita sai no destaque, que traz o próprio fundo. */}
      <div className={`entrada-veu absolute inset-0 z-20 ${somemNoDestaque}`} />
      <div className="entrada-veu-topo absolute inset-x-0 top-0 z-20 h-32" />

      <p className="absolute right-12 top-10 z-30 text-lg font-semibold tracking-tight text-white">
        Portal CRC
      </p>

      {/* O lema das camisetas, com o "&" na cor da marca. */}
      <p
        className={`absolute right-12 top-[20%] z-30 text-right text-4xl font-bold leading-[1.08] tracking-tight
          text-white xl:text-5xl 2xl:text-6xl ${somemNoDestaque}`}
      >
        {['Simplificar', 'Transformar', 'Apoiar'].map((palavra, i, todas) => (
          <span key={palavra} className="block overflow-hidden pb-1">
            <span className="entrada-linha block" style={{ animationDelay: `${150 + i * 140}ms` }}>
              {palavra}
              {i < todas.length - 1
                ? <span className="entrada-e-comercial">&amp;</span>
                : '.'}
            </span>
          </span>
        ))}
      </p>

      {/* A frase: troca junto com o slide. */}
      <div className={`pointer-events-none absolute inset-0 z-30 ${somemNoDestaque}`}>
        <figure
          key={passo}
          className={`${semMovimento ? '' : 'entrada-frase'} absolute bottom-16 right-12 max-w-sm text-right`}
        >
          <blockquote className="text-base font-light leading-relaxed text-white/90 xl:text-lg">
            “{frase.texto}”
          </blockquote>
          <figcaption className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-white/50">
            {frase.autor}
          </figcaption>
        </figure>
      </div>

      {/* Em qual slide estamos, e quanto falta para o próximo. */}
      {SLIDES.length > 1 && !semMovimento && (
        <div className="absolute bottom-10 left-10 z-30 flex gap-2">
          {SLIDES.map(({ src }, i) => (
            <span key={src} className="h-0.5 w-8 overflow-hidden rounded-full bg-white/25">
              {i === ativo && (
                <span key={passo} className="entrada-progresso-foto block h-full origin-left bg-white" />
              )}
            </span>
          ))}
        </div>
      )}
    </aside>
  );
}
