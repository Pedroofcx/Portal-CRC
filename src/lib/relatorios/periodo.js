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

/** Atalhos de período. O ciclo é só mais uma opção, nunca a obrigatória. */
export const ATALHOS = [
  { chave: 'ultimos7', rotulo: 'Últimos 7 dias' },
  { chave: 'ultimos30', rotulo: 'Últimos 30 dias' },
  { chave: 'ultimos90', rotulo: 'Últimos 90 dias' },
  { chave: 'este_mes', rotulo: 'Este mês' },
  { chave: 'mes_anterior', rotulo: 'Mês anterior' },
  { chave: 'este_ano', rotulo: 'Este ano' },
  { chave: 'tudo', rotulo: 'Tudo' },
];

const dia = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const mover = (base, dias) => new Date(base.getTime() + dias * 86400000);

/** { inicio, fim } de um atalho; 'tudo' devolve os dois vazios. */
export function intervaloDoAtalho(chave, agora = new Date()) {
  const hoje = dia(agora);
  const [ano, mes] = hoje.split('-').map(Number);
  const ultimoDia = (a, m) => String(new Date(a, m, 0).getDate()).padStart(2, '0');
  switch (chave) {
    case 'ultimos7': return { inicio: dia(mover(agora, -6)), fim: hoje };
    case 'ultimos30': return { inicio: dia(mover(agora, -29)), fim: hoje };
    case 'ultimos90': return { inicio: dia(mover(agora, -89)), fim: hoje };
    case 'este_mes': return { inicio: `${hoje.slice(0, 7)}-01`, fim: hoje };
    case 'mes_anterior': {
      const m = mes === 1 ? 12 : mes - 1;
      const a = mes === 1 ? ano - 1 : ano;
      const mm = String(m).padStart(2, '0');
      return { inicio: `${a}-${mm}-01`, fim: `${a}-${mm}-${ultimoDia(a, m)}` };
    }
    case 'este_ano': return { inicio: `${ano}-01-01`, fim: hoje };
    case 'tudo': return { inicio: '', fim: '' };
    default: return null;
  }
}
