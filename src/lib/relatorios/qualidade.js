/**
 * Relatórios › Qualidade — como os clientes nos avaliam. Funções puras,
 * testadas em `npm run testar`. As mesmas regras da premiação:
 *   CSAT = (CSAT do telefone + CSAT do chat) ÷ 2, cada canal com TODAS as
 *   avaliações do período (positivas ÷ avaliadas — não a média de médias);
 *   performance = ligações atendidas ÷ recebidas; CX = média das avaliações.
 * Cada dia conta uma vez (importação mais recente), como em indicadoresCiclo.
 */
import { indicadoresDoCiclo, diasApurados } from '../indicadoresCiclo.js';
import { pontosDaFaixa } from '../faixasIndicadores.js';

const semLimite = ({ inicio, fim } = {}) => ({ data_inicio: inicio || '0000-01-01', data_fim: fim || '9999-12-31' });
const pct = (parte, total) => (total > 0 ? (parte / total) * 100 : null);

/** Soma de telefone e chat de um grupo de apurações (já sem dias duplicados por pessoa). */
function somar(apuracoesPorPessoa, periodo) {
  const t = { ligacoes: 0, atendidas: 0, avaliadas: 0, positivas: 0, negativas: 0 };
  const c = { chats: 0, avaliados: 0, positivos: 0 };
  for (const lista of apuracoesPorPessoa) {
    for (const { dados } of diasApurados(lista, 'telefone', periodo)) {
      t.ligacoes += Number(dados.total_ligacoes) || 0;
      t.atendidas += Number(dados.total_atendidas) || 0;
      t.avaliadas += Number(dados.total_avaliadas) || 0;
      t.positivas += Number(dados.total_positivas) || 0;
      t.negativas += Number(dados.total_negativas) || 0;
    }
    for (const { dados } of diasApurados(lista, 'chat', periodo)) {
      c.chats += Number(dados.total_chats) || 0;
      c.avaliados += Number(dados.total_avaliados) || 0;
      c.positivos += Number(dados.total_positivos) || 0;
    }
  }
  // Telefone: positivas ÷ (positivas + negativas) — avaliadas inclui as
  // neutras (FCR 1 + nota 3) e as incompletas, que não entram no CSAT
  // (Pedro, 24/09/2026).
  const csatTel = pct(t.positivas, t.positivas + t.negativas);
  const csatChat = pct(c.positivos, c.avaliados);
  const canais = [csatTel, csatChat].filter((v) => v !== null);
  return {
    csat: canais.length ? canais.reduce((s, v) => s + v, 0) / canais.length : null,
    csatTelefone: csatTel,
    csatChat,
    performance: pct(t.atendidas, t.ligacoes),
    avaliadosTelefone: pct(t.avaliadas, t.atendidas),
    avaliadosChat: pct(c.avaliados, c.chats),
    volumes: { ...t, ...c },
  };
}

/**
 * @returns { equipe, pessoas: [...], meses: [...] }
 */
export function resumoQualidade({ apuracoes = [], colaboradores = [], periodo = {} }) {
  const p = semLimite(periodo);
  const agentes = colaboradores.filter((c) => c.papel === 'agente');
  const porPessoa = new Map(agentes.map((a) => [a.id, apuracoes.filter((x) => x.colaborador_id === a.id)]));

  const pessoas = agentes.map((a) => {
    const lista = porPessoa.get(a.id);
    const s = somar([lista], p);
    const ind = indicadoresDoCiclo(lista, p);
    return {
      id: a.id,
      nome: a.nome_completo,
      ativo: a.ativo !== false,
      ...s,
      cx: ind.cx?.valor ?? null,
      cxAvaliacoes: ind.cx?.avaliacoes ?? 0,
      pontos: { csat: pontosDaFaixa('csat', s.csat), performance: pontosDaFaixa('performance', s.performance), cx: pontosDaFaixa('cx', ind.cx?.valor) },
      temDados: s.volumes.ligacoes + s.volumes.chats > 0 || (ind.cx?.avaliacoes ?? 0) > 0,
    };
  }).filter((x) => x.temDados); // quem não teve apuração no período não entra

  // Equipe: soma de todo mundo (ponderado pelo volume), não média das pessoas.
  const equipe = somar([...porPessoa.values()], p);

  // Mês a mês, para ver a tendência.
  const meses = new Set();
  for (const lista of porPessoa.values()) {
    for (const tipo of ['telefone', 'chat']) for (const { dia } of diasApurados(lista, tipo, p)) meses.add(dia.slice(0, 7));
  }
  const serie = [...meses].sort().map((mes) => {
    const [ano, m] = mes.split('-').map(Number);
    const ultimo = new Date(ano, m, 0).getDate();
    const dentro = { data_inicio: `${mes}-01` < p.data_inicio ? p.data_inicio : `${mes}-01`, data_fim: `${mes}-${String(ultimo).padStart(2, '0')}` > p.data_fim ? p.data_fim : `${mes}-${String(ultimo).padStart(2, '0')}` };
    return { mes, ...somar([...porPessoa.values()], dentro) };
  });

  return { equipe, pessoas, meses: serie };
}

/** Segunda-feira da semana operacional (seg→sex) de um dia 'AAAA-MM-DD'. */
function inicioDaSemana(diaIso) {
  const [y, m, d] = diaIso.split('-').map(Number);
  const data = new Date(y, m - 1, d);
  const diaSemana = data.getDay();
  data.setDate(data.getDate() + (diaSemana === 0 ? -6 : 1 - diaSemana));
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

/** Sexta-feira da mesma semana operacional. */
function fimDaSemana(inicioIso) {
  const [y, m, d] = inicioIso.split('-').map(Number);
  const data = new Date(y, m - 1, d);
  data.setDate(data.getDate() + 4);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

/**
 * Dia a dia e semana a semana de UMA pessoa — para achar o dia (ou a semana)
 * ruim que puxou o mês. Usa `diasApurados`, a mesma fonte da premiação: cada
 * dia conta uma vez (vale a importação mais recente), sem lógica própria de
 * filtro de data — nada de reinventar o "está dentro do período?" aqui.
 */
export function diaADiaQualidade({ apuracoes = [], colaboradorId, periodo = {} }) {
  const p = semLimite(periodo);
  const lista = apuracoes.filter((a) => a.colaborador_id === colaboradorId);
  const tel = new Map(diasApurados(lista, 'telefone', p).map(({ dia, dados }) => [dia, dados]));
  const chat = new Map(diasApurados(lista, 'chat', p).map(({ dia, dados }) => [dia, dados]));
  const diasOrdenados = [...new Set([...tel.keys(), ...chat.keys()])].sort();

  const dias = diasOrdenados.map((dia) => {
    const t = tel.get(dia) ?? null;
    const c = chat.get(dia) ?? null;
    const baseCsatTel = t ? (Number(t.total_positivas) || 0) + (Number(t.total_negativas) || 0) : 0;
    return {
      dia,
      telefone: t,
      chat: c,
      csatTelefone: baseCsatTel > 0 ? pct(t.total_positivas, baseCsatTel) : null,
      csatChat: c && c.total_avaliados > 0 ? pct(c.total_positivos, c.total_avaliados) : null,
      performance: t && t.total_ligacoes > 0 ? pct(t.total_atendidas, t.total_ligacoes) : null,
    };
  });

  const porSemana = new Map();
  dias.forEach((d) => {
    const ini = inicioDaSemana(d.dia);
    if (!porSemana.has(ini)) porSemana.set(ini, []);
    porSemana.get(ini).push(d);
  });

  const semanas = [...porSemana.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([inicio, diasDaSemana]) => {
    const t = { pos: 0, neg: 0, lig: 0, at: 0 };
    const c = { pos: 0, av: 0, chats: 0 };
    diasDaSemana.forEach((d) => {
      if (d.telefone) {
        t.pos += Number(d.telefone.total_positivas) || 0;
        t.neg += Number(d.telefone.total_negativas) || 0;
        t.lig += Number(d.telefone.total_ligacoes) || 0;
        t.at += Number(d.telefone.total_atendidas) || 0;
      }
      if (d.chat) {
        c.pos += Number(d.chat.total_positivos) || 0;
        c.av += Number(d.chat.total_avaliados) || 0;
        c.chats += Number(d.chat.total_chats) || 0;
      }
    });
    return {
      inicio,
      fim: fimDaSemana(inicio),
      dias: diasDaSemana,
      csatTelefone: (t.pos + t.neg) > 0 ? pct(t.pos, t.pos + t.neg) : null,
      csatChat: c.av > 0 ? pct(c.pos, c.av) : null,
      performance: t.lig > 0 ? pct(t.at, t.lig) : null,
      volumes: { ligacoes: t.lig, atendidas: t.at, chats: c.chats },
    };
  });

  return { dias, semanas };
}
