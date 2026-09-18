/**
 * Prazo do SLA de uma tratativa: data_registro + sla_atribuido (horas), em
 * tempo corrido — a mesma régua do servidor (migration 09,
 * documentacao/decisoes-de-regra.md). Usado pela fila do operador e pelo
 * resumo do dia das boas-vindas, para os dois nunca discordarem.
 */
const HORA = 3600 * 1000;

/** Prazo em Date, ou null quando a tratativa não tem registro ou SLA. */
export function prazoDaTratativa(t) {
  const inicio = t?.data_registro ? new Date(t.data_registro) : null;
  const horas = Number(t?.sla_atribuido);
  if (!inicio || Number.isNaN(inicio.getTime()) || !(horas > 0)) return null;
  return new Date(inicio.getTime() + horas * HORA);
}

/** Fração do prazo já consumida (0 a 1+), para a barra. */
export function consumoDoPrazo(t, agora = new Date()) {
  const prazo = prazoDaTratativa(t);
  if (!prazo) return null;
  const inicio = new Date(t.data_registro).getTime();
  const total = prazo.getTime() - inicio;
  return total > 0 ? (agora.getTime() - inicio) / total : null;
}

/**
 * Tempo até o prazo, em palavras curtas: "vencido há 2h", "45 min", "6h",
 * "1 dia", "3 dias". Arredonda para baixo o que falta — dizer "1 dia" quando
 * faltam 23h faria alguém relaxar à toa.
 */
export function descreverPrazo(prazo, agora = new Date()) {
  if (!prazo) return 'sem prazo';
  const ms = prazo.getTime() - agora.getTime();
  const abs = Math.abs(ms);
  const horas = Math.floor(abs / HORA);
  const dias = Math.floor(abs / (24 * HORA));

  let texto;
  if (abs < HORA) texto = `${Math.max(1, Math.floor(abs / 60000))} min`;
  else if (horas < 24) texto = `${horas}h`;
  else texto = dias === 1 ? '1 dia' : `${dias} dias`;

  return ms < 0 ? `vencido há ${texto}` : texto;
}
