/**
 * Relatórios › Canais — como estamos em cada canal. Substitui o antigo
 * "Relatórios por Tipo". Funções puras, testadas em `npm run testar`.
 *
 * Correções em relação ao antigo (22/09/2026):
 *   - nota média do Reclame Aqui ignorava as notas 0 (8,95 em vez de 8,52);
 *   - "sem reabertura" lia a confirmação manual; agora é apurado pelos dados
 *     (nova tratativa do mesmo cliente em 7 dias), como na premiação;
 *   - contestações com desfecho "contestou" não apareciam em lugar nenhum;
 *   - tempo em média (puxada por casos de meses) virou mediana.
 * Tudo conta as tratativas ENCERRADAS no período (horário de Brasília).
 */
import { noPeriodo } from './periodo.js';
import { reaberturaDe } from '../pontuacaoCiclo.js';
import { situacaoReplicavel } from '../../components/utils/helpers.js';
import { desfechoDaContestacao } from './financeiro.js';

const ENCERRADA = ['encerrada', 'aguardando_confirmacao_reabertura'];
const temValor = (v) => v !== null && v !== undefined && v !== '';
const pct = (parte, total) => (total ? (parte / total) * 100 : null);
const mediana = (l) => { if (!l.length) return null; const s = [...l].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const contar = (itens, chave) => {
  const m = {};
  for (const t of itens) { const k = chave(t); if (k) m[k] = (m[k] || 0) + 1; }
  return Object.entries(m).map(([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd);
};

export const CANAIS = ['reclamacao_interna', 'reclame_aqui', 'google_meu_negocio', 'contestacao'];

export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/** Hora (0-23) e dia da semana (0=dom) de um instante, no fuso de Brasília. */
function horaEDiaSemanaSP(instante) {
  const d = new Date(instante);
  if (Number.isNaN(d.getTime())) return null;
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false, weekday: 'short',
  }).formatToParts(d);
  // Alguns motores devolvem "24" pra meia-noite com hour12:false.
  const hora = Number(partes.find((p) => p.type === 'hour').value) % 24;
  const abrev = partes.find((p) => p.type === 'weekday').value;
  const mapa = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hora, diaSemana: mapa[abrev] };
}

/**
 * Em que horário e dia da semana chegam as reclamações (data_registro, hora
 * de Brasília) — pra achar o pico de volume, não de resultado. `tipo` é um
 * dos CANAIS, ou 'todos' pra somar os quatro.
 */
export function distribuicaoDeChegada(tratativas = [], { tipo = 'todos', periodo = {} } = {}) {
  const relevantes = tratativas.filter((t) => !t.excluida && t.status !== 'excluida'
    && (tipo === 'todos' ? CANAIS.includes(t.tipo_tratativa) : t.tipo_tratativa === tipo)
    && noPeriodo(t.data_registro || t.created_date, periodo));

  const porHora = Array.from({ length: 24 }, (_, hora) => ({ hora, qtd: 0 }));
  const porDiaSemana = Array.from({ length: 7 }, (_, diaSemana) => ({ diaSemana, nome: DIAS_SEMANA[diaSemana], qtd: 0 }));

  for (const t of relevantes) {
    const info = horaEDiaSemanaSP(t.data_registro || t.created_date);
    if (!info) continue;
    porHora[info.hora].qtd += 1;
    porDiaSemana[info.diaSemana].qtd += 1;
  }

  const total = relevantes.length;
  const horaPico = total ? [...porHora].sort((a, b) => b.qtd - a.qtd)[0] : null;
  const diaPico = total ? [...porDiaSemana].sort((a, b) => b.qtd - a.qtd)[0] : null;

  return { total, porHora, porDiaSemana, horaPico, diaPico };
}

export function resumoDoCanal(tratativas = [], tipo, periodo = {}, agora = new Date()) {
  const doTipo = tratativas.filter((t) => !t.excluida && t.status !== 'excluida'
    && (tipo === 'outros' ? !CANAIS.includes(t.tipo_tratativa) : t.tipo_tratativa === tipo));
  const encerradas = doTipo.filter((t) => ENCERRADA.includes(t.status) && noPeriodo(t.data_encerramento, periodo));
  const entraram = doTipo.filter((t) => noPeriodo(t.data_registro || t.created_date, periodo)).length;
  const noPrazo = encerradas.filter((t) => t.encerrado_no_sla === true).length;
  const devolucoes = encerradas.filter((t) => t.houve_devolucao_financeira && Number(t.valor_devolvido_cliente) > 0);

  const base = {
    tipo,
    entraram,
    encerradas: encerradas.length,
    pctNoPrazo: pct(noPrazo, encerradas.length),
    medianaHoras: mediana(encerradas.filter((t) => Number(t.tempo_total_minutos) > 0).map((t) => Number(t.tempo_total_minutos) / 60)),
    devolucoes: devolucoes.length,
    valorDevolvido: devolucoes.reduce((s, t) => s + Number(t.valor_devolvido_cliente), 0),
    motivos: contar(encerradas, (t) => t.motivo_nome).slice(0, 6),
    itens: encerradas,
  };

  // Mês a mês do canal, prioridades e clientes que mais aparecem.
  base.meses = (() => {
    const m = {};
    for (const t of doTipo) {
      const reg = String(t.data_registro || t.created_date || '').slice(0, 7);
      if (reg && noPeriodo(t.data_registro || t.created_date, periodo)) { m[reg] ||= { mes: reg, entraram: 0, encerradas: 0 }; m[reg].entraram += 1; }
      const enc = String(t.data_encerramento || '').slice(0, 7);
      if (enc && ENCERRADA.includes(t.status) && noPeriodo(t.data_encerramento, periodo)) { m[enc] ||= { mes: enc, entraram: 0, encerradas: 0 }; m[enc].encerradas += 1; }
    }
    return Object.values(m).sort((x, y) => x.mes.localeCompare(y.mes));
  })();
  base.prioridades = contar(encerradas, (t) => t.prioridade);
  base.clientes = (() => {
    const m = {};
    for (const t of encerradas) {
      const id = String(t.id_base_cliente ?? '').trim();
      if (!id) continue;
      m[id] ||= { nome: t.nome_cliente || `Cliente ${id}`, qtd: 0 };
      m[id].qtd += 1;
    }
    return Object.values(m).filter((c) => c.qtd > 1).sort((a2, b2) => b2.qtd - a2.qtd).slice(0, 6);
  })();

  if (tipo === 'reclamacao_interna') {
    const reab = encerradas.map((t) => reaberturaDe(t, tratativas, agora).situacao);
    const decididas = reab.filter((s) => s === 'reabriu' || s === 'nao_houve');
    const rep = encerradas.map(situacaoReplicavel);
    return {
      ...base,
      semReabertura: reab.filter((s) => s === 'nao_houve').length,
      voltaram: reab.filter((s) => s === 'reabriu').length,
      aguardando: reab.filter((s) => s === 'aguardando').length,
      pctSemReabertura: pct(reab.filter((s) => s === 'nao_houve').length, decididas.length),
      replicaveis: {
        marcadas: encerradas.filter((t) => t.solucao_replicavel).length,
        aprovadas: rep.filter((s) => s === 'aprovada').length,
        pendentes: rep.filter((s) => s === 'pendente').length,
        contestadas: rep.filter((s) => s === 'contestada').length,
      },
      causas: contar(encerradas, (t) => t.causa_primaria).slice(0, 6),
    };
  }

  if (tipo === 'reclame_aqui') {
    const comNota = encerradas.filter((t) => temValor(t.nota_reclame_aqui)).map((t) => ({ t, nota: Number(t.nota_reclame_aqui) }));
    const faixa = (min, max) => comNota.filter((n) => n.nota >= min && n.nota <= max).length;
    return {
      ...base,
      avaliadas: comNota.length,
      semNota: encerradas.length - comNota.length,
      notaMedia: comNota.length ? comNota.reduce((s, n) => s + n.nota, 0) / comNota.length : null,
      notas: { ate6: faixa(0, 6.99), de7a8: faixa(7, 8.99), nove: faixa(9, 9.99), dez: faixa(10, 10) },
      voltaria: comNota.filter((n) => n.t.voltaria_fazer_negocio === true).length,
      pctVoltaria: pct(comNota.filter((n) => n.t.voltaria_fazer_negocio === true).length, comNota.length),
      inativadas: encerradas.filter((t) => t.inativada_na_plataforma).length,
      categorias: contar(encerradas, (t) => t.categoria_reclame_aqui).slice(0, 6),
    };
  }

  if (tipo === 'google_meu_negocio') {
    return {
      ...base,
      reavaliacoes: encerradas.filter((t) => t.reavaliacao_positiva_google).length,
      exclusoes: encerradas.filter((t) => t.exclusao_avaliacao_negativa_google).length,
      inativadas: encerradas.filter((t) => t.inativada_na_plataforma).length,
      semReversao: encerradas.filter((t) => !t.reavaliacao_positiva_google && !t.exclusao_avaliacao_negativa_google && !t.inativada_na_plataforma).length,
      comentario: {
        mantido: encerradas.filter((t) => t.situacao_comentario_google === 'comentario_mantido').length,
        editado: encerradas.filter((t) => t.situacao_comentario_google === 'comentario_editado').length,
        excluido: encerradas.filter((t) => t.situacao_comentario_google === 'comentario_excluido').length,
      },
    };
  }

  if (tipo === 'contestacao') {
    const d = encerradas.map(desfechoDaContestacao);
    return {
      ...base,
      desfechos: contar(d, (x) => x.rotulo),
      recuperadas: d.filter((x) => x.grupo === 'recuperado').length,
      acordos: d.filter((x) => x.grupo === 'acordo').length,
      perdidas: d.filter((x) => x.grupo === 'perda').length,
      semDesfecho: d.filter((x) => x.grupo === 'sem_desfecho').length,
      emAndamento: doTipo.filter((t) => !ENCERRADA.includes(t.status)).length,
      categorias: contar(encerradas, (t) => t.categoria_contestacao).slice(0, 6),
    };
  }

  return { ...base, porTipo: contar(encerradas, (t) => t.tipo_tratativa) };
}
