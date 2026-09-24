/**
 * FÉRIAS — saldo, vencimento e as regras do pedido.
 *
 * Regras combinadas com Pedro (23/09/2026):
 *   - até três pessoas de férias ao mesmo tempo;
 *   - o pedido tem antecedência mínima;
 *   - a aprovação acontece no Portal (não mais por fora);
 *   - o agente enxerga o próprio saldo e quando ele vence.
 *
 * O saldo mora no CicloFerias (um por período aquisitivo, gerado pela data de
 * admissão). O pedido mora na SolicitacaoFerias. Quando o gestor aprova, o
 * período vira um fragmento do ciclo — é assim que o saldo baixa.
 */

export const MAXIMO_SIMULTANEOS = 3;
export const ANTECEDENCIA_MINIMA_DIAS = 30; // Art. 135 da CLT: aviso com 30 dias
export const MINIMO_DIAS_FRACAO = 5;
export const MINIMO_DIAS_PERIODO_MAIOR = 14;
export const MAXIMO_DIAS_VENDIDOS = 10;
export const DIAS_AVISO_VENCIMENTO = 90;

/** Status que ocupam vaga no calendário: pedido em pé ou já aprovado. */
export const STATUS_EM_PE = new Set(['em_analise', 'aprovada', 'sugestao_nova_data']);

const soData = (valor) => String(valor ?? '').slice(0, 10);
export const hojeSP = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

const emDias = (data) => {
  const [a, m, d] = soData(data).split('-').map(Number);
  return Date.UTC(a, m - 1, d) / 86400000;
};

/** Quantos dias corridos entre duas datas, contando as duas pontas. */
export const diasCorridos = (inicio, fim) => (
  !inicio || !fim ? 0 : Math.max(0, Math.round(emDias(fim) - emDias(inicio)) + 1)
);

/** Distância em dias entre duas datas (negativa se a segunda é anterior). */
export const distanciaEmDias = (de, ate) => Math.round(emDias(ate) - emDias(de));

/** Dois períodos se encostam? */
export const periodosSobrepoem = (a, b) => soData(a.data_inicio) <= soData(b.data_fim) && soData(a.data_fim) >= soData(b.data_inicio);

/** Saldo de um ciclo: quanto ainda dá para tirar e quando isso vence. */
export function saldoDoCiclo(ciclo, hoje = hojeSP()) {
  const direito = ciclo?.dias_direito ?? 30;
  const abono = ciclo?.abono_dias ?? 0;
  const usados = ciclo?.dias_utilizados ?? 0;
  const restantes = Math.max(0, direito - abono - usados);
  const venceEm = soData(ciclo?.concessivo_fim);
  const diasAteVencer = venceEm ? distanciaEmDias(hoje, venceEm) : null;
  return {
    direito, abono, usados, restantes, venceEm, diasAteVencer,
    vencido: diasAteVencer !== null && diasAteVencer < 0 && restantes > 0,
    vencendo: diasAteVencer !== null && diasAteVencer >= 0 && diasAteVencer <= DIAS_AVISO_VENCIMENTO && restantes > 0,
  };
}

/** A situação do ciclo, em uma palavra. */
export function situacaoDoCiclo(ciclo, hoje = hojeSP()) {
  const fimAquisitivo = soData(ciclo?.aquisitivo_fim);
  if (fimAquisitivo && hoje <= fimAquisitivo) return 'em_aquisicao';
  const saldo = saldoDoCiclo(ciclo, hoje);
  if (saldo.restantes === 0) return 'utilizado';
  if (saldo.vencido) return 'vencido';
  if (saldo.vencendo) return 'vencendo';
  if (saldo.usados > 0) return 'parcialmente_utilizado';
  return 'disponivel';
}

/** O ciclo que deve pagar um período de férias que começa nesta data. */
export function cicloParaAData(ciclos = [], dataInicio, hoje = hojeSP()) {
  const candidatos = ciclos
    .filter((c) => saldoDoCiclo(c, hoje).restantes > 0)
    .filter((c) => !c.aquisitivo_fim || soData(dataInicio) > soData(c.aquisitivo_fim))
    .sort((a, b) => soData(a.concessivo_fim).localeCompare(soData(b.concessivo_fim)));
  // O que vence primeiro é usado primeiro — senão o saldo vence sem ninguém ver.
  return candidatos[0] ?? null;
}

/** Quem está de férias numa data (pedidos em pé). */
export function deFeriasEm(solicitacoes = [], data) {
  const dia = soData(data);
  return solicitacoes.filter((s) => STATUS_EM_PE.has(s.status)
    && soData(s.data_inicio) <= dia && soData(s.data_fim) >= dia);
}

/**
 * O dia mais cheio dentro de um período: quantas pessoas já estariam fora e
 * quem são. É o que decide se o quarto pedido cabe.
 */
export function lotacaoNoPeriodo(solicitacoes = [], inicio, fim, { ignorarId, ignorarColaborador } = {}) {
  const emPe = solicitacoes.filter((s) => STATUS_EM_PE.has(s.status)
    && s.id !== ignorarId
    && s.colaborador_id !== ignorarColaborador
    && periodosSobrepoem(s, { data_inicio: inicio, data_fim: fim }));

  let pico = 0;
  let diaDoPico = null;
  const total = diasCorridos(inicio, fim);
  for (let i = 0; i < total; i += 1) {
    const dia = new Date((emDias(inicio) + i) * 86400000).toISOString().slice(0, 10);
    const quantos = emPe.filter((s) => soData(s.data_inicio) <= dia && soData(s.data_fim) >= dia).length;
    if (quantos > pico) { pico = quantos; diaDoPico = dia; }
  }
  return { pico, diaDoPico, pessoas: [...new Set(emPe.map((s) => s.colaborador_nome).filter(Boolean))], pedidos: emPe };
}

/**
 * Confere um pedido de férias. Erro impede o envio; aviso só alerta — quem
 * decide é o gestor, mas ninguém pede sem ver a regra na tela.
 */
export function conferirPedido({
  pedido, solicitacoes = [], ciclo = null, hoje = hojeSP(),
  maximoSimultaneos = MAXIMO_SIMULTANEOS, antecedenciaMinima = ANTECEDENCIA_MINIMA_DIAS,
}) {
  const erros = [];
  const avisos = [];
  const inicio = soData(pedido?.data_inicio);
  const fim = soData(pedido?.data_fim);

  if (!inicio || !fim) {
    return { erros: ['Escolha a data de início e a de fim.'], avisos, dias: 0, lotacao: null };
  }
  if (fim < inicio) {
    return { erros: ['A data de fim é anterior à de início.'], avisos, dias: 0, lotacao: null };
  }

  const dias = diasCorridos(inicio, fim);
  const antecedencia = distanciaEmDias(hoje, inicio);

  if (antecedencia < 0) erros.push('Não dá para pedir férias que já começaram.');
  else if (antecedencia < antecedenciaMinima) {
    erros.push(`O pedido precisa de ${antecedenciaMinima} dias de antecedência — faltam ${antecedencia} para o início.`);
  }

  if (dias < MINIMO_DIAS_FRACAO) erros.push(`Cada período precisa de ao menos ${MINIMO_DIAS_FRACAO} dias corridos.`);
  if (dias < MINIMO_DIAS_PERIODO_MAIOR) {
    avisos.push(`Pela CLT, um dos períodos do ano precisa ter ${MINIMO_DIAS_PERIODO_MAIOR} dias corridos ou mais.`);
  }

  const venda = pedido?.venda_dias ?? 0;
  if (venda > MAXIMO_DIAS_VENDIDOS) erros.push(`A venda de férias é de no máximo ${MAXIMO_DIAS_VENDIDOS} dias.`);

  const meuPedido = solicitacoes.some((s) => s.id !== pedido?.id
    && s.colaborador_id === pedido?.colaborador_id
    && STATUS_EM_PE.has(s.status)
    && periodosSobrepoem(s, { data_inicio: inicio, data_fim: fim }));
  if (meuPedido) erros.push('Você já tem um pedido nestas mesmas datas.');

  const lotacao = lotacaoNoPeriodo(solicitacoes, inicio, fim, { ignorarId: pedido?.id, ignorarColaborador: pedido?.colaborador_id });
  if (lotacao.pico >= maximoSimultaneos) {
    erros.push(`Já são ${lotacao.pico} pessoas de férias neste período (${lotacao.pessoas.join(', ')}). O limite é ${maximoSimultaneos}.`);
  } else if (lotacao.pico === maximoSimultaneos - 1) {
    avisos.push(`Com este pedido, ${maximoSimultaneos} pessoas ficam fora ao mesmo tempo — é o limite.`);
  }

  if (ciclo) {
    const saldo = saldoDoCiclo(ciclo, hoje);
    if (dias + venda > saldo.restantes) {
      erros.push(`O saldo deste período é de ${saldo.restantes} dia(s) e o pedido usa ${dias + venda}.`);
    }
    if (saldo.venceEm && fim > saldo.venceEm) {
      avisos.push(`Estas férias terminam depois de ${saldo.venceEm.split('-').reverse().join('/')}, quando o período vence.`);
    }
  } else {
    avisos.push('Nenhum período aquisitivo com saldo foi encontrado para estas datas.');
  }

  return { erros, avisos, dias, lotacao };
}

/** O fragmento que entra no ciclo quando o gestor aprova o pedido. */
export function fragmentoDoPedido(pedido) {
  return {
    id: `sol-${pedido.id}`,
    data_inicio: soData(pedido.data_inicio),
    data_fim: soData(pedido.data_fim),
    dias: diasCorridos(pedido.data_inicio, pedido.data_fim),
    abono_dias: pedido.venda_dias ?? 0,
    status: 'aprovado',
    observacao: 'Aprovado no Portal',
    solicitacao_id: pedido.id,
  };
}

/** Os próximos períodos aprovados, do mais próximo para o mais distante. */
export function proximasFerias(solicitacoes = [], hoje = hojeSP()) {
  return solicitacoes
    .filter((s) => s.status === 'aprovada' && soData(s.data_fim) >= hoje)
    .sort((a, b) => soData(a.data_inicio).localeCompare(soData(b.data_inicio)));
}
