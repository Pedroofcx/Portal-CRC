import db from '@/api/db';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tratativaNosCiclo } from '@/hooks/usePontuacaoAgente';
import { STATUS_ENCERRADOS, somaDoBonus } from '@/lib/bonusManual';
import { pontosDeTratativasNoCiclo } from '@/lib/pontuacaoCiclo';
import { indicadoresDoCiclo } from '@/lib/indicadoresCiclo';

/**
 * Ranking dos agentes num ciclo — o ativo, ou um já encerrado (histórico).
 *
 * Saiu de dentro do RankingTrimestral para a tela inicial do operador poder
 * dizer "3º lugar, a 2,0 pts do 2º" com a MESMA conta do ranking — duas
 * contas diferentes na mesma tela acabariam discordando.
 *
 * Pontos = tratativas encerradas no ciclo (calculateTratativaPoints, com a
 * reabertura apurada pelos dados) + 0,5 por tratativa aberta no ciclo (do
 * Ciclo 2 em diante) + indicadores (CSAT, performance e avaliação CX, até 10
 * cada, src/lib/indicadoresCiclo.js) + bônus manual que o gestor lança. As
 * regras que cruzam tratativas moram em src/lib/pontuacaoCiclo.js.
 *
 * Quem entra: os agentes ativos. Num ciclo que não é o ativo, entra também
 * quem já saiu mas pontuou nele — o histórico não pode perder gente.
 *
 * @param cicloId o ciclo a mostrar; sem ele, o ativo.
 */
export function useRankingCiclo(cicloId = null) {
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
    staleTime: 120000,
  });

  const { data: ciclos = [] } = useQuery({
    queryKey: ['ciclos-trimestrais', "list()"],
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

  // TODAS as tratativas (paginado pelo db.js), abertas também: a abertura
  // vale 0,5 e uma tratativa nova do mesmo cliente é o que revela a
  // reabertura. Mesma chave da tela de Tratativas — uma busca só.
  const { data: todasTratativas = [], isLoading } = useQuery({
    queryKey: ['tratativas', "list('-created_date')"],
    queryFn: () => db.entities.Tratativa.list('-created_date'),
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  // Apurações de toda a equipe (todas, sem limite): os indicadores entram no total.
  const { data: apuracoes = [] } = useQuery({
    queryKey: ['apuracoes-equipe'],
    queryFn: () => db.entities.Apuracao.list('-periodo_fim'),
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  const ranking = useMemo(() => {
    if (!ciclo) return [];
    const porAgente = pontosDeTratativasNoCiclo(todasTratativas, ciclo, {
      encerrada: (t) => STATUS_ENCERRADOS.includes(t.status),
      noCiclo: tratativaNosCiclo,
      // Os agentes ativos liberam (ou não) cada canal da pontuação.
      equipe: colaboradores.filter((c) => c.papel === 'agente' && c.ativo !== false).map((c) => c.id),
    });
    const bonusDoCiclo = bonus.filter((b) => b.ciclo_id === ciclo.id);
    const pontuouNoCiclo = new Set([...porAgente.keys(), ...bonusDoCiclo.map((b) => b.colaborador_id)]);
    const historico = ciclo.id !== cicloAtivo?.id;

    const agentes = colaboradores.filter((c) => c.papel === 'agente'
      && (c.ativo !== false || (historico && pontuouNoCiclo.has(c.id))));

    return agentes.map((agente) => {
      // Uma linha por tratativa encerrada: a página detalhada do gestor monta
      // dela o ritmo por semana, os pontos por canal e o % no SLA.
      const { itens = [], aberturas = [], pontosEncerramento = 0, pontosAbertura = 0, retidos = {}, pontosRetidos = 0, semRegistro = [], canaisBloqueados = [], faltamPorCanal = {}, volume = {} } = porAgente.get(agente.id) ?? {};
      const pontosCalculados = pontosEncerramento + pontosAbertura;
      const indicadores = indicadoresDoCiclo(apuracoes.filter((a) => a.colaborador_id === agente.id), ciclo);
      const lancamentos = bonusDoCiclo.filter((b) => b.colaborador_id === agente.id);
      const somaBonus = somaDoBonus(lancamentos);

      return {
        id: agente.id,
        nome: agente.nome_completo,
        foto: agente.foto_url,
        ativo: agente.ativo !== false,
        totalPontos: pontosCalculados + indicadores.pontos.total + somaBonus,
        indicadores,
        pontosIndicadores: indicadores.pontos.total,
        pontosTratativas: pontosCalculados,
        pontosEncerramento,
        pontosAbertura,
        aberturas,
        retidos,
        pontosRetidos,
        semRegistro,
        canaisBloqueados,
        faltamPorCanal,
        registrosPorCanal: volume,
        bonus: somaBonus,
        lancamentosBonus: lancamentos,
        itens,
        tratativasEncerradas: itens.length + Object.values(retidos).reduce((n, r) => n + r.itens.length, 0),
      };
    }).sort((a, b) => b.totalPontos - a.totalPontos);
  }, [colaboradores, bonus, todasTratativas, apuracoes, ciclo, cicloAtivo]);

  return { ranking, ciclo, cicloAtivo, ciclos, isLoading };
}

export { posicaoNoRanking } from '@/lib/posicaoRanking';
