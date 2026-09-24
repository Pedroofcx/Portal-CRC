// ======================================================
// MÓDULO DE CÁLCULO DE APURAÇÃO — CRC v3.0
// Regras corrigidas: FCR=1 obrigatório para positivos,
// parsing robusto de datas, validação de consistência
// ======================================================

// A leitura da data mora em src/lib/apuracao/datas.js — o importador novo e
// estes cálculos precisam entender exatamente a mesma coisa.
import { normalizarData } from '@/lib/apuracao/datas';

export { normalizarData };

// Segunda-feira da semana (seg→sex)
function getInicioSemana(dataStr) {
  const partes = dataStr.split('-');
  const d = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
  const diaSemana = d.getDay(); // 0=dom, 1=seg...
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Sexta-feira da semana
function getFimSemana(inicioSemana) {
  const partes = inicioSemana.split('-');
  const d = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
  d.setDate(d.getDate() + 4);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Formata rótulo da semana: "Semana N (DD/MM → DD/MM)"
export function formatarRotuloSemana(inicioSemana, numero) {
  const partes = inicioSemana.split('-');
  const inicio = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 4);
  const fmt = (dt) => `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
  return `Semana ${numero} (${fmt(inicio)} → ${fmt(fim)})`;
}

// =====================================================
// TELEFONE
// Regras:
//   - Ligação transferida: conta total E atendida, mas NÃO entra em FCR/CSAT
//   - Atendida: status contém "atendida" (case-insensitive)
//   - Avaliada: FCR === 1 ou FCR === 2 (inteiro exato)
//   - REGRA CRÍTICA: Positiva = CSAT 4 ou 5 APENAS quando FCR === 1 (resolvido)
//     FCR === 2 não gera positivos, independente da nota CSAT
//   - Performance = atendidas / ligações × 100
//   - CSAT = positivas / avaliadas × 100
//   - % Avaliados = avaliadas / atendidas × 100
// =====================================================
export function calcularTelefone(dados, mapeamento) {
  const resultados = {};
  let _totalRegistrosImportados = dados.length;

  dados.forEach(row => {
    const agente = (row[mapeamento.agente] || '').trim();
    const dataOriginal = row[mapeamento.data];
    const data = normalizarData(dataOriginal);
    if (!agente || !data) return;

    if (!resultados[agente]) {
      resultados[agente] = {
        porData: {},
        porSemana: {},
        totalLigacoes: 0,
        totalAtendidas: 0,
        totalSemTransferencia: 0,
        totalTransferencias: 0,
        totalAvaliadas: 0,
        totalPositivas: 0,
        totalNegativas: 0,
        nota4: 0,
        nota5: 0,
        historico: [],
        registrosImportados: 0
      };
    }

    const r = resultados[agente];
    r.registrosImportados++;

    if (!r.porData[data]) {
      r.porData[data] = {
        data,
        total_ligacoes: 0,
        total_sem_transferencia: 0,
        total_atendidas: 0,
        total_avaliadas: 0,
        total_positivas: 0,
        total_negativas: 0,
        nota4: 0,
        nota5: 0,
        transferencias: 0
      };
    }

    const inicioSemana = getInicioSemana(data);
    if (!r.porSemana[inicioSemana]) {
      r.porSemana[inicioSemana] = {
        inicio: inicioSemana,
        fim: getFimSemana(inicioSemana),
        total_ligacoes: 0,
        total_sem_transferencia: 0,
        total_atendidas: 0,
        total_avaliadas: 0,
        total_positivas: 0,
        total_negativas: 0,
        nota4: 0,
        nota5: 0,
        transferencias: 0
      };
    }

    const diaD = r.porData[data];
    const semD = r.porSemana[inicioSemana];

    // Detectar transferência de fila
    const origem = (row[mapeamento.origem] || '').toLowerCase();
    const isTransferencia =
      origem.includes('transferência') ||
      origem.includes('transferencia') ||
      origem.includes('fila') ||
      origem.includes('transfer');

    // Toda ligação conta no total
    r.totalLigacoes++;
    diaD.total_ligacoes++;
    semD.total_ligacoes++;

    const status = (row[mapeamento.status] || '').toLowerCase().trim();
    const isAtendida = status.includes('atendida');

    if (isAtendida || isTransferencia) {
      r.totalAtendidas++;
      diaD.total_atendidas++;
      semD.total_atendidas++;
    }

    if (isTransferencia) {
      r.totalTransferencias++;
      diaD.transferencias++;
      semD.transferencias++;
      r.historico.push({ data, tipo: 'TRANSFERENCIA', excluido_metricas: true });
      return; // Transferência não gera avaliação
    }

    // Ligação sem transferência
    r.totalSemTransferencia++;
    diaD.total_sem_transferencia++;
    semD.total_sem_transferencia++;

    // FCR: apenas 1 (resolvido) ou 2 (não resolvido) = avaliada
    const fcrRaw = (row[mapeamento.fcr] || '').toString().trim();
    const fcrInt = parseInt(fcrRaw);
    const isAvaliada = fcrInt === 1 || fcrInt === 2;

    // CSAT nota
    const csatRaw = (row[mapeamento.csat] || '').toString().trim();
    const csatInt = parseInt(csatRaw);

    // REGRA CRÍTICA: Positiva = CSAT 4 ou 5 SOMENTE se FCR === 1
    const isPositiva = fcrInt === 1 && (csatInt === 4 || csatInt === 5);
    const isNegativa = isAvaliada && !isPositiva;

    if (isAvaliada) {
      r.totalAvaliadas++;
      diaD.total_avaliadas++;
      semD.total_avaliadas++;

      if (isPositiva) {
        r.totalPositivas++;
        diaD.total_positivas++;
        semD.total_positivas++;
        if (csatInt === 4) { r.nota4++; diaD.nota4++; semD.nota4++; }
        if (csatInt === 5) { r.nota5++; diaD.nota5++; semD.nota5++; }
      } else {
        r.totalNegativas++;
        diaD.total_negativas++;
        semD.total_negativas++;
      }
    }

    r.historico.push({ data, status, fcr: fcrInt, csat: csatInt, isAtendida, isAvaliada, isPositiva, isNegativa });
  });

  // Calcular métricas e validação de consistência
  Object.keys(resultados).forEach(agente => {
    const r = resultados[agente];

    // Por data
    Object.keys(r.porData).forEach(dt => {
      const d = r.porData[dt];
      d.performance = d.total_ligacoes > 0 ? (d.total_atendidas / d.total_ligacoes) * 100 : 0;
      // % Avaliados = avaliadas / atendidas (sem contar transferências)
      const atendidasSemTransf = d.total_atendidas - d.transferencias;
      d.percentual_avaliados = atendidasSemTransf > 0 ? (d.total_avaliadas / atendidasSemTransf) * 100 : 0;
      d.csat = d.total_avaliadas > 0 ? (d.total_positivas / d.total_avaliadas) * 100 : 0;
    });

    // Por semana
    const semanasOrd = Object.keys(r.porSemana).sort();
    semanasOrd.forEach((iniSem, idx) => {
      const s = r.porSemana[iniSem];
      s.performance = s.total_ligacoes > 0 ? (s.total_atendidas / s.total_ligacoes) * 100 : 0;
      const atendidasSemTransf = s.total_atendidas - s.transferencias;
      s.percentual_avaliados = atendidasSemTransf > 0 ? (s.total_avaliadas / atendidasSemTransf) * 100 : 0;
      s.csat = s.total_avaliadas > 0 ? (s.total_positivas / s.total_avaliadas) * 100 : 0;
      s.numero = idx + 1;
      s.rotulo = formatarRotuloSemana(iniSem, idx + 1);
    });

    r.consolidadoSemanal = semanasOrd.map(k => r.porSemana[k]);
    const _nS = r.consolidadoSemanal.length;

    // Totais consolidados calculados diretamente das semanas (sem média de médias)
    const totalAtendidas = r.totalAtendidas;
    const totalSemTransf = totalAtendidas - r.totalTransferencias;

    r.csatPercentual = r.totalAvaliadas > 0 ? (r.totalPositivas / r.totalAvaliadas) * 100 : 0;
    r.percentualAvaliados = totalSemTransf > 0 ? (r.totalAvaliadas / totalSemTransf) * 100 : 0;
    r.performance = r.totalLigacoes > 0 ? (totalAtendidas / r.totalLigacoes) * 100 : 0;
    r.fcrPercentual = r.csatPercentual; // Alias para compatibilidade

    // Validação de consistência
    r.validacao = validarConsistenciaTelefone(r);
  });

  return resultados;
}

// Verifica consistência dos dados calculados
export function validarConsistenciaTelefone(r) {
  const alertas = [];

  // Ligações = atendidas + não atendidas
  if (r.totalAtendidas > r.totalLigacoes) {
    alertas.push(`Inconsistência: atendidas (${r.totalAtendidas}) maior que total de ligações (${r.totalLigacoes})`);
  }

  // Avaliadas não pode exceder ligações sem transferência
  const semTransf = r.totalLigacoes - r.totalTransferencias;
  if (r.totalAvaliadas > semTransf) {
    alertas.push(`Inconsistência: avaliadas (${r.totalAvaliadas}) maior que ligações sem transferência (${semTransf})`);
  }

  // Positivas não pode exceder avaliadas
  if (r.totalPositivas > r.totalAvaliadas) {
    alertas.push(`Inconsistência: positivas (${r.totalPositivas}) maior que avaliadas (${r.totalAvaliadas})`);
  }

  // Nota4 + Nota5 deve ser igual ao total de positivas
  if (r.nota4 + r.nota5 !== r.totalPositivas) {
    alertas.push(`Inconsistência: nota4 (${r.nota4}) + nota5 (${r.nota5}) ≠ positivas (${r.totalPositivas})`);
  }

  return {
    ok: alertas.length === 0,
    alertas,
    resumo: {
      registros_importados: r.registrosImportados,
      total_ligacoes: r.totalLigacoes,
      total_atendidas: r.totalAtendidas,
      total_transferencias: r.totalTransferencias,
      total_sem_transferencia: r.totalLigacoes - r.totalTransferencias,
      total_avaliadas: r.totalAvaliadas,
      total_positivas: r.totalPositivas,
      total_negativas: r.totalNegativas,
      nota4: r.nota4,
      nota5: r.nota5
    }
  };
}

// =====================================================
// CHAT
// Regras:
//   - Total chats: contagem de linhas do agente
//   - Avaliado: bom === 1 OU ruim === 1
//   - Positivo: bom === 1
//   - CSAT = positivos / avaliados × 100
//   - % Avaliados = avaliados / chats × 100
// =====================================================
// Ouvidoria (Zendesk, 24/09/2026): o relatorio traz duas colunas booleanas
// (satisfacao boa / satisfacao ruim, 1 ou 0) e, quando mapeada, uma coluna de
// nota (1 a 3). A regra de Pedro: "boa" nunca precisa de checagem extra -- e
// sempre positiva. Ja "ruim" pode estar escondendo um ticket NEUTRO (nota 3),
// que nao e de fato negativo. So valida a nota nos tickets marcados ruim.
//
// PREMIACAO NAO MUDA: total_positivos/total_negativos/total_avaliados e o
// csat continuam exatamente como sempre foram calculados -- ruim=1 conta como
// negativo, ponto. O que este bloco acrescenta e so informativo: quantos
// desses "ruins" eram na verdade neutros (nota 3), para relatorios que
// mostrem a leitura com e sem esse ajuste. Vale so quando a coluna de nota e
// mapeada; sem ela, os campos de neutro ficam zerados e nada muda.
export function calcularChat(dados, mapeamento) {
  const resultados = {};
  const temNota = !!mapeamento.nota;

  dados.forEach(row => {
    const agente = (row[mapeamento.agente] || '').trim();
    const dataOriginal = row[mapeamento.data];
    const data = normalizarData(dataOriginal);
    if (!agente || !data) return;

    if (!resultados[agente]) {
      resultados[agente] = {
        porData: {},
        porSemana: {},
        totalChats: 0,
        totalAvaliados: 0,
        totalPositivos: 0,
        totalNegativos: 0,
        totalNeutros: 0,
        historico: []
      };
    }

    const r = resultados[agente];

    if (!r.porData[data]) {
      r.porData[data] = { data, total_chats: 0, total_avaliados: 0, total_positivos: 0, total_negativos: 0, total_neutros: 0 };
    }

    const inicioSemana = getInicioSemana(data);
    if (!r.porSemana[inicioSemana]) {
      r.porSemana[inicioSemana] = {
        inicio: inicioSemana,
        fim: getFimSemana(inicioSemana),
        total_chats: 0,
        total_avaliados: 0,
        total_positivos: 0,
        total_negativos: 0,
        total_neutros: 0
      };
    }

    const diaD = r.porData[data];
    const semD = r.porSemana[inicioSemana];

    r.totalChats++;
    diaD.total_chats++;
    semD.total_chats++;

    const bom = parseInt((row[mapeamento.bom] || '').toString().trim()) || 0;
    const ruim = parseInt((row[mapeamento.ruim] || '').toString().trim()) || 0;
    const notaRaw = temNota ? parseInt((row[mapeamento.nota] || '').toString().trim()) : null;
    const nota = Number.isFinite(notaRaw) ? notaRaw : null;

    if (bom === 1) {
      r.totalPositivos++;
      r.totalAvaliados++;
      diaD.total_positivos++;
      diaD.total_avaliados++;
      semD.total_positivos++;
      semD.total_avaliados++;
    } else if (ruim === 1) {
      // Continua contando como negativo -- a premiacao nao muda.
      r.totalNegativos++;
      r.totalAvaliados++;
      diaD.total_negativos++;
      diaD.total_avaliados++;
      semD.total_negativos++;
      semD.total_avaliados++;

      // Alem disso, se a nota veio junto e e 3, marca como neutro (ouvidoria).
      if (nota === 3) {
        r.totalNeutros++;
        diaD.total_neutros++;
        semD.total_neutros++;
      }
    }

    r.historico.push({ data, ticket: row[mapeamento.ticket], bom, ruim, nota });
  });

  Object.keys(resultados).forEach(agente => {
    const r = resultados[agente];

    Object.keys(r.porData).forEach(dt => {
      const d = r.porData[dt];
      d.csat = d.total_avaliados > 0 ? (d.total_positivos / d.total_avaliados) * 100 : 0;
      d.percentual_avaliados = d.total_chats > 0 ? (d.total_avaliados / d.total_chats) * 100 : 0;
      // Ouvidoria: o mesmo CSAT, mas tirando os "ruins" que eram neutros
      // (nota 3) do negativo E do total avaliado -- informativo, nao entra
      // na premiacao.
      d.negativos_confirmados = d.total_negativos - d.total_neutros;
      const avaliadosSemNeutros = d.total_avaliados - d.total_neutros;
      d.csat_sem_neutros = avaliadosSemNeutros > 0 ? (d.total_positivos / avaliadosSemNeutros) * 100 : 0;
    });

    const semanasOrd = Object.keys(r.porSemana).sort();
    semanasOrd.forEach((iniSem, idx) => {
      const s = r.porSemana[iniSem];
      s.csat = s.total_avaliados > 0 ? (s.total_positivos / s.total_avaliados) * 100 : 0;
      s.percentual_avaliados = s.total_chats > 0 ? (s.total_avaliados / s.total_chats) * 100 : 0;
      s.negativos_confirmados = s.total_negativos - s.total_neutros;
      const avaliadosSemNeutros = s.total_avaliados - s.total_neutros;
      s.csat_sem_neutros = avaliadosSemNeutros > 0 ? (s.total_positivos / avaliadosSemNeutros) * 100 : 0;
      s.numero = idx + 1;
      s.rotulo = formatarRotuloSemana(iniSem, idx + 1);
    });

    r.consolidadoSemanal = semanasOrd.map(k => r.porSemana[k]);
    const nS = r.consolidadoSemanal.length;

    // Oficial (premiacao): media das semanas do CSAT bruto -- igual a sempre foi.
    r.csatPercentual = nS > 0 ? r.consolidadoSemanal.reduce((a, s) => a + s.csat, 0) / nS : 0;
    r.percentualAvaliados = nS > 0 ? r.consolidadoSemanal.reduce((a, s) => a + s.percentual_avaliados, 0) / nS : 0;

    // So informativo (ouvidoria): existe apenas quando a nota foi mapeada.
    r.temNotaChat = temNota;
    r.negativosConfirmados = r.totalNegativos - r.totalNeutros;
    const avaliadosSemNeutrosTotal = r.totalAvaliados - r.totalNeutros;
    r.csatSemNeutros = avaliadosSemNeutrosTotal > 0 ? (r.totalPositivos / avaliadosSemNeutrosTotal) * 100 : 0;
  });

  return resultados;
}

// =====================================================
// CX — Avaliação qualitativa
// =====================================================
export function calcularCX(dados, mapeamento) {
  const resultados = {};

  dados.forEach(row => {
    const agente = (row[mapeamento.agente] || '').trim();
    const dataOriginal = row[mapeamento.data];
    const data = normalizarData(dataOriginal);
    if (!agente || !data) return;

    if (!resultados[agente]) {
      resultados[agente] = { porData: {}, avaliacoes: [], totalAvaliacoes: 0 };
    }

    const campos = ['empatia', 'cordialidade', 'comunicacao', 'escrita', 'profissionalismo', 'resolucao'];
    const valores = campos.map(c => parseFloat(row[mapeamento[c]]) || 0);
    const media = valores.reduce((a, b) => a + b, 0) / campos.length;

    if (!resultados[agente].porData[data]) {
      resultados[agente].porData[data] = { data, avaliacoes: [], media_dia: 0, total_avaliacoes_dia: 0 };
    }

    const avaliacao = {
      data,
      empatia: valores[0],
      cordialidade: valores[1],
      comunicacao: valores[2],
      escrita: valores[3],
      profissionalismo: valores[4],
      resolucao: valores[5],
      media,
      observacao: row[mapeamento.observacao] || ''
    };

    resultados[agente].avaliacoes.push(avaliacao);
    resultados[agente].totalAvaliacoes++;
    resultados[agente].porData[data].avaliacoes.push(avaliacao);
    resultados[agente].porData[data].total_avaliacoes_dia++;
  });

  Object.keys(resultados).forEach(agente => {
    const r = resultados[agente];
    r.mediaCX = r.totalAvaliacoes > 0
      ? r.avaliacoes.reduce((a, av) => a + av.media, 0) / r.totalAvaliacoes
      : 0;
    Object.keys(r.porData).forEach(dt => {
      const d = r.porData[dt];
      d.media_dia = d.total_avaliacoes_dia > 0
        ? d.avaliacoes.reduce((a, av) => a + av.media, 0) / d.total_avaliacoes_dia
        : 0;
    });
  });

  return resultados;
}

// =====================================================
// HELPERS para relatórios
// =====================================================

// Agrupa dados_por_data de apurações salvas por período (semanal seg→sex)
export function agruparDadosPorSemana(dadosPorData, _tipo) {
  const semanas = {};
  (dadosPorData || []).forEach(dia => {
    const dataN = dia.data?.split('T')[0];
    if (!dataN) return;
    const iniSem = getInicioSemana(dataN);
    if (!semanas[iniSem]) {
      semanas[iniSem] = {
        inicio: iniSem,
        fim: getFimSemana(iniSem),
        rotulo: '',
        telefone: { total_ligacoes: 0, total_atendidas: 0, total_avaliadas: 0, total_positivas: 0, transferencias: 0 },
        chat: { total_chats: 0, total_avaliados: 0, total_positivos: 0 }
      };
    }
    const s = semanas[iniSem];
    if (dia.telefone) {
      s.telefone.total_ligacoes += dia.telefone.total_ligacoes || 0;
      s.telefone.total_atendidas += dia.telefone.total_atendidas || 0;
      s.telefone.total_avaliadas += dia.telefone.total_avaliadas || 0;
      s.telefone.total_positivas += dia.telefone.total_positivas || 0;
      s.telefone.transferencias += dia.telefone.transferencias || 0;
    }
    if (dia.chat) {
      s.chat.total_chats += dia.chat.total_chats || 0;
      s.chat.total_avaliados += dia.chat.total_avaliados || 0;
      s.chat.total_positivos += dia.chat.total_positivos || 0;
    }
  });

  const arr = Object.keys(semanas).sort().map((k, idx) => {
    const s = semanas[k];
    s.rotulo = formatarRotuloSemana(k, idx + 1);
    // Métricas derivadas
    s.telefone.performance = s.telefone.total_ligacoes > 0 ? (s.telefone.total_atendidas / s.telefone.total_ligacoes) * 100 : 0;
    s.telefone.percentual_avaliados = s.telefone.total_atendidas > 0 ? (s.telefone.total_avaliadas / s.telefone.total_atendidas) * 100 : 0;
    s.telefone.csat = s.telefone.total_avaliadas > 0 ? (s.telefone.total_positivas / s.telefone.total_avaliadas) * 100 : 0;
    s.chat.percentual_avaliados = s.chat.total_chats > 0 ? (s.chat.total_avaliados / s.chat.total_chats) * 100 : 0;
    s.chat.csat = s.chat.total_avaliados > 0 ? (s.chat.total_positivos / s.chat.total_avaliados) * 100 : 0;
    // Satisfação média consolidada
    const canais = [];
    if (s.telefone.total_avaliadas > 0) canais.push(s.telefone.csat);
    if (s.chat.total_avaliados > 0) canais.push(s.chat.csat);
    s.satisfacao_media = canais.length > 0 ? canais.reduce((a, b) => a + b, 0) / canais.length : 0;
    const canaisAv = [];
    if (s.telefone.total_atendidas > 0) canaisAv.push(s.telefone.percentual_avaliados);
    if (s.chat.total_chats > 0) canaisAv.push(s.chat.percentual_avaliados);
    s.percentual_avaliados_medio = canaisAv.length > 0 ? canaisAv.reduce((a, b) => a + b, 0) / canaisAv.length : 0;
    return s;
  });

  return arr;
}