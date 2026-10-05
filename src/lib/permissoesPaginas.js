/**
 * Qual permissão libera cada página. Usado pelo menu lateral (o item some para
 * quem não tem) e documenta o que cada chave do catálogo (tabela `permissao`)
 * controla na tela. A trava de verdade está no banco (migration 41).
 *
 * Página que não aparece aqui continua pelo papel (gestor/agente): são as de
 * "visão gerencial" (Dashboard, Hansei, Relatórios, Jornada do Cliente...), em
 * que gestor e agente enxergam telas diferentes, e não uma capacidade isolada.
 */
export const PERMISSAO_DA_PAGINA = {
  Cadastro: 'gerenciar_colaboradores',
  Observacoes: 'ver_observacoes_equipe',
  Oraculo: 'acessar_oraculo',
  Apuracao: 'gerenciar_apuracao',
  RelatoriosApuracao: 'gerenciar_apuracao',
  Pesquisas: 'gerenciar_pesquisas',
  SolucoesReplicaveis: 'aprovar_solucao_replicavel',
  AuditoriaPontuacao: 'gerenciar_premiacao',
};

/** A página de Plano Setorial reúne o plano em si e os PDIs. */
export const PERMISSOES_DO_PLANO_SETORIAL = ['gerenciar_operacao', 'ver_pdi_equipe'];

/** O hub de Configurações abre para quem administra qualquer uma das áreas dele. */
export const PERMISSOES_DE_CONFIGURACAO = [
  'gerenciar_tipos_tratativa',
  'gerenciar_configuracoes',
  'gerenciar_premiacao',
  'gerenciar_permissoes',
  'gerenciar_apuracao',
  'gerenciar_integracoes',
];
