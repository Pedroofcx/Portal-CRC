/**
 * Documentação técnica — Operação: ferramentas, rotina de mudança e receitas.
 *
 * Cada seção: { id, titulo, paragrafos[], itens[{rotulo,texto}], tabela?: {colunas, linhas} }.
 */

export const secoesDeOperacao = [
  {
    id: 'rotina',
    titulo: 'Rotina de uma mudança',
    paragrafos: [
      'Ordem que evita publicar tela que depende de banco que ainda não existe.',
    ],
    itens: [
      { rotulo: '1. Banco primeiro', texto: 'Se a mudança precisa de migration, ela é rodada no SQL Editor do Supabase ANTES de publicar a tela. Quem desenvolve não executa SQL no banco: entrega o arquivo em supabase/migrations e quem administra roda e confere o resultado (cada migration termina com uma consulta de conferência).' },
      { rotulo: '2. Verificações locais', texto: 'npm run lint (ESLint, regra de ordem dos hooks, conferência de cores e esta documentação), npm run testar (regras de negócio) e npm run build.' },
      { rotulo: '3. Teste de verdade', texto: 'Telas e permissões são conferidas com contas descartáveis criadas pela API de administração (nunca pedindo a senha de ninguém), que são apagadas ao final. Segurança se prova escrevendo no banco com a sessão da conta, não olhando a tela.' },
      { rotulo: '4. Publicar', texto: 'git push no ramo main: a Cloudflare publica sozinha em 1 a 2 minutos.' },
      { rotulo: '5. Documentar', texto: 'Decisão de regra entra em documentacao/decisoes-de-regra.md (com data e o porquê); mudança de módulo, tabela, função ou página entra aqui. npm run conferir-documentacao falha se algo existir sem estar descrito ou for descrito sem existir.' },
    ],
  },
  {
    id: 'receitas',
    titulo: 'Receitas: como mexer sem quebrar',
    itens: [
      { rotulo: 'Coluna nova em colaborador ou tratativa', texto: 'Essas duas são VIEWS sobre colaborador_base e tratativa_base. Acrescente a coluna na tabela _base, recrie a view com a coluna NO FIM (view só aceita acréscimo no fim) e recrie a função de gravação (colaborador_gravar / tratativa_gravar) incluindo a coluna nos dois lados (inserir e alterar). Exemplos: migrations 33 e 34. Sem isso o formulário falha com "coluna não existe".' },
      { rotulo: 'Tabela nova', texto: 'Crie com RLS ligado e políticas explícitas (eh_colaborador() para ler; escrita por tem_permissao ou por dono). Acrescente a entrada em src/api/tabelas.js (o cabeçalho "gerado" está desatualizado: o gerador só lê os JSON do Base44 e não deve ser rodado de novo) e descreva em dadosBanco.js. Confira com auditoria_rls().' },
      { rotulo: 'Cuidado com tipos', texto: 'meu_colaborador_id() devolve TEXTO. Tabela nova com coluna de colaborador deve usar text, senão a política dá "operator does not exist: text = uuid" (aconteceu na migration 32).' },
      { rotulo: 'Permissão nova', texto: '1) insira a chave em permissao; 2) acrescente a tabela e a chave ao mapa da migration (como a 41); 3) use temPermissao(chave) na tela e, se for página, acrescente em src/lib/permissoesPaginas.js; 4) o menu em src/Layout.jsx recebe permissao: chave.' },
      { rotulo: 'Página nova', texto: 'Arquivo em src/pages; entrada em src/pages.config.js (esse arquivo pode ser editado à mão; o aviso de "gerado" é antigo); item em menuItems de src/Layout.jsx; módulo em src/components/documentacao.' },
      { rotulo: 'Regra de pontuação ou SLA', texto: 'Antes de publicar, compare o resultado dos ciclos fechados antes e depois (o código antigo está no git). Ciclos 1 e 2 não podem mudar. Regra nova entra com data de corte, como DIA_DE_VIRADA_VALE_DESDE e o recorte de 17/09 do SLA.' },
      { rotulo: 'Desfazer um recálculo em massa', texto: 'Migrations que alteram dado em lote guardam cópia (sla_recalculo_38, replicaveis_aprovacao_40) e trazem o comando de desfazer no cabeçalho.' },
    ],
  },
  {
    id: 'contas',
    titulo: 'Contas e acessos',
    itens: [
      { rotulo: 'Criar contas', texto: 'npm run criar-contas (mostra quem seria criado) e npm run criar-contas -- --criar. Cria uma conta para cada colaborador ativo que ainda não tem, com senha provisória aleatória e e-mail já confirmado. As senhas vão para um arquivo em senhas-provisorias/ (ignorado pelo git), nunca para o terminal. A pessoa troca a senha no primeiro acesso.' },
      { rotulo: 'Conferir contas', texto: 'npm run conferir-contas cruza as contas de login com o cadastro e diz quem tem login sem cadastro, e o contrário.' },
      { rotulo: 'Forçar troca de senha', texto: 'npm run exigir-troca-de-senha marca a conta para exigir senha nova no próximo acesso.' },
      { rotulo: 'Primeiro gestor', texto: 'ferramentas/criar-primeiro-gestor.sql (só na instalação inicial).' },
      { rotulo: 'Desativar alguém', texto: 'Cadastro > ativo = false: a pessoa perde o acesso na hora (eh_colaborador() deixa de valer) e o histórico fica.' },
      { rotulo: 'Chave service_role', texto: 'Fica em .env.import (fora do Git), só para as ferramentas locais. Nunca no front, nunca em variável da Cloudflare.' },
    ],
  },
  {
    id: 'comandos',
    titulo: 'Comandos e ferramentas',
    tabela: {
      colunas: ['Comando', 'Para quê'],
      linhas: [
        ['npm run dev', 'Servidor de desenvolvimento (Vite). Precisa de .env.local com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'],
        ['npm run build', 'Gera dist/, que a Cloudflare publica.'],
        ['npm run lint', 'ESLint + conferência de cores (contraste) + conferência desta documentação.'],
        ['npm run typecheck', 'Checagem de tipos pelo jsconfig.'],
        ['npm run testar', 'Testes das regras de negócio (funções puras de src/lib). Não usam o banco.'],
        ['npm run testar-fsm <email> <senha>', 'Entra como agente comum e tenta pular estados da tratativa. Cria dados de teste.'],
        ['npm run testar-pontuacao <email> <senha>', 'Entra como agente comum e tenta inflar a própria pontuação.'],
        ['npm run testar-ia', 'Confere a Edge Function de IA (login exigido, chave não exposta, limites).'],
        ['node ferramentas/testar-seguranca.mjs', 'Teste de invasão: o que um agente comum não deveria conseguir.'],
        ['npm run conferir-contas / criar-contas / exigir-troca-de-senha', 'Gestão de contas de login (ver Contas e acessos).'],
        ['npm run analisar-sla / analisar-carga', 'Análises de leitura dos dados de SLA e da carga simultânea, para decidir regra.'],
        ['npm run apagar-apuracao / apagar-hansei', 'Zeram os dados desses módulos (pedido de teste de importação). Irreversível.'],
        ['node ferramentas/recalcular-hansei.mjs', 'Recalcula os números dos Hanseis já enviados com a conta atual.'],
        ['node ferramentas/importar-pops.mjs, atualizar-pop.mjs', 'Publicam POPs a partir da Estrutura de Trabalho, ou uma nova versão a partir de um arquivo.'],
        ['npm run previa-operador / previa-sistema', 'Geram dados e páginas de PRÉVIA (previas/) para revisar a tela sem login.'],
        ['node ferramentas/conferir-documentacao.mjs', 'Falha se a documentação citar algo que não existe, ou algo existir sem estar documentado.'],
        ['ferramentas/conferir-rls.sql', 'No SQL Editor: lista o RLS de cada tabela (só lê).'],
        ['ferramentas/importar-dados.mjs, conferir-importacao.mjs, extrair-dados-base44.js, gerar-sql.py, gerar-seguranca.py', 'Ferramentas da migração do Base44 (09/2026). Históricas: as migrations 01 a 05 saíram dos geradores; não rode de novo.'],
      ],
    },
  },
  {
    id: 'testes',
    titulo: 'Testes: o que cobrem e o que não cobrem',
    itens: [
      { rotulo: 'npm run testar', texto: 'Regras de negócio puras: pontuação, ciclos (inclusive o dia de virada), SLA e pausa, reabertura, indicadores, relatórios, férias, escalas, pendências, validações, importação de apuração, permissões de menu. Mais de 530 verificações. Roda em segundos e não toca no banco.' },
      { rotulo: 'Testes contra o banco', texto: 'testar-fsm, testar-pontuacao, testar-seguranca e testar-ia usam uma conta real de agente. São eles que provam que a trava está no servidor.' },
      { rotulo: 'O que não há', texto: 'Não há teste automatizado de interface (cliques). As telas são verificadas à mão no navegador, com conta descartável, e as migrations são conferidas pela consulta que cada uma traz no fim.' },
    ],
  },
  {
    id: 'incidentes',
    titulo: 'Quando algo dá errado',
    itens: [
      { rotulo: '"Erro de gravação" em uma tela', texto: 'A mensagem traduz a recusa do banco: "sem permissão" é política de RLS (ou exceção de permissão); "campo obrigatório" é NOT NULL; "já existe" é chave única. Confira auditoria_rls() e a permissão da pessoa em Configurações > Permissões.' },
      { rotulo: 'Formulário falha com "coluna não existe"', texto: 'A view não foi recriada com a coluna nova (ver a receita de coluna nova).' },
      { rotulo: 'Pontuação ou SLA "estranhos"', texto: 'Confira primeiro os campos de entrada da tratativa (status_reabertura, solucao_replicavel_valida, nota, encerrado_no_sla) e o ciclo em que o evento cai. Tratativa em aguardando_confirmacao_reabertura conta para o ciclo, mas só ganha o ponto de reabertura passados 7 dias sem nova tratativa do cliente.' },
      { rotulo: 'Alguém não vê um menu', texto: 'Menu vale pela permissão da área (Configurações > Permissões). Item sem permissão própria ainda obedece ao interruptor antigo de permissao_modulo.' },
      { rotulo: 'Depois de publicar a tela parece antiga', texto: 'Ctrl+F5 (cache do navegador).' },
      { rotulo: 'Dado errado em massa', texto: 'Não corrija no olho: escreva a migration com cópia de segurança antes do UPDATE e traga a consulta de conferência.' },
    ],
  },
];

export const legadoParaRemover = [
  { item: 'src/pages/UploadFoto.jsx', motivo: 'Resto do Base44, sem nenhuma referência no código. A troca de foto agora é o diálogo do menu da conta.' },
  { item: 'src/components/utils/SafeRoute.jsx e RouteGuard.jsx', motivo: 'Guardas de rota do Base44, sem nenhuma importação no código atual.' },
  { item: 'src/pages/OAuthConsent.jsx', motivo: 'Tela de consentimento OAuth do Base44 (em inglês), sem uso.' },
  { item: 'Tabelas escala, saldo_ferias, configuracao_home_office, solicitacao_home_office, curso, curso_matricula, oraculo_lancamento', motivo: 'Sem uso no código atual; dados mantidos por decisão (histórico). Removê-las exige uma migration e atualizar o backup.' },
  { item: 'Funções minutos_congelados e tempo_sla_minutos, pontos_da_tratativa e pontos_do_colaborador', motivo: 'As duas primeiras foram substituídas pela migration 38; as outras não são usadas pelas telas.' },
];
