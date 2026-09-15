// Configurações de tipos e pesos operacionais
export const TIPOS_CONFIG = {
  reclamacao_interna:  { label: 'Reclamação Interna',    color: 'bg-warning-soft text-warning',   colorSolid: 'hsl(var(--chart-3))', peso: 1, pontos: 2 },
  reclame_aqui:        { label: 'Reclame Aqui',          color: 'bg-success-soft text-success',   colorSolid: 'hsl(var(--chart-2))', peso: 2, pontos: 4 },
  google_meu_negocio:  { label: 'Google Meu Negócio',    color: 'bg-info-soft text-primary',     colorSolid: 'hsl(var(--chart-1))', peso: 2, pontos: 3 },
  contestacao_compra:  { label: 'Contestação de Compra', color: 'bg-info-soft text-primary', colorSolid: 'hsl(var(--chart-5))', peso: 3, pontos: 5 },
  procon:              { label: 'PROCON',                 color: 'bg-destructive/10 text-destructive',       colorSolid: 'hsl(var(--destructive))', peso: 4, pontos: 6 },
};

export const PRIORIDADE_CONFIG = {
  baixa:   { label: 'Baixa',    peso: 0.5 },
  media:   { label: 'Média',    peso: 1.0 },
  alta:    { label: 'Alta',     peso: 1.5 },
  critica: { label: 'Crítica',  peso: 2.5 },
};

// Saturação: limiares
const LIMIAR_ATENCAO  = 60;
const LIMIAR_CRITICO  = 85;

/**
 * Calcula o índice de saturação operacional (0-100) de um agente
 * baseado em: volume, tickets críticos, canais prioritários, diversidade
 */
export function calcularSaturacao(agenteId, distribuicoes, tratativasAtivas) {
  const minhas = distribuicoes.filter(d => d.agente_id === agenteId);
  // Calcular data de corte uma única vez fora do filter
  const ultimos7dias = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const recentes = minhas.filter(d => d.data_atribuicao >= ultimos7dias);

  // Peso por volume (max: 30 pts)
  const volumePts = Math.min(recentes.length * 4, 30);

  // Peso por criticidade (max: 30 pts)
  const criticas = recentes.filter(d => d.prioridade === 'critica').length;
  const altas = recentes.filter(d => d.prioridade === 'alta').length;
  const criticaPts = Math.min(criticas * 8 + altas * 3, 30);

  // Peso por canais pesados (max: 20 pts)
  const pesados = recentes.filter(d => ['contestacao_compra', 'procon'].includes(d.tipo_tratativa)).length;
  const pesoPts = Math.min(pesados * 5, 20);

  // Concentração em canal único (max: 20 pts)
  const conc = calcularConcentracao(minhas);
  const concPts = Math.min(conc * 20, 20);

  return Math.min(Math.round(volumePts + criticaPts + pesoPts + concPts), 100);
}

/**
 * Retorna 0.0 a 1.0 de concentração em canal único
 */
export function calcularConcentracao(distribuicoes) {
  if (!distribuicoes.length) return 0;
  const counts = {};
  distribuicoes.forEach(d => { counts[d.tipo_tratativa] = (counts[d.tipo_tratativa] || 0) + 1; });
  const max = Math.max(...Object.values(counts));
  return max / distribuicoes.length;
}

/**
 * Status operacional do agente, pela saturação da carga.
 *
 * Antes, o indicador visual era um emoji cravado aqui — vermelho, amarelo e
 * verde. A remoção dos emojis da interface deixou o campo vazio e o sinal
 * sumiu da tela, sobrando só o rótulo em texto.
 *
 * Agora o estado devolve um `tom`, e quem renderiza usa o StatusBadge. Isso
 * traz duas coisas que o emoji não dava: o rótulo acompanha a cor, então
 * quem não distingue vermelho de verde continua entendendo; e a cor passa a
 * vir dos tokens, como no resto do sistema.
 */
export function getStatusOperacional(saturacao) {
  if (saturacao >= LIMIAR_CRITICO) return { label: 'Sobrecarga', tom: 'critico', bg: 'bg-critical-soft border-critical/25' };
  if (saturacao >= LIMIAR_ATENCAO) return { label: 'Atenção',    tom: 'atencao', bg: 'bg-warning-soft border-warning/25' };
  return                                  { label: 'Saudável',   tom: 'sucesso', bg: 'bg-success-soft border-success/25' };
}

/**
 * Calcula peso operacional total (pontuação estimada) de um conjunto de distribuições
 */
export function calcularPesoOperacional(distribuicoes) {
  return distribuicoes.reduce((acc, d) => {
    const tipo = TIPOS_CONFIG[d.tipo_tratativa] || { peso: 1 };
    const prio = PRIORIDADE_CONFIG[d.prioridade] || { peso: 1 };
    return acc + tipo.peso * prio.peso;
  }, 0);
}

/**
 * Calcula pontuação estimada de um conjunto de distribuições
 */
export function calcularPontuacaoEstimada(distribuicoes) {
  return distribuicoes.reduce((acc, d) => {
    const tipo = TIPOS_CONFIG[d.tipo_tratativa] || { pontos: 2 };
    const prio = PRIORIDADE_CONFIG[d.prioridade] || { peso: 1 };
    return acc + tipo.pontos * prio.peso;
  }, 0);
}

/**
 * Sugere o próximo agente para um tipo de tratativa com base no rodízio
 * Retorna: { sugerido, motivo, ultimaAtribuicao, pulados }
 */
export function sugerirProximoAgente(tipo, agentesDisponiveis, distribuicoes) {
  if (!agentesDisponiveis.length) return null;

  // Pega todas as distribuições deste tipo, ordenadas por data
  const doTipo = [...distribuicoes]
    .filter(d => d.tipo_tratativa === tipo)
    .sort((a, b) => {
      const da = `${a.data_atribuicao} ${a.horario_atribuicao || '00:00'}`;
      const db = `${b.data_atribuicao} ${b.horario_atribuicao || '00:00'}`;
      return db.localeCompare(da);
    });

  // Monta mapa: agenteId → última data/hora atribuição neste tipo
  const ultimoPorAgente = {};
  doTipo.forEach(d => {
    if (!ultimoPorAgente[d.agente_id]) ultimoPorAgente[d.agente_id] = d;
  });

  // Ordena agentes: quem recebeu há mais tempo (ou nunca recebeu) vem primeiro
  const ordenados = [...agentesDisponiveis].sort((a, b) => {
    const ua = ultimoPorAgente[a.id];
    const ub = ultimoPorAgente[b.id];
    if (!ua && !ub) return a.nome_completo.localeCompare(b.nome_completo);
    if (!ua) return -1;
    if (!ub) return 1;
    const da = `${ua.data_atribuicao} ${ua.horario_atribuicao || '00:00'}`;
    const db = `${ub.data_atribuicao} ${ub.horario_atribuicao || '00:00'}`;
    return da.localeCompare(db);
  });

  const sugerido = ordenados[0];
  const ultimaAtribuicao = ultimoPorAgente[sugerido?.id] || null;

  return { sugerido, ultimaAtribuicao, ordenados };
}

/**
 * Gera alertas operacionais para um agente
 */
export function gerarAlertas(agenteId, distribuicoes, saturacao) {
  const alertas = [];
  const minhas = distribuicoes.filter(d => d.agente_id === agenteId);
  const ultimos30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const recentes30 = minhas.filter(d => d.data_atribuicao >= ultimos30);

  // Alerta de saturação
  if (saturacao >= 85) alertas.push({ tipo: 'critico', msg: 'Agente em sobrecarga operacional' });
  else if (saturacao >= 60) alertas.push({ tipo: 'atencao', msg: 'Atenção: volume operacional elevado' });

  // Concentração de canal
  const counts = {};
  recentes30.forEach(d => { counts[d.tipo_tratativa] = (counts[d.tipo_tratativa] || 0) + 1; });
  const total30 = recentes30.length;
  Object.entries(counts).forEach(([tipo, qtd]) => {
    if (total30 > 3 && qtd / total30 > 0.65) {
      alertas.push({ tipo: 'atencao', msg: `Alta concentração em ${TIPOS_CONFIG[tipo]?.label || tipo} (${Math.round(qtd/total30*100)}%)` });
    }
  });

  // Baixa exposição operacional (canal sem receber nos últimos 30 dias)
  Object.keys(TIPOS_CONFIG).forEach(tipo => {
    const temRecente = recentes30.some(d => d.tipo_tratativa === tipo);
    const jaTeve = minhas.some(d => d.tipo_tratativa === tipo);
    if (!temRecente && jaTeve) {
      alertas.push({ tipo: 'info', msg: `Baixa exposição em ${TIPOS_CONFIG[tipo]?.label || tipo} nos últimos 30 dias` });
    }
  });

  return alertas;
}