/**
 * Bônus manual e ciclos — regras puras, sem banco nem React.
 *
 * O bônus é um lançamento do gestor na tabela pontuacao (migration 17):
 * tipo 'bonus_manual', ciclo_id, colaborador_id, total_pontos e descricao.
 * O ranking e o "Meu ciclo" somam TODOS os lançamentos da pessoa no ciclo.
 */

/** Estados em que a tratativa conta pontos (encerrada, ou encerrada e reaberta a pedido). */
export const STATUS_ENCERRADOS = ['encerrada', 'aguardando_confirmacao_reabertura'];

const numero = (v) => Number(String(v ?? '').replace(',', '.'));

/** Soma dos pontos de uma lista de lançamentos. */
export const somaDoBonus = (lancamentos = []) =>
  lancamentos.reduce((acc, b) => acc + (Number(b?.total_pontos) || 0), 0);

/**
 * O registro a gravar, a partir do formulário. Devolve { erro } quando algo
 * falta — o banco também recusa (constraint pontuacao_bonus_completo), mas a
 * mensagem daqui é a que a pessoa entende.
 */
export function montarBonus({ ciclo, pessoa, pontos, descricao, gestor }) {
  const valor = numero(pontos);
  if (!ciclo?.id) return { erro: 'Escolha o ciclo.' };
  if (!pessoa?.id) return { erro: 'Escolha a pessoa.' };
  if (!Number.isFinite(valor) || valor <= 0) return { erro: 'Os pontos precisam ser um número maior que zero.' };
  if (!String(descricao ?? '').trim()) return { erro: 'Escreva o motivo do bônus.' };
  return {
    registro: {
      tipo: 'bonus_manual',
      ciclo_id: ciclo.id,
      periodo_trimestre: ciclo.nome,
      colaborador_id: pessoa.id,
      colaborador_nome: pessoa.nome_completo ?? pessoa.nome ?? null,
      total_pontos: Math.round(valor * 100) / 100,
      descricao: String(descricao).trim(),
      lancado_por_id: gestor?.id ?? null,
      lancado_por_nome: gestor?.nome_completo ?? null,
    },
  };
}

/** Ciclos do mais recente para o mais antigo — a ordem do seletor de histórico. */
export const ciclosEmOrdem = (ciclos = []) =>
  [...ciclos].sort((a, b) => String(b.data_inicio ?? '').localeCompare(String(a.data_inicio ?? '')));
