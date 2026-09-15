// Módulo de cálculos para a Inteligência Financeira da Jornada do Cliente.
// Cruza dados do Portal CRC (tratativas), sistema financeiro (valores) e
// recursos humanos (custo de hora/encargos) para calcular o impacto total.

import {
  calcularTempoEfetivo,
  calcularCustoOperacional,
  calcularReceitaAnualEquivalente,
} from '@/components/utils/helpers';

// ── Benchmarks globais fixos de mercado ──
export const BENCHMARKS_GLOBAIS = {
  mckinsey: { min: 20, max: 30, label: 'McKinsey', descricao: 'Desperdício operacional: 20% a 30% dos custos' },
  gartner: { valor: 40, label: 'Gartner', descricao: '40% do tempo gasto em falhas evitáveis' },
  copq: { min: 5, max: 20, label: 'COPQ', descricao: 'Custo da má qualidade: 5% a 20% do faturamento' },
};

// ── Parâmetros padrão configuráveis ──
export const PARAMETROS_PADRAO = {
  custoHora: 14,
  toleranciaTipo: 'percentual',
  toleranciaValor: 2,
  faturamentoReferencia: 320000,
  multiplicadorEncargos: 1.6,
  cargaHorariaMensal: 220,
};

// ── Risco reputacional estimado por tratativa ──
// Reclame Aqui / Google Meu Negócio com baixa avaliação geram risco futuro.
function calcularRiscoReputacional(t) {
  let risco = 0;
  if (t.tipo_tratativa === 'reclame_aqui') {
    const nota = parseFloat(t.nota_reclame_aqui) || 0;
    if (nota > 0 && nota < 7) risco += 500;
    else if (nota >= 7 && nota < 9) risco += 200;
    if (t.voltaria_fazer_negocio === false) risco += 300;
  }
  if (t.tipo_tratativa === 'google_meu_negocio') {
    if (!t.reavaliacao_positiva_google) risco += 300;
    if (!t.exclusao_avaliacao_negativa_google) risco += 200;
  }
  return risco;
}

// ── Custo de retrabalho (reabertura = trabalho duplicado) ──
function calcularCustoRetrabalho(t, custoHora) {
  if (!t.houve_reabertura) return 0;
  const minutos = calcularTempoEfetivo(t);
  return (minutos / 60) * (parseFloat(custoHora) || 0) * 0.5;
}

// ── Impacto financeiro total de uma tratativa ──
// Fórmula: valor devolvido + custo operacional + perda de receita + risco reputacional + retrabalho
export function calcularImpactoTotal(t, colaborador, params) {
  const p = { ...PARAMETROS_PADRAO, ...params };
  const valorDevolvido = parseFloat(t.valor_devolvido_cliente) || 0;
  const perdaReceita = parseFloat(t.valor_perda_receita) || 0;
  const riscoReputacional = calcularRiscoReputacional(t);
  const custoRetrabalho = calcularCustoRetrabalho(t, p.custoHora);

  let custoOperacional;
  if (colaborador && colaborador.salario) {
    custoOperacional = calcularCustoOperacional(t, colaborador, p.multiplicadorEncargos, p.cargaHorariaMensal);
  } else {
    const minutos = calcularTempoEfetivo(t);
    custoOperacional = (minutos / 60) * (parseFloat(p.custoHora) || 0);
  }

  const total = valorDevolvido + custoOperacional + perdaReceita + riscoReputacional + custoRetrabalho;
  return { valorDevolvido, custoOperacional, perdaReceita, riscoReputacional, custoRetrabalho, total };
}

// ── Agrupa impacto por qualquer dimensão (plano, agente, segmento, motivo) ──
export function agruparImpactoPorDimensao(tratativas, colaboradores, params, dimKey, labelMap) {
  const colabMap = (colaboradores || []).reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
  const mapa = {};

  tratativas.forEach(t => {
    const rawKey = t[dimKey] || 'Não definido';
    const key = labelMap ? (labelMap[rawKey] || rawKey) : rawKey;
    if (!mapa[key]) {
      mapa[key] = {
        casos: 0, valorDevolvido: 0, custoOperacional: 0, perdaReceita: 0,
        riscoReputacional: 0, custoRetrabalho: 0, total: 0, faturamento: 0, churns: 0,
      };
    }
    const imp = calcularImpactoTotal(t, colabMap[t.agente_responsavel_id], params);
    mapa[key].casos++;
    mapa[key].valorDevolvido += imp.valorDevolvido;
    mapa[key].custoOperacional += imp.custoOperacional;
    mapa[key].perdaReceita += imp.perdaReceita;
    mapa[key].riscoReputacional += imp.riscoReputacional;
    mapa[key].custoRetrabalho += imp.custoRetrabalho;
    mapa[key].total += imp.total;
    mapa[key].faturamento += calcularReceitaAnualEquivalente(t);
    if (t.teve_churn) mapa[key].churns++;
  });

  return Object.entries(mapa)
    .map(([key, dados]) => ({ key, ...dados }))
    .sort((a, b) => b.total - a.total);
}

// ── Agrupa impacto por mês (para tendência e projeção) ──
export function agruparImpactoPorMes(tratativas, colaboradores, params) {
  const colabMap = (colaboradores || []).reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
  const mapa = {};

  tratativas.forEach(t => {
    const dataRef = t.data_encerramento || t.data_registro;
    if (!dataRef) return;
    const mes = String(dataRef).slice(0, 7); // YYYY-MM
    if (!mapa[mes]) mapa[mes] = { mes, total: 0, casos: 0, valorDevolvido: 0 };
    const imp = calcularImpactoTotal(t, colabMap[t.agente_responsavel_id], params);
    mapa[mes].total += imp.total;
    mapa[mes].valorDevolvido += imp.valorDevolvido;
    mapa[mes].casos++;
  });

  return Object.values(mapa).sort((a, b) => a.mes.localeCompare(b.mes));
}

// ── Projeção simples por média móvel dos últimos N meses ──
export function projetarProximosMeses(dadosMes, numMeses = 3) {
  if (dadosMes.length === 0) return [];
  const ultimos = dadosMes.slice(-3);
  const media = ultimos.reduce((acc, d) => acc + d.total, 0) / ultimos.length;

  // Calcula taxa de crescimento média (se houver >1 mês)
  let taxaCrescimento = 0;
  if (dadosMes.length >= 2) {
    const crescimentos = [];
    for (let i = 1; i < dadosMes.length; i++) {
      if (dadosMes[i - 1].total > 0) {
        crescimentos.push((dadosMes[i].total - dadosMes[i - 1].total) / dadosMes[i - 1].total);
      }
    }
    if (crescimentos.length > 0) {
      taxaCrescimento = crescimentos.reduce((a, b) => a + b, 0) / crescimentos.length;
    }
  }

  const projecoes = [];
  let ultimoMes = dadosMes[dadosMes.length - 1].mes;
  let valor = media;
  for (let i = 0; i < numMeses; i++) {
    valor = valor * (1 + taxaCrescimento);
    // calcular próximo mês
    const [ano, mes] = ultimoMes.split('-').map(Number);
    const proxMes = mes === 12 ? 1 : mes + 1;
    const proxAno = mes === 12 ? ano + 1 : ano;
    ultimoMes = `${proxAno}-${String(proxMes).padStart(2, '0')}`;
    projecoes.push({ mes: ultimoMes, total: Math.round(valor), casos: 0, projetado: true });
  }
  return projecoes;
}

// ── Calcula tolerância em reais com base nos parâmetros ──
export function calcularToleranciaReais(params) {
  const p = { ...PARAMETROS_PADRAO, ...params };
  if (p.toleranciaTipo === 'percentual') {
    return (parseFloat(p.faturamentoReferencia) || 0) * (parseFloat(p.toleranciaValor) || 0) / 100;
  }
  return parseFloat(p.toleranciaValor) || 0;
}

// ── Classifica nível de risco com base no impacto vs tolerância ──
export function classificarRisco(totalImpacto, toleranciaReais) {
  if (toleranciaReais <= 0) return { nivel: 'sem_referencia', label: 'Sem referência', cor: 'slate' };
  const pct = (totalImpacto / toleranciaReais) * 100;
  if (pct <= 50) return { nivel: 'baixo', label: 'Baixo', cor: 'green', pct };
  if (pct <= 100) return { nivel: 'moderado', label: 'Moderado', cor: 'amber', pct };
  if (pct <= 200) return { nivel: 'alto', label: 'Alto', cor: 'orange', pct };
  return { nivel: 'critico', label: 'Crítico', cor: 'red', pct };
}

// ── Gera respostas automáticas para perguntas estratégicas ──
export function gerarPerguntasEstrategicas(tratativas, colaboradores, params) {
  const _colabMap = (colaboradores || []).reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
  const respostas = [];

  // 1. Qual etapa gera mais perdas?
  const porEtapa = agruparImpactoPorDimensao(tratativas, colaboradores, params, 'etapa_jornada_nome');
  if (porEtapa.length > 0) {
    const pior = porEtapa[0];
    respostas.push({
      pergunta: 'Qual etapa da jornada gera mais perdas?',
      resposta: `${pior.key} — ${pior.casos} caso(s), impacto de R$ ${pior.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      detalhe: `Custo operacional R$ ${pior.custoOperacional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} + devoluções R$ ${pior.valorDevolvido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} + perda de receita R$ ${pior.perdaReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      prioridade: 'alta',
    });
  }

  // 2. Qual produto (motivo) apresenta maior risco?
  const porMotivo = agruparImpactoPorDimensao(tratativas, colaboradores, params, 'motivo_nome');
  if (porMotivo.length > 0) {
    const pior = porMotivo[0];
    respostas.push({
      pergunta: 'Qual motivo/produto apresenta maior risco financeiro?',
      resposta: `${pior.key} — impacto R$ ${pior.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em ${pior.casos} caso(s)`,
      detalhe: `Risco reputacional R$ ${pior.riscoReputacional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Retrabalho R$ ${pior.custoRetrabalho.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      prioridade: 'alta',
    });
  }

  // 3. Qual plano possui maior volume de reclamações?
  const porPlano = agruparImpactoPorDimensao(tratativas, colaboradores, params, 'plano_cliente');
  if (porPlano.length > 0) {
    const pior = porPlano[0];
    respostas.push({
      pergunta: 'Qual plano possui maior volume de reclamações?',
      resposta: `Plano ${pior.key} — ${pior.casos} reclamação(ões), impacto R$ ${pior.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      detalhe: `Faturamento envolvido R$ ${pior.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano | Churns: ${pior.churns}`,
      prioridade: 'alta',
    });
  }

  // 4. Projeção de perdas para os próximos meses
  const porMes = agruparImpactoPorMes(tratativas, colaboradores, params);
  const projecoes = projetarProximosMeses(porMes, 3);
  if (projecoes.length > 0) {
    const projTotal = projecoes.reduce((acc, p) => acc + p.total, 0);
    respostas.push({
      pergunta: 'Qual é a projeção de perdas para os próximos 3 meses?',
      resposta: `R$ ${projTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} projetados`,
      detalhe: projecoes.map(p => `${p.mes}: R$ ${p.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join(' | '),
      prioridade: 'media',
    });
  }

  // 5. Causa-raiz mais recorrente
  const porCausa = agruparImpactoPorDimensao(tratativas, colaboradores, params, 'causa_primaria', {
    processo: 'Processo', produto_sistema: 'Produto/Sistema', comunicacao: 'Comunicação',
    expectativa_cliente: 'Expectativa do Cliente', operacao_interna: 'Operação Interna', terceiro: 'Terceiro',
  });
  if (porCausa.length > 0) {
    const pior = porCausa[0];
    respostas.push({
      pergunta: 'Qual é a causa-raiz mais recorrente?',
      resposta: `${pior.key} — ${pior.casos} caso(s), impacto R$ ${pior.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      detalhe: `Foco de correção deve ser esta causa-raiz para reduzir o impacto futuro.`,
      prioridade: 'media',
    });
  }

  // 6. Quanto dinheiro pode ser recuperado?
  const recuperavel = tratativas.reduce((acc, t) => {
    const recuperado = parseFloat(t.valor_recuperado) || 0;
    const _contestado = parseFloat(t.valor_contestado_inicial) || 0;
    const devolvido = parseFloat(t.valor_devolvido_cliente) || 0;
    // O que foi devolvido mas não recuperado é potencial de recuperação futura
    return acc + Math.max(0, devolvido - recuperado);
  }, 0);
  if (recuperavel > 0) {
    respostas.push({
      pergunta: 'Quanto dinheiro pode ser recuperado?',
      resposta: `R$ ${recuperavel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em potencial de recuperação`,
      detalhe: `Valores devolvidos ao cliente que poderiam ser recuperados via defesa de contestação ou acordo.`,
      prioridade: 'media',
    });
  }

  // 7. Qual carteira/segmento é mais impactado?
  const porSegmento = agruparImpactoPorDimensao(tratativas, colaboradores, params, 'segmento_cliente');
  if (porSegmento.length > 0) {
    const pior = porSegmento[0];
    const pctFaturamento = pior.faturamento > 0 ? (pior.total / pior.faturamento) * 100 : 0;
    respostas.push({
      pergunta: 'Qual carteira/segmento sofre mais impacto?',
      resposta: `${pior.key} — impacto R$ ${pior.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${pctFaturamento.toFixed(1)}% do faturamento da carteira)`,
      detalhe: `${pior.casos} caso(s) | Faturamento envolvido R$ ${pior.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano | Churns: ${pior.churns}`,
      prioridade: 'alta',
    });
  }

  return respostas;
}