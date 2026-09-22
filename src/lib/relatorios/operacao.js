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
