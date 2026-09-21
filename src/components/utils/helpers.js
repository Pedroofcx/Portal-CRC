import { pontosDaFaixa } from '../../lib/faixasIndicadores.js';
/**
 * Data SEM hora ("2026-09-16", colunas `date` do banco) é uma data de
 * CALENDÁRIO: não tem fuso. `new Date("2026-09-16")` a lê como meia-noite em
 * UTC — que em São Paulo é 21h do dia 15. Por isso a admissão, os períodos de
 * apuração, de Hansei e de escala apareciam com UM DIA A MENOS.
 *
 * `dataDoCalendario` devolve a meia-noite LOCAL do dia (ou null); use-a em
 * vez de `new Date(...)` sempre que o valor for só data.
 */
const SO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function dataDoCalendario(valor) {
  const m = typeof valor === 'string' ? SO_DATA.exec(valor.trim()) : null;
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// Formatar data para fuso horário de São Paulo
export function formatDateSP(date, format = 'DD/MM/YYYY HH:mm') {
  if (!date) return '-';

  // Só data: formata os próprios números, sem passar por fuso nenhum.
  const soData = typeof date === 'string' ? SO_DATA.exec(date.trim()) : null;
  if (soData) {
    const [, ano, mes, dia] = soData;
    if (format === 'DD/MM') return `${dia}/${mes}`;
    if (format === 'DD/MM/YY') return `${dia}/${mes}/${ano.slice(2)}`;
    return `${dia}/${mes}/${ano}`; // formatos com hora: não há hora para mostrar
  }

  try {
    const d = new Date(date);

    // Validar se é uma data válida
    if (isNaN(d.getTime())) return '-';

    const options = { timeZone: 'America/Sao_Paulo' };

    if (format === 'DD/MM/YYYY') {
      return d.toLocaleDateString('pt-BR', options);
    }
    if (format === 'DD/MM/YYYY HH:mm') {
      return d.toLocaleString('pt-BR', { ...options, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    if (format === 'HH:mm') {
      return d.toLocaleTimeString('pt-BR', { ...options, hour: '2-digit', minute: '2-digit' });
    }
    if (format === 'DD/MM') {
      return d.toLocaleDateString('pt-BR', { ...options, day: '2-digit', month: '2-digit' });
    }
    // Antes caía no formato completo, com segundos: "15/09/2026, 21:00:00".
    if (format === 'DD/MM/YY') {
      return d.toLocaleDateString('pt-BR', { ...options, day: '2-digit', month: '2-digit', year: '2-digit' });
    }
    return d.toLocaleString('pt-BR', options);
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return '-';
  }
}

// Obter data/hora atual em São Paulo
export function nowSP() {
  return new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
}

// Criar ISO string (UTC) — nota: ISO strings são sempre UTC por spec
export function toISOStringSP() {
  return new Date().toISOString();
}

// Retorna data atual no formato YYYY-MM-DD no fuso de São Paulo
export function todaySP() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // en-CA = YYYY-MM-DD
}

// Calcular trimestre atual
export function getCurrentTrimester() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  return `${year}-Q${quarter}`;
}

// Calcular SLA baseado no tipo
export function getSLAByType(tipo) {
  const slaMap = {
    reclamacao_interna: 24,
    reclame_aqui: 48,
    google_meu_negocio: 72,
    contestacao: 72
  };
  return slaMap[tipo] || 24;
}

// Calcular pontuação por tipo de tratativa
export function calculateTratativaPoints(tratativa) {
  let pontos = 0;
  const detalhes = [];

  // Reclamações Internas
  if (tratativa.tipo_tratativa === 'reclamacao_interna') {
    if (tratativa.encerrado_no_sla) {
      pontos += 1;
      detalhes.push({ tipo: 'Encerramento no SLA', pontos: 1 });
    }
    // Só ganha ponto de reabertura se status_reabertura === 'nao_houve'
    if (tratativa.status_reabertura === 'nao_houve') {
      pontos += 1;
      detalhes.push({ tipo: 'Sem reabertura em 7 dias', pontos: 1 });
    }
    if (tratativa.solucao_replicavel) {
      pontos += 0.5;
      detalhes.push({ tipo: 'Solução replicável', pontos: 0.5 });
    }
  }

  // Reclame Aqui
  if (tratativa.tipo_tratativa === 'reclame_aqui') {
    const nota = tratativa.nota_reclame_aqui;
    if (nota >= 7 && nota <= 8) {
      pontos += 0.5;
      detalhes.push({ tipo: 'Nota Reclame Aqui 7-8', pontos: 0.5 });
    } else if (nota === 9) {
      pontos += 1.5;
      detalhes.push({ tipo: 'Nota Reclame Aqui 9', pontos: 1.5 });
    } else if (nota === 10) {
      pontos += 2.5;
      detalhes.push({ tipo: 'Nota Reclame Aqui 10', pontos: 2.5 });
    }
    if (tratativa.voltaria_fazer_negocio && nota > 8) {
      pontos += 1;
      detalhes.push({ tipo: 'Voltaria a fazer negócio', pontos: 1 });
    }
  }

  // Google Meu Negócio
  if (tratativa.tipo_tratativa === 'google_meu_negocio') {
    if (tratativa.reavaliacao_positiva_google) {
      pontos += 2;
      detalhes.push({ tipo: 'Reavaliação positiva', pontos: 2 });
    }
    if (tratativa.exclusao_avaliacao_negativa_google) {
      pontos += 1;
      detalhes.push({ tipo: 'Exclusão avaliação negativa', pontos: 1 });
    }
  }

  // Contestação — aceita ambos os valores do enum (contestacao_compra e contestacao)
  if (tratativa.tipo_tratativa === 'contestacao' || tratativa.tipo_tratativa === 'contestacao_compra') {
    const tipoResolucao = tratativa.tipo_resolucao_contestacao;
    const statusResolucao = tratativa.status_resolucao_contestacao;

    if (tipoResolucao === 'cancelamento' || statusResolucao === 'cancelou_contestacao') {
      pontos += 2.5;
      detalhes.push({ tipo: 'Cancelamento', pontos: 2.5 });
    } else if (tipoResolucao === 'pagamento_integral' || statusResolucao === 'pagou') {
      pontos += 2.5;
      detalhes.push({ tipo: 'Pagamento integral / Pagou', pontos: 2.5 });
    } else if (tipoResolucao === 'acordo_custo_reduzido' || statusResolucao === 'acordo') {
      pontos += 2.5;
      detalhes.push({ tipo: 'Acordo de contestação (+2,5 pts)', pontos: 2.5 });
    }
  }

  return { pontos, detalhes };
}

// Pontos dos indicadores: as faixas moram em src/lib/faixasIndicadores.js,
// que também diz qual é a próxima faixa. Uma fonte só para as duas perguntas.
export function calculateCSATPoints(csatPercentage) {
  return pontosDaFaixa('csat', csatPercentage);
}

export function calculatePerformancePoints(performancePercentage) {
  return pontosDaFaixa('performance', performancePercentage);
}

export function calculateCXPoints(notaMedia) {
  return pontosDaFaixa('cx', notaMedia);
}

// Labels para tipos de tratativa
export const tipoTratativaLabels = {
  reclamacao_interna: 'Reclamação Interna',
  reclame_aqui: 'Reclame Aqui',
  google_meu_negocio: 'Google Meu Negócio',
  contestacao: 'Contestação'
};

// Labels para prioridades
export const prioridadeLabels = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica'
};

// Labels para status
export const statusLabels = {
  registrada: 'Registrada',
  tratativa_iniciada: 'Tratativa Iniciada',
  em_andamento: 'Em Andamento',
  dependencia_externa: 'Dependência Externa',
  aguardando_financeiro: 'Aguardando Retorno Financeiro',
  encerrada: 'Encerrada',
  aguardando_confirmacao_reabertura: 'Aguardando Confirmação de Reabertura',
  excluida: 'Excluída'
};

// Calcular dias restantes para confirmação de reabertura
export function calcularDiasRestantesReabertura(dataEncerramento) {
  if (!dataEncerramento) return null;
  
  const dataEnc = new Date(dataEncerramento);
  const dataLimite = new Date(dataEnc);
  dataLimite.setDate(dataLimite.getDate() + 7);
  
  const agora = new Date();
  const diffMs = dataLimite - agora;
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return {
    dias: Math.max(0, diffDias),
    expirou: diffDias <= 0,
    dataLimite: dataLimite
  };
};

// Labels para papéis
export const papelLabels = {
  agente: 'Agente',
  gestor: 'Gestor',
  fi: 'Facilitador Interno'
};

// Estados considerados "ativos" (agente efetivamente trabalhando no ticket)
const ESTADOS_ATIVOS_TEMPO = ['tratativa_iniciada', 'em_andamento'];

// Calcula os minutos efetivamente trabalhados em uma tratativa, ignorando
// estados pausados/congelados (dependencia_externa, aguardando_financeiro,
// aguardando_confirmacao_reabertura) — varre o historico_estados[].
export function calcularTempoEfetivo(tratativa) {
  const historico = tratativa?.historico_estados || [];
  if (historico.length === 0) return 0;

  let totalMinutos = 0;
  for (let i = 0; i < historico.length; i++) {
    const entrada = historico[i];
    if (!ESTADOS_ATIVOS_TEMPO.includes(entrada.estado_novo)) continue;

    const inicio = new Date(entrada.data_mudanca);
    const proxima = historico[i + 1];
    const fim = proxima ? new Date(proxima.data_mudanca) : new Date();

    if (fim > inicio) {
      totalMinutos += (fim - inicio) / 60000;
    }
  }
  return Math.round(totalMinutos);
}

// Sanitiza o campo salario (que pode vir como número ou string formatada em
// Real Brasileiro, ex: "R$ 3.500,00") e retorna um Float estrito.
//
// CORRIGIDO: o comentário original dizia "NUNCA aplica fallback fixo — se o
// valor for inválido/nulo, retorna 0 para forçar a conferência manual do
// cadastro" — e logo abaixo havia um SALARIO_FALLBACK de R$ 2.000,00, que a
// função aplicava. Documentação e código diziam o oposto.
//
// Agora a função faz o que o comentário sempre prometeu: devolve 0 para valor
// ausente ou inválido. Custo operacional calculado sobre salário inventado é
// pior que custo não calculado — o número errado entra no relatório da
// diretoria com a mesma cara de um número certo.
export function sanitizeSalario(salarioInput) {
  if (salarioInput === null || salarioInput === undefined || salarioInput === '') return 0;

  if (typeof salarioInput === 'number') {
    return (Number.isNaN(salarioInput) || salarioInput <= 0) ? 0 : salarioInput;
  }

  const valorLimpo = String(salarioInput)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(valorLimpo);
  return (!num || Number.isNaN(num) || num <= 0) ? 0 : num;
}

/** Diz se dá para calcular custo para este colaborador. */
export function temSalarioCadastrado(colaborador) {
  return sanitizeSalario(colaborador?.salario) > 0;
}

// Formata um número como moeda em Real Brasileiro (R$ 0,00).
//
// CORRIGIDO — ERA O BUG MAIS GRAVE DESTE ARQUIVO: esta função chamava
// sanitizeSalario, que devolvia R$ 2.000,00 para qualquer valor nulo ou zero.
// O efeito: TODO valor monetário zerado do sistema aparecia como R$ 2.000,00.
// Devolução de zero, custo de zero, valor recuperado de zero — todos exibidos
// como dois mil reais, em 82 pontos de 14 arquivos, incluindo os relatórios
// financeiros e o relatório da diretoria.
//
// Formatar dinheiro não tem nada a ver com sanear salário. São duas coisas.
export function formatBRL(valor) {
  const num = typeof valor === 'number'
    ? valor
    : parseFloat(String(valor ?? '').replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.'));
  const seguro = Number.isFinite(num) ? num : 0;
  return `R$ ${seguro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Calcula o custo operacional (R$) de uma tratativa a partir do tempo efetivo
// trabalhado e do salário (sanitizado) do colaborador responsável.
// Custo_Minuto = ((salario * 1.6) / 220) / 60
export function calcularCustoOperacional(tratativa, colaborador, multiplicadorEncargos = 1.6, cargaHorariaMensal = 220) {
  const salario = sanitizeSalario(colaborador?.salario);
  const minutosReais = calcularTempoEfetivo(tratativa);
  const custoMinuto = ((salario * multiplicadorEncargos) / cargaHorariaMensal) / 60;
  return Math.round(custoMinuto * minutosReais * 100) / 100;
}

// Impacto Financeiro Direto = Valor da Devolução + (Horas gastas na tratativa x Custo médio da hora da equipe)
// custoHoraEquipe é um parâmetro configurável pelo gestor (não depende do salário individual).
export function calcularImpactoFinanceiroDireto(tratativa, custoHoraEquipe = 0) {
  const valorDevolvido = parseFloat(tratativa?.valor_devolvido_cliente) || 0;
  const minutosReais = calcularTempoEfetivo(tratativa);
  const horas = minutosReais / 60;
  const custoHoras = horas * (parseFloat(custoHoraEquipe) || 0);
  return Math.round((valorDevolvido + custoHoras) * 100) / 100;
}

// Calcula o tempo de contrato em meses a partir da data de contratação.
// Retorna null se a data for inválida ou ausente.
// O cálculo é sempre dinâmico (display-time) — nunca persistido manualmente.
export function calcularTempoContratoMeses(dataContratacao) {
  if (!dataContratacao) return null;
  const inicio = new Date(dataContratacao);
  if (isNaN(inicio.getTime())) return null;
  const agora = new Date();
  const meses = (agora.getFullYear() - inicio.getFullYear()) * 12 + (agora.getMonth() - inicio.getMonth());
  // Ajuste: se o dia atual for menor que o dia da contratação, subtrai 1 mês incompleto
  if (agora.getDate() < inicio.getDate() && meses > 0) {
    return meses - 1;
  }
  return Math.max(0, meses);
}

// Formata tempo de contrato em meses para exibição amigável (ex: "2 anos e 3 meses").
export function formatarTempoContrato(meses) {
  if (meses === null || meses === undefined || isNaN(meses)) return '-';
  if (meses < 1) return 'Menos de 1 mês';
  const anos = Math.floor(meses / 12);
  const mesesRestantes = meses % 12;
  if (anos === 0) return `${mesesRestantes} ${mesesRestantes === 1 ? 'mês' : 'meses'}`;
  if (mesesRestantes === 0) return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
  return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${mesesRestantes} ${mesesRestantes === 1 ? 'mês' : 'meses'}`;
}

// Lista fixa e padronizada de planos do cliente (enum) — usada em formulários,
// filtros, dashboards, relatórios e importações.
export const PLANOS_CLIENTE = ['Bronze', 'Prata', 'Ouro', 'Platina', 'ClickNotas', 'Outros'];

// Receita Mensal Equivalente — calculada dinamicamente a partir da modalidade
// e do valor da contratação do plano atual. NUNCA persistida no banco de dados.
// Mensal: Valor | Trimestral: ÷3 | Semestral: ÷6 | Anual: ÷12
export function calcularReceitaMensalEquivalente(tratativa) {
  const valor = parseFloat(tratativa?.valor_contratacao_plano_atual) || 0;
  if (!valor) return 0;
  switch (tratativa?.modalidade_plano) {
    case 'Mensal': return valor;
    case 'Trimestral': return valor / 3;
    case 'Semestral': return valor / 6;
    case 'Anual': return valor / 12;
    default: return 0;
  }
}

// Receita Anual Equivalente — calculada dinamicamente a partir da modalidade
// e do valor da contratação do plano atual. NUNCA persistida no banco de dados.
// Mensal: ×12 | Trimestral: (÷3)×12 | Semestral: (÷6)×12 | Anual: Valor
export function calcularReceitaAnualEquivalente(tratativa) {
  const valor = parseFloat(tratativa?.valor_contratacao_plano_atual) || 0;
  if (!valor) return 0;
  switch (tratativa?.modalidade_plano) {
    case 'Mensal': return valor * 12;
    case 'Trimestral': return (valor / 3) * 12;
    case 'Semestral': return (valor / 6) * 12;
    case 'Anual': return valor;
    default: return 0;
  }
}

// Constrói o bloco de contexto comercial do cliente para envio à IA.
// Usa apenas dados contratuais (modalidade + valor da contratação do plano atual)
// e os valores equivalentes calculados dinamicamente, preservando a fidelidade contratual.
export function construirContextoComercialIA(tratativa) {
  if (!tratativa) return '';
  const linhas = [];
  if (tratativa.plano_cliente) linhas.push(`Plano do Cliente: ${tratativa.plano_cliente}`);
  if (tratativa.modalidade_plano) linhas.push(`Modalidade: ${tratativa.modalidade_plano}`);
  if (tratativa.valor_contratacao_plano_atual) linhas.push(`Valor da Contratação do Plano Atual: ${formatBRL(tratativa.valor_contratacao_plano_atual)}`);
  if (tratativa.modalidade_plano && tratativa.valor_contratacao_plano_atual) {
    linhas.push(`Receita Mensal Equivalente: ${formatBRL(calcularReceitaMensalEquivalente(tratativa))}`);
    linhas.push(`Receita Anual Equivalente: ${formatBRL(calcularReceitaAnualEquivalente(tratativa))}`);
  }
  const tempoMeses = calcularTempoContratoMeses(tratativa.data_primeira_contratacao);
  if (tempoMeses !== null) linhas.push(`Tempo de Relacionamento: ${formatarTempoContrato(tempoMeses)}`);
  if (tratativa.data_contratacao_plano_atual) linhas.push(`Plano Atual Desde: ${new Date(tratativa.data_contratacao_plano_atual + 'T00:00:00').toLocaleDateString('pt-BR')}`);
  if (tratativa.segmento_cliente) linhas.push(`Segmento: ${tratativa.segmento_cliente}`);
  return linhas.join('\n');
}