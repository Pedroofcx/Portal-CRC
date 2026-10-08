import db from '@/api/db';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { STATUS_ENCERRADOS, somaDoBonus } from '@/lib/bonusManual';
import { pontosDeTratativasNoCiclo, PONTOS_POR_ABERTURA } from '@/lib/pontuacaoCiclo';
import { indicadoresDoCiclo } from '@/lib/indicadoresCiclo';
import { extratoDoAgente } from '@/lib/extratoPontos';

import { tratativaNosCiclo } from '@/lib/pontuacaoCiclo';

export { tratativaNosCiclo };

/**
 * Pontuação do agente no ciclo ativo — a MESMA conta do ranking
 * (src/lib/pontuacaoCiclo.js): encerradas no ciclo, 0,5 por abertura,
 * indicadores (src/lib/indicadoresCiclo.js) e bônus.
 */
export function usePontuacaoAgente(colaboradorId) {
  // Ciclo trimestral ativo — fonte de verdade para o período
  const { data: ciclos = [], isLoading: loadingCiclos } = useQuery({
    queryKey: ['ciclos-trimestrais', "list()"],
    queryFn: () => db.entities.CicloTrimestral.list(),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
  });

  const cicloAtivo = useMemo(() => ciclos.find(c => c.ativo) || null, [ciclos]);

  // TODAS as tratativas, abertas também — mesma busca do ranking e da tela
  // de Tratativas. A abertura vale 0,5 e a reabertura é descoberta por uma
  // tratativa nova do mesmo cliente, que pode ser de outro agente.
  const { data: todas = [], isLoading: loadingTratativas } = useQuery({
    queryKey: ['tratativas', "list('-created_date')"],
    queryFn: () => db.entities.Tratativa.list('-created_date'),
    enabled: !!colaboradorId,
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  // Os agentes ativos: é a equipe que libera (ou não) cada canal da pontuação.
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
    enabled: !!colaboradorId,
    staleTime: 120000,
  });
  const equipe = useMemo(() => colaboradores.filter((c) => c.papel === 'agente' && c.ativo !== false).map((c) => c.id), [colaboradores]);

  const minhas = useMemo(() => {
    if (!cicloAtivo || !colaboradorId) return null;
    return pontosDeTratativasNoCiclo(todas, cicloAtivo, {
      encerrada: (t) => STATUS_ENCERRADOS.includes(t.status),
      noCiclo: tratativaNosCiclo,
      equipe,
    }).get(colaboradorId) ?? { itens: [], aberturas: [], pontosEncerramento: 0, pontosAbertura: 0, retidos: {}, pontosRetidos: 0, semRegistro: [], canaisBloqueados: [] };
  }, [todas, cicloAtivo, colaboradorId, equipe]);

  const tratativasEncerradas = useMemo(() => {
    const ids = new Set((minhas?.itens ?? []).map((i) => i.tratativa_id));
    return todas.filter((t) => ids.has(t.id));
  }, [todas, minhas]);

  // Detalhamento: cada regra de cada tratativa encerrada, e cada abertura
  // (marcada com `abertura: true`, para não cair na conta de um canal).
  const { pontosCalculados, detalhamentoPontos } = useMemo(() => {
    if (!minhas) return { pontosCalculados: 0, detalhamentoPontos: [] };
    const detalhamento = [
      ...minhas.itens.flatMap((i) => i.detalhes.map((d) => ({
        ...d,
        tratativa_id: i.tratativa_id,
        nome_cliente: i.nome_cliente,
        tipo_tratativa: i.tipo_tratativa,
        data_encerramento: i.data_encerramento,
      }))),
      ...minhas.aberturas.map((a) => ({
        tipo: 'Abertura de tratativa',
        pontos: PONTOS_POR_ABERTURA,
        abertura: true,
        tratativa_id: a.tratativa_id,
        nome_cliente: a.nome_cliente,
        tipo_tratativa: a.tipo_tratativa,
        data_encerramento: a.data_registro,
      })),
    ];
    return { pontosCalculados: minhas.pontosEncerramento + minhas.pontosAbertura, detalhamentoPontos: detalhamento };
  }, [minhas]);

  // Bônus manual: todos os lançamentos do gestor para a pessoa no ciclo
  // (migration 17) — a mesma consulta e a mesma soma do ranking.
  const { data: lancamentos = [], isLoading: loadingPontuacoes } = useQuery({
    queryKey: ['bonus-manual'],
    queryFn: () => db.entities.Pontuacao.filter({ tipo: 'bonus_manual' }, '-created_date'),
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const meusLancamentos = useMemo(() => {
    if (!colaboradorId || !cicloAtivo) return [];
    return lancamentos.filter(p => p.colaborador_id === colaboradorId && p.ciclo_id === cicloAtivo.id);
  }, [lancamentos, colaboradorId, cicloAtivo]);
  const bonusManual = somaDoBonus(meusLancamentos);

  // Indicadores do ciclo (CSAT, performance, avaliação CX) — mesma busca e
  // mesma conta do ranking.
  const { data: apuracoes = [] } = useQuery({
    queryKey: ['apuracoes-equipe'],
    queryFn: () => db.entities.Apuracao.list('-periodo_fim'),
    enabled: !!colaboradorId,
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });
  const indicadores = useMemo(
    () => indicadoresDoCiclo(apuracoes.filter((a) => a.colaborador_id === colaboradorId), cicloAtivo),
    [apuracoes, colaboradorId, cicloAtivo],
  );

  const totalPontos = pontosCalculados + indicadores.pontos.total + bonusManual;

  // Extrato: cada ponto com o motivo, e o que ainda está a caminho.
  const extrato = useMemo(
    () => extratoDoAgente({ registro: minhas, indicadores, lancamentos: meusLancamentos, todas }),
    [minhas, indicadores, meusLancamentos, todas],
  );

  const trimestre = cicloAtivo?.nome ?? 'Ciclo Atual';

  return {
    totalPontos,
    pontosCalculados,
    bonusManual,
    retidos: minhas?.retidos ?? {},
    pontosRetidos: minhas?.pontosRetidos ?? 0,
    semRegistro: minhas?.semRegistro ?? [],
    canaisBloqueados: minhas?.canaisBloqueados ?? [],
    indicadores,
    extrato,
    detalhamentoPontos,
    tratativasEncerradas,
    cicloAtivo,
    trimestre,
    isLoading: loadingCiclos || loadingTratativas || loadingPontuacoes,
  };
}