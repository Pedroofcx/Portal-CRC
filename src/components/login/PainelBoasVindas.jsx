import React from 'react';
import { Building2, CheckCircle2, Clock, MessageSquareWarning, Star } from 'lucide-react';

/**
 * Painel de boas-vindas da tela de entrada.
 *
 * Mostra o ciclo central do sistema — tratativas passando por Registrada,
 * Em andamento e Encerrada — em vez de uma ilustração genérica. Quem entra
 * vê, antes de qualquer tela, o que o Portal faz.
 *
 * Os três cartões rodam o mesmo ciclo de 9s, defasados em 3s: a qualquer
 * momento há um em cada estado. Sem movimento (prefers-reduced-motion), cada
 * cartão fica parado num estado diferente e a história continua legível.
 *
 * Os tipos de tratativa são os do próprio sistema. Não há nome de cliente,
 * número nem valor: é ilustração, e não deve ser confundida com dado real.
 */

/*
 * As classes de animação vão escritas por extenso, e não montadas com
 * `entrada-fase-${n}`: o Tailwind só mantém no site final as classes que
 * encontra literalmente no código. Montadas, elas eram descartadas no build
 * e os selos ficavam invisíveis.
 */
const FASES = [
  { rotulo: 'Registrada', classe: 'bg-info-soft text-info', animacao: 'entrada-fase-1', Icone: Clock },
  { rotulo: 'Em andamento', classe: 'bg-warning-soft text-warning', animacao: 'entrada-fase-2', Icone: Clock },
  { rotulo: 'Encerrada', classe: 'bg-success-soft text-success', animacao: 'entrada-fase-3', Icone: CheckCircle2 },
];

const CARTOES = [
  { tipo: 'Reclame Aqui', Icone: MessageSquareWarning, atraso: '0s', estatica: 3, recuo: 'ml-0' },
  { tipo: 'Google Meu Negócio', Icone: Star, atraso: '-3s', estatica: 2, recuo: 'ml-16' },
  { tipo: 'Reclamação interna', Icone: Building2, atraso: '-6s', estatica: 1, recuo: 'ml-6' },
];

function CartaoTratativa({ tipo, Icone, atraso, estatica, recuo }) {
  return (
    <div
      className={`entrada-cartao ${recuo} w-[26rem] max-w-full rounded-xl border border-white/10 bg-white/[0.06] p-5`}
      style={{ animationDelay: atraso }}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <Icone className="h-4 w-4 text-white/80" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <p className="truncate text-sm font-medium text-white">{tipo}</p>
          {/* Linhas abstratas no lugar do texto: sugerem conteúdo sem inventar dado. */}
          <span className="block h-1.5 w-40 rounded-full bg-white/15" />
          <span className="block h-1.5 w-24 rounded-full bg-white/10" />
        </div>

        {/* Os três selos ocupam o mesmo lugar; a animação troca qual aparece. */}
        <span className="relative h-6 w-[7.5rem] shrink-0">
          {FASES.map(({ rotulo, classe, animacao, Icone: IconeFase }, i) => (
            <span
              key={rotulo}
              className={`entrada-fase ${animacao} ${estatica === i + 1 ? 'entrada-fase-estatica' : ''}
                absolute inset-y-0 right-0 inline-flex items-center gap-1 rounded-md px-2 text-xs font-medium ${classe}`}
              style={{ animationDelay: atraso }}
            >
              <IconeFase className="h-3 w-3" aria-hidden="true" />
              {rotulo}
            </span>
          ))}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">SLA</span>
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <span
            className="entrada-progresso block h-full rounded-full"
            style={{
              animationDelay: atraso,
              // Estado parado, para quem pediu para reduzir movimento.
              width: `${[34, 70, 100][estatica - 1]}%`,
              backgroundColor: `hsl(var(--${['info', 'warning', 'success'][estatica - 1]}))`,
            }}
          />
        </span>
      </div>
    </div>
  );
}

export default function PainelBoasVindas() {
  return (
    <aside
      className="relative hidden overflow-hidden lg:flex lg:w-[55%] lg:flex-col lg:justify-between"
      style={{ backgroundColor: 'hsl(222 47% 13%)' }}
      aria-hidden="true"
    >
      {/* Fundo: pontilhado e duas luzes na cor institucional. */}
      <div className="entrada-grade absolute inset-0" />
      <div
        className="entrada-brilho absolute -left-24 top-1/4 h-96 w-96 rounded-full blur-3xl"
        style={{ backgroundColor: 'hsl(var(--primary) / 0.35)' }}
      />
      <div
        className="entrada-brilho absolute -bottom-32 right-0 h-80 w-80 rounded-full blur-3xl"
        style={{ backgroundColor: 'hsl(var(--primary) / 0.2)', animationDelay: '-7s' }}
      />

      <div className="relative flex items-center gap-3 p-12">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
          C
        </span>
        <span className="text-lg font-semibold text-white">Portal CRC</span>
      </div>

      <div className="relative flex flex-col gap-5 px-12 xl:px-20">
        {CARTOES.map((c) => <CartaoTratativa key={c.tipo} {...c} />)}
      </div>

      <div className="relative max-w-md space-y-3 p-12">
        <p className="text-2xl font-semibold leading-snug text-white">
          Cada cliente, do primeiro contato à solução.
        </p>
        <p className="text-sm leading-relaxed text-white/60">
          Tratativas, escalas, pontuação e desenvolvimento da equipe num só lugar.
        </p>
      </div>
    </aside>
  );
}
