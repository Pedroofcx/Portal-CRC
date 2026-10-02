/**
 * Campo de lista fechada, data ou número que chega do formulário como texto
 * vazio ('') não tem valor: tem ausência. O banco recusa '' nesses campos
 * (CHECK da lista, "invalid input syntax for type date"), e a recusa só
 * aparecia depois que a tela fosse usada de um certo jeito — o erro "só
 * funciona se atualizar a página" da tratativa veio disso.
 *
 * Aqui ficam os campos de cada entidade em que '' vira NULL antes de gravar.
 * Os de texto livre ficam de fora: '' neles é um valor possível.
 */
export const VAZIO_VIRA_NULO = {
  Tratativa: [
    'causa_primaria', 'tipo_tratativa', 'prioridade', 'status_reabertura',
    'situacao_comentario_google', 'categoria_contestacao', 'tipo_resolucao_contestacao',
    'status_resolucao_contestacao', 'status_final_contestacao', 'plano_cliente',
    'modalidade_plano', 'tipo_acionamento_lider', 'tipo_acionamento_n2',
    'data_primeira_contratacao', 'data_contratacao_plano_atual', 'valor_contratacao_plano_atual',
  ],
};

export function vazioViraNulo(entidade, dados) {
  const campos = VAZIO_VIRA_NULO[entidade];
  if (!campos) return dados;
  const saida = { ...dados };
  for (const campo of campos) {
    if (saida[campo] === '') saida[campo] = null;
  }
  return saida;
}
