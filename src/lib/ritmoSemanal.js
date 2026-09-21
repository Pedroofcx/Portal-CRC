/**
 * Pontos por semana, para o gráfico de ritmo da tela inicial do operador.
 *
 * Sem teto de pontos, "quanto falta" não existe; o que dá direção é o ritmo —
 * quanto entrou esta semana comparado às anteriores. Semana começa na
 * segunda-feira, no horário de quem está olhando.
 */
export function inicioDaSemana(data) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  const diaDaSemana = (d.getDay() + 6) % 7; // segunda = 0
  d.setDate(d.getDate() - diaDaSemana);
  return d;
}

/**
 * @param itens [{ pontos, data_encerramento }] — o detalhamento do hook de pontuação
 * @returns as `quantas` semanas mais recentes, da mais antiga para a atual
 */
export function pontosPorSemana(itens = [], agora = new Date(), quantas = 6) {
  const atual = inicioDaSemana(agora);
  const semanas = Array.from({ length: quantas }, (_, i) => {
    const inicio = new Date(atual);
    inicio.setDate(inicio.getDate() - 7 * (quantas - 1 - i));
    return { inicio, pontos: 0 };
  });

  for (const item of itens) {
    if (!item?.data_encerramento) continue;
    const semana = inicioDaSemana(item.data_encerramento).getTime();
    const alvo = semanas.find((s) => s.inicio.getTime() === semana);
    if (alvo) alvo.pontos += Number(item.pontos) || 0;
  }
  return semanas;
}

/**
 * Até quando o gráfico de ritmo vai: hoje, ou o último dia do ciclo se ele
 * já terminou. Sem isto, um ciclo encerrado mostrava as semanas DEPOIS do
 * fim — zeradas, e a última em destaque como se fosse "esta semana".
 */
export function fimDoRitmo(ciclo, agora = new Date()) {
  if (!ciclo?.data_fim) return agora;
  const fim = new Date(`${ciclo.data_fim}T23:59:59`);
  return fim < agora ? fim : agora;
}
