/**
 * Contas da tela do gestor: tratativas vencidas da equipe, registros por
 * canal no ciclo e o acompanhamento de cada pessoa.
 *
 * Funções puras, sem banco nem React — as mesmas contas servem à tela inicial
 * do gestor, à página detalhada da pessoa e ao painel "Meu ciclo" do operador,
 * e os testes (npm run testar) conferem cada uma.
 */
import { prazoDaTratativa } from './prazoSla.js';
import { volumePorCanal } from './elegibilidade.js';

/** Estados em que a tratativa já saiu da fila de trabalho. */
export const STATUS_FECHADOS = ['encerrada', 'excluida', 'aguardando_confirmacao_reabertura'];

export const estaAberta = (t) => Boolean(t) && !t.excluida && !STATUS_FECHADOS.includes(t.status);

const mesmoDia = (a, b) => a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Situação do prazo de uma tratativa ABERTA: 'vencida', 'hoje' (vence ainda
 * hoje), 'no_prazo' ou 'sem_prazo'.
 */
export function situacaoDoPrazo(t, agora = new Date()) {
  const prazo = prazoDaTratativa(t);
  if (!prazo) return 'sem_prazo';
  if (prazo < agora) return 'vencida';
  return mesmoDia(prazo, agora) ? 'hoje' : 'no_prazo';
}

/** Abertas por ordem de prazo: a que venceu há mais tempo primeiro; sem prazo no fim. */
export function ordenarPorPrazo(tratativas = []) {
  const chave = (t) => prazoDaTratativa(t)?.getTime() ?? Infinity;
  return [...tratativas].sort((a, b) => chave(a) - chave(b));
}

/**
 * O retrato das abertas da equipe, agora.
 * @returns { abertas, vencidas, venceHoje, porAgente: [{ id, nome, abertas, vencidas, venceHoje }] }
 *          porAgente vem de quem tem mais vencidas para quem tem menos.
 */
export function vencidasDaEquipe(tratativas = [], agora = new Date()) {
  const porAgente = new Map();
  let abertas = 0;
  let vencidas = 0;
  let venceHoje = 0;

  for (const t of tratativas) {
    if (!estaAberta(t)) continue;
    const situacao = situacaoDoPrazo(t, agora);
    abertas += 1;
    if (situacao === 'vencida') vencidas += 1;
    if (situacao === 'hoje') venceHoje += 1;

    if (!t.agente_responsavel_id) continue;
    const linha = porAgente.get(t.agente_responsavel_id)
      ?? { id: t.agente_responsavel_id, nome: t.agente_responsavel_nome || '', abertas: 0, vencidas: 0, venceHoje: 0 };
    linha.abertas += 1;
    if (situacao === 'vencida') linha.vencidas += 1;
    if (situacao === 'hoje') linha.venceHoje += 1;
    porAgente.set(linha.id, linha);
  }

  return {
    abertas,
    vencidas,
    venceHoje,
    porAgente: [...porAgente.values()].sort((a, b) => b.vencidas - a.vencidas || b.abertas - a.abertas),
  };
}

/**
 * Registros por canal dentro do ciclo — conta pelo REGISTRO (data_registro),
 * que é o que a Estrutura de Trabalho chama de "registros no trimestre".
 */
export function registrosNoCiclo(tratativas = [], ciclo) {
  if (!ciclo) return volumePorCanal([]);
  const inicio = new Date(`${ciclo.data_inicio}T00:00:00`);
  const fim = new Date(`${ciclo.data_fim}T23:59:59`);
  return volumePorCanal(tratativas.filter((t) => {
    const d = t?.data_registro ? new Date(t.data_registro) : null;
    return d && d >= inicio && d <= fim;
  }));
}

/**
 * Parte das encerradas no ciclo que fecharam dentro do SLA, de 0 a 100.
 * Só conta quem tem a marcação (encerrado_no_sla true/false); `null` quando
 * nenhuma tem.
 */
export function percentualNoSla(encerradas = []) {
  const marcadas = encerradas.filter((t) => t?.encerrado_no_sla === true || t?.encerrado_no_sla === false);
  if (!marcadas.length) return null;
  return (marcadas.filter((t) => t.encerrado_no_sla === true).length / marcadas.length) * 100;
}

const DIA = 24 * 3600 * 1000;
const dataDe = (r) => r?.data_registro || r?.created_date || null;

/**
 * O acompanhamento de uma pessoa: PDI em andamento, último feedback,
 * último Hansei e as próximas férias.
 */
export function acompanhamentoDa(colaboradorId, { pdis = [], observacoes = [], hanseis = [], ciclosFerias = [] } = {}, agora = new Date()) {
  const pdiAtivo = pdis
    .filter((p) => p.colaborador_id === colaboradorId && p.status === 'em_andamento')
    .sort((a, b) => String(b.data_criacao || b.created_date).localeCompare(String(a.data_criacao || a.created_date)));

  const feedback = observacoes
    .filter((o) => Array.isArray(o.colaboradores_ids) && o.colaboradores_ids.includes(colaboradorId) && dataDe(o))
    .sort((a, b) => new Date(dataDe(b)) - new Date(dataDe(a)))[0] ?? null;

  const hansei = hanseis
    .filter((h) => h.colaborador_id === colaboradorId && (h.data_envio || h.created_date))
    .sort((a, b) => new Date(b.data_envio || b.created_date) - new Date(a.data_envio || a.created_date))[0] ?? null;

  const hoje = new Date(agora);
  hoje.setHours(0, 0, 0, 0);
  const proximasFerias = ciclosFerias
    .filter((c) => c.colaborador_id === colaboradorId)
    .flatMap((c) => c.fragmentos || [])
    .filter((f) => f?.data_inicio && f?.data_fim && new Date(`${f.data_fim}T23:59:59`) >= hoje)
    .sort((a, b) => String(a.data_inicio).localeCompare(String(b.data_inicio)))[0] ?? null;

  return {
    pdi: pdiAtivo[0]
      ? { titulo: pdiAtivo[0].titulo, percentual: Number(pdiAtivo[0].percentual_conclusao) || 0, ativos: pdiAtivo.length }
      : null,
    feedback: feedback
      ? { titulo: feedback.titulo || feedback.tipo || 'Feedback', dias: Math.floor((agora - new Date(dataDe(feedback))) / DIA) }
      : null,
    hansei: hansei
      ? { data: hansei.data_envio || hansei.created_date, visualizado: hansei.visualizado === true }
      : null,
    ferias: proximasFerias
      ? { inicio: proximasFerias.data_inicio, fim: proximasFerias.data_fim, dias: proximasFerias.dias ?? null }
      : null,
  };
}
