const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { calculateTratativaPoints } from '@/components/utils/helpers';

/**
 * Verifica se uma tratativa está dentro do período de um ciclo trimestral.
 * Usa data_encerramento (ou data_registro como fallback).
 */
export function tratativaNosCiclo(tratativa, ciclo) {
  if (!ciclo) return false;
  const dataRef = tratativa.data_encerramento || tratativa.data_registro;
  if (!dataRef) return false;
  const data = new Date(dataRef);
  const inicio = new Date(ciclo.data_inicio + 'T00:00:00');
  const fim = new Date(ciclo.data_fim + 'T23:59:59');
  return data >= inicio && data <= fim;
}

/**
 * Hook centralizado para pontuação de agente.
 * Fonte única de verdade: calcula pontos APENAS das tratativas
 * encerradas dentro do ciclo trimestral ativo.
 */
export function usePontuacaoAgente(colaboradorId) {
  // Ciclo trimestral ativo — fonte de verdade para o período
  const { data: ciclos = [], isLoading: loadingCiclos } = useQuery({
    queryKey: ['ciclos-trimestrais'],
    queryFn: () => db.entities.CicloTrimestral.list(),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
  });

  const cicloAtivo = useMemo(() => ciclos.find(c => c.ativo) || null, [ciclos]);

  // Query dedicada — busca todas as tratativas do agente
  const { data: tratativasRaw = [], isLoading: loadingTratativas } = useQuery({
    queryKey: ['tratativas-encerradas-pontuacao', colaboradorId],
    queryFn: () =>
      db.entities.Tratativa.filter(
        { agente_responsavel_id: colaboradorId },
        '-data_encerramento',
        500
      ),
    enabled: !!colaboradorId,
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  // Filtra: encerradas/aguardando + DENTRO do ciclo ativo
  const tratativasEncerradas = useMemo(() => {
    if (!cicloAtivo) return [];
    return (tratativasRaw || []).filter(t =>
      (t.status === 'encerrada' || t.status === 'aguardando_confirmacao_reabertura') &&
      !t.excluida &&
      tratativaNosCiclo(t, cicloAtivo)
    );
  }, [tratativasRaw, cicloAtivo]);

  // Calcula pontos exclusivamente das tratativas dentro do ciclo
  const { pontosCalculados, detalhamentoPontos } = useMemo(() => {
    let pontos = 0;
    const detalhamento = [];
    tratativasEncerradas.forEach((t) => {
      const { pontos: pts, detalhes } = calculateTratativaPoints(t);
      pontos += pts;
      detalhes.forEach(d => detalhamento.push({
        ...d,
        tratativa_id: t.id,
        nome_cliente: t.nome_cliente,
        tipo_tratativa: t.tipo_tratativa,
        data_encerramento: t.data_encerramento,
      }));
    });
    return { pontosCalculados: pontos, detalhamentoPontos: detalhamento };
  }, [tratativasEncerradas]);

  // Pontuação com bônus manual (somente adicional, nunca substitui o calculado)
  const { data: pontuacoes = [], isLoading: loadingPontuacoes } = useQuery({
    queryKey: ['pontuacoes'],
    queryFn: () => db.entities.Pontuacao.list('-created_date', 200),
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const bonusManual = useMemo(() => {
    if (!colaboradorId || !cicloAtivo) return 0;
    const salvo = pontuacoes.find(
      p => p.colaborador_id === colaboradorId &&
           p.ciclo_id === cicloAtivo.id &&
           p.tipo === 'bonus_manual'
    );
    return salvo?.total_pontos ?? 0;
  }, [pontuacoes, colaboradorId, cicloAtivo]);

  const totalPontos = pontosCalculados + bonusManual;

  const trimestre = cicloAtivo?.nome ?? 'Ciclo Atual';

  return {
    totalPontos,
    pontosCalculados,
    bonusManual,
    detalhamentoPontos,
    tratativasEncerradas,
    cicloAtivo,
    trimestre,
    isLoading: loadingCiclos || loadingTratativas || loadingPontuacoes,
  };
}