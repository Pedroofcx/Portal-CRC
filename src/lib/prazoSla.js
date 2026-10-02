/**
 * Prazo do SLA de uma tratativa, na mesma régua do servidor (migration 38,
 * decisão de Pedro em 02/10/2026): o relógio começa no INÍCIO da tratativa e
 * PARA enquanto ela está em dependência externa ou aguardando o financeiro.
 *
 *   prazo = início + sla_atribuido (horas) + tempo já passado em pausa
 *
 * Quem nunca foi iniciada ainda não tem início: conta do registro, para a fila
 * continuar acusando o que está parado sem ninguém pegar. Usado pela fila do
 * operador, pelo resumo do dia das boas-vindas e pelos relatórios, para todos
 * nunca discordarem.
 */
const HORA = 3600 * 1000;
const MINUTO = 60 * 1000;
const ESTADOS_EM_PAUSA = new Set(['dependencia_externa', 'aguardando_financeiro']);

const tempo = (v) => (v ? new Date(v).getTime() : NaN);

/**
 * Milissegundos em pausa entre `inicio` e `fim`. Espelha minutos_pausados()
 * do banco: o histórico é uma linha do tempo de ESTADOS, e nota livre
 * (estado_anterior igual ao novo) não interrompe a pausa.
 */
export function tempoEmPausa(historico, inicio, fim) {
  if (!Array.isArray(historico) || !(inicio < fim)) return 0;

  const mudancas = historico
    .filter((e) => e && e.estado_novo && e.estado_novo !== e.estado_anterior && !Number.isNaN(tempo(e.data_mudanca)))
    .sort((a, b) => tempo(a.data_mudanca) - tempo(b.data_mudanca));

  let total = 0;
  mudancas.forEach((e, i) => {
    if (!ESTADOS_EM_PAUSA.has(e.estado_novo)) return;
    const de = Math.max(tempo(e.data_mudanca), inicio);
    const ate = Math.min(i + 1 < mudancas.length ? tempo(mudancas[i + 1].data_mudanca) : fim, fim);
    if (ate > de) total += ate - de;
  });
  return total;
}

/** Instante em que o relógio do SLA começou, em ms; NaN se não há registro. */
export function inicioDoRelogio(t) {
  const iniciada = tempo(t?.data_inicio_tratativa);
  return Number.isNaN(iniciada) ? tempo(t?.data_registro) : iniciada;
}

/** Prazo em Date, ou null quando a tratativa não tem registro ou SLA. */
export function prazoDaTratativa(t, agora = new Date()) {
  const inicio = inicioDoRelogio(t);
  const horas = Number(t?.sla_atribuido);
  if (Number.isNaN(inicio) || !(horas > 0)) return null;
  const pausa = tempoEmPausa(t.historico_estados, inicio, agora.getTime());
  return new Date(inicio + horas * HORA + pausa);
}

/** Fração do prazo já consumida (0 a 1+), para a barra. */
export function consumoDoPrazo(t, agora = new Date()) {
  const inicio = inicioDoRelogio(t);
  const horas = Number(t?.sla_atribuido);
  if (Number.isNaN(inicio) || !(horas > 0)) return null;
  const pausa = tempoEmPausa(t.historico_estados, inicio, agora.getTime());
  return (agora.getTime() - inicio - pausa) / (horas * HORA);
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
  if (abs < HORA) texto = `${Math.max(1, Math.floor(abs / MINUTO))} min`;
  else if (horas < 24) texto = `${horas}h`;
  else texto = dias === 1 ? '1 dia' : `${dias} dias`;

  return ms < 0 ? `vencido há ${texto}` : texto;
}
