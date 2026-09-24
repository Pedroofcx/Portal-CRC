/**
 * ESCALAS — as duas escalas da semana, em um lugar só.
 *
 * Escala de Trabalho: quem fica presencial e quem fica em home office.
 * Regra do CRC (Pedro, 23/09/2026): três presenciais e dois em casa por dia.
 *
 * Escala de Turno: de manhã duas pessoas atendem e as outras analisam
 * tickets; à tarde inverte. Não é horário de entrada — é o que cada uma faz
 * em cada metade do dia.
 *
 * Aqui só as contas. As telas ficam em src/components/escalas/.
 */

export const DIAS_UTEIS = [
  { chave: 'segunda', rotulo: 'Segunda', curto: 'Seg' },
  { chave: 'terca', rotulo: 'Terça', curto: 'Ter' },
  { chave: 'quarta', rotulo: 'Quarta', curto: 'Qua' },
  { chave: 'quinta', rotulo: 'Quinta', curto: 'Qui' },
  { chave: 'sexta', rotulo: 'Sexta', curto: 'Sex' },
];

export const HOME_OFFICE_POR_DIA = 2;
export const MINIMO_PRESENCIAIS = 3;
export const ATENDENDO_POR_TURNO = 2;

export const TIPOS_TRABALHO = [
  { valor: 'presencial', rotulo: 'Presencial', curto: 'P' },
  { valor: 'home_office', rotulo: 'Home office', curto: 'H' },
  { valor: 'day_off', rotulo: 'Day off', curto: 'D' },
  { valor: 'ferias', rotulo: 'Férias', curto: 'F' },
  { valor: 'falta', rotulo: 'Falta', curto: '—' },
  { valor: 'treinamento', rotulo: 'Treinamento', curto: 'T' },
];

/** Quem está trabalhando (presencial ou de casa) conta para a operação. */
export const TRABALHANDO = new Set(['presencial', 'home_office']);

const soData = (valor) => String(valor ?? '').slice(0, 10);

/** Segunda-feira da semana de uma data, em YYYY-MM-DD (sem fuso: data pura). */
export function segundaDaSemana(data) {
  const [ano, mes, dia] = soData(data).split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  const diaSemana = d.getUTCDay(); // 0 domingo
  const recuo = diaSemana === 0 ? 6 : diaSemana - 1;
  d.setUTCDate(d.getUTCDate() - recuo);
  return d.toISOString().slice(0, 10);
}

/** '2026-W39' — o mesmo formato que a EscalaTurno já usa desde o Base44. */
export function semanaDeReferencia(data) {
  const [ano, mes, dia] = soData(data).split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const semana1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const numero = 1 + Math.round(((d - semana1) / 86400000 - 3 + ((semana1.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(numero).padStart(2, '0')}`;
}

/** Os cinco dias úteis da semana que começa na segunda informada. */
export function diasDaSemana(segunda) {
  const [ano, mes, dia] = soData(segunda).split('-').map(Number);
  return DIAS_UTEIS.map((d, i) => {
    const data = new Date(Date.UTC(ano, mes - 1, dia + i));
    return { ...d, data: data.toISOString().slice(0, 10) };
  });
}

/** Soma dias a uma data (YYYY-MM-DD), sem passar por fuso. */
export function somarDias(data, dias) {
  const [ano, mes, dia] = soData(data).split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/**
 * O que cada pessoa faz em cada dia, a partir das atribuições gravadas.
 * As atribuições antigas (Base44) cobrem períodos; as novas são de um dia só.
 * Quando duas valem para o mesmo dia, ganha a mais recente.
 */
export function trabalhoDaSemana(atribuicoes = [], dias = []) {
  const mapa = new Map();
  const ordenadas = [...atribuicoes].sort((a, b) => String(a.created_date || '').localeCompare(String(b.created_date || '')));
  ordenadas.forEach((a) => {
    if (a.ativa === false) return;
    const inicio = soData(a.data_inicio);
    const fim = soData(a.data_fim) || inicio;
    if (!inicio) return;
    dias.forEach(({ data }) => {
      if (data >= inicio && data <= fim) mapa.set(`${a.colaborador_id}|${data}`, { tipo: a.tipo_evento, id: a.id });
    });
  });
  return mapa;
}

export const trabalhoDe = (mapa, colaboradorId, data) => mapa.get(`${colaboradorId}|${data}`)?.tipo ?? null;

/**
 * Monta a semana de trabalho: dois home office por dia, revezando quem já
 * ficou em casa mais vezes. Quem está de férias, em day off ou treinamento
 * (indisponíveis) não entra no sorteio nem ocupa vaga de presencial.
 *
 * Determinístico: mesma entrada, mesma saída — nada de sorteio aleatório,
 * que faz o gestor perder a confiança no que a tela mostrou.
 */
export function montarSemanaDeTrabalho({ pessoas = [], dias = [], indisponiveis = new Map(), historico = new Map(), homePorDia = HOME_OFFICE_POR_DIA }) {
  const contagem = new Map(pessoas.map((p) => [p.id, historico.get(p.id) || 0]));
  const plano = new Map();

  dias.forEach(({ data }) => {
    const disponiveis = pessoas.filter((p) => !indisponiveis.get(`${p.id}|${data}`));
    const quantosEmCasa = Math.min(homePorDia, Math.max(0, disponiveis.length - MINIMO_PRESENCIAIS));
    const fila = [...disponiveis].sort((a, b) => (
      (contagem.get(a.id) - contagem.get(b.id)) || String(a.nome_completo).localeCompare(String(b.nome_completo))
    ));
    const emCasa = new Set(fila.slice(0, quantosEmCasa).map((p) => p.id));
    emCasa.forEach((id) => contagem.set(id, contagem.get(id) + 1));
    disponiveis.forEach((p) => plano.set(`${p.id}|${data}`, emCasa.has(p.id) ? 'home_office' : 'presencial'));
  });

  return plano;
}

/** Quantos dias de home office cada pessoa teve num conjunto de atribuições. */
export function historicoDeHomeOffice(atribuicoes = [], pessoas = [], desde) {
  const contagem = new Map(pessoas.map((p) => [p.id, 0]));
  atribuicoes.forEach((a) => {
    if (a.tipo_evento !== 'home_office' || a.ativa === false) return;
    if (desde && soData(a.data_inicio) < soData(desde)) return;
    if (contagem.has(a.colaborador_id)) contagem.set(a.colaborador_id, contagem.get(a.colaborador_id) + 1);
  });
  return contagem;
}

/** O que está fora da regra na escala de trabalho — em português, sem código. */
export function avisosDoTrabalho({ mapa, pessoas = [], dias = [], minimoPresenciais = MINIMO_PRESENCIAIS }) {
  const avisos = [];
  dias.forEach(({ data, rotulo }) => {
    const tipos = pessoas.map((p) => trabalhoDe(mapa, p.id, data));
    const presenciais = tipos.filter((t) => t === 'presencial').length;
    const emCasa = tipos.filter((t) => t === 'home_office').length;
    const semMarcacao = tipos.filter((t) => !t).length;
    const trabalhando = presenciais + emCasa;

    if (semMarcacao > 0) {
      avisos.push({ data, grave: false, texto: `${rotulo}: ${semMarcacao} pessoa(s) sem marcação.` });
    }
    if (trabalhando > 0 && presenciais < Math.min(minimoPresenciais, trabalhando)) {
      avisos.push({ data, grave: true, texto: `${rotulo}: só ${presenciais} presencial(is) — a regra é ${minimoPresenciais}.` });
    }
    if (emCasa > HOME_OFFICE_POR_DIA) {
      avisos.push({ data, grave: true, texto: `${rotulo}: ${emCasa} em home office — o combinado são ${HOME_OFFICE_POR_DIA}.` });
    }
  });
  return avisos;
}

/**
 * Monta a escala de turno da semana: em cada dia, duas pessoas atendem de
 * manhã e as demais analisam tickets; à tarde inverte. A escolha de quem
 * começa atendendo gira dia a dia, para ninguém passar a semana só num lado.
 *
 * Grava em `manha`/`tarde` (quem está ATENDENDO em cada metade do dia) —
 * as mesmas chaves que o relatório de produtividade já lê desde o Base44.
 */
export function montarTurnosDaSemana({ dias = [], presentesPorDia = new Map(), atendendoPorTurno = ATENDENDO_POR_TURNO, giro = 0 }) {
  return dias.map(({ chave, data }, indice) => {
    const presentes = presentesPorDia.get(data) ?? [];
    const quantos = Math.min(atendendoPorTurno, Math.floor(presentes.length / 2)) || (presentes.length ? 1 : 0);
    const deslocamento = (indice + giro) * quantos;
    const girados = presentes.map((_, i) => presentes[(i + deslocamento) % presentes.length]);
    const manha = girados.slice(0, quantos);
    const restantes = girados.filter((p) => !manha.some((m) => m.colaborador_id === p.colaborador_id));
    const tarde = restantes.slice(0, quantos);
    return {
      dia: chave,
      data,
      cancelado: false,
      motivo_cancelamento: '',
      manha,
      tarde,
    };
  });
}

/** O que a pessoa faz no dia, em palavras — para o card do agente. */
export function meuDiaNoTurno(diaTurno, colaboradorId) {
  if (!diaTurno || diaTurno.cancelado) return null;
  const atendeManha = (diaTurno.manha || []).some((c) => c.colaborador_id === colaboradorId);
  const atendeTarde = (diaTurno.tarde || []).some((c) => c.colaborador_id === colaboradorId);
  if (!atendeManha && !atendeTarde) return null;
  return {
    manha: atendeManha ? 'atendendo' : 'analisando',
    tarde: atendeTarde ? 'atendendo' : 'analisando',
  };
}

/** Quantas metades de dia cada pessoa passou atendendo na semana. */
export function equilibrioDoAtendimento(turnos = []) {
  const contagem = new Map();
  turnos.forEach((dia) => {
    if (dia.cancelado) return;
    ['manha', 'tarde'].forEach((metade) => (dia[metade] || []).forEach((c) => {
      const atual = contagem.get(c.colaborador_id) || { colaborador_id: c.colaborador_id, nome: c.colaborador_nome, metades: 0 };
      atual.metades += 1;
      contagem.set(c.colaborador_id, atual);
    }));
  });
  return [...contagem.values()].sort((a, b) => b.metades - a.metades);
}
