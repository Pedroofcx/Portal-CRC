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
