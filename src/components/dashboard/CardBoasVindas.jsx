import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import db from '@/api/db';
import { Quote, Star } from 'lucide-react';
import { formatDateSP } from '@/components/utils/helpers';

/**
 * Card de destaque do Dashboard — saudação, data, papel e frase motivacional.
 *
 * Reúne num só bloco o que antes eram três: o cabeçalho de página, o card do
 * Facilitador Interno (que era um gradiente roxo-azul solto) e o
 * MotivationalQuote (outro gradiente, azul-roxo). Três gradientes diferentes
 * empilhados no topo da mesma tela.
 *
 * Este é o único elemento do sistema com gradiente — a seção 7 das regras o
 * permite exclusivamente em card de destaque do Dashboard.
 *
 * A frase troca a cada 8 segundos, como já fazia. Sem animação de entrada:
 * movimento no topo da tela a cada 8s incomoda quem passa o dia aqui.
 */
export default function CardBoasVindas({ nome, papel, facilitadorInterno, fiExpiracao }) {
  const [indice, setIndice] = useState(0);

  const { data: frases = [] } = useQuery({
    queryKey: ['frases-motivacionais'],
    queryFn: () => db.entities.FraseMotivacional.filter({ ativa: true }),
  });

  useEffect(() => {
    if (frases.length < 2) return;
    const t = setInterval(() => setIndice((i) => (i + 1) % frases.length), 8000);
    return () => clearInterval(t);
  }, [frases.length]);

  const frase = frases[indice];
  const primeiroNome = nome?.split(' ')[0] || 'Usuário';
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <section className="overflow-hidden rounded-xl bg-gradient-to-br from-primary to-[hsl(221_83%_44%)] text-primary-foreground">
      <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">

        <div className="min-w-0">
          <p className="text-sm text-primary-foreground/75">
            {formatDateSP(new Date(), 'DD/MM/YYYY')} · {papel === 'gestor' ? 'Visão gerencial' : 'Visão do agente'}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-primary-foreground">
            {saudacao}, {primeiroNome}
          </h1>

          {facilitadorInterno && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-sm">
              <Star className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Você é o Facilitador Interno
                {fiExpiracao && ` · até ${formatDateSP(fiExpiracao, 'DD/MM/YYYY')}`}
              </span>
            </p>
          )}
        </div>

        {frase && (
          <figure className="flex max-w-md gap-3 border-t border-white/20 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <Quote className="h-5 w-5 shrink-0 text-primary-foreground/60" aria-hidden="true" />
            <div className="min-w-0">
              <blockquote className="text-sm italic leading-relaxed text-primary-foreground/95">
                {frase.texto}
              </blockquote>
              {frase.autor && (
                <figcaption className="mt-1.5 text-xs text-primary-foreground/70">— {frase.autor}</figcaption>
              )}
            </div>
          </figure>
        )}

      </div>
    </section>
  );
}
