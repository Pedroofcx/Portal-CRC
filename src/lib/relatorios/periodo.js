/**
 * Período dos relatórios. Datas do filtro são dias de calendário
 * ("2026-09-16"); as das tratativas são instantes. Comparar pelo DIA em
 * horário de Brasília evita o erro antigo em que "Data fim 16/09" cortava o
 * próprio dia 16 (new Date('2026-09-16') é meia-noite em UTC = 21h do dia 15).
 */
export const diaSP = (valor) => {
  if (!valor) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) return String(valor);
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
};

/** O instante cai no período? Sem início/fim, o lado fica aberto. */
export function noPeriodo(valor, { inicio, fim } = {}) {
  const dia = diaSP(valor);
  if (!dia) return false;
  return (!inicio || dia >= inicio) && (!fim || dia <= fim);
}

/** Data de referência da tratativa: o encerramento; aberta, o registro. */
export const dataDeReferencia = (t) => t.data_encerramento || t.data_registro || t.created_date;
