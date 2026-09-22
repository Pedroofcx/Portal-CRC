/**
 * Relatórios › Operação — como está a fila. Substitui o antigo "Analytics
 * Preditivo" (decisão de Pedro em 22/09/2026: "refazer tudo e bem
 * explicado"). Funções puras, testadas em `npm run testar`.
 *
 * O que saiu, e por quê:
 *   - "risco de SLA" de 130%: contava no numerador tratativas que não estavam
 *     no denominador e misturava vencidas com "quase vencendo";
 *   - "saturação", "capacidade teórica", simulação "+1 agente = +10%" e o
 *     texto "CMMI nível 4": números sem definição combinada;
 *   - entrada medida em 7 dias contra saída em 30.
 *
 * O que ficou: a fila de hoje (vencidas, vencendo em 24h), entrada × saída
 * no MESMO período, em quantos dias a fila zera no ritmo atual, e o tempo até
 * encerrar por canal — a mediana (o caso típico), não a média, que alguns
 * casos de meses puxam para cima.
 */
import { noPeriodo, diaSP } from './periodo.js';
import { prazoDaTratativa } from '../prazoSla.js';

const ABERTA = (t) => !t.excluida && !['encerrada', 'aguardando_confirmacao_reabertura', 'excluida'].includes(t.status);
const ENCERRADA = (t) => !t.excluida && ['encerrada', 'aguardando_confirmacao_reabertura'].includes(t.status);
const HORA = 3600 * 1000;

const percentil = (valores, p) => {
  if (!valores.length) return null;
  const s = [...valores].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const baixo = Math.floor(i);
  const alto = Math.ceil(i);
  return s[baixo] + (s[alto] - s[baixo]) * (i - baixo);
};

/** A fila neste momento. */
export function filaDeHoje(tratativas = [], agora = new Date()) {
  const abertas = tratativas.filter(ABERTA).map((t) => {
    const prazo = prazoDaTratativa(t);
    const situacao = !prazo ? 'sem_prazo' : prazo < agora ? 'vencida' : prazo - agora <= 24 * HORA ? 'vence_24h' : 'no_prazo';
    return { t, prazo, situacao };
  });
  const conta = (s) => abertas.filter((a) => a.situacao === s).length;
  const porAgente = {};
  for (const a of abertas) {
    const nome = a.t.agente_responsavel_nome || 'Sem agente';
    porAgente[nome] ||= { nome, abertas: 0, vencidas: 0, vence24h: 0 };
    porAgente[nome].abertas += 1;
    if (a.situacao === 'vencida') porAgente[nome].vencidas += 1;
    if (a.situacao === 'vence_24h') porAgente[nome].vence24h += 1;
  }
  return {
    total: abertas.length,
    vencidas: conta('vencida'),
    vence24h: conta('vence_24h'),
    noPrazo: conta('no_prazo'),
    semPrazo: conta('sem_prazo'),
    itens: abertas.sort((a, b) => (a.prazo ?? Infinity) - (b.prazo ?? Infinity)),
    porAgente: Object.values(porAgente).sort((a, b) => b.vencidas - a.vencidas || b.abertas - a.abertas),
  };
}

/** Dias do período, até hoje (um período que ainda não acabou conta só os dias passados). */
export function diasDoPeriodo({ inicio, fim } = {}, agora = new Date()) {
  const hoje = diaSP(agora);
  const ate = !fim || fim > hoje ? hoje : fim;
  if (!inicio || ate < inicio) return 0;
  return Math.round((new Date(`${ate}T12:00:00Z`) - new Date(`${inicio}T12:00:00Z`)) / (24 * HORA)) + 1;
}

/** Entrada × saída no período, e em quantos dias a fila zera nesse ritmo. */
export function entradaESaida(tratativas = [], periodo = {}, agora = new Date()) {
  const validas = tratativas.filter((t) => !t.excluida && t.status !== 'excluida');
  const entraram = validas.filter((t) => noPeriodo(t.data_registro || t.created_date, periodo)).length;
  const sairam = validas.filter((t) => ENCERRADA(t) && noPeriodo(t.data_encerramento, periodo)).length;
  const dias = diasDoPeriodo(periodo, agora);
  const saidaPorDia = dias ? sairam / dias : 0;
  const abertasAgora = tratativas.filter(ABERTA).length;
  return {
    entraram,
    sairam,
    saldo: entraram - sairam,
    dias,
    entradaPorDia: dias ? entraram / dias : 0,
    saidaPorDia,
    abertasAgora,
    diasParaZerar: saidaPorDia > 0 ? abertasAgora / saidaPorDia : null,
  };
}

/** Por semana (segunda a domingo), para o gráfico de entrada × saída. */
export function porSemana(tratativas = [], periodo = {}) {
  const semanas = {};
  const segunda = (dia) => {
    const d = new Date(`${dia}T12:00:00Z`);
    const dow = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dow);
    return d.toISOString().slice(0, 10);
  };
  const somar = (valor, campo) => {
    const dia = diaSP(valor);
    if (!dia || !noPeriodo(dia, periodo)) return;
    const k = segunda(dia);
    semanas[k] ||= { semana: k, entraram: 0, sairam: 0 };
    semanas[k][campo] += 1;
  };
  for (const t of tratativas) {
    if (t.excluida || t.status === 'excluida') continue;
    somar(t.data_registro || t.created_date, 'entraram');
    if (ENCERRADA(t)) somar(t.data_encerramento, 'sairam');
  }
  return Object.values(semanas).sort((a, b) => a.semana.localeCompare(b.semana));
}

/** Tempo até encerrar e % no prazo, por canal, das encerradas no período. */
export function tempoPorCanal(tratativas = [], periodo = {}) {
  const grupos = {};
  for (const t of tratativas) {
    if (!ENCERRADA(t) || !noPeriodo(t.data_encerramento, periodo)) continue;
    const g = (grupos[t.tipo_tratativa] ||= { tipo: t.tipo_tratativa, qtd: 0, noPrazo: 0, horas: [] });
    g.qtd += 1;
    if (t.encerrado_no_sla === true) g.noPrazo += 1;
    if (Number(t.tempo_total_minutos) > 0) g.horas.push(Number(t.tempo_total_minutos) / 60);
  }
  return Object.values(grupos).map((g) => ({
    tipo: g.tipo,
    qtd: g.qtd,
    pctNoPrazo: g.qtd ? (g.noPrazo / g.qtd) * 100 : null,
    medianaHoras: percentil(g.horas, 0.5),
    p90Horas: percentil(g.horas, 0.9),
  })).sort((a, b) => b.qtd - a.qtd);
}

/** Série de entrada × saída por dia, semana ou mês, com o acumulado da fila. */
export function serie(tratativas = [], periodo = {}, granularidade = 'semana') {
  const chaveDe = (dia) => {
    if (granularidade === 'dia') return dia;
    if (granularidade === 'mes') return dia.slice(0, 7);
    const d = new Date(`${dia}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  };
  const pontos = {};
  const somar = (valor, campo) => {
    const dia = diaSP(valor);
    if (!dia || !noPeriodo(dia, periodo)) return;
    const k = chaveDe(dia);
    pontos[k] ||= { chave: k, entraram: 0, sairam: 0 };
    pontos[k][campo] += 1;
  };
  for (const t of tratativas) {
    if (t.excluida || t.status === 'excluida') continue;
    somar(t.data_registro || t.created_date, 'entraram');
    if (ENCERRADA(t)) somar(t.data_encerramento, 'sairam');
  }
  let acumulado = 0;
  return Object.values(pontos).sort((a, b) => a.chave.localeCompare(b.chave)).map((p) => {
    acumulado += p.entraram - p.sairam;
    return { ...p, saldo: p.entraram - p.sairam, acumulado };
  });
}

/** Produtividade de cada agente no período (quem encerra quanto, e como). */
export function produtividade(tratativas = [], periodo = {}, agora = new Date()) {
  const dias = diasDoPeriodo(periodo, agora) || 1;
  const abertasPorAgente = {};
  for (const t of tratativas.filter(ABERTA)) {
    const nome = t.agente_responsavel_nome || 'Sem agente';
    abertasPorAgente[nome] = (abertasPorAgente[nome] || 0) + 1;
  }
  const porAgente = {};
  for (const t of tratativas) {
    if (!ENCERRADA(t) || t.excluida || !noPeriodo(t.data_encerramento, periodo)) continue;
    const nome = t.agente_responsavel_nome || 'Sem agente';
    porAgente[nome] ||= { nome, encerradas: 0, noPrazo: 0, horas: [], porCanal: {} };
    const a = porAgente[nome];
    a.encerradas += 1;
    if (t.encerrado_no_sla === true) a.noPrazo += 1;
    if (Number(t.tempo_total_minutos) > 0) a.horas.push(Number(t.tempo_total_minutos) / 60);
    a.porCanal[t.tipo_tratativa] = (a.porCanal[t.tipo_tratativa] || 0) + 1;
  }
  const mediana = (l) => { if (!l.length) return null; const s = [...l].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  return Object.values(porAgente).map((a) => ({
    nome: a.nome,
    encerradas: a.encerradas,
    porDia: a.encerradas / dias,
    pctNoPrazo: a.encerradas ? (a.noPrazo / a.encerradas) * 100 : null,
    medianaHoras: mediana(a.horas),
    abertasAgora: abertasPorAgente[a.nome] || 0,
    porCanal: a.porCanal,
  })).sort((x, y) => y.encerradas - x.encerradas);
}

/** Idade da fila: há quanto tempo as abertas estão esperando. */
export function idadeDaFila(tratativas = [], agora = new Date()) {
  const abertas = tratativas.filter(ABERTA);
  const idades = abertas.map((t) => (agora - new Date(t.data_registro || t.created_date)) / (24 * HORA)).filter((d) => Number.isFinite(d));
  const faixa = (min, max) => abertas.filter((t) => {
    const prazo = prazoDaTratativa(t);
    if (!prazo || prazo >= agora) return false;
    const atraso = (agora - prazo) / (24 * HORA);
    return atraso >= min && (max === null || atraso < max);
  }).length;
  const ordenadas = [...idades].sort((a, b) => a - b);
  return {
    medianaDias: ordenadas.length ? ordenadas[Math.floor(ordenadas.length / 2)] : null,
    maisAntigaDias: ordenadas.length ? ordenadas[ordenadas.length - 1] : null,
    atraso: { ate1: faixa(0, 1), de1a7: faixa(1, 7), de8a30: faixa(7, 30), mais30: faixa(30, null) },
  };
}

/** Avisos do período — só o que tem número por trás. */
export function avisosDaOperacao({ fila, es, tempos = [], produtividade: prod = [] }) {
  const avisos = [];
  if (fila.total > 0 && fila.vencidas / fila.total >= 0.5) {
    avisos.push({ tom: 'critico', texto: `${fila.vencidas} das ${fila.total} tratativas abertas já passaram do prazo.`, acao: 'Comece pelas mais antigas: elas estão na lista ao lado.' });
  }
  if (es.saldo > 0) {
    avisos.push({ tom: 'atencao', texto: `Entraram ${es.saldo} tratativas a mais do que saíram no período.`, acao: 'A fila cresce enquanto isso se mantiver.' });
  }
  const ruins = tempos.filter((t) => t.pctNoPrazo !== null && t.pctNoPrazo < 50);
  if (ruins.length) {
    avisos.push({ tom: 'atencao', texto: `Menos da metade encerrou no prazo em: ${ruins.map((t) => t.tipo).join(', ')}.`, acao: 'Vale rever o prazo do tipo ou a rotina de acompanhamento.' });
  }
  const sobrecarregado = [...prod].sort((a, b) => b.abertasAgora - a.abertasAgora)[0];
  if (sobrecarregado && sobrecarregado.abertasAgora >= 10) {
    avisos.push({ tom: 'atencao', texto: `${sobrecarregado.nome} está com ${sobrecarregado.abertasAgora} tratativas abertas.`, acao: 'Considere redistribuir parte da fila.' });
  }
  return avisos;
}
