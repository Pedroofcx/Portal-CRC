export const DEFAULT_CONFIG = {
  iss: 2.50, pis: 0.65, cofins: 3.00,
  irpj: 4.80, csll: 2.88,
  comissao_vendedor: 4.00, multa_contratual: 10.00,
};

export const IMPOSTOS_KEYS = ['iss', 'pis', 'cofins', 'irpj', 'csll'];

export const IMPOSTO_LABELS = {
  iss: 'ISS', pis: 'PIS', cofins: 'COFINS',
  irpj: 'IRPJ', csll: 'CSLL',
  comissao_vendedor: 'Comissão Vendedor',
  multa_contratual: 'Multa Contratual',
};

export const TIPO_ESTORNO_OPTIONS = [
  { value: 'contestacao_compra', label: 'Contestação de Compra' },
  { value: 'reclamacao_interna', label: 'Reclamação Interna' },
  { value: 'cancelamento', label: 'Cancelamento' },
  { value: 'devolucao_proporcional', label: 'Devolução Proporcional' },
  { value: 'ajuste_financeiro', label: 'Ajuste Financeiro Operacional' },
  { value: 'reclame_aqui', label: 'Reclame Aqui' },
  { value: 'procon', label: 'PROCON' },
  { value: 'outros', label: 'Outros' },
];

// Classificações de plano para identificação operacional
export const CLASSIFICACAO_PLANO_OPTIONS = [
  { value: 'bronze', label: 'Bronze' },
  { value: 'prata', label: 'Prata' },
  { value: 'ouro', label: 'Ouro' },
  { value: 'platina', label: 'Platina' },
  { value: 'outros', label: 'Outros' },
];

// Tipos de plano com seus totais de contrato
export const TIPOS_PLANO = [
  { value: 'mensal',     label: 'Mensal',     meses: 1,  dias: 30  },
  { value: 'trimestral', label: 'Trimestral', meses: 3,  dias: 90  },
  { value: 'semestral',  label: 'Semestral',  meses: 6,  dias: 180 },
  { value: 'anual',      label: 'Anual',      meses: 12, dias: 365 },
];

export function getDiasContrato(tipoPlano) {
  const plano = TIPOS_PLANO.find(p => p.value === tipoPlano);
  return plano ? plano.dias : 365;
}

export function getMesesContrato(tipoPlano) {
  const plano = TIPOS_PLANO.find(p => p.value === tipoPlano);
  return plano ? plano.meses : 12;
}

/**
 * Formata string de valor monetário BR para número
 */
export function parseBRL(str) {
  if (!str) return 0;
  const clean = str.toString().replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
}

/**
 * Formata número para moeda BRL com símbolo
 */
export function fmtBRL(v) {
  const num = parseFloat(v) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Formata número digitado para máscara BRL (sem símbolo)
 */
export function formatarInputBRL(valor) {
  const apenasDigitos = String(valor).replace(/\D/g, '');
  if (!apenasDigitos) return '';
  const numero = parseInt(apenasDigitos, 10) / 100;
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * CÁLCULO PROPORCIONAL — BASE MENSAL (metodologia operacional)
 *
 * Regra:
 *   valorMensal = valorNota ÷ mesesContrato
 *   valorDiario = valorMensal ÷ 30
 *   custo = (mesesUsados × valorMensal) + (diasAdicionais × valorDiario)
 *
 * Exemplo validado (plano anual, 1 mês):
 *   1.538,33 ÷ 12 = R$ 128,19/mês → custo = R$ 128,19
 *
 * @param {number} valorNota
 * @param {number} mesesUsados    - meses completos utilizados
 * @param {number} diasAdicionais - dias além dos meses completos
 * @param {string} tipoPlano
 */
export function calcularUsoProporcional(valorNota, mesesUsados, diasAdicionais, tipoPlano) {
  const v = parseFloat(valorNota) || 0;
  const mUsados = parseInt(mesesUsados) || 0;
  const dAdicionais = parseInt(diasAdicionais) || 0;
  const mContrato = getMesesContrato(tipoPlano);
  const dContrato = getDiasContrato(tipoPlano);

  if (v <= 0) return {
    valor: 0, valorMensal: 0, valorDiario: 0,
    valorMeses: 0, valorDias: 0,
    diasTotaisUsados: dAdicionais, diasContrato: dContrato,
    mesesUsados: mUsados, mesesContrato: mContrato,
    diasAdicionais: dAdicionais,
    excedeuContrato: false, tipoPlano,
  };

  // Base mensal: NF ÷ meses do contrato
  // IMPORTANTE: arredondamos para 2 casas decimais IMEDIATAMENTE,
  // garantindo que o valor exibido na tela == valor usado nos cálculos.
  const valorMensalRaw = mContrato > 0 ? v / mContrato : 0;
  const valorMensal = Math.round(valorMensalRaw * 100) / 100;

  // Base diária: valorMensal ÷ 30 (para dias extras)
  const valorDiarioRaw = valorMensal / 30;
  const valorDiario = Math.round(valorDiarioRaw * 100) / 100;

  const valorMeses = Math.round(mUsados * valorMensal * 100) / 100;
  const valorDias = Math.round(dAdicionais * valorDiario * 100) / 100;
  const valorTotal = Math.min(Math.round((valorMeses + valorDias) * 100) / 100, v);

  const diasTotaisUsados = mUsados * 30 + dAdicionais;

  return {
    valor: valorTotal,
    valorMensal,
    valorDiario,
    valorMeses,
    valorDias,
    diasTotaisUsados,
    diasContrato: dContrato,
    mesesUsados: mUsados,
    mesesContrato: mContrato,
    diasAdicionais: dAdicionais,
    excedeuContrato: diasTotaisUsados > dContrato,
    tipoPlano,
  };
}

/**
 * Calcula o estorno parcial completo.
 * Usa ÚNICA base proporcional em dias.
 */
export function calcularEstorno(valorNota, cfg, mesesUsados, diasAdicionais, tipoPlano, aplicarMulta = true) {
  try {
    const v = parseBRL(valorNota);
    if (!v || v <= 0) return null;

    const iss    = v * (cfg.iss    ?? 0) / 100;
    const pis    = v * (cfg.pis    ?? 0) / 100;
    const cofins = v * (cfg.cofins ?? 0) / 100;
    const irpj   = v * (cfg.irpj   ?? 0) / 100;
    const csll   = v * (cfg.csll   ?? 0) / 100;

    const total_impostos_valor = iss + pis + cofins + irpj + csll;
    const total_impostos_pct   = (cfg.iss ?? 0) + (cfg.pis ?? 0) + (cfg.cofins ?? 0) + (cfg.irpj ?? 0) + (cfg.csll ?? 0);
    const comissao_valor       = v * (cfg.comissao_vendedor ?? 0) / 100;

    // Cálculo proporcional — base única em dias
    const usoProporcional = calcularUsoProporcional(v, mesesUsados, diasAdicionais, tipoPlano);
    const uso_proporcional_valor = usoProporcional.valor;

    // Custo total = impostos + comissão + uso proporcional
    const total_descontos_valor = total_impostos_valor + comissao_valor + uso_proporcional_valor;

    // Valor devolução sem multa
    const valor_sem_multa = Math.max(v - total_descontos_valor, 0);

    // Multa (sempre calculada para referência)
    const multa_pct = cfg.multa_contratual ?? 0;
    const valor_multa_calculado = valor_sem_multa * multa_pct / 100;
    const valor_multa = aplicarMulta ? valor_multa_calculado : 0;

    // Valores finais
    const valor_final_devolucao = Math.max(valor_sem_multa - valor_multa, 0);
    const valor_final_sem_multa = valor_sem_multa;

    return {
      total_impostos_pct,
      total_impostos_valor,
      comissao_valor,
      uso_proporcional_valor,
      uso_proporcional_detalhe: usoProporcional,
      total_descontos_valor,
      valor_sem_multa,
      valor_multa,
      valor_multa_calculado,
      valor_final_devolucao,
      valor_final_sem_multa,
      aplicar_multa: aplicarMulta,
      detalhes_impostos: { iss, pis, cofins, irpj, csll },
      valor_nota: v,
    };
  } catch {
    return null;
  }
}