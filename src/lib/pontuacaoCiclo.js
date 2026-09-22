/**
 * Pontuação do agente no ciclo — regras que dependem de MAIS DE UMA tratativa
 * (ou do ciclo), e por isso não cabem em calculateTratativaPoints, que olha
 * uma tratativa só. Funções puras, testadas em `npm run testar`.
 *
 * Decisões de Pedro em 22/09/2026 (documentacao/decisoes-de-regra.md):
 *
 * REABERTURA (reclamação interna): o +1 "sem reabertura" é perdido se o MESMO
 * cliente abrir qualquer nova tratativa, com qualquer agente, em até 7 dias
 * corridos depois do encerramento no Portal. Passados os 7 dias sem nova
 * abertura, o ponto é ganho — sem ninguém precisar confirmar. O cliente é
 * reconhecido pelo id da base (id_base_cliente).
 *
 * ABERTURA: cada tratativa aberta no Portal vale 0,5 ponto para o agente
 * responsável, no ciclo em que foi REGISTRADA. Vale do Ciclo 2 em diante
 * (ciclos que começam em 16/06/2026 ou depois); o Ciclo 1 não muda.
 */
import { calculateTratativaPoints } from '../components/utils/helpers.js';

const DIA = 24 * 60 * 60 * 1000;
export const PRAZO_REABERTURA_DIAS = 7;
export const PONTOS_POR_ABERTURA = 0.5;
export const ABERTURA_PONTUA_DESDE = '2026-06-16'; // início do Ciclo 2

const clienteDe = (t) => String(t?.id_base_cliente ?? '').trim();
const ms = (v) => (v ? new Date(v).getTime() : NaN);

/**
 * Situação da reabertura de uma reclamação interna encerrada.
 * @returns {{ situacao: 'reabriu'|'aguardando'|'nao_houve'|null, por?: object, ate?: Date }}
 *   null quando não se aplica (outro tipo, ainda aberta).
 */
export function reaberturaDe(tratativa, todas = [], agora = new Date()) {
  if (tratativa?.tipo_tratativa !== 'reclamacao_interna' || !tratativa.data_encerramento) return { situacao: null };
  const fim = ms(tratativa.data_encerramento);
  const ate = new Date(fim + PRAZO_REABERTURA_DIAS * DIA);
  const cliente = clienteDe(tratativa);

  const nova = cliente
    ? todas
      .filter((o) => o.id !== tratativa.id && !o.excluida && clienteDe(o) === cliente)
      .filter((o) => { const r = ms(o.data_registro); return r > fim && r <= ate.getTime(); })
      .sort((a, b) => ms(a.data_registro) - ms(b.data_registro))[0]
    : null;
  if (nova) return { situacao: 'reabriu', por: nova, ate };

  // O gestor pode ter registrado à mão que o cliente voltou por um canal que
  // não virou tratativa — isso continua valendo.
  if (tratativa.status_reabertura === 'cliente_reabriu') return { situacao: 'reabriu', ate };
  if (agora.getTime() < ate.getTime()) return { situacao: 'aguardando', ate };
  return { situacao: 'nao_houve', ate };
}

/** A tratativa com status_reabertura trocado pelo que os dados dizem — para calculateTratativaPoints. */
export function comReaberturaApurada(tratativa, todas, agora) {
  const { situacao } = reaberturaDe(tratativa, todas, agora);
  if (!situacao) return tratativa;
  const status = { reabriu: 'cliente_reabriu', aguardando: 'aguardando', nao_houve: 'nao_houve' }[situacao];
  return { ...tratativa, status_reabertura: status };
}

const dentro = (valor, ciclo) => {
  if (!valor || !ciclo) return false;
  const t = ms(valor);
  return t >= new Date(`${ciclo.data_inicio}T00:00:00`).getTime() && t <= new Date(`${ciclo.data_fim}T23:59:59`).getTime();
};

/** O ciclo paga 0,5 por abertura? Só os que começam no Ciclo 2 ou depois. */
export const cicloPagaAbertura = (ciclo) => !!ciclo?.data_inicio && ciclo.data_inicio >= ABERTURA_PONTUA_DESDE;

/** Tratativas registradas no ciclo que pagam 0,5 (não excluídas, com agente). */
export function aberturasNoCiclo(todas = [], ciclo) {
  if (!cicloPagaAbertura(ciclo)) return [];
  return todas.filter((t) => !t.excluida && t.agente_responsavel_id && dentro(t.data_registro, ciclo));
}

/**
 * Pontos de tratativas de cada agente no ciclo.
 * @param todas TODAS as tratativas (abertas também: são elas que revelam a reabertura)
 * @returns Map agenteId -> { itens, aberturas, pontosEncerramento, pontosAbertura }
 *   itens: [{ tratativa_id, pontos, detalhes, tipo_tratativa, data_encerramento, encerrado_no_sla, nome_cliente }]
 */
export function pontosDeTratativasNoCiclo(todas = [], ciclo, { encerrada, noCiclo }, agora = new Date()) {
  const porAgente = new Map();
  const doAgente = (id) => {
    if (!porAgente.has(id)) porAgente.set(id, { itens: [], aberturas: [], pontosEncerramento: 0, pontosAbertura: 0 });
    return porAgente.get(id);
  };

  for (const t of todas) {
    if (t.excluida || !t.agente_responsavel_id || !encerrada(t) || !noCiclo(t, ciclo)) continue;
    const { pontos, detalhes } = calculateTratativaPoints(comReaberturaApurada(t, todas, agora));
    const reg = doAgente(t.agente_responsavel_id);
    reg.itens.push({
      tratativa_id: t.id,
      pontos,
      detalhes,
      tipo_tratativa: t.tipo_tratativa,
      data_encerramento: t.data_encerramento,
      encerrado_no_sla: t.encerrado_no_sla,
      nome_cliente: t.nome_cliente,
    });
    reg.pontosEncerramento += pontos;
  }

  for (const t of aberturasNoCiclo(todas, ciclo)) {
    const reg = doAgente(t.agente_responsavel_id);
    reg.aberturas.push({ tratativa_id: t.id, data_registro: t.data_registro, tipo_tratativa: t.tipo_tratativa, nome_cliente: t.nome_cliente });
    reg.pontosAbertura += PONTOS_POR_ABERTURA;
  }
  return porAgente;
}
