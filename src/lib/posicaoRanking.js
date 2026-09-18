/**
 * Posição de uma pessoa no ranking e a distância para a posição de cima.
 * Empate conta como a mesma posição: quem tem os mesmos pontos do 2º também
 * é 2º, e "a 0 pts do 1º" seria uma frase estranha.
 */
export function posicaoNoRanking(ranking, colaboradorId) {
  const eu = ranking.find((r) => r.id === colaboradorId);
  if (!eu) return null;
  const posicao = ranking.filter((r) => r.totalPontos > eu.totalPontos).length + 1;
  const acima = ranking
    .filter((r) => r.totalPontos > eu.totalPontos)
    .sort((a, b) => a.totalPontos - b.totalPontos)[0];
  // A posição de quem está logo acima segue a mesma regra de empate: com
  // dois empatados em 2º, quem vem depois está atrás do 2º, e não de um 3º
  // que não existe.
  const posicaoAcima = acima
    ? ranking.filter((r) => r.totalPontos > acima.totalPontos).length + 1
    : null;
  return {
    posicao,
    total: ranking.length,
    distancia: acima ? acima.totalPontos - eu.totalPontos : 0,
    posicaoAcima,
  };
}
