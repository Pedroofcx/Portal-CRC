import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import db from '@/api/db';
import emblema from '@/assets/destaques/meteoro.webp';
import { CLASSICAS } from '@/components/login/frases';
import { primeiroNome } from '@/lib/nomes';
import { saudacao } from '@/lib/saudacao';
import { resumoDoDia } from '@/lib/resumoDoDia';

/**
 * Sequência de boas-vindas depois do login — uma vez por dia.
 *
 * TRÊS ATOS, E DEPOIS A CORTINA
 *   1. Cortina   (0 a 3,4s)   "Boa tarde, Pedro." grande, a foto (ou a
 *                              inicial) e o lema. Continua a tela de entrada.
 *   2. Seu dia   (3,4 a 8,2s) tratativas abertas, que vencem o SLA hoje, e
 *                              as já vencidas; mais a frase do dia.
 *   3. Meteoro   (8,2 a 11,4s) um cometa cruza, o emblema acende.
 *   Depois, a tela sobe como uma cortina e o sistema entra em cascata, de
 *   cima para baixo (isso é feito pelo Layout, em `aoConcluir`).
 *
 * PULAR: um clique ou qualquer tecla vai direto para a cortina. A tela ficou
 * mais longa por decisão do Pedro; o "pular" é o que a mantém dentro do
 * espírito das regras — ninguém é obrigado a esperar para trabalhar.
 *
 * O NOME é sempre o primeiro nome do cadastro de colaborador, nunca o e-mail.
 *
 * AGENTE vê as próprias tratativas; GESTOR vê as da equipe toda.
 */

const ATO_2 = 3400;
const ATO_3 = 8200;
const SAIDA = 11400;
const CORTINA = 800;

/**
 * Mesma frase o dia inteiro: sorteada pela data, não a cada abertura. Só as
 * clássicas — os bordões da equipe ficam na tela de entrada, onde trocam a
 * cada 8s; como "frase do dia" um deles se repetiria o dia todo.
 */
function fraseDoDia(hoje = new Date()) {
  const dias = Math.floor(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime() / 864e5);
  return CLASSICAS[dias % CLASSICAS.length];
}

function dataPorExtenso(hoje = new Date()) {
  const texto = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function Avatar({ colaborador, nome, tamanho }) {
  const [falhou, setFalhou] = useState(false);
  const foto = colaborador?.foto_url && !falhou;
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/25 bg-white/10 font-semibold text-white ${tamanho}`}
    >
      {foto
        ? <img src={colaborador.foto_url} alt="" className="h-full w-full object-cover" onError={() => setFalhou(true)} />
        : nome.charAt(0)}
    </span>
  );
}

function Numero({ valor, rotulo, tom, atraso }) {
  return (
    <div className="bv-subir rounded-xl border border-white/10 bg-white/[0.06] p-6" style={{ animationDelay: atraso }}>
      <p className={`text-5xl font-bold tracking-tight ${tom}`}>{valor ?? '—'}</p>
      <p className="mt-2 text-sm text-white/65">{rotulo}</p>
    </div>
  );
}

export default function SequenciaBoasVindas({ colaborador, aoConcluir }) {
  const nome = primeiroNome(colaborador?.nome_completo);
  const gestor = colaborador?.papel === 'gestor';
  const ola = useMemo(() => saudacao(), []);
  const frase = useMemo(() => fraseDoDia(), []);
  const data = useMemo(() => dataPorExtenso(), []);

  const [ato, setAto] = useState(1);
  const timers = useRef([]);

  // Começa a buscar já no primeiro ato, para os números estarem prontos no
  // segundo. Se não chegarem a tempo, o cartão mostra "—" em vez de travar.
  const { data: tratativas } = useQuery({
    queryKey: ['boas-vindas-tratativas', gestor ? 'equipe' : colaborador?.id],
    queryFn: () => (gestor
      ? db.entities.Tratativa.list()
      : db.entities.Tratativa.filter({ agente_responsavel_id: colaborador.id })),
    enabled: Boolean(colaborador?.id),
    staleTime: 60 * 1000,
  });
  const resumo = tratativas ? resumoDoDia(tratativas) : null;

  const sair = useCallback(() => {
    timers.current.forEach(clearTimeout);
    setAto('saindo');
    timers.current = [setTimeout(() => aoConcluir?.(), CORTINA)];
  }, [aoConcluir]);

  useEffect(() => {
    timers.current = [
      setTimeout(() => setAto(2), ATO_2),
      setTimeout(() => setAto(3), ATO_3),
      setTimeout(sair, SAIDA),
    ];
    const aoTeclar = () => sair();
    window.addEventListener('keydown', aoTeclar);
    return () => {
      timers.current.forEach(clearTimeout);
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [sair]);

  const saindo = ato === 'saindo';
  const visivel = (n) => (ato === n ? 'opacity-100' : 'opacity-0 pointer-events-none');
  const montado = (n) => ato === n || (typeof ato === 'number' && ato > n) || (saindo && n === 3);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${ola}, ${nome}. Boas-vindas ao Portal CRC.`}
      onClick={sair}
      className="entrada-painel fixed inset-0 z-[100] cursor-pointer overflow-hidden text-white"
      style={{
        transform: saindo ? 'translateY(-100%)' : 'translateY(0)',
        transition: `transform ${CORTINA}ms cubic-bezier(.7, 0, .2, 1)`,
      }}
    >
      {/* Textura de pontos, a mesma família visual da tela de entrada. */}
      <div className="bv-pontos absolute inset-0" />

      {/* ATO 1 — a cortina */}
      <section className={`absolute inset-0 transition-opacity duration-700 ${visivel(1)}`}>
        <div className="absolute left-[8%] top-1/2 -translate-y-1/2">
          <span className="block overflow-hidden">
            <span className="entrada-linha block text-xl font-medium text-[#93b4ff]" style={{ animationDelay: '100ms' }}>
              {ola},
            </span>
          </span>
          <span className="block overflow-hidden pb-2">
            <span className="entrada-linha block text-8xl font-bold tracking-tighter xl:text-9xl" style={{ animationDelay: '250ms' }}>
              {nome}.
            </span>
          </span>
          <span className="block overflow-hidden">
            <span className="entrada-linha block text-xl text-white/70" style={{ animationDelay: '450ms' }}>
              Que bom te ver de novo.
            </span>
          </span>
        </div>
        <div className="bv-surgir-escala absolute right-[10%] top-1/2 -translate-y-1/2" style={{ animationDelay: '500ms' }}>
          <Avatar colaborador={colaborador} nome={nome} tamanho="h-56 w-56 text-7xl" />
        </div>
        <p className="bv-subir absolute bottom-[9%] left-[8%] text-sm font-semibold text-white/55" style={{ animationDelay: '1200ms' }}>
          Simplificar<span className="entrada-e-comercial">&amp;</span> Transformar
          <span className="entrada-e-comercial">&amp;</span> Apoiar.
        </p>
      </section>

      {/* ATO 2 — o seu dia */}
      <section className={`absolute inset-0 transition-opacity duration-700 ${visivel(2)}`}>
        {montado(2) && (
          <div className="absolute inset-x-[8%] top-1/2 -translate-y-1/2">
            <div className="bv-subir flex items-center gap-5">
              <Avatar colaborador={colaborador} nome={nome} tamanho="h-16 w-16 text-2xl" />
              <div>
                <p className="text-4xl font-bold tracking-tight">{gestor ? 'O dia da equipe' : `O seu dia, ${nome}`}</p>
                <p className="mt-1 text-white/60">{data}</p>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-4 gap-5">
              <Numero valor={resumo?.abertas} rotulo={gestor ? 'tratativas abertas na equipe' : 'tratativas abertas'} tom="text-[#93b4ff]" atraso="300ms" />
              <Numero valor={resumo?.vencemHoje} rotulo="vencem o SLA hoje" tom="text-[#fbbf24]" atraso="450ms" />
              <Numero valor={resumo?.vencidas} rotulo="com o SLA vencido" tom="text-[#fb923c]" atraso="600ms" />
              <figure className="bv-subir flex flex-col justify-center rounded-xl border border-white/10 bg-white/[0.06] p-6" style={{ animationDelay: '750ms' }}>
                <blockquote className="text-base font-light italic leading-relaxed text-white/90">“{frase.texto}”</blockquote>
                <figcaption className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-white/50">{frase.autor}</figcaption>
              </figure>
            </div>
          </div>
        )}
      </section>

      {/* ATO 3 — M.E.T.E.O.R.O. */}
      <section className={`absolute inset-0 bg-[#050206] transition-opacity duration-1000 ${visivel(3)} ${saindo ? '!opacity-100' : ''}`}>
        {montado(3) && (
          <>
            <span className="bv-cometa absolute right-[-10%] top-[-10%] h-[3px] w-[40%]" />
            <img src={emblema} alt="" className="bv-emblema absolute left-1/2 top-[44%] w-[min(62%,900px)]" />
            <div className="bv-subir absolute inset-x-0 bottom-[11%] text-center" style={{ animationDelay: '1400ms' }}>
              <p className="text-4xl font-bold tracking-tight">Tenha um ótimo dia, {nome}.</p>
            </div>
          </>
        )}
      </section>

      {!saindo && (
        <>
          <p className="absolute bottom-6 right-8 z-10 text-xs text-white/50">
            Clique ou pressione qualquer tecla para pular
          </p>
          <span className="bv-progresso absolute bottom-0 left-0 z-10 h-[3px] bg-white/80" style={{ animationDuration: `${SAIDA}ms` }} />
        </>
      )}
    </div>
  );
}
