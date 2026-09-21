import db from '@/api/db';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calculateTratativaPoints } from '@/components/utils/helpers';
import { tratativaNosCiclo } from '@/hooks/usePontuacaoAgente';
import { STATUS_ENCERRADOS, somaDoBonus } from '@/lib/bonusManual';

/**
 * Ranking dos agentes num ciclo — o ativo, ou um já encerrado (histórico).
 *
 * Saiu de dentro do RankingTrimestral para a tela inicial do operador poder
 * dizer "3º lugar, a 2,0 pts do 2º" com a MESMA conta do ranking — duas
 * contas diferentes na mesma tela acabariam discordando.
 *
 * Pontos = tratativas encerradas no ciclo (calculateTratativaPoints) + bônus
 * manual que o gestor lança para o ciclo.
 *
 * Quem entra: os agentes ativos. Num ciclo que não é o ativo, entra também
 * quem já saiu mas pontuou nele — o histórico não pode perder gente.
 *
 * @param cicloId o ciclo a mostrar; sem ele, o ativo.
 */
export function useRankingCiclo(cicloId = null) {
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => db.entities.Colaborador.list(),
    staleTime: 120000,
  });

  const { data: ciclos = [] } = useQuery({
    queryKey: ['ciclos-trimestrais'],
    queryFn: () => db.entities.CicloTrimestral.list(),
    staleTime: 300000,
  });
  const cicloAtivo = useMemo(() => ciclos.find((c) => c.ativo) || null, [ciclos]);
  const ciclo = useMemo(
    () => (cicloId ? ciclos.find((c) => c.id === cicloId) : cicloAtivo) || null,
    [ciclos, cicloId, cicloAtivo],
  );

  const { data: bonus = [] } = useQuery({
    queryKey: ['bonus-manual'],
    queryFn: () => db.entities.Pontuacao.filter({ tipo: 'bonus_manual' }, '-created_date'),
    staleTime: 60000,
  });

  // TODAS as encerradas (paginado pelo db.js), e não as "últimas 1000": o
  // histórico de ciclos antigos precisa das antigas.
  const { data: todasTratativas = [], isLoading } = useQuery({
    queryKey: ['tratativas-encerradas-ranking'],
    queryFn: () => db.entities.Tratativa.filter({ status: { $in: STATUS_ENCERRADOS } }, '-data_encerramento'),
    staleTime: 120000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    select: (data) => data.filter((t) =>
      STATUS_ENCERRADOS.includes(t.status)
      && !!t.agente_responsavel_id
      && !t.excluida),
  });

  const ranking = useMemo(() => {
    if (!ciclo) return [];
    const doCiclo = todasTratativas.filter((t) => tratativaNosCiclo(t, ciclo));
    const bonusDoCiclo = bonus.filter((b) => b.ciclo_id === ciclo.id);
    const pontuouNoCiclo = new Set([...doCiclo.map((t) => t.agente_responsavel_id), ...bonusDoCiclo.map((b) => b.colaborador_id)]);
    const historico = ciclo.id !== cicloAtivo?.id;

    const agentes = colaboradores.filter((c) => c.papel === 'agente'
      && (c.ativo !== false || (historico && pontuouNoCiclo.has(c.id))));

    return agentes.map((agente) => {
      // Uma linha por tratativa: a página detalhada do gestor monta dela o
      // ritmo por semana, os pontos por canal e o % no SLA.
      const itens = doCiclo.filter((t) => t.agente_responsavel_id === agente.id).map((t) => ({
        tratativa_id: t.id,
        pontos: calculateTratativaPoints(t).pontos,
        tipo_tratativa: t.tipo_tratativa,
        data_encerramento: t.data_encerramento,
        encerrado_no_sla: t.encerrado_no_sla,
      }));
      const pontosCalculados = itens.reduce((acc, i) => acc + i.pontos, 0);
      const lancamentos = bonusDoCiclo.filter((b) => b.colaborador_id === agente.id);
      const somaBonus = somaDoBonus(lancamentos);

      return {
        id: agente.id,
        nome: agente.nome_completo,
        foto: agente.foto_url,
        ativo: agente.ativo !== false,
        totalPontos: pontosCalculados + somaBonus,
        pontosTratativas: pontosCalculados,
        bonus: somaBonus,
        lancamentosBonus: lancamentos,
        itens,
        tratativasEncerradas: itens.length,
      };
    }).sort((a, b) => b.totalPontos - a.totalPontos);
  }, [colaboradores, bonus, todasTratativas, ciclo, cicloAtivo]);

  return { ranking, ciclo, cicloAtivo, ciclos, isLoading };
}

export { posicaoNoRanking } from '@/lib/posicaoRanking';
