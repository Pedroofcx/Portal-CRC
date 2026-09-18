import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FRASES } from './frases';

/**
 * Painel de boas-vindas da tela de entrada: a equipe, o lema e uma frase.
 *
 * O QUE ACONTECE AQUI
 *   - As fotos da equipe se revezam a cada 8s, com fade de 1,2s.
 *   - A foto ativa se aproxima devagar (efeito Ken Burns).
 *   - Com o mouse, a pessoa e o fundo se movem alguns pixels em direções
 *     opostas: dá profundidade sem virar distração.
 *   - O lema entra linha por linha quando a tela abre.
 *   - A frase troca junto com a foto, como um slide.
 *
 * AS FOTOS NÃO SÃO CORTADAS. São retratos em pé, e o painel é mais largo que
 * alto — preencher sem cortar seria impossível. A foto fica inteira, na
 * altura do painel, e o resto é preenchido pela MESMA foto, ampliada e
 * desfocada. É isso que evita faixa vazia dos lados.
 *
 * PARA ACRESCENTAR UMA PESSOA: coloque a foto em src/assets/equipe/ (webp,
 * jpg ou png, de preferência em pé) e publique. Ela entra sozinha na
 * sequência, na ordem do nome do arquivo. Nenhum código precisa mudar.
 *
 * Quem pediu para reduzir movimento vê a primeira foto e a primeira frase,
 * paradas: sem revezamento, sem zoom, sem profundidade.
 *
 * Regras: documentacao/regras-ui-ux.md, seção 8.
 */

const FOTOS = Object.entries(
  import.meta.glob('/src/assets/equipe/*.{webp,jpg,jpeg,png}', { eager: true, import: 'default' }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);

const INTERVALO_MS = 8000;

function querMenosMovimento() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default function PainelBoasVindas() {
  const semMovimento = useMemo(querMenosMovimento, []);
  const painel = useRef(null);
  const quadro = useRef(0);

  // Cada entrada começa numa frase diferente: quem abre o sistema todo dia
  // não lê sempre a mesma primeira.
  const inicioFrase = useMemo(() => Math.floor(Math.random() * FRASES.length), []);
  const [passo, setPasso] = useState(0);

  useEffect(() => {
    if (semMovimento || FOTOS.length < 2) return undefined;
    const t = setInterval(() => {
      // Aba escondida não gira: ninguém está vendo, e a pessoa volta para a
      // mesma foto em que estava.
      if (!document.hidden) setPasso((p) => p + 1);
    }, INTERVALO_MS);
    return () => clearInterval(t);
  }, [semMovimento]);

  const fotoAtiva = FOTOS.length ? passo % FOTOS.length : 0;
  const frase = FRASES[(inicioFrase + passo) % FRASES.length];

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

  return (
    <aside
      ref={painel}
      onPointerMove={mover}
      onPointerLeave={centralizar}
      className="entrada-painel relative hidden overflow-hidden lg:block lg:w-[55%]"
      aria-hidden="true"
    >
      {/* Fundo: a mesma foto, ampliada e desfocada. */}
      <div className="entrada-profundidade-fundo absolute -inset-[8%]">
        {FOTOS.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover blur-2xl brightness-[.45] saturate-[1.2]
              transition-opacity duration-[1200ms] ${i === fotoAtiva ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
      </div>

      {/* A foto inteira, na altura do painel. */}
      <div className="entrada-profundidade-frente absolute inset-y-0 left-[3%] w-[62%]">
        {FOTOS.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            decoding="async"
            className={`absolute inset-y-0 left-0 h-full w-auto max-w-none object-contain
              transition-opacity duration-[1200ms]
              ${i === fotoAtiva ? 'entrada-kenburns opacity-100' : 'opacity-0'}`}
          />
        ))}
      </div>

      {/* Escurece a direita, para o texto ler bem sobre qualquer foto. */}
      <div className="entrada-veu absolute inset-0" />

      <div className="absolute left-10 top-10 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
          C
        </span>
        <span className="text-lg font-semibold text-white">Portal CRC</span>
      </div>

      {/* O lema das camisetas, com o "&" na cor da marca. */}
      <p className="absolute right-12 top-[20%] text-right text-4xl font-bold leading-[1.08] tracking-tight text-white xl:text-5xl 2xl:text-6xl">
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

      {/* A frase: troca junto com a foto. */}
      <figure key={passo} className="entrada-frase absolute bottom-16 right-12 max-w-sm text-right">
        <blockquote className="text-base font-light leading-relaxed text-white/90 xl:text-lg">
          “{frase.texto}”
        </blockquote>
        <figcaption className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-white/50">
          {frase.autor}
        </figcaption>
      </figure>

      {/* Em qual foto estamos, e quanto falta para a próxima. */}
      {FOTOS.length > 1 && !semMovimento && (
        <div className="absolute bottom-10 left-10 flex gap-2">
          {FOTOS.map((src, i) => (
            <span key={src} className="h-0.5 w-8 overflow-hidden rounded-full bg-white/25">
              {i === fotoAtiva && (
                <span key={passo} className="entrada-progresso-foto block h-full origin-left bg-white" />
              )}
            </span>
          ))}
        </div>
      )}
    </aside>
  );
}
