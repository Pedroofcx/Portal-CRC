/**
 * Números do Hansei de uma pessoa num período — a "foto" que vai no envio.
 * Função pura (usada pela tela e por ferramentas/recalcular-hansei.mjs).
 *
 * Refeita em 22/09/2026. A conta antiga, herdada do Base44, errava:
 *   - CSAT = média dos CSATs de cada DIA, pulando os dias com 0% — os dias
 *     ruins sumiam (Ana: 91,7% no Hansei, 64,9% de verdade);
 *   - dia importado duas vezes contava duas vezes;
 *   - a avaliação CX nunca era lida (saía sempre 0);
 *   - os "pontos do trimestre" vinham da tabela antiga do Base44.
 *
 * Agora: os indicadores são os mesmos da premiação (src/lib/indicadoresCiclo.js)
 * aplicados ao período do Hansei, e os pontos são os acumulados no ciclo
 * (mesma conta do ranking) até o último dia do período.
 */
import { indicadoresDoCiclo } from './indicadoresCiclo.js';
import { pontosDeTratativasNoCiclo, reaberturaDe, tratativaNosCiclo } from './pontuacaoCiclo.js';
import { STATUS_ENCERRADOS, somaDoBonus } from './bonusManual.js';

const noPeriodo = (valor, inicio, fim) => {
  if (!valor) return false;
  const dia = new Date(valor).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  return dia >= inicio && dia <= fim;
};

/** Total oficial da pessoa no ciclo: tratativas + aberturas + indicadores + bônus. */
export function totalNoCiclo({ tratativas = [], apuracoes = [], bonus = [], ciclo, colaboradorId, agora = new Date() }) {
  if (!ciclo) return null;
  const reg = pontosDeTratativasNoCiclo(tratativas, ciclo, {
    encerrada: (t) => STATUS_ENCERRADOS.includes(t.status),
    noCiclo: tratativaNosCiclo,
  }, agora).get(colaboradorId);
  const ind = indicadoresDoCiclo(apuracoes.filter((a) => a.colaborador_id === colaboradorId), ciclo);
  const lancamentos = bonus.filter((b) => b.colaborador_id === colaboradorId && b.ciclo_id === ciclo.id);
  return (reg?.pontosEncerramento ?? 0) + (reg?.pontosAbertura ?? 0) + ind.pontos.total + somaDoBonus(lancamentos);
}

/**
 * O ciclo em que a data cai. Depois do último ciclo cadastrado (o próximo
 * ainda não foi aberto), vale o ativo; antes do primeiro, nenhum.
 */
export function cicloDaData(ciclos = [], data) {
  // No dia em que um ciclo termina e o outro começa, vale o que termina.
  const dentro = [...ciclos]
    .sort((a, b) => (a.data_fim < b.data_fim ? -1 : 1))
    .find((c) => data >= c.data_inicio && data <= c.data_fim);
  if (dentro) return dentro;
  const depoisDeTodos = ciclos.length && ciclos.every((c) => data > c.data_fim);
  return depoisDeTodos ? (ciclos.find((c) => c.ativo) ?? null) : null;
}

export function calcularDadosConsolidados(colaboradorId, inicio, fim, { tratativas = [], apuracoes = [], bonus = [], ciclos = [], agora = new Date() }) {
  const minhas = tratativas.filter((t) => t.agente_responsavel_id === colaboradorId && !t.excluida && t.status !== 'excluida'
    && noPeriodo(t.data_registro || t.created_date, inicio, fim));

  const encerradas = minhas.filter((t) => STATUS_ENCERRADOS.includes(t.status));
  const reaberturas = encerradas.filter((t) => reaberturaDe(t, tratativas, agora).situacao === 'reabriu').length;

  const porTipo = {};
  minhas.forEach((t) => { const tipo = t.tipo_tratativa || 'outros'; porTipo[tipo] = (porTipo[tipo] || 0) + 1; });

  const contestacoes = minhas.filter((t) => t.tipo_tratativa === 'contestacao');
  const motivos = {};
  minhas.forEach((t) => { if (t.motivo_nome) motivos[t.motivo_nome] = (motivos[t.motivo_nome] || 0) + 1; });

  // Indicadores do período, com as regras da premiação.
  const ind = indicadoresDoCiclo(apuracoes.filter((a) => a.colaborador_id === colaboradorId), { data_inicio: inicio, data_fim: fim });
  const um = (v) => (v === null || v === undefined ? 0 : Math.round(v * 10) / 10);

  // Pontos acumulados no ciclo ATÉ o fim do período deste Hansei — a foto
  // do momento, não o total de hoje.
  const ciclo = cicloDaData(ciclos, fim);
  const ate = ciclo ? { ...ciclo, data_fim: fim < ciclo.data_fim ? fim : ciclo.data_fim } : null;
  const fimDoDia = new Date(`${fim}T23:59:59-03:00`);
  const pontos = ate ? totalNoCiclo({
    tratativas, apuracoes, colaboradorId, ciclo: ate,
    bonus: bonus.filter((b) => !b.created_date || new Date(b.created_date) <= fimDoDia),
    agora: fimDoDia < agora ? fimDoDia : agora,
  }) : null;

  return {
    tratativas_total: minhas.length,
    tratativas_solucionadas: encerradas.length,
    tratativas_em_aberto: minhas.length - encerradas.length,
    csat_individual: um(ind.csat?.valor),
    csat_telefone: ind.csat?.telefone != null ? um(ind.csat.telefone) : null,
    csat_chat: ind.csat?.chat != null ? um(ind.csat.chat) : null,
    chats_atendidos: ind.volumes.chats,
    ligacoes_atendidas: ind.volumes.ligacoesAtendidas,
    slas_cumpridos: encerradas.filter((t) => t.encerrado_no_sla === true).length,
    slas_estourados: encerradas.filter((t) => t.encerrado_no_sla === false).length,
    performance_percentual: um(ind.performance?.valor),
    pontuacao_trimestre: pontos === null ? null : Math.round(pontos * 10) / 10,
    ciclo_nome: ciclo?.nome ?? null,
    tratativas_por_tipo: porTipo,
    contestacoes_total: contestacoes.length,
    contestacoes_resolvidas: contestacoes.filter((t) => STATUS_ENCERRADOS.includes(t.status)).length,
    valor_recuperado_total: contestacoes.reduce((s, t) => s + (Number(t.valor_recuperado) || 0), 0),
    reaberturas,
    solucoes_replicaveis: minhas.filter((t) => t.solucao_replicavel === true).length,
    top_motivos: Object.entries(motivos).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nome, count]) => ({ nome, count })),
    cx_nota_media: ind.cx ? Math.round(ind.cx.valor * 100) / 100 : 0,
    cx_total_avaliacoes: ind.cx?.avaliacoes ?? 0,
    calculado_em: agora.toISOString(),
  };
}
