/**
 * Equidade operacional — regras do rodízio de tratativas, em funções puras.
 *
 * A regra do CRC: cada pessoa precisa atender pelo menos uma tratativa por
 * canal a cada mês para pontuar nele. Então o rodízio olha, por canal, quem
 * recebeu há mais tempo — e PULA quem não pode receber naquele dia (férias
 * aprovadas ou marcada na Escala como day off, falta, atestado médico ou treinamento).
 *
 * Quem é pulado não perde a vez: a fila é pela última atribuição, então ao
 * voltar a pessoa já é a primeira.
 */

const soData = (v) => String(v ?? '').slice(0, 10);
const instanteDe = (d) => `${soData(d.data_atribuicao)} ${d.horario_atribuicao || '00:00'}`;

/** Tipos da Escala em que a pessoa não pode receber tratativa. */
const INDISPONIVEIS = {
  ferias: 'Férias',
  day_off: 'Day off',
  falta: 'Ausente',
  atestado: 'Atestado médico',
  treinamento: 'Em treinamento',
};

/**
 * Quem não pode receber tratativa numa data.
 * @returns Map<colaboradorId, { motivo, ate }>  (só quem está indisponível)
 */
export function indisponiveisEm(data, { solicitacoes = [], atribuicoes = [] } = {}) {
  const dia = soData(data);
  const mapa = new Map();

  // Escala: vale a marcação mais recente que cobre o dia.
  const porPessoa = new Map();
  [...atribuicoes]
    .sort((a, b) => String(a.created_date || '').localeCompare(String(b.created_date || '')))
    .forEach((a) => {
      if (a.ativa === false) return;
      const inicio = soData(a.data_inicio);
      const fim = soData(a.data_fim) || inicio;
      if (!inicio || dia < inicio || dia > fim) return;
      porPessoa.set(a.colaborador_id, { tipo: a.tipo_evento, ate: fim, id: a.id });
    });
  porPessoa.forEach((v, id) => {
    if (INDISPONIVEIS[v.tipo]) mapa.set(id, { motivo: INDISPONIVEIS[v.tipo], ate: v.ate, escalaId: v.id });
  });

  // Férias aprovadas mandam sobre qualquer marcação da escala.
  solicitacoes.forEach((s) => {
    if (s.status !== 'aprovada') return;
    if (soData(s.data_inicio) <= dia && soData(s.data_fim) >= dia) {
      mapa.set(s.colaborador_id, { motivo: 'Férias', ate: soData(s.data_fim) });
    }
  });
  return mapa;
}

export const mesDe = (data) => soData(data).slice(0, 7);

/**
 * A fila de um canal: primeiro quem pode receber, na ordem de quem recebeu há
 * mais tempo (nunca recebeu vem antes); depois, quem está indisponível.
 */
export function filaDoCanal(tipo, agentes = [], distribuicoes = [], indisponiveis = new Map(), data) {
  const mes = mesDe(data);
  const doCanal = distribuicoes.filter((d) => d.tipo_tratativa === tipo);
  const ultima = new Map();
  [...doCanal].sort((a, b) => instanteDe(b).localeCompare(instanteDe(a))).forEach((d) => {
    if (!ultima.has(d.agente_id)) ultima.set(d.agente_id, d);
  });

  const linhas = agentes.map((agente) => {
    const u = ultima.get(agente.id) ?? null;
    const fora = indisponiveis.get(agente.id) ?? null;
    return {
      agente,
      ultima: u,
      noMes: doCanal.filter((d) => d.agente_id === agente.id && mesDe(d.data_atribuicao) === mes).length,
      disponivel: !fora,
      motivo: fora?.motivo ?? null,
      ate: fora?.ate ?? null,
    };
  });

  const ordem = (a, b) => {
    if (!a.ultima && !b.ultima) return String(a.agente.nome_completo).localeCompare(String(b.agente.nome_completo));
    if (!a.ultima) return -1;
    if (!b.ultima) return 1;
    return instanteDe(a.ultima).localeCompare(instanteDe(b.ultima));
  };
  const fila = [
    ...linhas.filter((l) => l.disponivel).sort(ordem),
    ...linhas.filter((l) => !l.disponivel).sort(ordem),
  ].map((l, i) => ({ ...l, posicao: i + 1 }));

  const sugerido = fila.find((l) => l.disponivel) ?? null;
  // Quem estaria na frente se estivesse disponível (para explicar o "pulou").
  const puladosAFrente = sugerido
    ? fila.filter((l) => !l.disponivel && ordem(l, sugerido) < 0)
    : [];
  return { fila, sugerido, puladosAFrente };
}

/** Pessoa × canal no mês: quantas tratativas, e em quais canais ainda está zerada. */
export function gradeDoMes(mes, agentes = [], distribuicoes = [], canais = []) {
  const doMes = distribuicoes.filter((d) => mesDe(d.data_atribuicao) === mes);
  return agentes.map((agente) => {
    const minhas = doMes.filter((d) => d.agente_id === agente.id);
    const porCanal = {};
    canais.forEach((c) => { porCanal[c] = minhas.filter((d) => d.tipo_tratativa === c).length; });
    return {
      agente,
      porCanal,
      total: minhas.length,
      zerados: canais.filter((c) => porCanal[c] === 0),
    };
  });
}

/** Motivos de uma atribuição fora da ordem do rodízio. */
export const MOTIVOS_OVERRIDE = [
  { valor: 'atestado', rotulo: 'Indisponível (atestado ou imprevisto)' },
  { valor: 'carga', rotulo: 'Carga do dia' },
  { valor: 'experiencia', rotulo: 'Experiência no assunto' },
  { valor: 'cliente', rotulo: 'Já conhece o cliente' },
  { valor: 'outro', rotulo: 'Outro motivo' },
];

export const montarJustificativa = (valor, texto = '') => {
  const motivo = MOTIVOS_OVERRIDE.find((m) => m.valor === valor);
  if (!motivo) return String(texto ?? '').trim();
  const livre = String(texto ?? '').trim();
  return livre ? `${motivo.rotulo}: ${livre}` : motivo.rotulo;
};

/** Volta ao motivo a partir do texto gravado; o que não casa vira "Sem motivo informado". */
export function motivoDaJustificativa(justificativa) {
  const j = String(justificativa ?? '').trim();
  if (!j) return { valor: 'sem', rotulo: 'Sem motivo informado' };
  const achado = MOTIVOS_OVERRIDE.find((m) => j === m.rotulo || j.startsWith(`${m.rotulo}:`));
  return achado ?? { valor: 'texto-livre', rotulo: 'Texto livre (antigo)' };
}

/** Resumo das atribuições fora do rodízio: por motivo e por quem foi pulado. */
export function resumoDeOverrides(distribuicoes = []) {
  const overrides = distribuicoes.filter((d) => d.override_rodizio);
  const porMotivo = new Map();
  const porPulado = new Map();
  overrides.forEach((d) => {
    const m = motivoDaJustificativa(d.justificativa_override);
    porMotivo.set(m.rotulo, (porMotivo.get(m.rotulo) ?? 0) + 1);
    const pulado = d.agente_sugerido_nome || '—';
    porPulado.set(pulado, (porPulado.get(pulado) ?? 0) + 1);
  });
  const ordenar = (mapa) => [...mapa.entries()].map(([rotulo, qtd]) => ({ rotulo, qtd })).sort((a, b) => b.qtd - a.qtd);
  return {
    total: overrides.length,
    percentual: distribuicoes.length ? Math.round((overrides.length / distribuicoes.length) * 100) : 0,
    porMotivo: ordenar(porMotivo),
    porPulado: ordenar(porPulado),
  };
}

/** Filtros do histórico (todos opcionais). `mes` no formato AAAA-MM. */
export function filtrarHistorico(distribuicoes = [], { agenteId, tipo, mes, soOverride, busca } = {}) {
  const termo = String(busca ?? '').trim().toLowerCase();
  return distribuicoes
    .filter((d) => (!agenteId || d.agente_id === agenteId)
      && (!tipo || d.tipo_tratativa === tipo)
      && (!mes || mesDe(d.data_atribuicao) === mes)
      && (!soOverride || d.override_rodizio)
      && (!termo || String(d.ticket_id ?? '').toLowerCase().includes(termo)))
    .sort((a, b) => instanteDe(b).localeCompare(instanteDe(a)));
}

/** Os últimos N meses (AAAA-MM), do mais recente para o mais antigo, a partir de uma data. */
export function ultimosMeses(data, quantidade = 6) {
  let [ano, mes] = soData(data).split('-').map(Number);
  const lista = [];
  for (let i = 0; i < quantidade; i += 1) {
    lista.push(`${ano}-${String(mes).padStart(2, '0')}`);
    mes -= 1;
    if (mes === 0) { mes = 12; ano -= 1; }
  }
  return lista;
}

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const rotuloDoMes = (aaaamm) => {
  const [ano, mes] = String(aaaamm).split('-').map(Number);
  return `${NOMES_MES[mes - 1]} de ${ano}`;
};

/** "2026-10-02" vira "02/10". */
export const dataCurta = (data) => {
  const d = soData(data);
  return d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '—';
};
