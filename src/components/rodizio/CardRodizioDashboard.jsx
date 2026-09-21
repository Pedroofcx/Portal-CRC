import db from '@/api/db';
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { UserCog, Headset } from 'lucide-react';
import { findNextLider, getPosicaoAtual } from '@/components/lider-tecnico/rodizioUtils';
import { findNextN2, getPosicaoAtualN2 } from '@/components/apoio-n2/rodizioN2Utils';
import { primeiroNome } from '@/lib/nomes';

/**
 * Rodízio do Líder Técnico e do Apoio N2: quem é o próximo, quem foi o último
 * e quem fez a última solicitação.
 *
 * Card branco, cor só no ícone (regras-ui-ux.md, seção 9). Antes era um bloco
 * de cor cheia — roxo um, azul o outro — que gritava mais alto que a fila de
 * trabalho ao lado. A cor continua separando as duas categorias, mas no
 * detalhe: roxo (chart-5) para o Líder, petróleo (chart-4) para o N2. O
 * azul-botão (chart-1) fica de fora: categoria não é ação.
 *
 * "Próximo" vem primeiro porque é a pergunta de quem abre o card.
 */
const DATA_HORA = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' };

export default function CardRodizioDashboard({ tipo }) {
  const isLider = tipo === 'lider';

  const entityName = isLider ? 'LiderTecnico' : 'AgenteN2';
  const acionamentoName = isLider ? 'AcionamentoLiderTecnico' : 'AcionamentoN2';
  const nomeField = isLider ? 'lider_tecnico_nome' : 'agente_n2_nome';
  const Icon = isLider ? UserCog : Headset;
  const findNext = isLider ? findNextLider : findNextN2;
  const getPosicao = isLider ? getPosicaoAtual : getPosicaoAtualN2;
  const titulo = isLider ? 'Líder Técnico' : 'Apoio N2';
  const tomIcone = isLider ? 'bg-chart-5/10 text-chart-5' : 'bg-chart-4/10 text-chart-4';

  const { data: participantes = [] } = useQuery({
    queryKey: [`rodizio-${tipo}-dashboard`],
    queryFn: () => db.entities[entityName].list(),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: acionamentos = [] } = useQuery({
    queryKey: [`acionamentos-${tipo}-dashboard`],
    queryFn: () => db.entities[acionamentoName].list('-data_acionamento', 10),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: configuracoes = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => db.entities.Configuracao.list(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const proximo = useMemo(() => findNext(participantes, getPosicao(configuracoes)), [participantes, configuracoes]);
  const ultimo = acionamentos?.[0] || null;
  const proximoNome = proximo
    ? (isLider ? proximo.lider?.colaborador_nome : proximo.agente?.colaborador_nome) || '—'
    : '—';
  const ultimoNome = ultimo ? ultimo[nomeField] || '—' : '—';

  // Quem pediu por último, pelo primeiro nome — o mesmo padrão das boas-vindas.
  const solicitante = ultimo?.usuario_nome ? primeiroNome(ultimo.usuario_nome) : null;
  const quando = ultimo?.data_acionamento
    ? new Date(ultimo.data_acionamento).toLocaleString('pt-BR', DATA_HORA).replace(', ', ' às ')
    : null;

  return (
    // block: link é elemento de linha e ignora a margem vertical — empilhado
    // na lateral do operador, o card grudava no de cima.
    <Link
      to={createPageUrl('FerramentasOperacionais')}
      className="block h-full rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tomIcone}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{titulo}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground" title={`Próximo: ${proximoNome} · último: ${ultimoNome}`}>
            Próximo: <span className="font-semibold text-foreground">{proximoNome}</span>
            <span aria-hidden="true"> · </span>
            último: {ultimoNome}
          </p>
          {solicitante && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground" title={`Última solicitação: ${solicitante}${quando ? ` · ${quando}` : ''}`}>
              Última solicitação: <span className="font-medium text-foreground">{solicitante}</span>
              {quando && <span> · {quando}</span>}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
