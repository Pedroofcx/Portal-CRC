import db from '@/api/db';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';

import { createPageUrl } from '@/utils';
import { formatDateSP } from '@/components/utils/helpers';
import { usePontuacaoAgente } from '@/hooks/usePontuacaoAgente';
import { useRankingCiclo } from '@/hooks/useRankingCiclo';
import { posicaoNoRanking } from '@/lib/posicaoRanking';
import { proximaFaixa } from '@/lib/faixasIndicadores';
import { detalheCsat } from '@/lib/indicadoresCiclo';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ListaResumida from '@/components/ui/ListaResumida';
import { Cartao, Linha } from '@/components/ui/Cartao';
import ExtratoPontos from '@/components/performance/ExtratoPontos';
import PDIModal from '@/components/performance/PDIModal';
import FeedbackModal from '@/components/performance/FeedbackModal';
import { tipoLabels } from '@/components/observacoes/HistoricoColaborador';

/**
 * Minha Performance — o ciclo do agente, em leitura.
 *
 * Mesma linguagem da visão detalhada do gestor (CicloColaborador): cartões
 * brancos, linhas rótulo/valor, números em destaque, nenhum ícone decorativo.
 * Ordem: o resultado (pontos e posição), o extrato que explica cada ponto, e
 * ao lado os indicadores, as tratativas do ciclo e o acompanhamento.
 * Todas as contas são as do ranking (usePontuacaoAgente).
 */
const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dataCurta = (iso) => (iso ? `${String(iso).slice(8, 10)}/${String(iso).slice(5, 7)}` : '—');
const pct = (v) => `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const nota = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

function Numero({ rotulo, valor }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className="text-lg font-semibold tabular-nums text-foreground">{valor}</p>
    </div>
  );
}

export default function MinhaPerformance() {
  const [pdiAberto, setPdiAberto] = React.useState(null);
  const [feedbackAberto, setFeedbackAberto] = React.useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
  });
  const colaborador = React.useMemo(
    () => colaboradores.find((c) => c.email?.toLowerCase() === user?.email?.toLowerCase()),
    [colaboradores, user],
  );

  const { data: configuracoes = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => db.entities.Configuracao.list(),
    staleTime: 300000,
  });
  const rankingVisivel = configuracoes.find((c) => c.chave === 'ranking_visivel_agentes')?.valor !== 'false';

  const { data: pdis = [] } = useQuery({
    queryKey: ['pdis', 'colaborador', colaborador?.id],
    queryFn: () => db.entities.PDI.filter({ colaborador_id: colaborador.id }, '-created_date'),
    enabled: Boolean(colaborador?.id),
  });
  const { data: observacoes = [] } = useQuery({
    queryKey: ['observacoes', "list('-created_date')"],
    queryFn: () => db.entities.Observacao.list('-created_date'),
  });
  const { data: hanseis = [] } = useQuery({
    queryKey: ['hansei-envios', 'colaborador', colaborador?.id],
    queryFn: () => db.entities.HanseiEnvio.filter({ colaborador_id: colaborador.id }, '-data_envio', 5),
    enabled: Boolean(colaborador?.id),
  });

  const {
    totalPontos, extrato, indicadores, tratativasEncerradas, cicloAtivo, isLoading,
  } = usePontuacaoAgente(colaborador?.id);
  const { ranking } = useRankingCiclo();
  const posicao = rankingVisivel ? posicaoNoRanking(ranking, colaborador?.id) : null;

  // Feedbacks que a pessoa pode ver (o banco já filtra; aqui só os dela).
  const meusFeedbacks = React.useMemo(() => observacoes
    .filter((o) => o.visibilidade !== 'gestor' && o.colaboradores_ids?.includes(colaborador?.id)), [observacoes, colaborador]);
  const pdi = pdis.find((p) => p.status === 'em_andamento') ?? null;
  const hansei = hanseis[0] ?? null;

  if (!user || isLoading) return <LoadingSpinner text="Carregando sua performance..." />;
  if (colaboradores.length > 0 && !colaborador) {
    return <p className="text-sm text-muted-foreground">Seu usuário ainda não está cadastrado como colaborador. Fale com o gestor.</p>;
  }

  const grupo = (chave) => extrato?.grupos.find((g) => g.chave === chave)?.subtotal ?? 0;
  const noPrazo = tratativasEncerradas.filter((t) => t.encerrado_no_sla).length;
  const abertas = extrato?.grupos.find((g) => g.chave === 'aberturas')?.itens.length ?? 0;

  const linhaIndicador = (chave, rotulo, dado, formato) => {
    if (!dado) return <Linha key={chave} rotulo={rotulo} detalhe="aguardando apuração" valor="—" />;
    const prox = proximaFaixa(chave, dado.valor);
    const detalhe = [
      formato(dado.valor),
      chave === 'csat' ? detalheCsat(dado) : null,
      prox ? `${formato(prox.limiar)} vale +${prox.ganho}` : 'faixa máxima',
    ].filter(Boolean).join(' · ');
    return <Linha key={chave} rotulo={rotulo} detalhe={detalhe} valor={fmt(indicadores?.pontos?.[chave] ?? 0)} />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minha Performance"
        subtitle={cicloAtivo ? `${cicloAtivo.nome} · ${dataCurta(cicloAtivo.data_inicio)} a ${dataCurta(cicloAtivo.data_fim)}` : 'Nenhum ciclo ativo'}
        icon={Award}
      />

      {!cicloAtivo ? (
        <Cartao>
          <p className="text-sm text-muted-foreground">Nenhum ciclo de premiação está ativo. Assim que o gestor abrir o próximo, a sua pontuação aparece aqui.</p>
        </Cartao>
      ) : (
        <>
          {/* Resultado: pontos, posição e de onde vieram, em números */}
          <Cartao>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Pontos no ciclo</p>
                <p className="text-4xl font-bold tracking-tight tabular-nums text-foreground">{fmt(totalPontos)}</p>
              </div>
              {posicao && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Posição</p>
                  <p className="text-2xl font-bold tabular-nums text-foreground">{posicao.posicao}º</p>
                  <p className="text-xs text-muted-foreground">
                    {posicao.posicaoAcima ? `${fmt(posicao.distancia)} pts do ${posicao.posicaoAcima}º lugar` : 'na liderança do ciclo'}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
              <Numero rotulo="Tratativas encerradas" valor={fmt(grupo('tratativas'))} />
              <Numero rotulo="Tratativas abertas" valor={fmt(grupo('aberturas'))} />
              <Numero rotulo="Indicadores" valor={fmt(grupo('indicadores'))} />
              <Numero rotulo="Bônus do gestor" valor={fmt(grupo('bonus'))} />
            </div>
          </Cartao>

          <div className="grid items-start gap-6 lg:grid-cols-3">
            <Cartao titulo="Extrato de pontos" className="lg:col-span-2">
              <ExtratoPontos extrato={extrato} />
            </Cartao>

            <div className="space-y-6">
              <Cartao titulo="Indicadores do ciclo" extra={<span className="text-xs text-muted-foreground">até 10 cada</span>}>
                <div className="divide-y divide-border">
                  {linhaIndicador('csat', 'CSAT', indicadores?.csat, pct)}
                  {linhaIndicador('performance', 'Performance', indicadores?.performance, pct)}
                  {linhaIndicador('cx', 'Avaliação CX', indicadores?.cx, nota)}
                </div>
              </Cartao>

              <Cartao titulo="Tratativas no ciclo">
                <div className="divide-y divide-border">
                  <Linha rotulo="Encerradas" valor={tratativasEncerradas.length} />
                  <Linha
                    rotulo="Encerradas no prazo"
                    detalhe={tratativasEncerradas.length ? pct((noPrazo / tratativasEncerradas.length) * 100) : null}
                    valor={noPrazo}
                  />
                  <Linha rotulo="Abertas por você" valor={abertas} />
                </div>
              </Cartao>

              <Cartao titulo="Acompanhamento">
                <div className="divide-y divide-border">
                  <div className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 text-foreground">
                      PDI
                      <span className="block text-xs text-muted-foreground">{pdi ? pdi.titulo : 'nenhum em andamento'}</span>
                    </span>
                    {pdi && (
                      <button type="button" onClick={() => setPdiAberto(pdi)} className="shrink-0 font-medium text-primary hover:underline">
                        {Math.round(pdi.percentual_conclusao || 0)}% · ver
                      </button>
                    )}
                  </div>
                  <Linha
                    rotulo="Último Hansei"
                    detalhe={hansei ? (hansei.visualizado ? 'visualizado' : 'ainda não visualizado') : null}
                    valor={hansei ? dataCurta(hansei.data_envio) : 'nenhum'}
                  />
                </div>
                <h3 className="mt-4 border-b border-border pb-1.5 text-xs font-medium text-muted-foreground">Feedbacks recebidos</h3>
                {meusFeedbacks.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">Nenhum feedback compartilhado com você.</p>
                ) : (
                  <ListaResumida
                    className="divide-y divide-border"
                    limite={4}
                    rotulo="feedbacks"
                    itens={meusFeedbacks}
                    renderItem={(o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setFeedbackAberto(o)}
                        className="flex w-full items-start justify-between gap-3 py-2 text-left text-sm hover:bg-muted/50"
                      >
                        <span className="min-w-0 text-foreground">
                          <span className="line-clamp-1">{o.titulo || o.conteudo?.slice(0, 60)}</span>
                          <span className="block text-xs text-muted-foreground">{[tipoLabels[o.tipo] ?? o.tipo, o.autor_nome].filter(Boolean).join(' · ')}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatDateSP(o.data_registro, 'DD/MM/YYYY')}</span>
                      </button>
                    )}
                  />
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <Link to={createPageUrl('Hansei')} className="font-medium text-primary hover:underline">Meu Hansei</Link>
                  <Link to={createPageUrl('PDI')} className="font-medium text-primary hover:underline">Meu PDI</Link>
                </div>
              </Cartao>
            </div>
          </div>
        </>
      )}

      <PDIModal pdi={pdiAberto} open={!!pdiAberto} onClose={() => setPdiAberto(null)} />
      <FeedbackModal feedback={feedbackAberto} open={!!feedbackAberto} onClose={() => setFeedbackAberto(null)} />
    </div>
  );
}
