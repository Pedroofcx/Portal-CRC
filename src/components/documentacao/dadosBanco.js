/**
 * Documentação técnica — Banco de dados (Supabase / Postgres).
 *
 * Conferido por ferramentas/conferir-documentacao.mjs: toda tabela de
 * src/api/tabelas.js, toda função e todo gatilho das migrations precisam
 * aparecer aqui, e nada pode ser descrito se não existir.
 *
 * Vocabulário de acesso:
 *   "colaborador ativo"  = eh_colaborador(): tem linha em colaborador com ativo = true;
 *   "permissão X"        = tem_permissao('X'): padrão do papel (gestor sim, agente não)
 *                          com a exceção cadastrada em colaborador_permissao;
 *   "gestor"             = eh_gestor(): papel gestor de verdade, sem exceção;
 *   "dono"               = a linha é da própria pessoa (meu_colaborador_id()).
 */

const COLAB = 'colaborador ativo';

export const gruposDeTabelas = [
  {
    id: 'pessoas-acesso',
    nome: 'Pessoas e acesso',
    tabelas: [
      { entidade: 'Colaborador', tabela: 'colaborador', descricao: 'Cadastro de quem usa o sistema. É uma VIEW sobre colaborador_base: salario e promocoes saem nulos para quem não tem a permissão ver_salario (migrations 05 e 36). O vínculo com a conta de login é pelo e-mail (único, migration 06).', leitura: COLAB, escrita: 'permissão gerenciar_colaboradores; papel, e-mail, vínculo de conta e Facilitador Interno só o gestor altera (gatilho ac_protege_papel_colaborador, migration 41)' },
      { entidade: 'Equipe', tabela: 'equipe', descricao: 'Agrupamento de colaboradores. Usada só no cadastro (equipe_id no colaborador).', leitura: COLAB, escrita: 'permissão gerenciar_colaboradores' },
      { entidade: 'Permissao', tabela: 'permissao', descricao: 'Catálogo fixo das permissões que existem (chave, módulo, rótulo). Semeado pelas migrations 35 e 41; não se edita pela tela.', leitura: COLAB, escrita: 'ninguém pela API (só migration)' },
      { entidade: 'ColaboradorPermissao', tabela: 'colaborador_permissao', descricao: 'Só as EXCEÇÕES: uma linha por pessoa e permissão, com concedida true (um agente recebe) ou false (um gestor perde). Sem linha vale o padrão do papel. Editada em Configurações > Permissões.', leitura: 'gestor, ou dono (cada um lê as próprias)', escrita: 'gestor (de propósito, sem depender de permissão: quem perdesse gerenciar_permissoes nunca mais poderia devolvê-la)' },
      { entidade: 'PermissaoModulo', tabela: 'permissao_modulo', descricao: 'LEGADO. Interruptor antigo de visibilidade de item do menu por perfil, com lista de exceções. Só o Layout ainda lê; vale apenas para itens do menu que não têm permissão própria (src/lib/permissoesPaginas.js).', leitura: COLAB, escrita: 'permissão gerenciar_permissoes' },
    ],
  },
  {
    id: 'tratativas',
    nome: 'Tratativas e operação',
    tabelas: [
      { entidade: 'Tratativa', tabela: 'tratativa', descricao: 'A ocorrência de relacionamento com o cliente. É uma VIEW sobre tratativa_base, que mascara custo_operacional_reais (permissão ver_custo_operacional). Carrega o histórico de estados, SLA, devolução financeira, dados comerciais do cliente e os campos que geram pontos.', leitura: COLAB, escrita: 'colaborador ativo, com 4 camadas de proteção por gatilho: máquina de estados, campos calculados, campos de pontuação congelados no encerramento e auditoria de replicável (ver Gatilhos)' },
      { entidade: 'TipoTratativa', tabela: 'tipo_tratativa', descricao: 'Vocabulário dos tipos de tratativa (chave, nome, SLA). A regra de pontuação por tipo está no código, não aqui.', leitura: COLAB, escrita: 'permissão gerenciar_tipos_tratativa' },
      { entidade: 'CategoriaTratativa', tabela: 'categoria_tratativa', descricao: 'Categorias de tratativa (vocabulário).', leitura: COLAB, escrita: 'permissão gerenciar_tipos_tratativa' },
      { entidade: 'MotivoTratativa', tabela: 'motivo_tratativa', descricao: 'Motivo principal e submotivos, com o esforço de correção de TI estimado. Escolhidos no registro e confirmados no encerramento.', leitura: COLAB, escrita: 'permissão gerenciar_tipos_tratativa' },
      { entidade: 'EtapaJornada', tabela: 'etapa_jornada', descricao: 'Etapas da jornada do cliente (onde a dor aconteceu). Obrigatória no encerramento.', leitura: COLAB, escrita: 'permissão gerenciar_configuracoes' },
      { entidade: 'DistribuicaoTratativa', tabela: 'distribuicao_tratativa', descricao: 'Registro de cada atribuição de ticket a um agente (rodízio assistido), com a sugestão do sistema, override justificado, turno e confirmação do agente (migration 32).', leitura: COLAB, escrita: 'permissão gerenciar_operacao; o agente só confirma a própria atribuição, pela função confirmar_atribuicao()' },
      { entidade: 'LiderTecnico', tabela: 'lider_tecnico', descricao: 'Fila de líderes técnicos (ordem, status ativo/férias/bloqueado) do rodízio de acionamento.', leitura: COLAB, escrita: 'permissão gerenciar_operacao' },
      { entidade: 'AcionamentoLiderTecnico', tabela: 'acionamento_lider_tecnico', descricao: 'Cada acionamento de líder técnico numa tratativa (por rodízio ou por supervisor).', leitura: COLAB, escrita: COLAB + ' (é o próprio agente que aciona)' },
      { entidade: 'AgenteN2', tabela: 'agente_n2', descricao: 'Fila de agentes de apoio N2 do rodízio.', leitura: COLAB, escrita: 'permissão gerenciar_operacao' },
      { entidade: 'AcionamentoN2', tabela: 'acionamento_n2', descricao: 'Cada acionamento de apoio N2 numa tratativa.', leitura: COLAB, escrita: COLAB + ' (é o próprio agente que aciona)' },
      { entidade: 'SolicitacaoApoio', tabela: 'solicitacao_apoio', descricao: 'Apoio Especializado: pedidos de treinamento, consultoria ou implantação que consomem um saldo mensal de minutos.', leitura: COLAB, escrita: COLAB },
      { entidade: 'EstornoParcial', tabela: 'estorno_parcial', descricao: 'Cálculos de estorno parcial feitos na calculadora, com o memorial e a cópia dos percentuais usados.', leitura: COLAB, escrita: COLAB },
      { entidade: 'ConfigEstorno', tabela: 'config_estorno', descricao: 'Percentuais vigentes de impostos, comissão e multa da calculadora de estorno.', leitura: COLAB, escrita: 'permissão gerenciar_configuracoes' },
    ],
  },
  {
    id: 'pontuacao',
    nome: 'Pontuação, premiação e apuração',
    tabelas: [
      { entidade: 'CicloTrimestral', tabela: 'ciclo_trimestral', descricao: 'Os ciclos de premiação (nome, início, fim, mês de pagamento, ativo). Um por vez ativo. O dia 16 é fim de um ciclo e início do seguinte.', leitura: COLAB, escrita: 'permissão gerenciar_premiacao' },
      { entidade: 'ElegibilidadePremio', tabela: 'elegibilidade_premio', descricao: 'As exigências para concorrer à premiação (CSAT mínimo, performance, volume por canal...), com tipo de validação, valor mínimo e se é obrigatória.', leitura: COLAB, escrita: 'permissão gerenciar_premiacao' },
      { entidade: 'Pontuacao', tabela: 'pontuacao', descricao: 'Hoje guarda só o BÔNUS MANUAL do gestor (tipo bonus_manual, ciclo_id, colaborador_id, total_pontos, descricao; migration 17). Os pontos das tratativas NÃO são gravados: são calculados ao vivo.', leitura: COLAB, escrita: 'permissão gerenciar_premiacao' },
      { entidade: 'Apuracao', tabela: 'apuracao', descricao: 'Os números de telefone (55PBX), chat (Zendesk) e CX por pessoa, dia a dia, com a origem do arquivo e o lote de importação (migration 24).', leitura: COLAB, escrita: 'permissão gerenciar_apuracao' },
      { entidade: 'ApuracaoMapeamento', tabela: 'apuracao_mapeamento', descricao: 'O de-para que o sistema lembra entre importações: coluna do arquivo → campo, e nome do arquivo → pessoa.', leitura: 'permissão gerenciar_apuracao', escrita: 'permissão gerenciar_apuracao' },
    ],
  },
  {
    id: 'desenvolvimento',
    nome: 'Desenvolvimento de pessoas',
    tabelas: [
      { entidade: 'Observacao', tabela: 'observacao', descricao: 'Feedbacks e leituras de pessoas (tipo leitura, com doze competências de 1 a 5). Pode citar várias pessoas (colaboradores_ids).', leitura: 'permissão ver_observacoes_equipe, ou a pessoa citada quando a visibilidade é agente/ambos (migration 16)', escrita: 'permissão ver_observacoes_equipe' },
      { entidade: 'TipoObservacao', tabela: 'tipo_observacao', descricao: 'Vocabulário dos tipos de observação.', leitura: COLAB, escrita: 'permissão gerenciar_configuracoes' },
      { entidade: 'SkillMestre', tabela: 'skill_mestre', descricao: 'Lista de soft e hard skills disponíveis para avaliar.', leitura: COLAB, escrita: 'permissão gerenciar_configuracoes' },
      { entidade: 'OraculoPalavra', tabela: 'oraculo_palavra', descricao: 'Dicionário de palavras-chave das leituras de pessoas (ativa, em validação).', leitura: 'permissão acessar_oraculo', escrita: 'permissão acessar_oraculo' },
      { entidade: 'OraculoLancamento', tabela: 'oraculo_lancamento', descricao: 'LEGADO do Base44: os 31 lançamentos viraram observações do tipo leitura na migration 22. A tabela não recebe mais escrita.', leitura: 'permissão acessar_oraculo', escrita: 'permissão acessar_oraculo (sem uso)' },
      { entidade: 'PDI', tabela: 'pdi', descricao: 'Plano de Desenvolvimento Individual: etapas, prazos e percentual de conclusão.', leitura: 'permissão ver_pdi_equipe, ou o dono (migration 28: o PDI é individual)', escrita: 'permissão ver_pdi_equipe' },
      { entidade: 'PlanoSetorial', tabela: 'plano_setorial', descricao: 'Planejamento estratégico do setor (objetivos, ações, indicadores). Digitação manual, sem leitura de outros módulos.', leitura: COLAB, escrita: 'permissão gerenciar_operacao' },
      { entidade: 'HanseiEnvio', tabela: 'hansei_envio', descricao: 'Cada Hansei enviado: a foto dos números do período (calculada pelo sistema) e o comentário do gestor.', leitura: COLAB, escrita: COLAB + ' (a tela só deixa o gestor enviar; ver Pontos de atenção)' },
      { entidade: 'HanseiComentario', tabela: 'hansei_comentario', descricao: 'A reação da pessoa ao Hansei recebido (comentário e sentimento).', leitura: COLAB, escrita: COLAB },
    ],
  },
  {
    id: 'escalas-ferias',
    nome: 'Escalas e férias',
    tabelas: [
      { entidade: 'EscalaAtribuicao', tabela: 'escala_atribuicao', descricao: 'Escala de Trabalho: um registro por pessoa e dia (presencial, home office, folga, férias...).', leitura: COLAB, escrita: 'permissão gerenciar_escalas' },
      { entidade: 'EscalaTurno', tabela: 'escala_turno', descricao: 'Escala de Turno: quem atende e quem analisa tickets em cada metade do dia.', leitura: COLAB, escrita: 'permissão gerenciar_escalas' },
      { entidade: 'Escala', tabela: 'escala', descricao: 'LEGADO. Tabela de escalas do Base44, sem uso no código atual.', leitura: COLAB, escrita: 'permissão gerenciar_escalas' },
      { entidade: 'ConfiguracaoHomeOffice', tabela: 'configuracao_home_office', descricao: 'LEGADO. Regras do antigo módulo de escolha de Home Office, removido; dados mantidos.', leitura: COLAB, escrita: 'permissão gerenciar_configuracoes' },
      { entidade: 'SolicitacaoHomeOffice', tabela: 'solicitacao_home_office', descricao: 'LEGADO. Pedidos do antigo módulo de Home Office, removido; dados mantidos.', leitura: COLAB, escrita: COLAB },
      { entidade: 'CicloFerias', tabela: 'ciclo_ferias', descricao: 'O saldo de férias: um por período aquisitivo, com dias de direito, abono, dias usados, vencimento e os fragmentos já aprovados.', leitura: COLAB, escrita: 'permissão aprovar_ferias' },
      { entidade: 'SaldoFerias', tabela: 'saldo_ferias', descricao: 'LEGADO. Saldo antigo, substituído por CicloFerias. Sem uso no código atual.', leitura: COLAB, escrita: 'permissão aprovar_ferias' },
      { entidade: 'SolicitacaoFerias', tabela: 'solicitacao_ferias', descricao: 'O pedido de férias do agente e a resposta da gestão (em análise, aprovada, recusada, sugestão de nova data, cancelada).', leitura: COLAB, escrita: COLAB + ' (o agente pede; a aprovação baixa o saldo em CicloFerias, que exige aprovar_ferias)' },
    ],
  },
  {
    id: 'comunicacao',
    nome: 'Comunicação e conhecimento',
    tabelas: [
      { entidade: 'Aviso', tabela: 'aviso', descricao: 'Comunicados do mural, com destinatários, prioridade, publicação e expiração.', leitura: COLAB, escrita: 'permissão gerenciar_avisos' },
      { entidade: 'AvisoLeitura', tabela: 'aviso_leitura', descricao: 'A confirmação "li e compreendi" de cada pessoa em cada aviso.', leitura: COLAB, escrita: COLAB },
      { entidade: 'Pesquisa', tabela: 'pesquisa', descricao: 'Pesquisas internas (perguntas, período, anonimato, reenvio).', leitura: COLAB, escrita: 'permissão gerenciar_pesquisas' },
      { entidade: 'RespostaPesquisa', tabela: 'resposta_pesquisa', descricao: 'O que foi respondido. Em pesquisa anônima nasce sem colaborador_id e sem nome.', leitura: 'permissão ver_respostas_pesquisa, ou o dono', escrita: 'qualquer colaborador ativo insere; alterar e apagar exigem ver_respostas_pesquisa' },
      { entidade: 'PesquisaParticipacao', tabela: 'pesquisa_participacao', descricao: 'QUEM respondeu (sem as respostas): tira a pesquisa da fila de pendências e alimenta "quem respondeu / quem falta" (migration 23).', leitura: 'permissão ver_respostas_pesquisa, ou o dono', escrita: 'cada pessoa insere a própria; apagar exige ver_respostas_pesquisa' },
      { entidade: 'POP', tabela: 'pop', descricao: 'Procedimentos Operacionais e Orientações Técnicas (tipo pop ou ort, migration 25), com a versão atual e se exige ciência.', leitura: COLAB, escrita: 'permissão gerenciar_pop' },
      { entidade: 'PopVersao', tabela: 'pop_versao', descricao: 'O histórico de versões de cada POP (migration 18).', leitura: COLAB, escrita: 'permissão gerenciar_pop' },
      { entidade: 'PopLeitura', tabela: 'pop_leitura', descricao: 'A ciência ("li e compreendi") de cada agente em cada versão.', leitura: COLAB, escrita: 'cada pessoa insere a própria; alterar e apagar exigem gerenciar_pop' },
      { entidade: 'FraseMotivacional', tabela: 'frase_motivacional', descricao: 'Frases que giram no card de boas-vindas do Dashboard.', leitura: COLAB, escrita: COLAB },
    ],
  },
  {
    id: 'pessoal',
    nome: 'Área pessoal',
    tabelas: [
      { entidade: 'AnotacaoPessoal', tabela: 'anotacao_pessoal', descricao: 'Anotações e avisos pessoais do Dashboard. Privadas: nem o gestor lê as de outra pessoa (migration 14).', leitura: 'só o dono', escrita: 'só o dono' },
      { entidade: 'AgendaPessoal', tabela: 'agenda_pessoal', descricao: 'Compromissos da Minha Agenda, com data e hora (migration 26). Privados, como as anotações.', leitura: 'só o dono', escrita: 'só o dono' },
    ],
  },
  {
    id: 'sistema',
    nome: 'Sistema e auditoria',
    tabelas: [
      { entidade: 'Configuracao', tabela: 'configuracao', descricao: 'Chave/valor genérico (valor sempre texto, JSON quando preciso). Guarda metas de performance, visibilidade do ranking, parâmetros financeiros da Jornada e a posição dos rodízios.', leitura: COLAB, escrita: 'permissão gerenciar_configuracoes' },
      { entidade: 'LogAuditoria', tabela: 'log_auditoria', descricao: 'Trilha de ações (acao, módulo, dados). Hoje só os acionamentos de Líder Técnico e N2 gravam nela.', leitura: 'permissão ver_log_auditoria', escrita: COLAB + ' (insere; o próprio agente gera o registro)' },
      { entidade: 'Curso', tabela: 'curso', descricao: 'LEGADO. Módulo Universidade removido; dados mantidos e incluídos no backup manual.', leitura: COLAB, escrita: COLAB },
      { entidade: 'CursoMatricula', tabela: 'curso_matricula', descricao: 'LEGADO. Matrículas da Universidade, removida.', leitura: COLAB, escrita: COLAB },
    ],
  },
  {
    id: 'apoio',
    nome: 'Tabelas de apoio (sem entidade no código)',
    tabelas: [
      { entidade: 'log_invocacao_llm', tabela: 'log_invocacao_llm', descricao: 'Uma linha por chamada à IA (quem e quando, sem prompt nem resposta). Alimenta o limite de 60 chamadas por pessoa por dia (migration 31).', leitura: 'só o dono', escrita: 'só o dono (a Edge Function grava em nome da pessoa)' },
      { entidade: 'sla_recalculo_38', tabela: 'sla_recalculo_38', descricao: 'Cópia do SLA gravado ANTES do recálculo da migration 38. Usada pela migration 40 para devolver os ciclos fechados ao que foi apurado. Sem acesso pela API.', leitura: 'ninguém pela API', escrita: 'ninguém pela API' },
      { entidade: 'replicaveis_aprovacao_40', tabela: 'replicaveis_aprovacao_40', descricao: 'Cópia do estado das soluções replicáveis antes da aprovação em lote dos ciclos 1 e 2 (migration 40). Permite desfazer. Sem acesso pela API.', leitura: 'ninguém pela API', escrita: 'ninguém pela API' },
    ],
  },
];

/** Tabelas que existem no banco mas não têm entrada em src/api/tabelas.js. */
export const tabelasSemEntidade = ['log_invocacao_llm', 'sla_recalculo_38', 'replicaveis_aprovacao_40'];

export const funcoesDoBanco = [
  { nome: 'eh_gestor', migration: 4, descricao: 'O papel da pessoa logada é gestor? (por e-mail, colaborador ativo). A base de quase toda trava de gestão.' },
  { nome: 'eh_colaborador', migration: 13, descricao: 'A pessoa logada tem cadastro de colaborador ATIVO? É a porta de entrada: sem isso nenhuma tabela abre (o cadastro aberto do Supabase não dá acesso a nada).' },
  { nome: 'papel_atual', migration: 13, descricao: 'Devolve o papel (agente, gestor, fi) da pessoa logada, ou nulo.' },
  { nome: 'meu_colaborador_id', migration: 14, descricao: 'O id (TEXTO, não uuid) do colaborador logado. Base de tudo que é "só do dono". Atenção ao tipo: comparar com uuid dá erro.' },
  { nome: 'tem_permissao', migration: 35, descricao: 'tem_permissao(chave): vale a exceção cadastrada em colaborador_permissao; sem exceção, o padrão do papel (gestor sim, agente não).' },
  { nome: 'minhas_permissoes', migration: 35, descricao: 'Lista as chaves de permissão que a pessoa logada tem agora. O front chama uma vez por sessão (usePermissoes).' },
  { nome: 'transicao_de_status_permitida', migration: 8, descricao: 'A matriz da máquina de estados da tratativa: de qual estado para quais é permitido ir.' },
  { nome: 'validar_transicao_tratativa', migration: 8, descricao: 'Função do gatilho valida_transicao_tratativa: recusa transição fora da matriz.' },
  { nome: 'sla_horas', migration: 9, descricao: 'Prazo de SLA em horas por tipo (24, 48, 72; contestação usa o prazo informado em dias).' },
  { nome: 'minutos_congelados', migration: 9, descricao: 'LEGADO (regra de 15/09): minutos em aguardando_financeiro. Substituída por minutos_pausados na migration 38.' },
  { nome: 'tempo_sla_minutos', migration: 9, descricao: 'LEGADO (regra de 15/09): tempo do registro ao encerramento menos o congelamento. Substituída por tempo_sla_efetivo_minutos.' },
  { nome: 'minutos_pausados', migration: 38, descricao: 'Minutos em dependência externa ou aguardando financeiro dentro de [início, fim], lendo o histórico como linha do tempo de estados (nota livre não interrompe a pausa).' },
  { nome: 'tempo_sla_efetivo_minutos', migration: 38, descricao: 'O tempo de SLA: do início da tratativa ao encerramento, menos as pausas. Base de encerrado_no_sla.' },
  { nome: 'calcular_sla_ao_encerrar', migration: 39, descricao: 'Função do gatilho calcula_sla_ao_encerrar: grava tempo_total_minutos e encerrado_no_sla na entrada em encerrada OU em aguardando_confirmacao_reabertura.' },
  { nome: 'tempo_efetivo_minutos', migration: 10, descricao: 'Minutos de trabalho de uma tratativa (para custo): estados de atendimento, sem dependência externa.' },
  { nome: 'intervalos_ativos', migration: 11, descricao: 'Os intervalos de trabalho de cada tratativa, usados para medir a carga simultânea da pessoa.' },
  { nome: 'minutos_efetivos_ponderados', migration: 11, descricao: 'Minutos de trabalho divididos pela quantidade de tratativas que a pessoa atendia ao mesmo tempo.' },
  { nome: 'custo_operacional', migration: 10, descricao: 'Custo do tempo de uma tratativa: salário × 1,6 de encargos ÷ 220 h × minutos. Nulo quando falta salário (não inventa número).' },
  { nome: 'custo_operacional_ajustado', migration: 11, descricao: 'O custo oficial: o mesmo cálculo, dividido pela carga simultânea.' },
  { nome: 'calcular_custo_ao_encerrar', migration: 39, descricao: 'Função do gatilho calcula_custo_ao_encerrar: grava custo_operacional_reais no encerramento (e na entrada em aguardando_confirmacao_reabertura).' },
  { nome: 'proteger_campos_calculados', migration: 12, descricao: 'Função do gatilho aa_protege_campos_calculados: descarta valor vindo do cliente em encerrado_no_sla, tempo_total_minutos, sla_atribuido e custo_operacional_reais.' },
  { nome: 'congelar_campos_de_pontuacao', migration: 19, descricao: 'Função do gatilho ab_congela_pontuacao: depois de encerrada, os campos que geram ponto só mudam por quem tem corrigir_tratativa_encerrada.' },
  { nome: 'proteger_auditoria_replicavel', migration: 20, descricao: 'Função do gatilho ab_protege_auditoria_replicavel: só quem tem aprovar_solucao_replicavel grava a aprovação ou contestação de uma solução replicável.' },
  { nome: 'proteger_papel_do_colaborador', migration: 41, descricao: 'Função do gatilho ac_protege_papel_colaborador: impede quem gerencia colaboradores de se promover ou trocar e-mail (identidade).' },
  { nome: 'pontos_da_tratativa', migration: 20, descricao: 'Espelho em SQL do cálculo de pontos de uma tratativa. NÃO é usada pelas telas (elas calculam no navegador); serve de conferência. Não aplica a regra de reabertura por dados.' },
  { nome: 'pontos_do_colaborador', migration: 20, descricao: 'Soma de pontos de um colaborador num período, em SQL. Mesmo aviso de pontos_da_tratativa.' },
  { nome: 'confirmar_atribuicao', migration: 32, descricao: 'O agente confirma ("OK") que viu a atribuição nova. Altera só a própria linha.' },
  { nome: 'atualizar_minha_foto', migration: 37, descricao: 'Troca a foto de perfil de quem está logado, e só ela. Aceita só endereço do nosso bucket. Existe porque o agente não pode editar a própria linha de colaborador.' },
  { nome: 'auditoria_rls', migration: 29, descricao: 'Lista cada política de RLS e o que ela usa (eh_gestor, eh_colaborador, dono). Só service_role. Serve para conferir se o banco real bate com as migrations.' },
];

export const gatilhosDoBanco = [
  { nome: 'valida_transicao_tratativa', tabela: 'tratativa_base', quando: 'antes de alterar', migration: 8, descricao: 'Recusa mudança de estado fora da matriz (a regra mora no banco; a tela só mostra os botões permitidos). service_role passa, para importação e correção.' },
  { nome: 'aa_protege_campos_calculados', tabela: 'tratativa_base', quando: 'antes de alterar', migration: 12, descricao: 'Roda ANTES dos de cálculo (ordem alfabética): descarta o que o cliente mandou nos campos calculados pelo servidor.' },
  { nome: 'ab_congela_pontuacao', tabela: 'tratativa_base', quando: 'antes de alterar', migration: 12, descricao: 'Depois de encerrada, os campos que geram ponto congelam, salvo para quem tem corrigir_tratativa_encerrada.' },
  { nome: 'ab_protege_auditoria_replicavel', tabela: 'tratativa_base', quando: 'antes de inserir ou alterar', migration: 20, descricao: 'Só quem tem aprovar_solucao_replicavel grava a decisão sobre a solução replicável.' },
  { nome: 'calcula_custo_ao_encerrar', tabela: 'tratativa_base', quando: 'antes de alterar', migration: 10, descricao: 'Grava o custo operacional na entrada em encerrada ou aguardando_confirmacao_reabertura.' },
  { nome: 'calcula_sla_ao_encerrar', tabela: 'tratativa_base', quando: 'antes de alterar', migration: 9, descricao: 'Grava tempo_total_minutos e encerrado_no_sla (regra de 02/10/2026: do início, com pausa em dependência externa).' },
  { nome: 'ac_protege_papel_colaborador', tabela: 'colaborador_base', quando: 'antes de inserir ou alterar', migration: 41, descricao: 'Só gestor de verdade muda papel, e-mail, vínculo de conta e Facilitador Interno.' },
];

export const objetosEspeciais = [
  { nome: 'Views mascaradas', descricao: 'colaborador e tratativa são VIEWS (security_invoker) sobre colaborador_base e tratativa_base. A view troca por nulo o salário, as promoções e o custo operacional de quem não tem a permissão. Gravações passam por gatilhos INSTEAD OF (colaborador_gravar, tratativa_gravar) que, para quem não tem a permissão, mantêm o valor antigo. Para criar coluna nova é preciso recriar a view (só se acrescenta no fim) e a função de gravação.' },
  { nome: 'Storage', descricao: 'Um bucket público, "arquivos" (migration 27). Qualquer pessoa autenticada envia; a leitura da URL é pública. As fotos de perfil ficam aqui.' },
  { nome: 'Edge Function', descricao: 'invocar-llm (supabase/functions/invocar-llm): a chamada à IA, com a chave no servidor.' },
  { nome: 'Cadastro público', descricao: 'Desligado no Supabase. Só entra quem teve a conta criada por npm run criar-contas, e só vê dado quem também tem cadastro ativo em colaborador.' },
];

export const migracoes = [
  { n: 1, titulo: 'Tabelas', descricao: 'Gerada a partir dos schemas do Base44 (ferramentas/gerar-sql.py). Não se edita à mão.' },
  { n: 2, titulo: 'RLS ligado', descricao: 'Liga RLS em todas as tabelas, sem política (fecha tudo).' },
  { n: 3, titulo: 'Datas do sistema', descricao: 'Defaults para created_date e similares.' },
  { n: 4, titulo: 'Políticas e funções-base', descricao: 'eh_gestor, eh_colaborador, meu_colaborador_id e as políticas por tabela.' },
  { n: 5, titulo: 'Máscaras de campos sensíveis', descricao: 'colaborador e tratativa viram views mascaradas sobre tabelas _base.' },
  { n: 6, titulo: 'E-mail único', descricao: 'Um colaborador por e-mail (a identidade é o e-mail).' },
  { n: 7, titulo: 'Ajustes pré-importação', descricao: 'Resolve as tabelas que falharam na primeira carga.' },
  { n: 8, titulo: 'Máquina de estados', descricao: 'A matriz de transições da tratativa vira regra do banco.' },
  { n: 9, titulo: 'SLA no servidor', descricao: 'encerrado_no_sla e tempo_total_minutos calculados no encerramento (regra de 15/09, depois trocada pela 38).' },
  { n: 10, titulo: 'Custo operacional', descricao: 'Custo do tempo da equipe calculado no servidor.' },
  { n: 11, titulo: 'Custo por carga simultânea', descricao: 'O custo divide pela quantidade de tratativas atendidas ao mesmo tempo.' },
  { n: 12, titulo: 'Pontuação confiável', descricao: 'Campos calculados protegidos e campos de pontuação congelados no encerramento.' },
  { n: 13, titulo: 'Acesso só para colaborador ativo', descricao: 'eh_colaborador() vira a porta de entrada de todas as tabelas (pré-publicação).' },
  { n: 14, titulo: 'Anotações pessoais só da dona', descricao: 'Privacidade das anotações.' },
  { n: 15, titulo: 'Feedbacks com ids novos', descricao: 'Observações apontando para os ids novos dos colaboradores.' },
  { n: 16, titulo: 'Feedbacks privados', descricao: 'Observação só para o gestor ou para a pessoa citada.' },
  { n: 17, titulo: 'Bônus manual', descricao: 'Onde gravar o bônus manual (tabela pontuacao).' },
  { n: 18, titulo: 'POP com versão e leitura', descricao: 'pop_versao e pop_leitura (ciência por versão).' },
  { n: 19, titulo: 'Inativadas pontuam', descricao: 'Reclame Aqui e GMN inativados valem +1, a partir do Ciclo 3.' },
  { n: 20, titulo: 'Replicáveis e regras de pontos', descricao: 'Aprovação das soluções replicáveis; espelho SQL dos pontos.' },
  { n: 21, titulo: 'Escalas com ids novos', descricao: 'Escalas apontando para os ids novos.' },
  { n: 22, titulo: 'Leituras em Observações', descricao: 'A leitura de pessoas passa a morar em observacao (tipo leitura).' },
  { n: 23, titulo: 'Pesquisas: quem respondeu', descricao: 'pesquisa_participacao e anonimato de verdade.' },
  { n: 24, titulo: 'Apuração: origem e desfazer', descricao: 'Lote de importação e mapeamento de colunas e nomes.' },
  { n: 25, titulo: 'POP tipo ORT', descricao: 'Orientação Técnica ao lado do POP.' },
  { n: 26, titulo: 'Minha Agenda', descricao: 'agenda_pessoal, privada.' },
  { n: 27, titulo: 'Bucket arquivos', descricao: 'Permissão de upload e leitura no Storage.' },
  { n: 28, titulo: 'PDI privado', descricao: 'Só o dono e quem tem permissão leem.' },
  { n: 29, titulo: 'auditoria_rls()', descricao: 'Função que lista as políticas reais.' },
  { n: 30, titulo: 'Escrita restrita ao gestor', descricao: 'Nove tabelas que qualquer colaborador conseguia gravar pelo console.' },
  { n: 31, titulo: 'Limite diário da IA', descricao: 'log_invocacao_llm e o teto de 60 chamadas por pessoa por dia.' },
  { n: 32, titulo: 'Notificação de atribuição', descricao: 'O agente confirma a atribuição nova; histórico anterior nasce confirmado.' },
  { n: 33, titulo: 'CNPJ do cliente', descricao: 'Coluna que o formulário já tinha e o banco não (todo registro falhava).' },
  { n: 34, titulo: 'Carimbos automáticos', descricao: 'created_date, updated_date e atualizado_em preenchidos pelo servidor.' },
  { n: 35, titulo: 'Permissões granulares: infraestrutura', descricao: 'permissao, colaborador_permissao, tem_permissao(), minhas_permissoes().' },
  { n: 36, titulo: 'Salário e custo viram permissão', descricao: 'As máscaras passam a usar ver_salario e ver_custo_operacional.' },
  { n: 37, titulo: 'Foto de perfil', descricao: 'atualizar_minha_foto(): o agente troca só a própria foto.' },
  { n: 38, titulo: 'SLA do início com pausa', descricao: 'Nova regra de SLA e recálculo do histórico (revertido para os ciclos fechados pela 40).' },
  { n: 39, titulo: 'SLA na reclamação interna', descricao: 'SLA e custo calculados já na entrada em aguardando confirmação de reabertura.' },
  { n: 40, titulo: 'Ciclos 1 e 2 congelados', descricao: 'Devolve o SLA dos ciclos fechados e aprova as replicáveis deles.' },
  { n: 41, titulo: 'Permissão por área', descricao: 'eh_gestor() vira tem_permissao(<área>) em ~40 tabelas, mais a trava contra escalada.' },
  { n: 99, titulo: 'Restrições pós-importação', descricao: 'Só se aplica depois da carga de dados do Base44.' },
];

export const pontosDeAtencao = [
  'Várias tabelas aceitam escrita de qualquer colaborador ativo (tratativa, solicitacao_ferias, hansei_envio, hansei_comentario, solicitacao_apoio, estorno_parcial, acionamentos, frase_motivacional): quem pode fazer o quê vem da TELA, não do banco. Duas têm efeito: um agente conseguiria marcar o próprio pedido de férias como aprovado (sem baixar o saldo, que exige aprovar_ferias) e enviar um Hansei. Fechar isso é o próximo passo natural das permissões.',
  'O espelho SQL pontos_da_tratativa() não aplica a regra de reabertura por dados nem o dia de virada; as telas não o usam. Não confie nele para conferir ranking.',
  'Os números de tratativa (TRT-0000) são gerados no navegador (maior + 1): sob concorrência, dois registros podem receber o mesmo número (35 repetidos hoje). O identificador real é o id (uuid).',
  'Não há backup automático do banco (decisão de Pedro). O backup em Configurações é uma exportação manual e não há restauração automática.',
];
