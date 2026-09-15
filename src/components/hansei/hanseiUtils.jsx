import { getCurrentTrimester } from '@/components/utils/helpers';

export function calcularDadosConsolidados(colaboradorId, dataInicio, dataFim, { tratativas, apuracoes, pontuacoes }) {
  const inicio = dataInicio;
  const fim = dataFim;

  const tratativasCol = tratativas.filter(t => {
    const data = t.created_date ? t.created_date.split('T')[0] : null;
    if (!data) return false;
    return t.agente_responsavel_id === colaboradorId && data >= inicio && data <= fim && !t.excluida;
  });

  const solucionadas = tratativasCol.filter(t => ['encerrada', 'aguardando_confirmacao_reabertura'].includes(t.status)).length;
  const emAberto = tratativasCol.filter(t => !['encerrada', 'aguardando_confirmacao_reabertura', 'excluida'].includes(t.status)).length;
  const slasCumpridos = tratativasCol.filter(t => t.encerrado_no_sla === true).length;
  const slasEstourados = tratativasCol.filter(t => t.status === 'encerrada' && t.encerrado_no_sla === false).length;
  const reaberturas = tratativasCol.filter(t => t.houve_reabertura === true).length;
  const solucoesReplicaveis = tratativasCol.filter(t => t.solucao_replicavel === true).length;

  const porTipo = {};
  tratativasCol.forEach(t => {
    const tipo = t.tipo_tratativa || 'outros';
    porTipo[tipo] = (porTipo[tipo] || 0) + 1;
  });

  const contestacoes = tratativasCol.filter(t => t.tipo_tratativa === 'contestacao');
  const contestacoesResolvidas = contestacoes.filter(t => t.status === 'encerrada').length;
  const valorRecuperado = contestacoes.reduce((sum, t) => sum + (t.valor_recuperado || 0), 0);

  const motivoCount = {};
  tratativasCol.forEach(t => { if (t.motivo_nome) motivoCount[t.motivo_nome] = (motivoCount[t.motivo_nome] || 0) + 1; });
  const topMotivos = Object.entries(motivoCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nome, count]) => ({ nome, count }));

  const apuracoesCol = apuracoes.filter(a => {
    if (a.colaborador_id !== colaboradorId) return false;
    if (a.dados_por_data?.length > 0) return a.dados_por_data.some(d => { const dd = d.data.split('T')[0]; return dd >= inicio && dd <= fim; });
    const pi = a.periodo_inicio?.split('T')[0], pf = a.periodo_fim?.split('T')[0];
    if (!pi || !pf) return false;
    return pi <= fim && pf >= inicio;
  });

  let chats = 0, ligacoes = 0, csatSum = 0, nCSAT = 0, perfSum = 0, nPerf = 0, cxSum = 0, cxCount = 0, cxAvals = 0;

  apuracoesCol.forEach(ap => {
    if (ap.dados_por_data?.length > 0) {
      ap.dados_por_data.forEach(dia => {
        const dd = dia.data.split('T')[0];
        if (dd >= inicio && dd <= fim) {
          if (dia.chat) { chats += dia.chat.total_chats || 0; if (dia.chat.csat) { csatSum += dia.chat.csat; nCSAT++; } }
          if (dia.telefone) { ligacoes += dia.telefone.total_atendidas || 0; if (dia.telefone.csat) { csatSum += dia.telefone.csat; nCSAT++; } if (dia.telefone.performance) { perfSum += dia.telefone.performance; nPerf++; } }
        }
      });
    } else {
      if (ap.canal_chat) { chats += ap.canal_chat.total_atendimentos || 0; if (ap.canal_chat.csat) { csatSum += ap.canal_chat.csat; nCSAT++; } }
      if (ap.canal_telefone) { ligacoes += ap.canal_telefone.total_atendimentos || 0; if (ap.canal_telefone.csat) { csatSum += ap.canal_telefone.csat; nCSAT++; } if (ap.canal_telefone.performance) { perfSum += ap.canal_telefone.performance; nPerf++; } }
      if (ap.avaliacao_cx) { cxSum += ap.avaliacao_cx.nota_media || 0; cxAvals += ap.avaliacao_cx.total_avaliacoes || 0; cxCount++; }
    }
  });

  const trimestreAtual = getCurrentTrimester();
  const pontuacao = pontuacoes.find(p => p.colaborador_id === colaboradorId && p.periodo_trimestre === trimestreAtual);

  return {
    tratativas_total: tratativasCol.length,
    tratativas_solucionadas: solucionadas,
    tratativas_em_aberto: emAberto,
    csat_individual: parseFloat((nCSAT > 0 ? csatSum / nCSAT : 0).toFixed(1)),
    chats_atendidos: chats,
    ligacoes_atendidas: ligacoes,
    slas_cumpridos: slasCumpridos,
    slas_estourados: slasEstourados,
    performance_percentual: parseFloat((nPerf > 0 ? perfSum / nPerf : 0).toFixed(1)),
    pontuacao_trimestre: pontuacao?.total_pontos || 0,
    tratativas_por_tipo: porTipo,
    contestacoes_total: contestacoes.length,
    contestacoes_resolvidas: contestacoesResolvidas,
    valor_recuperado_total: valorRecuperado,
    reaberturas,
    solucoes_replicaveis: solucoesReplicaveis,
    top_motivos: topMotivos,
    cx_nota_media: parseFloat((cxCount > 0 ? cxSum / cxCount : 0).toFixed(1)),
    cx_total_avaliacoes: cxAvals,
  };
}

export function getQuickPeriod(tipo) {
  const hoje = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (tipo) {
    case 'esta_semana': {
      const dow = hoje.getDay();
      const mon = new Date(hoje); mon.setDate(hoje.getDate() - (dow === 0 ? 6 : dow - 1));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { inicio: fmt(mon), fim: fmt(sun) };
    }
    case 'semana_anterior': {
      const dow = hoje.getDay();
      const mon = new Date(hoje); mon.setDate(hoje.getDate() - (dow === 0 ? 6 : dow - 1) - 7);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { inicio: fmt(mon), fim: fmt(sun) };
    }
    case 'este_mes':
      return { inicio: fmt(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), fim: fmt(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)) };
    case 'mes_anterior':
      return { inicio: fmt(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)), fim: fmt(new Date(hoje.getFullYear(), hoje.getMonth(), 0)) };
    case 'ultimos_30': {
      const fim = new Date(hoje);
      const ini = new Date(hoje); ini.setDate(hoje.getDate() - 30);
      return { inicio: fmt(ini), fim: fmt(fim) };
    }
    default:
      return { inicio: '', fim: '' };
  }
}

export function gerarInsights(dados) {
  if (!dados) return [];
  const insights = [];

  const slaTotal = (dados.slas_cumpridos || 0) + (dados.slas_estourados || 0);
  const slaPct = slaTotal > 0 ? Math.round(((dados.slas_cumpridos || 0) / slaTotal) * 100) : null;

  if (slaPct !== null && slaPct < 70) {
    insights.push({ tipo: 'danger', titulo: '⚠️ SLA Crítico', desc: `Apenas ${slaPct}% das tratativas foram encerradas no prazo. Meta: 80%+. Revise a gestão de prazos e priorize os atendimentos em aberto.` });
  } else if (slaPct !== null && slaPct < 80) {
    insights.push({ tipo: 'warning', titulo: 'SLA abaixo da meta', desc: `${dados.slas_estourados} tratativa(s) fora do prazo. Meta de 80% ainda não atingida. Fique atento aos vencimentos.` });
  } else if (slaPct === 100 && slaTotal > 0) {
    insights.push({ tipo: 'success', titulo: '🏆 SLA 100%!', desc: `Todas as tratativas foram encerradas dentro do prazo. Continue mantendo essa disciplina de acompanhamento!` });
  }

  if ((dados.reaberturas || 0) > 0) {
    insights.push({ tipo: 'warning', titulo: 'Atenção: Reaberturas', desc: `${dados.reaberturas} tratativa(s) foram reabertas. Reflita sobre a qualidade da solução apresentada — o cliente pode não ter tido seu problema realmente resolvido.` });
  }

  if ((dados.tratativas_em_aberto || 0) > 5) {
    insights.push({ tipo: 'warning', titulo: 'Tratativas acumuladas', desc: `${dados.tratativas_em_aberto} tratativas em aberto. Priorize o encerramento para evitar estouro de SLA.` });
  }

  const perf = dados.performance_percentual || 0;
  if (perf > 0 && perf < 70) {
    insights.push({ tipo: 'danger', titulo: '📉 Performance abaixo da meta', desc: `${perf}% está abaixo dos 70% esperados. Revise a qualidade da investigação do problema do cliente, o uso dos POPs e a clareza na comunicação da solução.` });
  } else if (perf >= 70 && perf < 85) {
    insights.push({ tipo: 'warning', titulo: 'Performance dentro do básico', desc: `${perf}% de performance — está dentro do mínimo, mas há espaço para evoluir. Identifique os atendimentos com avaliação negativa.` });
  } else if (perf >= 85) {
    insights.push({ tipo: 'success', titulo: '🌟 Performance acima da meta', desc: `${perf}% de performance. Parabéns! Continue assim. Identifique quais práticas contribuíram para esse resultado e replique para manter este patamar.` });
  }

  const csat = dados.csat_individual || 0;
  if (csat > 0 && csat < 75) {
    insights.push({ tipo: 'danger', titulo: '📉 CSAT abaixo da meta', desc: `CSAT de ${csat}% abaixo do esperado. Reflita sobre a qualidade da investigação do problema do cliente, uso dos POPs, solicitação de avaliação e a clareza da solução apresentada.` });
  } else if (csat >= 75 && csat < 88) {
    insights.push({ tipo: 'warning', titulo: 'CSAT a melhorar', desc: `CSAT de ${csat}%. Foque em confirmar se o cliente realmente teve seu problema resolvido antes de encerrar o atendimento.` });
  } else if (csat >= 88) {
    insights.push({ tipo: 'success', titulo: '😊 CSAT excelente', desc: `CSAT de ${csat}% demonstra alta satisfação dos clientes. Parabéns! Mantenha essa atenção à qualidade no próximo período.` });
  }

  if ((dados.solucoes_replicaveis || 0) > 0) {
    insights.push({ tipo: 'info', titulo: '📚 Soluções documentadas', desc: `${dados.solucoes_replicaveis} solução(ões) replicável(is) registrada(s). Isso contribui diretamente para o conhecimento de toda a equipe.` });
  }

  if ((dados.contestacoes_total || 0) > 0 && dados.valor_recuperado_total > 0) {
    insights.push({ tipo: 'info', titulo: 'Contestações: valor recuperado', desc: `R$ ${dados.valor_recuperado_total.toFixed(2)} recuperado em ${dados.contestacoes_resolvidas}/${dados.contestacoes_total} contestações resolvidas.` });
  }

  if (insights.length === 0 && (dados.tratativas_total || 0) === 0) {
    insights.push({ tipo: 'info', titulo: 'Sem dados no período', desc: 'Nenhuma tratativa ou apuração encontrada para este período.' });
  }

  return insights;
}

export const ACOES_MELHORIA = [
  'Investigar melhor antes de encerrar o atendimento',
  'Confirmar se o cliente realmente teve seu problema resolvido',
  'Melhorar clareza na comunicação com o cliente',
  'Seguir o POP com mais atenção',
  'Solicitar avaliação ao cliente ao final do atendimento',
  'Reduzir o tempo de resposta em tratativas abertas',
  'Documentar mais soluções replicáveis para a equipe',
  'Verificar SLA antes de encerrar cada atendimento',
  'Revisar postura e tom na comunicação escrita',
  'Acompanhar tratativas reabertas com mais atenção',
];