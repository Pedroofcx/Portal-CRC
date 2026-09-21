# Diretrizes de UI/UX - Portal CRC (Ouvidoria / Backoffice)

Este documento estabelece as regras absolutas de design e experiência do usuário para o Portal CRC. Como um sistema de uso interno (100% Desktop) focado no registro de tratativas, a prioridade é a **eficiência operacional, legibilidade e consistência**. 

Estão sumariamente proibidos recursos visuais puramente decorativos (sombras excessivas, gradientes, *glassmorphism*, emojis e cantos exageradamente arredondados). **Função precede a estética.**

## 1. Identidade Visual e Cores Funcionais

O sistema deve harmonizar as duas identidades presentes (Metodologia Meteoro e Institucional) sem sacrificar a usabilidade. **O vermelho não deve gerar ansiedade.**

* **Cores Institucionais (Base da Interface):**
  * **Branco (`#FFFFFF`):** Cor de fundo principal de containers, cards e painéis.
  * **Azul Claro Institucional:** Utilizado para **ações principais** (Botões primários, links, abas ativas, *focus* de inputs).
  * **Preto/Grafite (`#1A1A1A` ou `#333333`):** Para textos principais e títulos. Nunca usar preto puro (`#000000`) para reduzir a fadiga visual.

* **Cores da Metodologia Meteoro (Uso Restrito e Estratégico):**
  * **Vermelho Meteoro:** Em interfaces de usuário, o vermelho é universalmente lido como "Erro" ou "Perigo". Portanto, seu uso será **estritamente restrito** a:
    1. Tags/Badges que identifiquem explicitamente a aplicação da metodologia.
    2. Ícones específicos da marca Meteoro.
    3. (Exceção padrão) Ações destrutivas (ex: "Excluir registro").
    *Não utilize o vermelho para botões de salvar, avançar ou cabeçalhos globais.*

## 2. Layout e Arquitetura 100% Desktop

Como o uso é exclusivo em monitores, o aproveitamento do espaço horizontal é vital, mas textos não devem cruzar a tela de ponta a ponta (limite a largura de blocos de leitura a 70-80 caracteres).

* **Padrão de Navegação:** Utilizar Menu Lateral (Sidebar) fixo à esquerda para navegação entre os módulos principais, liberando o restante da tela para o conteúdo de trabalho.
* **Uso da Tela:** Evite grandes áreas vazias projetadas apenas para parecerem "elegantes". Em um sistema de tratativas, a tela deve exibir a lista de chamados/registros simultaneamente com os painéis de detalhe (ex: Padrão *Master-Detail*, onde a lista fica na esquerda e a tratativa abre na direita).
* **Densidade de Dados:** Tabelas devem ser compactas, porém respiráveis (altura de linha de `40px` a `48px`). Nada de transformar dados de tabela em "cards gigantes" que exigem *scroll* desnecessário.

## 3. O Core do Sistema: Registro de Tratativas

O registro de tratativas exige baixo esforço cognitivo e acesso rápido ao histórico.

* **Histórico Cronológico (Timeline):** As tratativas anteriores devem ser exibidas em formato de linha do tempo ou *feed* (do mais recente para o mais antigo), com distinção clara e visual (uso de ícones lineares ou cor de fundo sutil) entre mensagens do cliente, notas internas e ações do sistema.
* **Área de Input (Textareas):** O campo para registrar uma nova tratativa deve ser o elemento de maior destaque na tela de ação. Deve suportar expansão automática conforme a digitação e possuir botões de atalho rápidos (ex: "Inserir resposta padrão").
* **Agrupamento de Ação:** O botão principal ("Salvar Tratativa" / "Atualizar Status") deve ficar imediatamente abaixo ou ao lado do campo de preenchimento. Não obrigue o usuário a rolar a página até o fim para salvar.

## 4. Formulários e Inputs (Regras Estritas)

* **Labels Claros e Permanentes:** Nunca utilize *placeholders* como substitutos de *labels*. O *label* (ex: "Motivo da Contato") deve estar sempre visível acima do campo.
* **Feedbacks e Validação:** 
  * Os inputs devem validar informações (como CPF ou e-mail) ao perderem o foco (`onBlur`), não enquanto a usuária digita.
  * Mensagens de erro devem ser literais (ex: "O campo CPF precisa ter 11 dígitos" e não "Campo inválido").
* **Navegação por Teclado:** Como é um sistema de produtividade desktop, a usuária deve conseguir preencher e enviar formulários inteiros usando apenas a tecla `Tab` para avançar e `Enter` para submeter. O estado de foco (`:focus`) deve usar um contorno nítido no Azul Institucional.

## 5. Componentes e Tipografia (Consistência)

* **Tipografia Única:** Escolha apenas **uma** família tipográfica *Sans-Serif* (ex: *Inter*, *Roboto* ou *Segoe UI*) de alta legibilidade em monitores.
* **Hierarquia:**
  * H1: Título da Página (ex: "Tratativa #1204").
  * H2: Divisão de blocos (ex: "Histórico", "Dados do Cliente").
  * Body: Textos de registros (mínimo `14px` para densidade, ideal `16px` para leitura de parágrafos longos).
* **Botões:**
  * **Primário:** Preenchimento sólido Azul Claro, texto Branco. Usado para a ação principal da tela (1 por tela).
  * **Secundário:** Fundo transparente, borda Azul Claro, texto Azul Claro. Para ações de apoio.
  * **Terciário/Ghost:** Apenas texto (com *hover* sutil), para ações como "Cancelar" ou "Voltar".
* **Reaproveitamento:** Não crie um botão, tabela ou modal novo se um componente com a mesma função já existir no sistema. Consistência gera previsibilidade, e previsibilidade aumenta a velocidade de trabalho das operadoras.

## 6. Microinterações Funcionais
* **Feedback de Ação:** Toda ação (salvar, enviar) deve mudar o botão para estado de `Loading` e, ao concluir, exibir um *Toast* (notificação no canto da tela) verde e discreto confirmando o sucesso.
* **Zero Animações Decorativas:** Transições devem ser rápidas (máximo `150ms` a `200ms`). Em sistemas de trabalho diário, animações longas irritam e atrasam o usuário.
---

## 7. Revisão de 15/09/2026 — Direção visual

Esta seção registra uma mudança de direção decidida pelo responsável pelo
produto, que **altera regras das seções anteriores**. Ela existe para o
documento não contradizer o que o sistema faz.

**Motivação:** foi apresentada uma referência de dashboard moderno (padrão SaaS
contemporâneo: menu lateral claro e recolhível, conteúdo em cards agrupados por
categoria, cantos macios, respiro generoso, card de destaque com gradiente).

### O que muda em relação à seção 1 e 5

* **Cantos:** o raio base sobe de 4px para **8px**; cards podem usar **12px**.
  A proibição passa a valer para o exagero (pílulas, raios acima de 16px em
  containers), não para o arredondamento em si.
* **Menu lateral:** passa a ser **claro** (fundo branco), com a navegação
  recuando visualmente para o conteúdo de trabalho ganhar peso. Deve ser
  **recolhível**, com a preferência lembrada entre sessões, e permanecer
  **dividido em categorias**.
* **Respiro:** a regra "evite grandes áreas vazias" continua valendo para
  **telas operacionais** (listas, formulários, tratativas). No **Dashboard**,
  que é tela de leitura e panorama, o respiro é permitido.
* **Gradiente:** permitido **exclusivamente** em cards de destaque do
  Dashboard. Continua proibido em botões, cabeçalhos, ícones de indicador,
  selos de status e qualquer elemento de tela operacional.

### O que NÃO muda

Estas continuam sendo regras absolutas, porque servem à operação e não à
estética:

* Densidade de tabela entre 40px e 48px por linha.
* Labels permanentes; placeholder nunca substitui label.
* Validação no `onBlur`, com mensagem literal.
* Formulário inteiro operável por `Tab` e `Enter`, com foco visível.
* Vermelho restrito a ação destrutiva e à marca Meteoro.
* Sem emoji na interface.
* Transições de no máximo 200ms; nenhuma animação decorativa.
* Reaproveitar componente existente em vez de criar um novo equivalente.

---

## 8. Revisão de 18/09/2026 — A tela de entrada

Decisão do responsável pelo produto: a tela de entrada ganha destaque e
animação. Isso **abre uma exceção** à regra "zero animações decorativas" da
seção 6, reafirmada na seção 7.

### Por que a exceção não enfraquece a regra

A regra existe porque, no trabalho diário, animação atrasa e irrita. A tela
de entrada não é trabalho: é vista uma vez por sessão, e a animação não fica
entre a pessoa e o que ela quer fazer. As condições abaixo são o que garante
isso — sem elas, a exceção não vale.

### Condições

* **A animação fica só no painel de boas-vindas**, à esquerda. O formulário não
  anima nada além das transições normais (até 200ms).
* **O formulário pode ser usado no instante em que a tela abre.** O foco já
  está no e-mail; ninguém espera animação terminar para entrar.
* **O painel mostra a equipe**, com as fotos se revezando a cada 8 segundos,
  o lema da empresa e uma frase de autor clássico. As fotos **nunca são
  cortadas**: o retrato fica inteiro na altura do painel, e o resto é
  preenchido pela mesma foto, ampliada e desfocada.
* **Slides de destaque** (imagens horizontais, como o emblema M.E.T.E.O.R.O.)
  ocupam a largura do painel, inteiros, com as bordas dissolvidas no próprio
  fundo desfocado. Enquanto um destaque está na tela, o lema e a frase saem de
  cena para a imagem falar sozinha.
* **Frases em dois grupos, misturados:** clássicas, só com autoria confirmada
  na obra de origem (frase famosa com autor errado, na primeira tela do
  sistema, desmente o tema da sabedoria), e os bordões da própria equipe.
* **O painel é escondido da leitura de tela** (`aria-hidden`), porque não
  carrega informação necessária para entrar.
* **Gradiente, desfoque, zoom lento na foto e profundidade com o mouse** ficam
  permitidos neste painel, pelo mesmo motivo. Quem pediu para reduzir movimento
  não recebe nenhum deles, e vê a primeira foto e a primeira frase paradas.
* **A troca de fotos pausa com a aba escondida**, para não gastar processamento
  com uma tela que ninguém está vendo.

### Identidade da marca no painel

O painel usa a identidade das camisetas da equipe: **fundo marinho** e o lema
*"Simplificar & Transformar & Apoiar."*, com o **"&" em vermelho**. É a segunda
exceção à restrição do vermelho da seção 1: vale **só para o "&" do lema, só
neste painel**. Os dois tons ficam nos tokens `--marca-marinho` e
`--marca-vermelho`, em `src/index.css`.

### Fotos de pessoas

Imagem de pessoa é dado pessoal (LGPD), e a tela de entrada fica num endereço
que qualquer pessoa na internet consegue abrir. Cada foto precisa de
autorização de quem aparece nela, e sai do sistema se a pessoa pedir ou deixar
a equipe. As fotos ficam em `src/assets/equipe/`: para tirar alguém, apague o
arquivo; para incluir, coloque a foto na pasta.

### O que continua valendo na tela de entrada

Rótulos permanentes, validação no `onBlur` com mensagem literal, envio pelo
`Enter`, foco visível, sem emoji, e nada de controle que não faça nada — por
isso ela não tem "Criar conta" (cadastro é só pelo administrador) nem "Manter
conectado" (a sessão já é mantida).

### Um emoji, e só um

O bordão do Julliano é o próprio emoji de rato (🐀), e aparece assim entre as
frases da equipe na tela de entrada. É a **única** exceção à regra "sem emoji
na interface": não se estende a outras frases nem a outras telas.

### A sequência de boas-vindas (depois do login)

Uma vez por dia, depois do login, três atos antes do sistema: a saudação com
o nome e a foto, o resumo do dia (tratativas abertas, que vencem o SLA hoje e
já vencidas; o gestor vê as da equipe), e o emblema M.E.T.E.O.R.O. Depois, a
tela sobe como uma cortina e o conteúdo da página entra de cima para baixo.

É a segunda exceção desta seção, e tem as mesmas condições, mais três:

* **Dá para pular** com um clique ou qualquer tecla, a qualquer momento. É o
  que impede a sequência de virar espera obrigatória.
* **O nome é sempre o primeiro nome do cadastro de colaborador**, nunca o
  e-mail. Cadastro em caixa alta ("TEFÃO") vira "Tefão".
* **A cascata acontece só nessa entrada.** Navegar entre telas continua sem
  animação nenhuma.

### Esta exceção não se estende

Nenhuma outra tela ganha animação contínua por analogia. Uma nova exceção
exige uma nova revisão neste documento.

---

## 9. Revisão de 21/09/2026 — Cor suave e rolagem

Decisões do responsável pelo produto.

### Cor suave: superfície neutra, cor só no detalhe

As cores de **situação** (registrada, em andamento, vencida, encerrada)
continuam como estão: sinalizam estado, em selos pequenos. Para todo o resto:

1. **Superfície sempre neutra.** Card branco, fundo cinza-claríssimo. Nenhum
   card grande com fundo colorido cheio.
2. **A cor da categoria vai no detalhe**: o fundo claro de um ícone, uma linha
   fina, a cor de um número. Exemplo: Líder Técnico (roxo, `chart-5`) e Apoio
   N2 (petróleo, `chart-4`) se distinguem pelo ícone, não pelo card inteiro.
   O azul dos botões (`chart-1`/`primary`) não é usado como categoria:
   categoria não é ação.
3. **Cor forte só para o que pede ação ou sinaliza estado**: o botão
   principal (um por tela) e os selos de situação.
4. **Destaque de fundo usa a versão clara** (`bg-warning-soft`,
   `bg-info-soft`, `bg-primary/10`), nunca a cheia.

**Garantia automática:** `npm run lint` roda `ferramentas/conferir-cores.mjs`,
que falha com texto da mesma cor do fundo, texto branco sobre fundo claro, ou
card inteiro de cor cheia. Os dois primeiros deixavam texto invisível — foram
12 lugares depois da troca de cores da Fase 05, incluindo o detalhamento de
pontos da tratativa encerrada.

### Rolagem: sem barra dentro de card

**Card é resumo; a lista inteira é a página própria.** Um card com lista
mostra os primeiros itens (de 3 a 5, os mais relevantes) e um link com o total
— "Ver todos os 7 avisos". Nenhum card tem barra de rolagem por dentro.

Propostos, aguardando decisão:
* **Tabelas largas**: só as colunas que decidem, e o resto no painel de
  detalhe ao lado, em vez de rolagem horizontal.
* **Janelas altas**: painel lateral de altura cheia, ou passos curtos.
* **Rolagem da página**: barra fina e discreta.
