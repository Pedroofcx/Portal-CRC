import db from '@/api/db';
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Cartao, Linha } from '@/components/ui/Cartao';
import TabelaResumida from '@/components/ui/TabelaResumida';
import { useRankingCiclo } from '@/hooks/useRankingCiclo';
import { posicaoNoRanking } from '@/lib/posicaoRanking';
import { pessoasNoPeriodo } from '@/lib/relatorios/pessoas';
import { situacaoReplicavel } from '@/components/utils/helpers';
import { STATUS_ENCERRADOS } from '@/lib/bonusManual';
import { ComoCalculamos, Pergunta, periodoPorExtenso } from '@/components/relatorios/hub/Pecas';
import { urlDaPessoa } from '@/components/dashboard/gestor/PainelCicloGestor';

/**
 * Relatórios › Pessoas e premiação — o ranking oficial do ciclo (a mesma
 * conta da tela inicial e do "Meu ciclo") e como cada pessoa está no período.
 */
const pts = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
const nota = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }));

export default function Pessoas({ tratativas, periodo, ciclos, colaboradores }) {
  const ciclo = ciclos.find((c) => c.id === periodo.chave) ?? null;
  const { ranking } = useRankingCiclo(ciclo?.id ?? null);

  const { data: apuracoes = [] } = useQuery({
    queryKey: ['apuracoes-equipe'],
    queryFn: () => db.entities.Apuracao.list('-periodo_fim'),
    staleTime: 120000,
  });
  const { data: hanseis = [] } = useQuery({
    queryKey: ['hansei-envios', "list('-data_envio')"],
    queryFn: () => db.entities.HanseiEnvio.list('-data_envio'),
    staleTime: 120000,
  });

  const pessoas = useMemo(() => pessoasNoPeriodo({ tratativas, apuracoes, colaboradores, periodo }), [tratativas, apuracoes, colaboradores, periodo]);
  const replicaveisPendentes = useMemo(
    () => tratativas.filter((t) => !t.excluida && STATUS_ENCERRADOS.includes(t.status) && situacaoReplicavel(t) === 'pendente').length,
    [tratativas],
  );
  const hanseiNaoLidos = hanseis.filter((h) => !h.visualizado).length;

  return (
    <div className="space-y-6">
      <Pergunta
        pergunta="Como cada pessoa está?"
        explicacao={`O ranking oficial da premiação e os números de cada agente ${periodoPorExtenso(periodo)}.`}
      />

      <div className="grid items-start gap-6 xl:grid-cols-5">
        <Cartao titulo={ciclo ? `Ranking do ${ciclo.nome}` : 'Ranking da premiação'} className="xl:col-span-2">
          {!ciclo ? (
            <p className="text-sm text-muted-foreground">O ranking é por ciclo da premiação. Escolha um ciclo no período, lá em cima.</p>
          ) : (
            <div className="divide-y divide-border">
              {ranking.map((r) => (
                <Link key={r.id} to={urlDaPessoa(r.id, ciclo.id)} className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-muted/50">
                  <span className="min-w-0 text-foreground">
                    <span className="mr-2 font-semibold tabular-nums">{posicaoNoRanking(ranking, r.id)?.posicao}º</span>
                    {r.nome}
                    <span className="block text-xs text-muted-foreground">
                      tratativas {pts(r.pontosEncerramento)} · abertas {pts(r.pontosAbertura)} · indicadores {pts(r.pontosIndicadores)} · bônus {pts(r.bonus)}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-foreground">{pts(r.totalPontos)}</span>
                </Link>
              ))}
            </div>
          )}
          <ComoCalculamos>
            <p>A mesma conta da tela inicial e do “Meu ciclo” de cada agente, pelas regras do POP 11: pontos das tratativas encerradas no ciclo, 0,5 por tratativa aberta, os indicadores (CSAT, performance e avaliação) e o bônus que você lança.</p>
            <p>Clique numa pessoa para ver de onde veio cada ponto.</p>
          </ComoCalculamos>
        </Cartao>

        <div className="space-y-6 xl:col-span-3">
          <Cartao titulo="O que depende de você">
            <div className="divide-y divide-border">
              <Link to={createPageUrl('SolucoesReplicaveis')} className="block hover:bg-muted/50">
                <Linha rotulo="Soluções replicáveis esperando aprovação" detalhe="o meio ponto só conta depois que você aprova" valor={replicaveisPendentes} />
              </Link>
              <Link to={createPageUrl('Hansei')} className="block hover:bg-muted/50">
                <Linha rotulo="Hanseis enviados e ainda não lidos" valor={hanseiNaoLidos} />
              </Link>
            </div>
          </Cartao>

          <Cartao titulo="Cada pessoa no período">
            <TabelaResumida
              linhas={pessoas}
              chaveDaLinha={(p) => p.id}
              rotuloDetalhe="Ver os números da pessoa"
              colunas={[
                { chave: 'nome', rotulo: 'Agente', alinhar: 'esquerda', principal: true, valor: (p) => p.nome },
                { chave: 'enc', rotulo: 'Encerradas', principal: true, valor: (p) => p.encerradas },
                { chave: 'prazo', rotulo: 'No prazo', principal: true, valor: (p) => pct(p.pctNoPrazo) },
                { chave: 'csat', rotulo: 'CSAT', principal: true, valor: (p) => pct(p.indicadores.csat?.valor) },
                { chave: 'perf', rotulo: 'Performance', principal: true, valor: (p) => pct(p.indicadores.performance?.valor) },
                { chave: 'cx', rotulo: 'Avaliação CX', valor: (p) => nota(p.indicadores.cx?.valor) },
                { chave: 'abertas', rotulo: 'Tratativas abertas por ela no período', valor: (p) => p.abertas },
                { chave: 'reab', rotulo: 'Clientes que voltaram em 7 dias', valor: (p) => p.reaberturas },
                { chave: 'rep', rotulo: 'Soluções replicáveis', valor: (p) => `${p.replicaveis.aprovadas} aprovadas · ${p.replicaveis.pendentes} pendentes · ${p.replicaveis.contestadas} contestadas` },
              ]}
            />
            <ComoCalculamos>
              <p><strong>Encerradas e no prazo:</strong> tratativas encerradas no período; “no prazo” é o SLA calculado pelo servidor.</p>
              <p><strong>CSAT:</strong> (CSAT do telefone + CSAT do chat) ÷ 2, cada canal com todas as avaliações do período. <strong>Performance:</strong> ligações atendidas ÷ ligações recebidas. <strong>Avaliação CX:</strong> média das avaliações do período. Vêm da tela Apuração — sem apuração importada, aparece “—”.</p>
            </ComoCalculamos>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
