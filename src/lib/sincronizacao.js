/** Depois de quantas horas sem sucesso a sincronização das férias roda sozinha. */
export const HORAS_ATE_ATUALIZAR = 6;

/** Uma execução "rodando" há mais que isto é considerada travada (a função libera sozinha em 5 min). */
const MINUTOS_RODANDO = 5;

/**
 * A sincronização automática deve rodar agora? Só quando o conector está
 * ligado, os dados têm mais de HORAS_ATE_ATUALIZAR horas (ou nunca foram
 * buscados) e não há uma execução em andamento.
 * Função pura: recebe a linha do conector e o instante de agora.
 */
export function precisaSincronizar(conector, agora = new Date()) {
  if (!conector?.ativo) return false;
  const rodando = conector.ultimo_resultado === 'rodando'
    && conector.ultima_execucao_em
    && agora.getTime() - new Date(conector.ultima_execucao_em).getTime() < MINUTOS_RODANDO * 60000;
  if (rodando) return false;
  if (!conector.ultimo_sucesso_em) return true;
  return agora.getTime() - new Date(conector.ultimo_sucesso_em).getTime() > HORAS_ATE_ATUALIZAR * 3600000;
}
