import db from '@/api/db';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRankingCiclo } from '@/hooks/useRankingCiclo';
import { posicaoNoRanking } from '@/lib/posicaoRanking';
import { indicadoresDoCiclo } from '@/lib/indicadoresCiclo';
import { avaliarExigencia } from '@/lib/elegibilidade';
import { pontosPorSemana, fimDoRitmo } from '@/lib/ritmoSemanal';
import { PONTOS_POR_ABERTURA } from '@/lib/pontuacaoCiclo';
import { STATUS_FECHADOS, vencidasDaEquipe, registrosNoCiclo, percentualNoSla } from '@/lib/cicloEquipe';

/**
 * A equipe no ciclo, pessoa a pessoa — a base da tela do gestor (proposta C)
 * e da página detalhada de cada agente.
 *
 * Nada é contado de novo aqui: pontos e posição vêm do useRankingCiclo (o
 * mesmo do ranking e do "Meu ciclo"), indicadores do indicadoresDoCiclo,
 * elegibilidade do avaliarExigencia, prazos do prazoSla. Este hook só junta.
 */
export function useCicloEquipe(cicloId = null) {
  // `ciclo` é o escolhido (o ativo, ou um encerrado do histórico).
  const { ranking, ciclo, cicloAtivo, ciclos, isLoading: carregandoRanking } = useRankingCiclo(cicloId);

  // TODAS as abertas, não as "últimas N": uma aberta antiga e vencida é
  // justamente a que mais importa, e seria a primeira a ficar de fora.
  const { data: abertas = [], isLoading: carregandoAbertas, dataUpdatedAt } = useQuery({
    queryKey: ['tratativas-abertas-equipe'],
    queryFn: () => db.entities.Tratativa.filter({ status: { $nin: STATUS_FECHADOS } }, 'data_registro'),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Todos os registros (abertos ou não), para o mínimo de registros por canal
  // — de qualquer ciclo, inclusive os do histórico. registrosNoCiclo recorta.
  const { data: registros = [] } = useQuery({
    queryKey: ['tratativas-registros'],
    queryFn: () => db.entities.Tratativa.list('-data_registro'),
    enabled: Boolean(ciclo),
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  const { data: apuracoes = [] } = useQuery({
    queryKey: ['apuracoes-equipe'],
    queryFn: () => db.entities.Apuracao.list('-periodo_fim', 500),
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  const { data: exigencias = [] } = useQuery({
    queryKey: ['elegibilidades'],
    queryFn: () => db.entities.ElegibilidadePremio.filter({ ativa: true }),
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  // "Agora" é o momento da última busca das abertas: "vencida" e "vence hoje"
  // são recalculados a cada nova busca, e não a cada renderização.
  const agora = useMemo(() => new Date(dataUpdatedAt || Date.now()), [dataUpdatedAt]);

  const retrato = useMemo(() => vencidasDaEquipe(abertas, agora), [abertas, agora]);

  const agentes = useMemo(() => ranking.map((r) => {
    const indicadores = indicadoresDoCiclo(apuracoes.filter((a) => a.colaborador_id === r.id), ciclo);
    const volume = registrosNoCiclo(registros.filter((t) => t.agente_responsavel_id === r.id), ciclo);
    const contexto = {
      csat: indicadores.csat?.valor,
      performance: indicadores.performance?.valor,
      cx: indicadores.cx?.valor,
      volume,
      totalTratativas: Object.values(volume).reduce((a, n) => a + n, 0),
    };
    const avaliacoes = exigencias.map((e) => ({ exigencia: e, ...avaliarExigencia(e, contexto) }));
    const prazo = retrato.porAgente.find((p) => p.id === r.id);

    return {
      ...r,
      posicao: posicaoNoRanking(ranking, r.id),
      // Aberturas entram no ritmo na semana em que foram registradas.
      semanas: pontosPorSemana([...r.itens, ...(r.aberturas ?? []).map((ab) => ({ pontos: PONTOS_POR_ABERTURA, data_encerramento: ab.data_registro }))], fimDoRitmo(ciclo, agora), 6),
      noSla: percentualNoSla(r.itens),
      indicadores,
      volume,
      avaliacoes,
      pendencias: avaliacoes.filter((a) => a.status === 'pendente').length,
      abertas: prazo?.abertas ?? 0,
      vencidas: prazo?.vencidas ?? 0,
      venceHoje: prazo?.venceHoje ?? 0,
      tratativasAbertas: abertas.filter((t) => t.agente_responsavel_id === r.id && !t.excluida),
    };
  }), [ranking, apuracoes, registros, exigencias, retrato, abertas, ciclo, agora]);

  const todasEncerradas = useMemo(() => ranking.flatMap((r) => r.itens), [ranking]);

  return {
    ciclo,
    cicloAtivo,
    ciclos,
    agentes,
    exigencias,
    retrato,
    agora,
    equipe: {
      pontos: ranking.reduce((acc, r) => acc + r.totalPontos, 0),
      noSla: percentualNoSla(todasEncerradas),
      semPendencia: agentes.filter((a) => a.pendencias === 0).length,
    },
    isLoading: carregandoRanking || carregandoAbertas,
  };
}
