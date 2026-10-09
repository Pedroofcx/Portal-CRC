/**
 * Ordem da lista de tratativas. Funções puras, testadas em `npm run testar`.
 *
 * Regra do Pedro (09/10/2026): da mais recente para a menos recente, pela data
 * de CADASTRO NO PORTAL (created_date). Antes a ordem dependia da última busca:
 * uma tratativa nova que ainda não estava na lista em cache entrava depois, no
 * fim, junto das "abertas" buscadas à parte. Agora a lista é ordenada aqui,
 * sempre, depois de juntar tudo.
 *
 * Fixadas: cada pessoa pode fixar as tratativas que quiser; elas ficam no topo
 * da lista dela, na mesma ordem (mais recente primeiro) entre si.
 */

const tempo = (v) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
};

/** O número do TRT-0395, para desempatar. */
const numeroDoTrt = (t) => Number(String(t?.id_interno ?? '').match(/(\d+)/)?.[1] ?? 0);

/** Comparador: a mais recente (cadastrada no portal) primeiro. */
export function maisRecentePrimeiro(a, b) {
  return (tempo(b?.created_date ?? b?.criado_em) - tempo(a?.created_date ?? a?.criado_em))
    || (tempo(b?.data_registro) - tempo(a?.data_registro))
    || (numeroDoTrt(b) - numeroDoTrt(a));
}

/**
 * Ordena a lista: fixadas primeiro (pela mesma ordem), depois as demais, da mais
 * recente para a menos recente. Não altera a lista original.
 * @param fixadas Set (ou lista) com os ids das tratativas fixadas pela pessoa
 */
export function ordenarTratativas(tratativas = [], fixadas = new Set()) {
  const marcadas = fixadas instanceof Set ? fixadas : new Set(fixadas);
  const ordenadas = [...tratativas].sort(maisRecentePrimeiro);
  if (marcadas.size === 0) return ordenadas;
  return [...ordenadas.filter((t) => marcadas.has(t.id)), ...ordenadas.filter((t) => !marcadas.has(t.id))];
}
