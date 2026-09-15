/**
 * INTELLIGENCE ENGINE — Gerador de Escala WFM
 * Suporta múltiplos colaboradores por slot (atendimento/analise)
 *
 * Regras:
 *  R0 (HARD) – Respeitar slots travados
 *  R1 (SOFT) – Ao menos 1 pessoa por slot/dia
 *  R2 (SOFT) – Equilíbrio manhã/tarde no mês
 *  R3 (SOFT) – Anti-dobra: evitar mesma pessoa em atendimento manhã+tarde mesmo dia
 *  R4 (BEST-EFFORT) – Rotação de função: evitar 3+ dias seguidos mesma função
 */

const DIAS_SEMANA = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

function contarTurnosHistorico(agenteId, historico) {
  let manhas = 0;
  let tardes = 0;
  historico.forEach(escala => {
    escala.turnos?.forEach(dia => {
      if (dia.manha?.some(s => s.colaborador_id === agenteId)) manhas++;
      if (dia.tarde?.some(s => s.colaborador_id === agenteId)) tardes++;
    });
  });
  return { manhas, tardes };
}

function verificarDobra(agenteId, diaObj, periodo) {
  if (periodo === 'tarde') {
    return !!(diaObj.manha?.find(s => s.colaborador_id === agenteId && s.slot === 'atendimento'));
  }
  return !!(diaObj.tarde?.find(s => s.colaborador_id === agenteId && s.slot === 'atendimento'));
}

function jaAlocadoNoDia(agenteId, diaObj) {
  return (
    (diaObj.manha?.some(s => s.colaborador_id === agenteId) ?? false) ||
    (diaObj.tarde?.some(s => s.colaborador_id === agenteId) ?? false)
  );
}

/**
 * FUNÇÃO PRINCIPAL — distribui agentes pelos 4 slots do dia
 * Cada slot recebe 1 agente. O gestor pode depois editar manualmente para adicionar mais.
 */
export function gerarEscalaAutomatica(agentes, historicoMes, semanaRef, dataInicioSemana, slotsFixos = []) {
  const alertas = [];

  const saldos = agentes.map(ag => ({
    ...ag,
    ...contarTurnosHistorico(ag.id, historicoMes)
  }));

  const inicio = new Date(dataInicioSemana + 'T12:00:00Z');
  const turnos = DIAS_SEMANA.map((dia, idx) => {
    const data = new Date(inicio);
    data.setUTCDate(data.getUTCDate() + idx);
    return { dia, data: data.toISOString().split('T')[0], manha: [], tarde: [] };
  });

  // R0 — Aplicar slots travados primeiro
  slotsFixos.forEach(fixo => {
    const diaObj = turnos.find(t => t.dia === fixo.dia);
    if (!diaObj) return;
    const arr = fixo.periodo === 'manha' ? diaObj.manha : diaObj.tarde;
    if (!arr.some(s => s.colaborador_id === fixo.colaborador_id && s.slot === fixo.slot)) {
      arr.push({ colaborador_id: fixo.colaborador_id, colaborador_nome: fixo.colaborador_nome, slot: fixo.slot, travado: true });
    }
  });

  // Preencher 4 slots por dia (1 agente automático por slot)
  for (const diaObj of turnos) {
    const slots = [
      { periodo: 'manha', slot: 'atendimento' },
      { periodo: 'manha', slot: 'analise' },
      { periodo: 'tarde', slot: 'atendimento' },
      { periodo: 'tarde', slot: 'analise' },
    ];

    for (const { periodo, slot } of slots) {
      const arr = periodo === 'manha' ? diaObj.manha : diaObj.tarde;
      // Slot já tem ao menos 1 travado? Pula
      if (arr.some(s => s.slot === slot && s.travado)) continue;

      const ordenados = [...saldos].sort((a, b) =>
        periodo === 'manha' ? a.manhas - b.manhas : a.tardes - b.tardes
      );

      let candidatos = ordenados.filter(ag =>
        !jaAlocadoNoDia(ag.id, diaObj) && !verificarDobra(ag.id, diaObj, periodo)
      );

      if (candidatos.length === 0) {
        candidatos = ordenados.filter(ag => !jaAlocadoNoDia(ag.id, diaObj));
        if (candidatos.length > 0) alertas.push({ dia: diaObj.dia, slot: `${periodo}-${slot}`, mensagem: 'R3 relaxado' });
      }

      if (candidatos.length === 0) {
        alertas.push({ dia: diaObj.dia, slot: `${periodo}-${slot}`, mensagem: 'Slot vazio: agentes insuficientes' });
        continue;
      }

      const escolhido = candidatos[Math.floor(Math.random() * Math.min(2, candidatos.length))];
      arr.push({ colaborador_id: escolhido.id, colaborador_nome: escolhido.nome_completo, slot, travado: false });

      const idx = saldos.findIndex(s => s.id === escolhido.id);
      if (idx >= 0) {
        if (periodo === 'manha') saldos[idx].manhas++;
        else saldos[idx].tardes++;
      }
    }
  }

  return {
    semana_referencia: semanaRef,
    data_inicio_semana: dataInicioSemana,
    colaboradores_participantes: agentes.map(a => a.id),
    turnos,
    alertas,
    publicada: false,
    ativa: true
  };
}

/**
 * Valida se a escala tem ao menos 1 pessoa por slot/dia
 */
export function validarEscala(escala) {
  const erros = [];
  escala.turnos?.forEach(diaObj => {
    if (!diaObj.manha?.some(s => s.slot === 'atendimento')) erros.push(`${diaObj.dia}: Falta M-ATEND`);
    if (!diaObj.manha?.some(s => s.slot === 'analise')) erros.push(`${diaObj.dia}: Falta M-ANÁL`);
    if (!diaObj.tarde?.some(s => s.slot === 'atendimento')) erros.push(`${diaObj.dia}: Falta T-ATEND`);
    if (!diaObj.tarde?.some(s => s.slot === 'analise')) erros.push(`${diaObj.dia}: Falta T-ANÁL`);
  });
  return erros;
}

export function getSemanaISO(date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function getSegundaFeira(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}