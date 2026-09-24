# Plano de ação — Apuração (telefone, chat e CX)

Escrito em 24/09/2026, a partir do código que está no ar e dos dados reais do
banco. Este documento é só sobre a Apuração: o que ela é hoje, o que está
errado, o que vai mudar e em que ordem.

---

## 1. O que a Apuração é hoje

Três fontes, três arquivos, um assistente de cinco passos (Tipo → Período →
Upload → Mapeamento → Resultado) que grava um registro `Apuracao` por pessoa.

| Fonte | O que traz | Vira |
|---|---|---|
| **55PBX** (telefone) | uma linha por ligação: agente, data, origem, status, FCR, CSAT | ligações, atendidas, avaliadas, positivas → **CSAT do telefone** e **performance** |
| **Zendesk** (chat) | uma linha por ticket: agente, ticket, data, satisfação boa/ruim | chats, avaliados, positivos → **CSAT do chat** |
| **Planilha de CX** | uma linha por avaliação: agente, data, 6 critérios, observação | média dos 6 critérios → **avaliação CX** |

Esses três números são a única fonte de **20 dos pontos da premiação**
(CSAT 10, performance 10) mais os 10 da avaliação CX — e alimentam o Hansei,
o Oráculo, o relatório de Qualidade e a Minha Performance.

### O que está no banco

- **65 apurações**, todas de **março, abril e maio de 2026**.
- **Nada desde junho.** O Ciclo 2 começou em 16/06 — hoje, na prática, todo
  mundo está com **CSAT, performance e CX valendo zero** na premiação do ciclo
  corrente. É o problema mais urgente desta frente.
- Todas gravadas como `incremental` + `semanal`.
- CX tem só 5 registros, todos de março.

---

## 2. O que está errado (e por que dói)

### 2.1 O arquivo é lido de um jeito frágil
A leitura do CSV é um `split` por vírgula ou ponto e vírgula, sem tratar
aspas. Qualquer campo com vírgula dentro — uma observação, um nome de cliente,
um motivo — **desloca todas as colunas daquela linha** sem erro nenhum na
tela. O número sai errado e ninguém percebe.

### 2.2 Tudo é remapeado a cada importação
São 6 campos para o telefone, 5 para o chat e 9 para o CX, escolhidos à mão
toda vez. Depois, **cada nome de agente é vinculado à mão** à pessoa do
sistema. É o mesmo trabalho repetido toda semana, e é onde entra erro humano.

### 2.3 O período é escolhido, não lido
Você escolhe ano e mês, e a apuração é gravada como "01 a 31 daquele mês",
mesmo que o arquivo tenha uma semana só — ou dias de dois meses. O período
gravado não descreve o que foi importado.

### 2.4 Importar duas vezes não avisa nada
Não há conferência de dia repetido nem aviso de "este período já foi
importado". A proteção existe só na leitura (o sistema mantém a importação
mais recente de cada dia), mas a tela não conta isso para você.

### 2.5 Não dá para desfazer
Não existe histórico de importações: o que veio em cada arquivo, quantas
linhas foram lidas, quantas foram descartadas e por quê. E não dá para
remover uma importação errada sem mexer registro a registro.

### 2.6 As regras estão só no código
Três regras importantes do telefone vivem hoje dentro do arquivo de cálculo, e
não no POP:
1. Uma ligação só conta como **avaliada** se o FCR for 1 ou 2.
2. Só é **positiva** se o CSAT for 4 ou 5 **e** o FCR for 1.
3. **Transferência de fila** conta como atendida (entra na performance), mas
   nunca gera avaliação.

Elas podem estar certas — mas precisam ser confirmadas por você e escritas no
POP, porque decidem pontos de premiação.

### 2.7 A tela mistura importar e analisar
O assistente de importação e os relatórios de apuração moram na mesma página,
com mais de mil linhas. Quem só quer conferir um número precisa passar pelo
fluxo de importação.

---

## 3. Para onde vamos

**Princípio:** importar tem que ser chato e seguro; analisar tem que ser
rápido e claro. São duas telas, não cinco passos.

### Fase 1 — Importar sem erro (a base de tudo) — **FEITA em 24/09/2026**

> Tudo abaixo já está no código (migration 24 + tela nova). O único ponto que
> continua provisório é o reconhecimento automático das colunas: ele funciona
> por sinônimos comuns e será afinado quando os três arquivos de exemplo
> chegarem. Nada disso trava o uso — o de-para é editável e fica guardado.

1. **Leitor de CSV de verdade**: aspas, vírgula ou ponto e vírgula, acentuação
   e Excel brasileiro. Antes de qualquer conta.
2. **O sistema reconhece a fonte** pelo cabeçalho do arquivo: "isto é um
   relatório do 55PBX", "isto é do Zendesk". O mapeamento vem pronto e
   continua editável.
3. **O mapeamento fica guardado** por fonte. Você corrige uma vez; na próxima
   semana ele já vem certo.
4. **Os nomes dos agentes ficam guardados** — "Ana Flávia G. Amarante" no
   55PBX é a Ana do Portal. Uma vez ligado, nunca mais.
5. **O período sai do arquivo** (menor e maior data), não de um seletor.
6. **Prévia antes de salvar**, com: quantas linhas foram lidas, quantas foram
   descartadas e por quê, quais dias entram, o que muda em relação ao que já
   está gravado e quem ficou sem vínculo.
7. **Aviso de repetição**: "os dias 16 a 20 já foram importados em 22/09 — esta
   importação substitui aqueles números".
8. **Histórico com desfazer**: cada importação vira um lote, com arquivo,
   quem importou, quando e quantas linhas. Desfazer remove o lote inteiro.

### Fase 2 — A tela de análise repaginada
- Separar **Apuração** (importar) de **Análise** (ler os números), no padrão
  que já usamos: cartões por pessoa, e o detalhe dentro.
- Por pessoa: CSAT do telefone, CSAT do chat, CSAT consolidado, performance,
  CX — **com os pontos que cada um vale hoje** e quanto falta para a próxima
  faixa (95% = 10 pontos, 90% = 9, 85% = 7; performance 100% = 10, 90–99% = 7;
  CX 4,5 = 10, 4,3 = 4, 4,2 = 1).
- Por dia e por semana, para achar o dia ruim que puxou o mês.
- Um "como calculamos" em português em cada quadro, como nos relatórios.

### Fase 3 — As regras, no POP e na tela
- Confirmar com você as três regras do telefone, a regra do chat e a do CX.
- Escrever no POP 11 (ou no POP da apuração) exatamente como cada indicador é
  calculado, com um exemplo numérico.
- A tela passa a mostrar a regra ao lado do número.

### Fase 4 — Integrações e vigilância
- **Aviso no painel do gestor** quando o ciclo corrente está sem apuração há
  mais de X dias — hoje o sistema fica em silêncio enquanto a premiação
  inteira vale zero.
- **Lacunas visíveis**: dias úteis sem dados no período, e meses faltando.
- Conferir que Hansei, Oráculo, Qualidade, Minha Performance e o ranking leem
  todos da mesma função (`indicadoresDoCiclo`) — hoje leem, e isso não pode
  regredir.

---

## 4. O que muda no banco

Proposta de **migration 24**, pequena, sem mexer no que já existe:

| Campo novo em `apuracao` | Para quê |
|---|---|
| `fonte` | `55pbx`, `zendesk` ou `planilha_cx` — hoje só existe o tipo (telefone/chat/cx) |
| `importacao_id` | agrupa todos os registros de uma mesma importação (é o que permite desfazer) |
| `arquivo_nome` | de qual arquivo aquilo veio |
| `linhas_lidas` / `linhas_descartadas` | conferência rápida do que entrou |

E uma tabela nova, `apuracao_mapeamento`, com o de-para de colunas e de nomes
de agente por fonte — é ela que faz o sistema "lembrar" do mapeamento.

---

## 5. O que eu preciso de você

1. **Um arquivo de exemplo de cada fonte** (pode ter 5 linhas, pode ter os
   nomes trocados): 55PBX, Zendesk e a planilha de CX. Sem ver as colunas
   reais, o reconhecimento automático vira chute.
2. **A cadência de cada uma**: telefone e chat são semanais? O CX é quinzenal?
   Qual o dia de corte?
3. ~~**As três regras do telefone** acima: confirmo como estão?~~
   **Confirmado em 24/09/2026:** sim, mantém as três. Já é o que o código
   faz hoje (`calcularTelefone`, sem mudança nenhuma): avaliada exige FCR 1
   ou 2; positiva exige CSAT 4 ou 5 **e** FCR 1; transferência de fila conta
   como atendida (entra na performance) mas nunca gera avaliação.
   **Refinado no mesmo dia**, a partir do relatório real do 55PBX: nota 3
   com FCR 1 é **neutra** (não positiva, não negativa); FCR 2 é **sempre
   negativa**, qualquer que seja a nota. O CSAT passou a ser
   positivas ÷ (positivas + negativas), não mais positivas ÷ avaliadas — ver
   "Telefone (55PBX): nota 3 é neutra..." em decisoes-de-regra.md.
4. ~~**Chat**: o CSAT é bons ÷ (bons + ruins)?~~ **Respondido em 24/09/2026:**
   sim, e "ruim=1" sempre conta como negativo na premiação — mesmo quando o
   ticket é nota 3 (neutra pelo critério do Pedro, negativa pelo da
   empresa). O Zendesk não manda nota nenhuma no arquivo; a classificação
   (1, 2 ou 3) é manual, ticket por ticket, na aba **Apuração → Ouvidoria**.
   Aparece à parte num comparativo "com e sem os neutros", só informativo.
   Ver decisoes-de-regra.md, "Ouvidoria do chat".
5. **CX**: quem avalia, quantas avaliações por pessoa em cada quinzena, e a
   nota é a média simples dos seis critérios?
6. **Reimportar o mesmo período**: substitui o que estava lá (é o que o
   sistema faz hoje na leitura) ou soma?
7. **O aviso de "ciclo sem apuração"** no painel: faz sentido?

---

## 6. Ordem sugerida

1. **Fase 1** — sem ela, qualquer número novo continua sujeito ao mesmo erro.
2. **Importar junho a setembro** — o Ciclo 2 precisa parar de valer zero.
3. **Fase 2** — a tela de análise.
4. **Fases 3 e 4** — regras no POP e os avisos.

O passo 2 é seu, mas fica muito mais rápido depois da Fase 1: quatro arquivos
por fonte, com mapeamento já reconhecido e prévia antes de salvar.
