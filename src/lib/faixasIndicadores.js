/**
 * Faixas de pontos dos indicadores do ciclo (Estrutura de Trabalho CRC 2026,
 * "Regras da Premiação Trimestral", seção 4).
 *
 * UMA FONTE SÓ. As funções calculateCSATPoints, calculatePerformancePoints e
 * calculateCXPoints, em helpers.js, leem daqui — antes cada uma tinha os
 * limites escritos à mão, e a tela nova precisaria de uma terceira cópia para
 * dizer "a próxima faixa vale +1".
 *
 * Ordem: da faixa mais alta para a mais baixa.
 */
export const FAIXAS = {
  // CSAT mensal consolidado: 85–89% = 7, 90–94% = 9, >= 95% = 10.
  csat: [{ min: 95, pontos: 10 }, { min: 90, pontos: 9 }, { min: 85, pontos: 7 }],
  // Performance sobre a meta: >= 100% = 10, >= 95% = 7.
  performance: [{ min: 100, pontos: 10 }, { min: 95, pontos: 7 }],
  // Avaliação quinzenal (média): >= 4,5 = 10, 4,3–4,4 = 4, 4,2 = 1.
  cx: [{ min: 4.5, pontos: 10 }, { min: 4.3, pontos: 4 }, { min: 4.2, pontos: 1 }],
};

const valido = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

export function pontosDaFaixa(indicador, valor) {
  if (!valido(valor)) return 0;
  const faixa = FAIXAS[indicador]?.find((f) => Number(valor) >= f.min);
  return faixa ? faixa.pontos : 0;
}

/**
 * A próxima faixa acima do valor atual: o limiar e quantos pontos a mais ela
 * vale. `null` quando já está na faixa máxima (ou sem valor).
 */
export function proximaFaixa(indicador, valor) {
  if (!valido(valor)) return null;
  const atuais = pontosDaFaixa(indicador, valor);
  const acima = [...(FAIXAS[indicador] ?? [])].reverse().find((f) => f.pontos > atuais);
  return acima ? { limiar: acima.min, pontos: acima.pontos, ganho: acima.pontos - atuais } : null;
}
