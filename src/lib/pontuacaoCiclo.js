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
 * UMA TRATATIVA EM CADA CANAL (decisão de 08/10/2026, do Ciclo 3 em diante):
 * para os pontos de tratativas valerem, a pessoa precisa ter pelo menos 1
 * registro em CADA um dos 4 canais (Reclame Aqui, Google Meu Negócio,
 * Reclamação Interna e Contestação) no ciclo — por data de registro, mesmo que
 * a tratativa ainda esteja aberta. Enquanto faltar algum canal, os pontos de
 * tratativas (encerramento e abertura) ficam RETIDOS: aparecem à parte, não
 * somam e passam a contar quando todos os canais têm registro. Indicadores
 * (CSAT, performance, CX) e bônus não são afetados. Os ciclos 1 e 2 já foram
 * apurados e não mudam.
 *
 * ABERTURA: cada tratativa aberta no Portal vale 0,5 ponto para o agente
 * responsável, no ciclo em que foi REGISTRADA. Vale do Ciclo 2 em diante
 * (ciclos que começam em 16/06/2026 ou depois); o Ciclo 1 não muda.
 */
import { calculateTratativaPoints } from '../components/utils/helpers.js';
import { volumePorCanal, canalDe, CANAIS } from './elegibilidade.js';

const DIA = 24 * 60 * 60 * 1000;
export const PRAZO_REABERTURA_DIAS = 7;
export const PONTOS_POR_ABERTURA = 0.5;
export const ABERTURA_PONTUA_DESDE = '2026-06-16'; // início do Ciclo 2
export const REGISTRO_EM_TODOS_OS_CANAIS_DESDE = '2026-09-16'; // início do Ciclo 3
/** Registros que cada canal precisa ter para os pontos valerem. */
export const REGISTROS_POR_CANAL_PARA_PONTUAR = 1;

/** O ciclo exige registro nos 4 canais para pontuar? Do Ciclo 3 em diante. */
export const cicloExigeRegistroEmTodosOsCanais = (ciclo) => !!ciclo?.data_inicio && ciclo.data_inicio >= REGISTRO_EM_TODOS_OS_CANAIS_DESDE;

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
 * @param opcoes.registrosPorCanal registros mínimos em cada canal para pontuar (Ciclo 3 em diante); padrão 1
 * @returns Map agenteId -> { itens, aberturas, pontosEncerramento, pontosAbertura,
 *   volume, faltando, retidos, pontosRetidos }
 *   itens e aberturas são só o que CONTA. Quando falta registro em algum canal
 *   (faltando: ['contestacao', ...]), tudo vai para retidos, por canal:
 *   { [canal]: { registros, pontos, itens, aberturas } }.
 */
export function pontosDeTratativasNoCiclo(todas = [], ciclo, { encerrada, noCiclo, registrosPorCanal = REGISTROS_POR_CANAL_PARA_PONTUAR }, agora = new Date()) {
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

  const aplica = cicloExigeRegistroEmTodosOsCanais(ciclo);
  for (const [id, reg] of porAgente) {
    const volume = volumePorCanal(registrosDe.get(id) ?? []);
    reg.volume = volume;
    reg.registrosPorCanal = registrosPorCanal;
    reg.faltando = CANAIS.filter((c) => (volume[c] ?? 0) < registrosPorCanal);
    reg.retidos = {};
    reg.pontosRetidos = 0;
    if (!aplica || reg.faltando.length === 0) continue;

    // Falta registro em algum canal: nenhum ponto de tratativa conta ainda.
    const retido = (tipo) => {
      const canal = canalDe(tipo);
      return (reg.retidos[canal] ||= { canal, registros: volume[canal] ?? 0, pontos: 0, itens: [], aberturas: [] });
    };
    for (const i of reg.itens) { const r = retido(i.tipo_tratativa); r.itens.push(i); r.pontos += i.pontos; }
    for (const a of reg.aberturas) { const r = retido(a.tipo_tratativa); r.aberturas.push(a); r.pontos += PONTOS_POR_ABERTURA; }
    reg.pontosRetidos = reg.pontosEncerramento + reg.pontosAbertura;
    reg.itens = [];
    reg.aberturas = [];
    reg.pontosEncerramento = 0;
    reg.pontosAbertura = 0;
  }
  return porAgente;
}
