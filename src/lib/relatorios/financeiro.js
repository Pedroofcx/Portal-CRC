/**
 * Relatório Financeiro — quanto custou e quanto recuperamos. Funções puras,
 * testadas em `npm run testar`.
 *
 * Decisões de Pedro em 22/09/2026 (documentacao/decisoes-de-regra.md):
 *
 * CONTESTAÇÃO — como cada desfecho entra na conta:
 *   - perda: sem acordo, sem contato, contestou (prazo de cancelamento ou
 *     pagamento em duplicidade) → perdemos o valor contestado;
 *   - acordo: perdemos só a diferença entre o valor inicial e o acordado; o
 *     acordado é recuperado;
 *   - recuperado: o cliente pagou, ou cancelou a contestação → nada perdido;
 *   - em andamento: ainda sem desfecho → fica fora das somas, mostrado à parte.
 *
 * CUSTO OPERACIONAL: o oficial, calculado pelo servidor com a divisão pela
 * carga simultânea (custo_operacional_reais). A tela não recalcula.
 *
 * RISCO REPUTACIONAL: só contado (casos), nunca somado em R$.
 */
import { noPeriodo, dataDeReferencia, diaSP } from './periodo.js';
import { motivoDeRisco } from '../../components/jornada/inteligenciaFinanceira.js';

const ENCERRADA = ['encerrada', 'aguardando_confirmacao_reabertura'];
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const valida = (t) => !t.excluida && t.status !== 'excluida';

const GRUPO_DO_DESFECHO = {
  pagou: 'recuperado',
  cancelou_contestacao: 'recuperado',
  pagamento_integral: 'recuperado',
  cancelamento: 'recuperado',
  acordo: 'acordo',
  acordo_custo_reduzido: 'acordo',
  sem_acordo: 'perda',
  sem_contato: 'perda',
  contestou_prazo_cancelamento: 'perda',
  contestou_pagamento_duplicidade: 'perda',
};

export const ROTULO_DO_DESFECHO = {
  pagou: 'Cliente pagou',
  cancelou_contestacao: 'Cliente cancelou a contestação',
  pagamento_integral: 'Cliente pagou',
  cancelamento: 'Cliente cancelou a contestação',
  acordo: 'Acordo',
  acordo_custo_reduzido: 'Acordo',
  sem_acordo: 'Sem acordo',
  sem_contato: 'Sem contato',
  contestou_prazo_cancelamento: 'Contestou: prazo de cancelamento',
  contestou_pagamento_duplicidade: 'Contestou: pagamento em duplicidade',
};

export const EXPLICACAO_DO_GRUPO = {
  perda: 'Perdemos o valor contestado.',
  acordo: 'Perdemos só a diferença entre o valor inicial e o acordado.',
  recuperado: 'Nada perdido: o valor foi recuperado.',
  em_andamento: 'Ainda sem desfecho: fora das somas até encerrar.',
  sem_desfecho: 'Encerrada sem o desfecho registrado: fora das somas.',
};

/** Como uma contestação entra na conta: grupo, rótulo, valores. */
export function desfechoDaContestacao(t) {
  const inicial = num(t.valor_contestado_inicial) || num(t.valor_contestacao);
  const final = t.valor_contestado_final !== null && t.valor_contestado_final !== undefined && t.valor_contestado_final !== ''
    ? num(t.valor_contestado_final) : inicial;
  const chave = t.status_resolucao_contestacao || t.tipo_resolucao_contestacao || null;
  const encerrada = ENCERRADA.includes(t.status);

  if (!encerrada) return { grupo: 'em_andamento', rotulo: 'Em andamento', contestado: inicial, perda: 0, recuperado: 0 };
  const grupo = GRUPO_DO_DESFECHO[chave];
  if (!grupo) return { grupo: 'sem_desfecho', rotulo: 'Sem desfecho registrado', contestado: inicial, perda: 0, recuperado: 0 };

  const recuperadoInformado = num(t.valor_recuperado);
  if (grupo === 'recuperado') return { grupo, rotulo: ROTULO_DO_DESFECHO[chave], contestado: inicial, perda: 0, recuperado: recuperadoInformado || inicial };
  if (grupo === 'acordo') {
    const acordado = Math.min(final, inicial);
    return { grupo, rotulo: ROTULO_DO_DESFECHO[chave], contestado: inicial, perda: Math.max(0, inicial - acordado), recuperado: recuperadoInformado || acordado };
  }
  return { grupo, rotulo: ROTULO_DO_DESFECHO[chave], contestado: inicial, perda: inicial, recuperado: 0 };
}

const somar = (itens, campo) => itens.reduce((s, i) => s + (i[campo] || 0), 0);

/**
 * @param periodo { inicio, fim } em 'AAAA-MM-DD' (dias de Brasília); vazio = tudo
 */
export function resumoFinanceiro(tratativas = [], periodo = {}) {
  const doPeriodo = tratativas.filter((t) => valida(t) && noPeriodo(dataDeReferencia(t), periodo));

  // Devoluções ao cliente (reclamação interna, Reclame Aqui, Google...)
  const devolucoes = doPeriodo
    .filter((t) => t.tipo_tratativa !== 'contestacao' && t.houve_devolucao_financeira && num(t.valor_devolvido_cliente) > 0)
    .map((t) => ({ t, valor: num(t.valor_devolvido_cliente) }));

  // Contestações por desfecho
  const contestacoes = doPeriodo.filter((t) => t.tipo_tratativa === 'contestacao').map((t) => ({ t, ...desfechoDaContestacao(t) }));
  const porDesfecho = {};
  for (const c of contestacoes) {
    const k = c.rotulo;
    porDesfecho[k] ||= { rotulo: k, grupo: c.grupo, qtd: 0, contestado: 0, perda: 0, recuperado: 0 };
    porDesfecho[k].qtd += 1;
    porDesfecho[k].contestado += c.contestado;
    porDesfecho[k].perda += c.perda;
    porDesfecho[k].recuperado += c.recuperado;
  }
  const ordemGrupo = { perda: 0, acordo: 1, recuperado: 2, em_andamento: 3, sem_desfecho: 4 };
  const desfechos = Object.values(porDesfecho).sort((a, b) => ordemGrupo[a.grupo] - ordemGrupo[b.grupo] || b.contestado - a.contestado);
  const emAndamento = contestacoes.filter((c) => c.grupo === 'em_andamento');

  // Custo operacional oficial das encerradas no período
  const encerradas = doPeriodo.filter((t) => ENCERRADA.includes(t.status));
  const custoPorCanal = {};
  for (const t of encerradas) custoPorCanal[t.tipo_tratativa] = (custoPorCanal[t.tipo_tratativa] || 0) + num(t.custo_operacional_reais);

  // Casos de risco reputacional (contagem)
  const riscos = encerradas.map((t) => ({ t, motivo: motivoDeRisco(t) })).filter((r) => r.motivo);
  const riscoPorMotivo = {};
  for (const r of riscos) riscoPorMotivo[r.motivo] = (riscoPorMotivo[r.motivo] || 0) + 1;

  const devolvido = somar(devolucoes, 'valor');
  const perdaContestacoes = somar(contestacoes, 'perda');
  const custoOperacional = Object.values(custoPorCanal).reduce((s, v) => s + v, 0);
  const perdaReceita = encerradas.reduce((s, t) => s + num(t.valor_perda_receita), 0);

  return {
    custou: { devolvido, perdaContestacoes, custoOperacional, perdaReceita, total: devolvido + perdaContestacoes + custoOperacional + perdaReceita },
    recuperado: somar(contestacoes, 'recuperado'),
    devolucoes: { qtd: devolucoes.length, total: devolvido, itens: devolucoes },
    contestacoes: {
      qtd: contestacoes.length,
      desfechos,
      itens: contestacoes,
      emAndamento: { qtd: emAndamento.length, valor: somar(emAndamento, 'contestado') },
    },
    custoPorCanal,
    risco: { qtd: riscos.length, porMotivo: riscoPorMotivo, itens: riscos },
  };
}

/** Mês a mês: o que custou e o que foi recuperado. */
export function financeiroPorMes(tratativas = [], periodo = {}) {
  const meses = {};
  const somar = (mes, campo, valor) => {
    meses[mes] ||= { mes, devolvido: 0, perdaContestacoes: 0, custoOperacional: 0, perdaReceita: 0, recuperado: 0, casos: 0 };
    meses[mes][campo] += valor;
  };
  for (const t of tratativas) {
    if (!valida(t) || !ENCERRADA.includes(t.status) || !noPeriodo(t.data_encerramento, periodo)) continue;
    const mes = String(diaSP(t.data_encerramento)).slice(0, 7);
    somar(mes, 'casos', 1);
    somar(mes, 'custoOperacional', num(t.custo_operacional_reais));
    somar(mes, 'perdaReceita', num(t.valor_perda_receita));
    if (t.tipo_tratativa === 'contestacao') {
      const d = desfechoDaContestacao(t);
      somar(mes, 'perdaContestacoes', d.perda);
      somar(mes, 'recuperado', d.recuperado);
    } else if (t.houve_devolucao_financeira) {
      somar(mes, 'devolvido', num(t.valor_devolvido_cliente));
    }
  }
  return Object.values(meses)
    .map((m) => ({ ...m, total: m.devolvido + m.perdaContestacoes + m.custoOperacional + m.perdaReceita }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

/** Quanto custou por agente, por plano e por segmento do cliente. */
export function financeiroPorDimensao(tratativas = [], periodo = {}, campo = 'agente_responsavel_nome') {
  const mapa = {};
  for (const t of tratativas) {
    if (!valida(t) || !ENCERRADA.includes(t.status) || !noPeriodo(t.data_encerramento, periodo)) continue;
    const k = t[campo] || 'Não informado';
    mapa[k] ||= { nome: k, casos: 0, devolvido: 0, perda: 0, custoOperacional: 0, recuperado: 0 };
    const m = mapa[k];
    m.casos += 1;
    m.custoOperacional += num(t.custo_operacional_reais);
    if (t.tipo_tratativa === 'contestacao') {
      const d = desfechoDaContestacao(t);
      m.perda += d.perda;
      m.recuperado += d.recuperado;
    } else if (t.houve_devolucao_financeira) {
      m.devolvido += num(t.valor_devolvido_cliente);
    }
  }
  return Object.values(mapa)
    .map((m) => ({ ...m, total: m.devolvido + m.perda + m.custoOperacional }))
    .sort((a, b) => b.total - a.total);
}
