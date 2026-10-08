/**
 * Reclamação interna encerrada automaticamente depois dos 7 dias (migration 55).
 *
 * A função do banco move a tratativa de "aguardando confirmação de reabertura"
 * para "encerrada" e deixa no histórico uma entrada de "Sistema" marcada com
 * `automatica: true`. É por essa marca que a tela inicial e a tratativa sabem
 * que o encerramento foi automático e quando. Funções puras, testadas em
 * `npm run testar`.
 */

/** Por quantos dias o aviso fica na tela inicial. */
export const DIAS_DO_AVISO = 7;

/** A entrada do histórico que encerrou a tratativa sozinha, ou null. */
export function encerramentoAutomaticoDe(tratativa) {
  const historico = Array.isArray(tratativa?.historico_estados) ? tratativa.historico_estados : [];
  return [...historico].reverse().find((h) => h?.automatica === true && h.estado_novo === 'encerrada') ?? null;
}

/**
 * As tratativas encerradas sozinhas nos últimos `dias` dias, da mais recente
 * para a mais antiga. Quem chama passa só o que a pessoa pode ver (o gestor,
 * todas; o agente, as dele).
 */
export function encerradasAutomaticamente(tratativas = [], { agora = new Date(), dias = DIAS_DO_AVISO } = {}) {
  const limite = agora.getTime() - dias * 86400000;
  return tratativas
    .filter((t) => t && !t.excluida && t.status === 'encerrada')
    .map((t) => ({ tratativa: t, evento: encerramentoAutomaticoDe(t) }))
    .filter(({ evento }) => evento && new Date(evento.data_mudanca).getTime() >= limite)
    .sort((a, b) => new Date(b.evento.data_mudanca) - new Date(a.evento.data_mudanca))
    .map(({ tratativa, evento }) => ({ ...tratativa, encerrada_automaticamente_em: evento.data_mudanca, cliente_reabriu: tratativa.status_reabertura === 'cliente_reabriu' }));
}

/** A frase do aviso: "3 tickets que aguardavam confirmação foram encerrados…". */
export function textoDoAviso(n) {
  if (n === 1) return '1 ticket que aguardava confirmação foi encerrado automaticamente (prazo de 7 dias).';
  return `${n} tickets que aguardavam confirmação foram encerrados automaticamente (prazo de 7 dias).`;
}
