
// A conta dos números mora em src/lib/hanseiDados.js (pura, também usada no
// recálculo dos Hanseis já enviados).
export { calcularDadosConsolidados } from '@/lib/hanseiDados';

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
    insights.push({ tipo: 'danger', titulo: 'Prazo: muitas fora do SLA', desc: `${slaPct}% das tratativas foram encerradas no prazo. Priorize os atendimentos que vencem primeiro.` });
  } else if (slaPct !== null && slaPct < 80) {
    insights.push({ tipo: 'warning', titulo: 'Prazo: algumas fora do SLA', desc: `${dados.slas_estourados} tratativa(s) encerrada(s) fora do prazo. Fique atento aos vencimentos.` });
  } else if (slaPct === 100 && slaTotal > 0) {
    insights.push({ tipo: 'success', titulo: 'SLA 100%!', desc: `Todas as tratativas foram encerradas dentro do prazo. Continue mantendo essa disciplina de acompanhamento!` });
  }

  if ((dados.reaberturas || 0) > 0) {
    insights.push({ tipo: 'warning', titulo: 'Atenção: reaberturas', desc: `${dados.reaberturas} cliente(s) abriram nova tratativa em até 7 dias depois do encerramento. Reflita sobre a qualidade da solução apresentada — o cliente pode não ter tido seu problema realmente resolvido.` });
  }

  if ((dados.tratativas_em_aberto || 0) > 5) {
    insights.push({ tipo: 'warning', titulo: 'Tratativas acumuladas', desc: `${dados.tratativas_em_aberto} tratativas em aberto. Priorize o encerramento para evitar estouro de SLA.` });
  }

  // Faixas do POP 11 (Regras da Premiação), as mesmas da pontuação.
  const perf = dados.performance_percentual || 0;
  if (perf > 0 && perf < 90) {
    insights.push({ tipo: 'danger', titulo: 'Performance abaixo da faixa', desc: `${perf}% das ligações atendidas. Abaixo de 90% não pontua na premiação; de 90% a 99% vale 7 pontos e 100% vale 10.` });
  } else if (perf >= 90 && perf < 100) {
    insights.push({ tipo: 'warning', titulo: 'Performance: faixa de 7 pontos', desc: `${perf}% das ligações atendidas. Atender todas (100%) vale 10 pontos na premiação.` });
  } else if (perf >= 100) {
    insights.push({ tipo: 'success', titulo: 'Performance máxima', desc: 'Todas as ligações atendidas: faixa máxima da premiação (10 pontos).' });
  }

  const csat = dados.csat_individual || 0;
  if (csat > 0 && csat < 85) {
    insights.push({ tipo: 'danger', titulo: 'CSAT abaixo da faixa', desc: `CSAT de ${csat}%. Abaixo de 85% não pontua na premiação. Reflita sobre a investigação do problema, o uso dos POPs, o pedido de avaliação e a clareza da solução.` });
  } else if (csat >= 85 && csat < 90) {
    insights.push({ tipo: 'warning', titulo: 'CSAT: faixa de 7 pontos', desc: `CSAT de ${csat}%. A partir de 90% vale 9 pontos. Confirme se o cliente teve o problema resolvido antes de encerrar.` });
  } else if (csat >= 90 && csat < 95) {
    insights.push({ tipo: 'success', titulo: 'CSAT: faixa de 9 pontos', desc: `CSAT de ${csat}%. A partir de 95% vale 10 pontos.` });
  } else if (csat >= 95) {
    insights.push({ tipo: 'success', titulo: 'CSAT na faixa máxima', desc: `CSAT de ${csat}%: faixa máxima da premiação (10 pontos).` });
  }

  if ((dados.solucoes_replicaveis || 0) > 0) {
    insights.push({ tipo: 'info', titulo: 'Soluções documentadas', desc: `${dados.solucoes_replicaveis} solução(ões) replicável(is) registrada(s). Isso contribui diretamente para o conhecimento de toda a equipe.` });
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