import { todaySP } from '@/components/utils/helpers';

// Retorna { inicio, fim } no formato YYYY-MM-DD para o tipo de período selecionado.
export function calcularRangePeriodo(tipo, customInicio, customFim) {
  const hoje = todaySP();
  const hojeDate = new Date(`${hoje}T00:00:00`);

  if (tipo === 'd7') {
    const inicio = new Date(hojeDate);
    inicio.setDate(inicio.getDate() - 7);
    return { inicio: inicio.toISOString().split('T')[0], fim: hoje };
  }

  if (tipo === 'mes_atual') {
    const inicio = new Date(hojeDate.getFullYear(), hojeDate.getMonth(), 1);
    return { inicio: inicio.toISOString().split('T')[0], fim: hoje };
  }

  if (tipo === 'trimestre') {
    const quarter = Math.floor(hojeDate.getMonth() / 3);
    const inicio = new Date(hojeDate.getFullYear(), quarter * 3, 1);
    return { inicio: inicio.toISOString().split('T')[0], fim: hoje };
  }

  if (tipo === 'customizado') {
    return { inicio: customInicio || hoje, fim: customFim || hoje };
  }

  return { inicio: hoje, fim: hoje };
}

export function dataDentroDoRange(dataStr, inicio, fim) {
  if (!dataStr) return false;
  const d = new Date(dataStr).toISOString().split('T')[0];
  return d >= inicio && d <= fim;
}