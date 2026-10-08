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
 * VOLUME MÍNIMO POR CANAL (decisão de 08/10/2026, do Ciclo 3 em diante): os
 * pontos de um canal só contam se a pessoa tem pelo menos N registros (padrão
 * 4) naquele canal, no ciclo — por data de registro, é o "registros no
 * trimestre" da Estrutura de Trabalho. Abaixo disso os pontos do canal ficam
 * RETIDOS: aparecem à parte, não somam, e voltam a contar quando o canal
 * chega ao mínimo. Os ciclos 1 e 2 já foram apurados e não mudam.
 *
 * ABERTURA: cada tratativa aberta no Portal vale 0,5 ponto para o agente
 * responsável, no ciclo em que foi REGISTRADA. Vale do Ciclo 2 em diante
 * (ciclos que começam em 16/06/2026 ou depois); o Ciclo 1 não muda.
 */
import { calculateTratativaPoints } from '../components/utils/helpers.js';
import { volumePorCanal, canalDe, VOLUME_MINIMO_PADRAO } from './elegibilidade.js';

const DIA = 24 * 60 * 60 * 1000;
export const PRAZO_REABERTURA_DIAS = 7;
export const PONTOS_POR_ABERTURA = 0.5;
export const ABERTURA_PONTUA_DESDE = '2026-06-16'; // início do Ciclo 2
export const VOLUME_MINIMO_VALE_DESDE = '2026-09-16'; // início do Ciclo 3

/** O ciclo aplica o mínimo de registros por canal? Do Ciclo 3 em diante. */
export const cicloExigeVolumeMinimo = (ciclo) => !!ciclo?.data_inicio && ciclo.data_inicio >= VOLUME_MINIMO_VALE_DESDE;

/**
 * A tratativa está no ciclo? Pelo encerramento (ou pelo registro, se ainda
 * não encerrou), no horário de quem calcula.
 */
export function tratativaNosCiclo(tratativa, ciclo) {
  if (!ciclo) return false;
  const dataRef = tratativa.data_encerramento || tratativa.data_registro;
  if (!dataRef) return false;
  return instanteNoCiclo(dataRef, ciclo);
}

/**
 * A regra do dia de virada (16/06, 16/09) vale só a partir do Ciclo 3.
 * Os ciclos 1 e 2 já foram apurados e a premiação do Ciclo 2 tem decisões
 * humanas em cima desses números (Pedro, 02/10/2026): eles seguem exatamente
 * como eram, com o dia de início contando.
 */
export const DIA_DE_VIRADA_VALE_DESDE = '2026-09-16';

/**
 * O instante cai no ciclo? Do Ciclo 3 em diante, o dia em que um ciclo termina
 * é o mesmo em que o seguinte começa, e esse dia pertence ao ciclo que TERMINA:
 * o dia de início fica de fora, para cada evento pontuar em um ciclo só. Nos
 * ciclos anteriores o dia de início continua contando (ver acima).
 */
export function instanteNoCiclo(instante, ciclo) {
  if (!instante || !ciclo?.data_inicio || !ciclo?.data_fim) return false;
  const t = new Date(instante).getTime();
  if (Number.isNaN(t)) return false;
  const inicioExclusivo = ciclo.data_inicio >= DIA_DE_VIRADA_VALE_DESDE;
  const comecou = inicioExclusivo
    ? t > new Date(`${ciclo.data_inicio}T23:59:59.999`).getTime()
    : t >= new Date(`${ciclo.data_inicio}T00:00:00`).getTime();
  return comecou && t <= new Date(`${ciclo.data_fim}T23:59:59.999`).getTime();
}

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

const dentro = (valor, ciclo) => instanteNoCiclo(valor, ciclo);

/** O ciclo paga 0,5 por abertura? Só os que começam no Ciclo 2 ou depois. */
export const cicloPagaAbertura = (ciclo) => !!ciclo?.data_inicio && ciclo.data_inicio >= ABERTURA_PONTUA_DESDE;

/** Tratativas registradas no ciclo que pagam 0,5 (não excluídas, com agente). */
export function aberturasNoCiclo(todas = [], ciclo) {
  if (!cicloPagaAbertura(ciclo)) return [];
  return todas.filter((t) => !t.excluida && t.agente_responsavel_id && dentro(t.data_registro, ciclo));
}

/**
 * A abertura de UMA tratativa: 0,5 no ciclo em que foi registrada, do Ciclo 2
 * em diante. Devolve { pontos, ciclo }, ou null quando não paga (ciclo 1,
 * excluída, sem agente). É a mesma conta de aberturasNoCiclo, olhada de uma
 * tratativa só — a tela da tratativa mostra o ponto por aqui.
 */
export function aberturaDaTratativa(tratativa, ciclos = []) {
  if (!tratativa || tratativa.excluida || !tratativa.agente_responsavel_id) return null;
  const ciclo = ciclos.find((c) => dentro(tratativa.data_registro, c));
  if (!ciclo || !cicloPagaAbertura(ciclo)) return null;
  return { pontos: PONTOS_POR_ABERTURA, ciclo };
}

/**
 * Pontos de tratativas de cada agente no ciclo.
 * @param todas TODAS as tratativas (abertas também: são elas que revelam a reabertura)
 * @param opcoes.volumeMinimo registros mínimos por canal (do Ciclo 3 em diante); padrão 4
 * @returns Map agenteId -> { itens, aberturas, pontosEncerramento, pontosAbertura,
 *   volume, volumeMinimo, retidos, pontosRetidos }
 *   itens: [{ tratativa_id, pontos, detalhes, tipo_tratativa, data_encerramento, encerrado_no_sla, nome_cliente }]
 *   itens e aberturas são só o que CONTA; o que ficou retido por canal abaixo do
 *   mínimo está em retidos: { [canal]: { registros, minimo, pontos, itens, aberturas } }.
 */
export function pontosDeTratativasNoCiclo(todas = [], ciclo, { encerrada, noCiclo, volumeMinimo = VOLUME_MINIMO_PADRAO }, agora = new Date()) {
  const porAgente = new Map();
  const doAgente = (id) => {
    if (!porAgente.has(id)) porAgente.set(id, { itens: [], aberturas: [], pontosEncerramento: 0, pontosAbertura: 0 });
    return porAgente.get(id);
  };

  for (const t of todas) {
    if (t.excluida || !t.agente_responsavel_id || !encerrada(t) || !noCiclo(t, ciclo)) continue;
    const { pontos, detalhes } = calculateTratativaPoints(comReaberturaApurada(t, todas, agora), { ciclo });
    const reg = doAgente(t.agente_responsavel_id);
    reg.itens.push({
      tratativa_id: t.id,
      pontos,
      detalhes,
      tipo_tratativa: t.tipo_tratativa,
      data_encerramento: t.data_encerramento,
      encerrado_no_sla: t.encerrado_no_sla,
      nome_cliente: t.nome_cliente,
      id_interno: t.id_interno,
    });
    reg.pontosEncerramento += pontos;
  }

  for (const t of aberturasNoCiclo(todas, ciclo)) {
    const reg = doAgente(t.agente_responsavel_id);
    reg.aberturas.push({ tratativa_id: t.id, data_registro: t.data_registro, tipo_tratativa: t.tipo_tratativa, nome_cliente: t.nome_cliente, id_interno: t.id_interno });
    reg.pontosAbertura += PONTOS_POR_ABERTURA;
  }

  // Registros de cada pessoa por canal no ciclo (por data de registro).
  const registrosDe = new Map();
  if (ciclo) {
    for (const t of todas) {
      if (t.excluida || !t.agente_responsavel_id || !dentro(t.data_registro, ciclo)) continue;
      if (!registrosDe.has(t.agente_responsavel_id)) registrosDe.set(t.agente_responsavel_id, []);
      registrosDe.get(t.agente_responsavel_id).push(t);
    }
  }
  for (const id of registrosDe.keys()) doAgente(id);

  const aplica = cicloExigeVolumeMinimo(ciclo);
  for (const [id, reg] of porAgente) {
    const volume = volumePorCanal(registrosDe.get(id) ?? []);
    reg.volume = volume;
    reg.volumeMinimo = volumeMinimo;
    reg.retidos = {};
    reg.pontosRetidos = 0;
    if (!aplica) continue;

    const abaixo = (tipo) => {
      const canal = canalDe(tipo);
      return canal in volume && volume[canal] < volumeMinimo ? canal : null;
    };
    const retido = (canal) => (reg.retidos[canal] ||= { canal, registros: volume[canal], minimo: volumeMinimo, pontos: 0, itens: [], aberturas: [] });

    const itens = [];
    for (const i of reg.itens) {
      const canal = abaixo(i.tipo_tratativa);
      if (!canal) { itens.push(i); continue; }
      const r = retido(canal);
      r.itens.push(i);
      r.pontos += i.pontos;
    }
    const aberturas = [];
    for (const a of reg.aberturas) {
      const canal = abaixo(a.tipo_tratativa);
      if (!canal) { aberturas.push(a); continue; }
      const r = retido(canal);
      r.aberturas.push(a);
      r.pontos += PONTOS_POR_ABERTURA;
    }
    reg.itens = itens;
    reg.aberturas = aberturas;
    reg.pontosEncerramento = itens.reduce((s, i) => s + i.pontos, 0);
    reg.pontosAbertura = aberturas.length * PONTOS_POR_ABERTURA;
    reg.pontosRetidos = Object.values(reg.retidos).reduce((s, r) => s + r.pontos, 0);
  }
  return porAgente;
}
