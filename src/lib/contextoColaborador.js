import { indicadoresDoCiclo } from '@/lib/indicadoresCiclo';
import { totalNoCiclo } from '@/lib/hanseiDados';
import { tratativaNosCiclo } from '@/lib/pontuacaoCiclo';

/**
 * Os números de uma pessoa no ciclo, com as contas oficiais do POP 11 — os
 * mesmos do ranking e do Hansei. Servem de contexto para a leitura de pessoas
 * (Observações) e para a visão 360º do Oráculo, para que ninguém converse
 * com um número diferente do que o sistema paga.
 */
export function contextoDoColaborador({ colaboradorId, ciclo, tratativas = [], apuracoes = [], bonus = [], equipe = null }) {
  const minhasApuracoes = apuracoes.filter((a) => a.colaborador_id === colaboradorId);
  const indicadores = indicadoresDoCiclo(minhasApuracoes, ciclo);
  const pontos = totalNoCiclo({ tratativas, apuracoes, bonus, ciclo, colaboradorId, equipe });

  const encerradas = tratativas.filter((t) => !t.excluida
    && t.agente_responsavel_id === colaboradorId
    && ['encerrada', 'aguardando_confirmacao_reabertura'].includes(t.status)
    && ciclo && tratativaNosCiclo(t, ciclo));
  const noPrazo = encerradas.filter((t) => t.encerrado_no_sla === true).length;

  const sinais = [];
  if (indicadores.csat?.valor >= 95) sinais.push(`CSAT de ${indicadores.csat.valor.toFixed(1)}% no ciclo — faixa máxima da premiação`);
  else if (indicadores.csat?.valor >= 85) sinais.push(`CSAT de ${indicadores.csat.valor.toFixed(1)}% no ciclo`);
  if (encerradas.length >= 5) {
    sinais.push(`${Math.round((noPrazo / encerradas.length) * 100)}% das ${encerradas.length} tratativas encerradas no prazo`);
  }
  if (indicadores.performance?.valor >= 100) sinais.push('Todas as ligações atendidas no ciclo');

  return {
    csat_recente: indicadores.csat?.valor ?? null,
    performance: indicadores.performance?.valor ?? null,
    cx: indicadores.cx?.valor ?? null,
    tratativas_periodo: encerradas.length,
    tratativas_no_prazo: noPrazo,
    pontos_trimestre: pontos ?? 0,
    ciclo_nome: ciclo?.nome ?? null,
    indicadores,
    sinais_recentes: sinais,
  };
}
