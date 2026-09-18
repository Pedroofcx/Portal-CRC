import db from '@/api/db';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calculateTratativaPoints } from '@/components/utils/helpers';
import { tratativaNosCiclo } from '@/hooks/usePontuacaoAgente';

/**
 * Ranking dos agentes no ciclo ativo.
 *
 * Saiu de dentro do RankingTrimestral para a tela inicial do operador poder
 * dizer "3º lugar, a 2,0 pts do 2º" com a MESMA conta do ranking — duas
 * contas diferentes na mesma tela acabariam discordando.
 *
 * Pontos = tratativas encerradas no ciclo (calculateTratativaPoints) + bônus
 * manual que o gestor lança para o ciclo.
 */
export function useRankingCiclo() {
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

  const { data: pontuacoes = [] } = useQuery({
    queryKey: ['pontuacoes'],
    queryFn: () => db.entities.Pontuacao.list('-created_date', 200),
    staleTime: 60000,
  });

  const { data: todasTratativas = [], isLoading } = useQuery({
    queryKey: ['tratativas-encerradas-ranking'],
    queryFn: () => db.entities.Tratativa.filter({}, '-data_encerramento', 1000),
    staleTime: 120000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    select: (data) => data.filter((t) =>
      (t.status === 'encerrada' || t.status === 'aguardando_confirmacao_reabertura')
      && !!t.agente_responsavel_id
      && !t.excluida),
  });

  const ranking = useMemo(() => {
    if (!cicloAtivo) return [];
    const agentes = colaboradores.filter((c) => c.papel === 'agente' && c.ativo !== false);

    return agentes.map((agente) => {
      const minhasTratativas = todasTratativas.filter(
        (t) => t.agente_responsavel_id === agente.id && tratativaNosCiclo(t, cicloAtivo),
      );
      let pontosCalculados = 0;
      minhasTratativas.forEach((t) => { pontosCalculados += calculateTratativaPoints(t).pontos; });

      const bonus = pontuacoes
        .filter((p) => p.colaborador_id === agente.id && p.ciclo_id === cicloAtivo.id && p.tipo === 'bonus_manual')
        .reduce((acc, p) => acc + (p.total_pontos || 0), 0);

      return {
        id: agente.id,
        nome: agente.nome_completo,
        foto: agente.foto_url,
        totalPontos: pontosCalculados + bonus,
        tratativasEncerradas: minhasTratativas.length,
      };
    }).sort((a, b) => b.totalPontos - a.totalPontos);
  }, [colaboradores, pontuacoes, todasTratativas, cicloAtivo]);

  return { ranking, cicloAtivo, isLoading };
}

export { posicaoNoRanking } from '@/lib/posicaoRanking';
