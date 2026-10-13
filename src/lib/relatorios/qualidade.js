/**
 * Relatórios › Qualidade — como os clientes nos avaliam. Funções puras,
 * testadas em `npm run testar`. As mesmas regras da premiação:
 *   CSAT = (CSAT do telefone + CSAT do chat) ÷ 2, cada canal com TODAS as
 *   avaliações do período (positivas ÷ avaliadas — não a média de médias);
 *   performance = ligações atendidas ÷ recebidas; CX = média das avaliações.
 * Cada dia conta uma vez (importação mais recente), como em indicadoresCiclo.
 *
 * Chat com duas fontes (13/10/2026): Zendesk e ClickDesk. Por padrão o CSAT do
 * chat é a média simples dos dois (`fonteChat: 'combinado'`); os relatórios
 * também podem olhar só uma delas (`'zendesk'` ou `'clickdesk'`).
 */
import {
  indicadoresDoCiclo, diasApurados, FONTES_DO_CHAT, novoAcumuladorChat, somarNoAcumulador, juntarAcumuladores, csatDoAcumulador, volumeDoAcumulador, acumuladorDoChat,
} from '../indicadoresCiclo.js';
import { pontosDaFaixa } from '../faixasIndicadores.js';

const semLimite = ({ inicio, fim } = {}) => ({ data_inicio: inicio || '0000-01-01', data_fim: fim || '9999-12-31' });
const pct = (parte, total) => (total > 0 ? (parte / total) * 100 : null);

/** Soma de telefone e chat de um grupo de apurações (já sem dias duplicados por pessoa). */
function somar(apuracoesPorPessoa, periodo, fonteChat = 'combinado') {
  const t = { ligacoes: 0, atendidas: 0, avaliadas: 0, positivas: 0, negativas: 0, neutras: 0 };
  const acumulador = novoAcumuladorChat();
  for (const lista of apuracoesPorPessoa) {
    for (const { dados } of diasApurados(lista, 'telefone', periodo)) {
      t.ligacoes += Number(dados.total_ligacoes) || 0;
      t.atendidas += Number(dados.total_atendidas) || 0;
      t.avaliadas += Number(dados.total_avaliadas) || 0;
      t.positivas += Number(dados.total_positivas) || 0;
      t.negativas += Number(dados.total_negativas) || 0;
      t.neutras += Number(dados.neutras_na_base) || 0;
    }
    juntarAcumuladores(acumulador, acumuladorDoChat(lista, periodo));
  }
  const c = volumeDoAcumulador(acumulador, fonteChat);
  // Telefone: positivas ÷ (positivas + negativas) — avaliadas inclui as
  // neutras (FCR 1 + nota 3) e as incompletas, que não entram no CSAT
  // (Pedro, 24/09/2026).
  const csatTel = pct(t.positivas, t.positivas + t.negativas + t.neutras);
  const csatChat = csatDoAcumulador(acumulador, fonteChat);
  const canais = [csatTel, csatChat].filter((v) => v !== null);
  return {
    csat: canais.length ? canais.reduce((s, v) => s + v, 0) / canais.length : null,
    csatTelefone: csatTel,
    csatChat,
    csatChatPorFonte: Object.fromEntries(FONTES_DO_CHAT.map((f) => [f, csatDoAcumulador(acumulador, f)])),
    volumesChatPorFonte: Object.fromEntries(FONTES_DO_CHAT.map((f) => [f, acumulador[f]])),
    performance: pct(t.atendidas, t.ligacoes),
    avaliadosTelefone: pct(t.avaliadas, t.atendidas),
    avaliadosChat: pct(c.avaliados, c.chats),
    volumes: { ...t, ...c },
  };
}

/**
 * Mês a mês de um grupo de listas de apuração: um item por mês com apuração,
 * com a mesma conta de `somar` limitada ao pedaço do mês que cai no período.
 * Serve à equipe inteira e a cada pessoa (o gráfico de linhas é o mesmo).
 */
function serieMensal(listas, p, fonteChat = 'combinado') {
  const meses = new Set();
  for (const lista of listas) {
    for (const tipo of ['telefone', 'chat']) for (const { dia } of diasApurados(lista, tipo, p)) meses.add(dia.slice(0, 7));
  }
  return [...meses].sort().map((mes) => {
    const [ano, m] = mes.split('-').map(Number);
    const ultimo = String(new Date(ano, m, 0).getDate()).padStart(2, '0');
    const dentro = {
      data_inicio: `${mes}-01` < p.data_inicio ? p.data_inicio : `${mes}-01`,
      data_fim: `${mes}-${ultimo}` > p.data_fim ? p.data_fim : `${mes}-${ultimo}`,
    };
    return { mes, ...somar(listas, dentro, fonteChat) };
  });
}

/**
 * @returns { equipe, pessoas: [...], meses: [...] } — cada pessoa também traz
 * `meses`, a mesma série mensal só dela.
 */
export function resumoQualidade({ apuracoes = [], colaboradores = [], periodo = {}, fonteChat = 'combinado' }) {
  const p = semLimite(periodo);
  const agentes = colaboradores.filter((c) => c.papel === 'agente');
  const porPessoa = new Map(agentes.map((a) => [a.id, apuracoes.filter((x) => x.colaborador_id === a.id)]));

  const pessoas = agentes.map((a) => {
    const lista = porPessoa.get(a.id);
    const s = somar([lista], p, fonteChat);
    const ind = indicadoresDoCiclo(lista, p);
    return {
      id: a.id,
      nome: a.nome_completo,
      ativo: a.ativo !== false,
      ...s,
      cx: ind.cx?.valor ?? null,
      cxAvaliacoes: ind.cx?.avaliacoes ?? 0,
      pontos: { csat: pontosDaFaixa('csat', s.csat), performance: pontosDaFaixa('performance', s.performance), cx: pontosDaFaixa('cx', ind.cx?.valor) },
      meses: serieMensal([lista], p, fonteChat),
      temDados: s.volumes.ligacoes + s.volumes.chats > 0 || (ind.cx?.avaliacoes ?? 0) > 0,
    };
  }).filter((x) => x.temDados); // quem não teve apuração no período não entra

  // Equipe: soma de todo mundo (ponderado pelo volume), não média das pessoas.
  const equipe = somar([...porPessoa.values()], p, fonteChat);

  // Mês a mês, para ver a tendência.
  const serie = serieMensal([...porPessoa.values()], p, fonteChat);

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
 * Dia a dia e semana a semana da EQUIPE INTEIRA (soma de todos os agentes
 * por dia, não média das pessoas — mesma regra de `resumoQualidade`). Para
 * o Preditivo: achar o dia que puxou o melhor/pior mês ou semana da equipe.
 */
export function diaADiaEquipeQualidade({ apuracoes = [], colaboradores = [], periodo = {}, fonteChat = 'combinado' }) {
  const p = semLimite(periodo);
  const agentes = colaboradores.filter((c) => c.papel === 'agente');
  const listasPorAgente = agentes.map((a) => apuracoes.filter((x) => x.colaborador_id === a.id));

  const tel = new Map();
  const chat = new Map();
  for (const lista of listasPorAgente) {
    for (const { dia, dados } of diasApurados(lista, 'telefone', p)) {
      const acc = tel.get(dia) || { positivas: 0, negativas: 0, neutras: 0, ligacoes: 0, atendidas: 0 };
      acc.positivas += Number(dados.total_positivas) || 0;
      acc.negativas += Number(dados.total_negativas) || 0;
      acc.neutras += Number(dados.neutras_na_base) || 0;
      acc.ligacoes += Number(dados.total_ligacoes) || 0;
      acc.atendidas += Number(dados.total_atendidas) || 0;
      tel.set(dia, acc);
    }
    for (const { dia, dados, fonte } of diasApurados(lista, 'chat', p)) {
      const acc = chat.get(dia) || novoAcumuladorChat();
      somarNoAcumulador(acc, fonte, dados);
      chat.set(dia, acc);
    }
  }

  const diasOrdenados = [...new Set([...tel.keys(), ...chat.keys()])].sort();
  const dias = diasOrdenados.map((dia) => {
    const t = tel.get(dia) ?? null;
    const c = chat.get(dia) ?? null;
    const baseCsatTel = t ? t.positivas + t.negativas + t.neutras : 0;
    const csatTelefone = baseCsatTel > 0 ? pct(t.positivas, baseCsatTel) : null;
    const csatChat = c ? csatDoAcumulador(c, fonteChat) : null;
    const canais = [csatTelefone, csatChat].filter((v) => v !== null);
    return {
      dia,
      csat: canais.length ? canais.reduce((s, v) => s + v, 0) / canais.length : null,
      csatTelefone,
      csatChat,
      performance: t && t.ligacoes > 0 ? pct(t.atendidas, t.ligacoes) : null,
      volumes: { ligacoes: t?.ligacoes ?? 0, atendidas: t?.atendidas ?? 0, chats: c ? volumeDoAcumulador(c, fonteChat).chats : 0 },
    };
  });

  const porSemana = new Map();
  diasOrdenados.forEach((dia) => {
    const ini = inicioDaSemana(dia);
    if (!porSemana.has(ini)) porSemana.set(ini, []);
    porSemana.get(ini).push(dia);
  });
  const semanas = [...porSemana.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([inicio, diasDaSemana]) => {
    // Soma os totais brutos da semana (não os CSAT já calculados por dia —
    // média de percentuais distorceria dias com volumes bem diferentes).
    const t = { positivas: 0, negativas: 0, neutras: 0, ligacoes: 0, atendidas: 0 };
    const c = novoAcumuladorChat();
    diasDaSemana.forEach((dia) => {
      const dt = tel.get(dia); const dc = chat.get(dia);
      if (dt) { t.positivas += dt.positivas; t.negativas += dt.negativas; t.neutras += dt.neutras; t.ligacoes += dt.ligacoes; t.atendidas += dt.atendidas; }
      if (dc) juntarAcumuladores(c, dc);
    });
    const csatTelefone = (t.positivas + t.negativas + t.neutras) > 0 ? pct(t.positivas, t.positivas + t.negativas + t.neutras) : null;
    const csatChat = csatDoAcumulador(c, fonteChat);
    const canais = [csatTelefone, csatChat].filter((v) => v !== null);
    return {
      inicio,
      fim: fimDaSemana(inicio),
      dias: diasDaSemana.map((dia) => dias.find((d) => d.dia === dia)),
      csat: canais.length ? canais.reduce((s, v) => s + v, 0) / canais.length : null,
      csatTelefone,
      csatChat,
      performance: t.ligacoes > 0 ? pct(t.atendidas, t.ligacoes) : null,
      volumes: { ligacoes: t.ligacoes, atendidas: t.atendidas, chats: volumeDoAcumulador(c, fonteChat).chats },
    };
  });

  return { dias, semanas };
}

/**
 * Dia a dia e semana a semana de UMA pessoa — para achar o dia (ou a semana)
 * ruim que puxou o mês. Usa `diasApurados`, a mesma fonte da premiação: cada
 * dia conta uma vez (vale a importação mais recente), sem lógica própria de
 * filtro de data — nada de reinventar o "está dentro do período?" aqui.
 */
export function diaADiaQualidade({ apuracoes = [], colaboradorId, periodo = {}, fonteChat = 'combinado' }) {
  const p = semLimite(periodo);
  const lista = apuracoes.filter((a) => a.colaborador_id === colaboradorId);
  const tel = new Map(diasApurados(lista, 'telefone', p).map(({ dia, dados }) => [dia, dados]));
  // Chat: um acumulador por dia, com uma coluna por fonte (Zendesk e ClickDesk).
  const chat = new Map();
  for (const { dia, dados, fonte } of diasApurados(lista, 'chat', p)) {
    const acc = chat.get(dia) || novoAcumuladorChat();
    somarNoAcumulador(acc, fonte, dados);
    chat.set(dia, acc);
  }
  const diasOrdenados = [...new Set([...tel.keys(), ...chat.keys()])].sort();

  const dias = diasOrdenados.map((dia) => {
    const t = tel.get(dia) ?? null;
    const acc = chat.get(dia) ?? null;
    const v = acc ? volumeDoAcumulador(acc, fonteChat) : null;
    // `chat` no formato de sempre (total_*), com o que foi escolhido (uma fonte ou as duas).
    const c = acc && (v.chats > 0 || v.avaliados > 0) ? { total_chats: v.chats, total_avaliados: v.avaliados, total_positivos: v.positivos } : null;
    const baseCsatTel = t ? (Number(t.total_positivas) || 0) + (Number(t.total_negativas) || 0) + (Number(t.neutras_na_base) || 0) : 0;
    return {
      dia,
      telefone: t,
      chat: c,
      chatAcumulado: acc,
      csatTelefone: baseCsatTel > 0 ? pct(t.total_positivas, baseCsatTel) : null,
      csatChat: acc ? csatDoAcumulador(acc, fonteChat) : null,
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
    const t = { pos: 0, neg: 0, neu: 0, lig: 0, at: 0 };
    const c = novoAcumuladorChat();
    diasDaSemana.forEach((d) => {
      if (d.telefone) {
        t.pos += Number(d.telefone.total_positivas) || 0;
        t.neg += Number(d.telefone.total_negativas) || 0;
        t.neu += Number(d.telefone.neutras_na_base) || 0;
        t.lig += Number(d.telefone.total_ligacoes) || 0;
        t.at += Number(d.telefone.total_atendidas) || 0;
      }
      if (d.chatAcumulado) juntarAcumuladores(c, d.chatAcumulado);
    });
    return {
      inicio,
      fim: fimDaSemana(inicio),
      dias: diasDaSemana,
      csatTelefone: (t.pos + t.neg + t.neu) > 0 ? pct(t.pos, t.pos + t.neg + t.neu) : null,
      csatChat: csatDoAcumulador(c, fonteChat),
      performance: t.lig > 0 ? pct(t.at, t.lig) : null,
      volumes: { ligacoes: t.lig, atendidas: t.at, chats: volumeDoAcumulador(c, fonteChat).chats },
    };
  });

  return { dias, semanas };
}
