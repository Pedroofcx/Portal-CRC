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
