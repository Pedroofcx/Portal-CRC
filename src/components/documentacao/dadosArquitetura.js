/**
 * Documentação técnica — Arquitetura e padrões.
 *
 * Cada seção: { id, titulo, paragrafos[], itens[{ rotulo, texto }] }.
 * Escrita sobre o sistema COMO ELE É (migrado do Base44 para Supabase +
 * Cloudflare em 09/2026). Conferida por ferramentas/conferir-documentacao.mjs
 * (migrations citadas precisam existir).
 */

export const resumoDoSistema = {
  nome: 'Portal CRC',
  descricao: 'Sistema interno da Central de Relacionamento e Conformidade (Click Digital): registra e acompanha as tratativas com clientes, mede o desempenho da equipe e calcula a premiação trimestral. Cerca de 10 pessoas usam: agentes e gestores.',
};

export const secoesArquitetura = [
  {
    id: 'camadas',
    titulo: 'Camadas e como o sistema se encaixa',
    paragrafos: [
      'É uma aplicação de página única (SPA) que roda inteira no navegador. Não há servidor próprio: o banco, o login, os arquivos e a única função de servidor (a IA) ficam no Supabase, e a Cloudflare só entrega as telas prontas.',
    ],
    itens: [
      { rotulo: 'Navegador (React 18 + Vite 6)', texto: 'Telas em src/pages, componentes por assunto em src/components, regras em funções puras em src/lib. Estilo com Tailwind 3 e componentes shadcn/ui (Radix). Gráficos com Recharts.' },
      { rotulo: 'src/api/db.js (o adaptador)', texto: 'O único arquivo que sabe que o banco é o Supabase. Mantém a interface do SDK antigo do Base44 (db.entities.Tratativa.filter(...)), para as telas não terem mudado na migração.' },
      { rotulo: 'Supabase — Postgres', texto: 'Dados, regras (funções e gatilhos), segurança por linha (RLS) e views mascaradas. É a fonte da verdade das regras que não podem depender do navegador.' },
      { rotulo: 'Supabase — Auth', texto: 'Login por e-mail e senha. Cadastro público desligado; as contas são criadas por npm run criar-contas.' },
      { rotulo: 'Supabase — Storage', texto: 'Um bucket público, "arquivos" (fotos de perfil).' },
      { rotulo: 'Supabase — Edge Function invocar-llm', texto: 'Chama o modelo de IA (Google Gemini) com a chave guardada como segredo do projeto.' },
      { rotulo: 'Cloudflare Workers (arquivos estáticos)', texto: 'Serve o resultado de npm run build (pasta dist/). Publica sozinho a cada push no ramo main do GitHub. Configuração em wrangler.jsonc.' },
    ],
  },
  {
    id: 'dados',
    titulo: 'Como o front lê e grava dados',
    paragrafos: [
      'Toda tela usa db.entities.<Entidade> (mapa de nomes em src/api/tabelas.js) dentro do TanStack React Query v5. Nenhuma tela chama o Supabase direto, exceto para funções (supabase.rpc) e Storage.',
    ],
    itens: [
      { rotulo: 'Operações', texto: 'list(sort?, limit?), filter(where, sort?, limit?), get(id), create(dados), update(id, dados), delete(id), bulkCreate([...]). Ordem com prefixo "-" é decrescente. O filtro aceita igualdade, $in e $nin.' },
      { rotulo: 'Paginação escondida', texto: 'O PostgREST devolve no máximo 1000 linhas por requisição. O adaptador pagina sozinho: sem isso, uma tela de indicadores mostraria dados parciais em silêncio.' },
      { rotulo: 'Campos que o cliente nunca grava', texto: 'O adaptador remove undefined (que viraria NULL e apagaria o valor), id, criado_em e atualizado_em.' },
      { rotulo: 'Cache e chaves', texto: 'As chaves de consulta imitam a chamada, por exemplo [\'tratativas\', "list(\'-created_date\')"], para telas diferentes compartilharem o mesmo cache. staleTime padrão de 30 s, 2 tentativas com espera crescente, sem refetch ao voltar para a aba.' },
      { rotulo: 'Erro de gravação nunca passa em silêncio', texto: 'src/lib/query-client.js: toda gravação sem onError próprio mostra "Não foi possível salvar: <motivo>" (src/lib/erros.js traduz a recusa do banco, como a falta de permissão).' },
      { rotulo: 'Funções do banco', texto: 'supabase.rpc(\'minhas_permissoes\'), \'confirmar_atribuicao\', \'atualizar_minha_foto\'.' },
      { rotulo: 'Code-splitting', texto: 'src/pages.config.js carrega cada página com React.lazy; App.jsx envolve as rotas em Suspense. O pacote principal tem cerca de 710 KB (gzip ~210 KB).' },
    ],
  },
  {
    id: 'autenticacao',
    titulo: 'Autenticação e identidade',
    itens: [
      { rotulo: 'Login', texto: 'src/pages/Login.jsx chama supabase.auth.signInWithPassword. A sessão persiste e renova sozinha, e o AuthContext (src/lib/AuthContext.jsx) troca a tela quando percebe a sessão.' },
      { rotulo: 'Quem é a pessoa: pelo e-mail', texto: 'O vínculo entre a conta de login e o cadastro é o e-mail (único, migration 06). meu_colaborador_id() e o front fazem a ligação por ele. Por isso mexer em e-mail é mexer em identidade, e só gestor altera (migration 41).' },
      { rotulo: 'Nome na tela', texto: 'db.auth.me() devolve o nome do CADASTRO de colaborador, nunca o da conta (a conta não tem nome). Ele é gravado como autor no histórico de estados, em acionamentos e no Hansei.' },
      { rotulo: 'Senha provisória', texto: 'npm run criar-contas cria a conta com senha aleatória e a marca trocar_senha. O Layout abre um diálogo de troca obrigatório (sem fechar) antes de qualquer coisa (src/components/conta/TrocarSenhaDialog.jsx).' },
      { rotulo: 'Papel de administrador da plataforma', texto: 'role admin só vem de app_metadata do usuário, marcado à mão. Nunca é presumido.' },
      { rotulo: 'Quem entra', texto: 'Conta de login sem cadastro ativo em colaborador entra, mas não lê nada: eh_colaborador() barra todas as tabelas (migration 13) e as telas ficam vazias. É o caso de quem foi desativado (ativo = false): perde o acesso na hora.' },
    ],
  },
  {
    id: 'seguranca',
    titulo: 'Segurança: o banco decide, a tela só obedece',
    paragrafos: [
      'Regra de ouro: o que esconder ou travar na tela é conveniência; a garantia está no banco. O que a tela mostra de menos não protege nada, porque qualquer pessoa logada consegue chamar a API pelo console do navegador.',
    ],
    itens: [
      { rotulo: 'RLS em todas as tabelas', texto: 'Ligado desde a migration 02. A porta de entrada de toda tabela é eh_colaborador() (migration 13). Em cima dela, cada tabela diz quem escreve.' },
      { rotulo: 'Escrita por permissão da área', texto: 'Políticas usam tem_permissao(\'<área>\') (migration 41). Sem exceção cadastrada vale o padrão do papel, então nada muda até alguém ser ajustado em Configurações > Permissões.' },
      { rotulo: 'Dado sensível mascarado na origem', texto: 'Salário, promoções (permissão ver_salario) e custo operacional (ver_custo_operacional) são trocados por nulo dentro da view para quem não pode. Mesmo forçando a tela, o dado não chega.' },
      { rotulo: 'Dado privado de verdade', texto: 'Anotações e agenda pessoais (só o dono), PDI (dono ou ver_pdi_equipe), observações (gestor ou pessoa citada), respostas de pesquisa (dono ou ver_respostas_pesquisa).' },
      { rotulo: 'Campos calculados pelo servidor', texto: 'encerrado_no_sla, tempo_total_minutos, sla_atribuido e custo_operacional_reais descartam o que o cliente mandar (gatilho aa_protege_campos_calculados). Os campos que geram ponto congelam no encerramento.' },
      { rotulo: 'Máquina de estados no banco', texto: 'A matriz de transições da tratativa vive em transicao_de_status_permitida(); a tela só mostra os botões permitidos.' },
      { rotulo: 'Anti-escalada', texto: 'Quem gerencia colaboradores não pode se promover nem trocar e-mail. As tabelas de permissões ficam só para gestor de verdade (migration 41).' },
      { rotulo: 'IA com teto', texto: 'Edge Function exige login, colaborador ativo, prompt de até 30.000 caracteres e no máximo 60 chamadas por pessoa por dia (migration 31).' },
      { rotulo: 'Como conferir', texto: 'auditoria_rls() (migration 29, só service_role) lista as políticas reais; npm run testar-seguranca tenta fraudes como agente comum.' },
    ],
  },
  {
    id: 'permissoes',
    titulo: 'Modelo de permissões',
    paragrafos: [
      'Dois papéis (agente e gestor, mais a marca temporária de Facilitador Interno) dão o PADRÃO. Em cima dele, exceções por pessoa e por área: um agente pode receber uma área; um gestor pode perder uma (o caso do substituto que gerencia sem ver salário).',
    ],
    itens: [
      { rotulo: 'Catálogo', texto: 'Tabela permissao (21 chaves, migrations 35 e 41): ver_salario, gerenciar_colaboradores, ver_custo_operacional, aprovar_solucao_replicavel, corrigir_tratativa_encerrada, gerenciar_tipos_tratativa, gerenciar_configuracoes, gerenciar_permissoes, gerenciar_premiacao, gerenciar_pop, gerenciar_escalas, aprovar_ferias, gerenciar_avisos, gerenciar_pesquisas, ver_respostas_pesquisa, ver_pdi_equipe, ver_observacoes_equipe, acessar_oraculo, ver_log_auditoria, gerenciar_apuracao, gerenciar_operacao.' },
      { rotulo: 'Exceções', texto: 'Tabela colaborador_permissao (só as exceções, concedida true ou false). Edição em Configurações > Permissões, que é por pessoa.' },
      { rotulo: 'Decisão no banco', texto: 'tem_permissao(chave) nas políticas e nas views; minhas_permissoes() lista o que a pessoa tem.' },
      { rotulo: 'Decisão na tela', texto: 'src/hooks/usePermissoes.js (temPermissao, temAlguma). Enquanto carrega, responde pelo papel, para o gestor não ver "acesso restrito" piscar. src/lib/permissoesPaginas.js mapeia página → permissão (menu e bloqueio por endereço).' },
      { rotulo: 'O que continua por papel', texto: 'Telas de visão gerencial (Dashboard, Hansei, Relatórios, Jornada do Cliente) e as ferramentas de acionamento por supervisor: gestor e agente veem telas diferentes, não uma capacidade isolada.' },
      { rotulo: 'Interruptor antigo', texto: 'permissao_modulo só vale para itens do menu sem permissão própria.' },
    ],
  },
  {
    id: 'tempo',
    titulo: 'Datas, fuso e dinheiro',
    itens: [
      { rotulo: 'Fuso', texto: 'Datas e horas são gravadas em ISO (UTC) e exibidas sempre em America/Sao_Paulo (formatDateSP, todaySP em src/components/utils/helpers.js). Período de relatório compara pelo DIA em horário de Brasília (src/lib/relatorios/periodo.js): "até 16/09" inclui o dia 16 inteiro.' },
      { rotulo: 'Data civil', texto: 'O campo date entrega "AAAA-MM-DD", que é um dia, não um instante. Compare como texto, nunca por new Date(): o JavaScript leria como meia-noite UTC (o dia anterior às 21h em Brasília).' },
      { rotulo: 'Dinheiro', texto: 'CurrencyInput usa o acumulador de centavos (digitar 1, 0, 0 dá R$ 1,00). O contrato com o resto do código é sempre um número em reais, nunca texto.' },
      { rotulo: 'Carimbos', texto: 'created_date, updated_date e atualizado_em são do servidor (migration 34). O cliente não precisa mandar.' },
    ],
  },
  {
    id: 'padroes',
    titulo: 'Padrões de código',
    itens: [
      { rotulo: 'Regra em função pura', texto: 'Contas de negócio moram em src/lib (pontuacaoCiclo, indicadoresCiclo, prazoSla, relatorios/*, ferias, escalas, pendencias...) como funções puras, sem banco nem React. São testadas por npm run testar (ferramentas/testar-validacao.mjs).' },
      { rotulo: 'Uma conta, um lugar', texto: 'Ranking, "Meu ciclo", Hansei, relatórios e Oráculo usam as mesmas funções, para nunca divergirem. A pontuação das tratativas é calculada ao vivo, nunca gravada.' },
      { rotulo: 'Formulários', texto: 'useValidacao + CampoFormulario: valida ao sair do campo, mostra a mensagem junto do campo e, ao enviar, valida tudo de uma vez. Mensagem diz o que fazer.' },
      { rotulo: 'Hooks do domínio', texto: 'useEu (quem sou), usePermissoes, useRankingCiclo, usePontuacaoAgente, useCicloEquipe.' },
      { rotulo: 'Interface', texto: 'As regras de UI estão em documentacao/regras-ui-ux.md: cartões com texto e número (Cartao/Linha), sem cartões de ícone em círculo, um único botão principal por tela, cores só por token. npm run conferir-cores confere o contraste.' },
      { rotulo: 'Erros de tela', texto: 'ErrorBoundary por página: uma página que quebra não derruba o sistema.' },
      { rotulo: 'Imports', texto: 'Alias @/ (src/). Cada componente shadcn vem do próprio arquivo em @/components/ui. Classes Tailwind sempre como texto literal (classe montada com variável é removida no build).' },
      { rotulo: 'Hooks', texto: 'Só no topo do componente, antes de qualquer return condicional (o lint barra: react-hooks/rules-of-hooks).' },
    ],
  },
  {
    id: 'ia',
    titulo: 'Inteligência artificial',
    paragrafos: [
      'A chamada ao modelo não pode rodar no navegador: a chave iria no pacote JavaScript e qualquer pessoa a copiaria. Por isso existe a Edge Function invocar-llm (supabase/functions/invocar-llm/index.ts).',
    ],
    itens: [
      { rotulo: 'Contrato', texto: 'Entrada { prompt, response_json_schema? }; saída um objeto (com schema) ou texto (sem). O adaptador db.integrations.Core.InvokeLLM mantém a forma do Base44.' },
      { rotulo: 'Modelo e segredos', texto: 'Google Gemini, modelo gemini-3.6-flash por padrão (troca sem republicar pelo segredo GEMINI_MODELO). A chave é o segredo GEMINI_API_KEY. O provedor recusa responseSchema, então o formato do JSON é pedido no texto do prompt.' },
      { rotulo: 'Quem chama', texto: 'ResumoIAEtapa (Jornada do Cliente), PainelLeitura (Observações), Visao360 (Oráculo) e RelatorioJornadaDiretoria. Nada é gravado só pela IA: ela apoia, o gestor decide.' },
      { rotulo: 'Limites', texto: 'Prompt de até 30.000 caracteres e 60 chamadas por pessoa por dia, contadas em log_invocacao_llm (que não guarda prompt nem resposta).' },
    ],
  },
  {
    id: 'arquivos',
    titulo: 'Arquivos e foto de perfil',
    itens: [
      { rotulo: 'Bucket', texto: '"arquivos", público para leitura da URL; qualquer pessoa autenticada envia (migration 27). db.integrations.Core.UploadFile devolve { file_url }.' },
      { rotulo: 'Foto de perfil', texto: 'Menu da conta > Alterar foto (src/components/conta/TrocarFotoDialog.jsx): JPG, JPEG ou PNG de até 2 MB. O agente não pode editar a própria linha de colaborador, então a URL é gravada pela função atualizar_minha_foto() (migration 37), que só altera foto_url de quem está logado e só aceita endereço do nosso bucket. A foto anterior não é apagada do bucket.' },
    ],
  },
  {
    id: 'hospedagem',
    titulo: 'Hospedagem e publicação',
    itens: [
      { rotulo: 'Front', texto: 'Cloudflare Workers com arquivos estáticos (wrangler.jsonc). O endereço é portal-crc.pedro-soares-11c.workers.dev. Cada push no ramo main do GitHub (Pedroofcx/Portal-CRC) publica sozinho em 1 a 2 minutos.' },
      { rotulo: 'Variáveis', texto: 'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Na Cloudflare precisam ser variáveis de BUILD, não de execução. Localmente ficam em .env.local (fora do Git).' },
      { rotulo: 'Banco', texto: 'Migrations em supabase/migrations, aplicadas à mão no SQL Editor do Supabase, na ordem numérica. A chave service_role (.env.import) é só para as ferramentas locais, nunca vai para o front.' },
      { rotulo: 'Edge Function', texto: 'Publicada à mão no Supabase. O limite diário vem da migration 31.' },
      { rotulo: 'Cache do navegador', texto: 'Depois de publicar, quem estiver com a página aberta pode precisar de Ctrl+F5 para pegar a versão nova.' },
      { rotulo: 'Backup', texto: 'Não há backup automático do banco (decisão de Pedro). Configurações > Backup baixa um .json manual e não existe restauração automatizada.' },
    ],
  },
];
