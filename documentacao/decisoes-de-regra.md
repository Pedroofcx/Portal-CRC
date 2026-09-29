# Decisões de regra de negócio — Portal CRC

Registro das regras que foram **escolhidas**, não deduzidas do código antigo.
Cada uma existe porque o comportamento herdado do Base44 era ambíguo,
contraditório ou irreproduzível.

---

## SLA — como o tempo é contado (15/09/2026)

**Decisão:** tempo de SLA é o corrido do registro ao encerramento, descontando
apenas os períodos em que o SLA esteve **formalmente congelado**.

**Por que foi preciso decidir.** A regra do Base44 não é reproduzível. Nas 309
tratativas encerradas importadas:

- o `tempo_total_minutos` gravado equivale ao tempo corrido em 236 casos e é
  muito menor em 73, sem padrão que explique a diferença;
- três tratativas constam como "fora do SLA" com 2, 10 e 1.070 minutos contra
  um prazo de 24 horas — nenhuma fórmula produz isso.

**As alternativas, medidas nos dados reais:**

| Regra | Reproduz o histórico | Diria "dentro do SLA" |
|---|---|---|
| Corrido (registro → encerramento) | 93% | 35% |
| **Corrido menos congelamento formal** | **92%** | **36%** |
| Corrido menos congelamento e dependência externa | 76% | 53% |
| Só tempo em atendimento ativo | 78% | 62% |
| *Registrado pelo Base44* | — | *40%* |

**O raciocínio.** O relógio não para em dependência externa: SLA é promessa ao
cliente, e ele espera o mesmo tanto independentemente de quem travou o caso.
Dependência externa é 17% de todo o tempo da operação — descontá-la levaria o
indicador de 35% para 53% sem que nada tivesse melhorado.

O relógio para no congelamento explícito porque é um ato registrado, com data
e responsável, e porque o produto tem um botão "Congelar SLA". Se o relógio
não parasse ali, o botão não faria nada. São 1,7% do tempo.

**O histórico foi recalculado** com esta régua, para comparações entre
períodos serem válidas. O indicador histórico mudou de 40% para cerca de 35%.

**Onde vive:** `supabase/migrations/09_sla_no_servidor.sql`, funções
`sla_horas`, `minutos_congelados` e `tempo_sla_minutos`.

**Em aberto:** o prazo de `procon` está em 24 horas, herdado do padrão do
código. Prazos legais de Procon costumam ser contados em dias. Há 1 registro
na base. Alterar em `sla_horas`.

---

## Custo operacional — duas réguas de tempo (15/09/2026)

**Decisão:** SLA e custo medem coisas diferentes e usam relógios diferentes.

| | Mede | Relógio |
|---|---|---|
| **SLA** | A espera do cliente | Tempo **corrido**, menos congelamento formal |
| **Custo** | O esforço da equipe | Tempo **efetivo**: só `tratativa_iniciada` e `em_andamento` |

Confundir as duas é o erro fácil aqui. Uma tratativa pode estourar o SLA — o
cliente esperou 10 dias — e custar pouco — a equipe trabalhou 40 minutos. As
duas afirmações estão certas ao mesmo tempo, e cada indicador responde a uma
pergunta diferente.

**Onde vive:** `supabase/migrations/10_custo_operacional.sql`, funções
`tempo_efetivo_minutos` e `custo_operacional`.

---

## Custo operacional — divisão pela carga simultânea (15/09/2026)

**Decisão:** o custo de uma tratativa é dividido pelo número de tratativas que
o mesmo agente tinha em atendimento ao mesmo tempo.

**Por que foi preciso.** Quando o custo saiu do zero pela primeira vez, o
número apareceu: R$ 683.446 no total, **125 horas efetivas por tratativa**.
São mais de 15 dias úteis de alguém dedicado a uma única reclamação — o que
não descreve a operação.

O que a conta media não era tempo trabalhado, e sim tempo no estado
`em_andamento`. Uma tratativa fica nesse estado durante dias enquanto o agente
atende outras ao mesmo tempo. A premissa de dedicação exclusiva veio herdada
do Base44 e só ficou visível quando o número deixou de ser zero.

**A carga medida nos dados reais:**

| Agente | Tratativas | Horas ativas | Carga simultânea | Pico |
|---|---|---|---|---|
| Sirlene | 102 | 5.306 | 6,65 | 12 |
| Dayane | 103 | 3.977 | 1,74 | 5 |
| Bárbara | 76 | 3.071 | 1,47 | 6 |
| Ana Flávia | 68 | 767 | 1,03 | 2 |

**Efeito:** custo total de R$ 683.446 para ~R$ 212.679 — redução de 69%.

**A RESSALVA, que precisa andar junto com o número.** A carga simultânea é
deduzida de **como cada pessoa usa o sistema**, não de quanto ela trabalha.
Ana Flávia tem carga 1,03 porque encerra e passa ao próximo; Sirlene tem 6,65
porque deixa vários abertos em paralelo. Isso muda o custo por tratativa de
cada uma sem que nenhuma tenha trabalhado mais ou menos.

O número ficou muito mais defensável que antes, mas continua sendo uma
**estimativa de ocupação, não uma medição de esforço**. Medir esforço de
verdade exigiria cronômetro na tratativa — preciso, porém com custo para quem
opera.

**Onde vive:** `supabase/migrations/11_custo_por_carga_simultanea.sql`.
`npm run analisar-carga` remede a carga a partir dos dados a qualquer momento.

---

## Custo operacional — salário ausente (15/09/2026)

**Decisão:** salário não cadastrado resulta em custo zero e aviso na tela, não
em valor estimado.

**Por que.** `sanitizeSalario` aplicava R$ 2.000,00 fixos quando o salário
faltava — e o comentário da própria função dizia que nunca faria isso. Custo
calculado sobre salário inventado entra no relatório da diretoria com a mesma
aparência de um número apurado.

`AvisoSalarioAusente` mostra quantas tratativas ficaram de fora do cálculo e
de quem é o cadastro incompleto, para o total menor não passar despercebido.

**Onde vive:** `src/components/utils/helpers.js` e
`src/components/jornada/AvisoSalarioAusente.jsx`.

---

## Pontuação — proteger as entradas em vez de mover o cálculo (18/09/2026)

**Decisão:** a pontuação continua sendo calculada no navegador; o que muda é
que os campos de onde ela sai passam a ser imutáveis.

**Por que.** O cálculo é determinístico — mesmas entradas, mesmo resultado. Se
as entradas forem confiáveis, o resultado é confiável mesmo calculado no
cliente, e a tela continua respondendo na hora sem ida ao servidor.

O buraco não estava no cálculo, estava nas entradas. A Fase 03 travou a tabela
`pontuacao` para escrita de gestor, mas `tratativa` continuou gravável por
qualquer usuário logado — e a pontuação sai de campos DA TRATATIVA. Pelo
console, um agente aumentava a própria nota do trimestre. Como a pontuação
define premiação, era o caminho de fraude mais direto que restava.

**Duas camadas de proteção:**

1. **Campos calculados pelo servidor** — `encerrado_no_sla`,
   `tempo_total_minutos`, `sla_atribuido`, `custo_operacional_reais` — nunca
   aceitam valor vindo do cliente. O valor enviado é descartado em silêncio,
   não rejeitado com erro: o frontend costuma devolver o objeto inteiro num
   update, e isso não é tentativa de fraude, é ruído normal.

2. **Campos que geram ponto** congelam quando a tratativa encerra. Gestor
   ainda corrige, porque auditar é função dele — o campo
   `solucao_replicavel_auditada` existe exatamente para isso.

**Onde vive:** `supabase/migrations/12_pontuacao_confiavel.sql`.
`npm run testar-pontuacao <email> <senha>` tenta a fraude como agente comum.

---

## O formato da resposta da IA é pedido no texto, não por contrato

**A decisão.** A Edge Function `invocar-llm` tenta primeiro o `responseSchema`
do Gemini — o contrato formal em que o provedor garante o molde da resposta — e
cai para uma instrução dentro do prompt quando ele é recusado.

**Por que não é uma dedução.** Seria mais simples usar só o contrato formal, e
foi assim que a função nasceu. O que mudou a decisão foi medição: em duas
execuções seguidas do `npm run testar-ia`, todo pedido com `responseSchema`
voltou com erro de servidor e todo pedido sem ele funcionou. Sobrecarga não
escolhe requisição, então a causa é o contrato, não a fila.

**O que se perde.** Pela segunda via, o formato passa a ser garantido por
instrução. Um modelo pode, raramente, devolver algo fora do molde — e nesse
caso a tela avisa "o modelo devolveu um JSON inválido" em vez de mostrar dado
errado. A alternativa era a funcionalidade não existir.

**O que reverte sozinho.** A primeira via continua sendo sempre tentada. No dia
em que o provedor voltar a aceitar o contrato formal, a função volta a usá-lo
sem ninguém mexer em nada. O campo `via` na resposta diz qual caminho
respondeu.

**Medido em:** 18 de setembro de 2026, modelo `gemini-3.6-flash`.

---

## Avisos e pesquisas: quem recebe, e quando somem

**Decidido em:** 21 de setembro de 2026, pelo responsável pelo produto.

**A regra nova.** Quem é cadastrado agora só recebe — e só vê — avisos e
pesquisas publicados **depois** do seu cadastro. Nada do passado aparece para
quem acabou de chegar: nem na central de pendências da tela inicial, nem na
lista de Avisos, nem na de Pesquisas. O gestor continua vendo tudo nas listas.

**As outras regras, que já deviam valer e não valiam:**
* aviso só para quem é destinatário (todos, agentes ou gestores), só se estiver
  ativo, já publicado e não expirado (`data_expiracao` era ignorada);
* pesquisa só dentro do período (`data_inicio` a `data_fim`) — uma pesquisa
  encerrada em 09/02/2026 continuava aparecendo;
* aviso some quando a pessoa confirma a leitura; pesquisa, quando ela responde.

**Por que os pop-ups voltavam depois de confirmados.** Três causas:
1. depois de responder, a lista de pendências só era relida um instante depois;
   se nesse intervalo outro pop-up abria ou fechava, a mesma pesquisa voltava.
   Agora o que foi tratado sai da fila na hora;
2. a confirmação de leitura era procurada entre as últimas 1000 de todo mundo —
   quando passasse disso, as antigas sumiam da conta e os avisos voltavam. Agora
   cada pessoa busca só as dela;
3. na troca de sistema, parte das confirmações e respostas ficou gravada com o
   id antigo de quem as fez (inclusive 9 respostas do gestor, de 15/09), e o
   sistema não as reconhecia. O importador corrigido evita isso na migração
   completa.

**Onde mora:** `src/lib/pendencias.js` (regras, com testes em `npm run testar`)
e `src/components/dashboard/CentralDePendencias.jsx` (uma pendência por vez).

**O que falta para ser regra do banco.** Hoje o filtro é das telas. Pelo
console do navegador, um agente ainda consegue listar avisos antigos. Se isso
precisar ser garantido pelo banco (como as anotações pessoais), é uma migration
de políticas — decisão pendente.

---

## Reclame Aqui e GMN inativados valem +1 — só a partir do Ciclo 3 (22/09/2026)

**Decisão (Pedro):** reclamação do Reclame Aqui inativada e avaliação do Google
Meu Negócio inativada passam a valer **+1 ponto**, somente a partir do Ciclo 3.
Os ciclos 1 e 2 não mudam.

**Como "a partir do Ciclo 3" foi traduzido.** Tratativa **encerrada de
17/09/2026 em diante**, no horário de Brasília. O Ciclo 2 termina em 16/09 e o
Ciclo 3 ainda não estava cadastrado. A data, e não o cadastro do ciclo, garante
que nada do Ciclo 2 mude — mesmo que o Ciclo 3 seja cadastrado começando no
próprio dia 16 (os ciclos 1 e 2 se tocam no dia 16/06).

**O campo.** `inativada_na_plataforma` (sim/não), marcado pelo agente no
encerramento de Reclame Aqui e de GMN. Soma com os outros pontos do tipo. Como
os demais campos que geram ponto, congela quando a tratativa encerra — depois
disso, só o gestor corrige.

**Onde vive:** `inativadaPontua` e `calculateTratativaPoints` em
`src/components/utils/helpers.js`; `pontos_da_tratativa` e o congelamento em
`supabase/migrations/19_inativadas_pontuam.sql`. Os POPs 04, 05 e 11 já trazem
o informativo.

---

## Pontuação — reabertura apurada pelos dados, 0,5 por abertura, ritmo manual (22/09/2026)

**Decisões (Pedro):**

1. **Reabertura.** O +1 "sem reabertura" da reclamação interna é perdido se o
   **mesmo cliente** (id da base) abrir **qualquer nova tratativa**, com
   qualquer agente, em até **7 dias corridos** depois do encerramento no
   Portal. Passados os 7 dias sem nova abertura, o ponto conta sozinho — antes
   ele dependia de alguém clicar em "confirmar", e 6 tratativas do Ciclo 2
   estavam paradas esperando isso. O gestor ainda pode registrar que o cliente
   voltou por um canal que não virou tratativa.
2. **Abertura.** Cada tratativa aberta no Portal vale **0,5 ponto** para o
   agente responsável, no ciclo em que foi registrada. Vale do **Ciclo 2 em
   diante** (ciclos que começam em 16/06/2026 ou depois) e recalcula o Ciclo 2.
   Tratativa excluída não conta.
3. **Ritmo (comentário a cada 36h úteis).** A atualização é feita no Zendesk; a
   gestão confere o histórico e lança como bônus manual. A tela de bônus tem um
   atalho com as faixas 10 / 7 / 4.
4. **Contestação:** o total possível é **2,5**, não 3,5 (erro do documento).

**Onde vive:** `src/lib/pontuacaoCiclo.js` (regras que cruzam tratativas),
usado pelo ranking, pelo "Meu ciclo", pela Auditoria de Pontuação e pelo
detalhe da tratativa. `calculateTratativaPoints` continua olhando uma
tratativa só.

---

## Solução replicável só com aprovação; indicadores entram no total (22/09/2026)

**Decisões (Pedro):**

1. **Solução replicável.** Do Ciclo 2 em diante, o +0,5 só conta depois que o
   gestor **aprova**, uma por uma, na tela **Soluções replicáveis** (Admin).
   Contestar exige parecer, que o agente vê na tratativa. Só o gestor grava a
   decisão (migration 20). No Ciclo 1 a marcação do agente continua bastando.
2. **Indicadores entram no total**, do Ciclo 2 em diante:
   - **CSAT** = (CSAT do telefone + CSAT do chat) ÷ 2, cada canal no ciclo
     inteiro (positivas ÷ avaliadas). Canal sem nenhuma avaliação fica fora da
     média, para não punir quem não atendeu por ele;
   - **Performance** = ligações atendidas (não abandonadas) ÷ ligações;
   - **Avaliação CX** = média de todas as avaliações do ciclo.
   Faixas de pontos: `src/lib/faixasIndicadores.js`.

**Como o ciclo é apurado.** Telefone e chat são guardados dia a dia, então o
ciclo soma exatamente os dias dele; um dia importado duas vezes vale a
importação mais recente (havia sobreposição em abril). A avaliação CX é por mês
de apuração e o mês entra no ciclo em que termina.

**"Do Ciclo 2 em diante" é pelo ciclo, não pela data.** O dia 16/06 pertence
ao Ciclo 1 e ao Ciclo 2; decidir pela data mudaria o Ciclo 1 nesse dia.
Conferido: o Ciclo 1 ficou idêntico ao anterior.

**Onde vive:** `src/lib/indicadoresCiclo.js`, `situacaoReplicavel` e
`replicavelExigeAprovacao` em `helpers.js`, `src/pages/SolucoesReplicaveis.jsx`,
`supabase/migrations/20_replicaveis_e_regras_de_pontos.sql`.

**Confirmado por Pedro (22/09/2026):**
- o +1 "sem reabertura" **não exige** encerramento no prazo — quem encerrou
  fora do prazo e o cliente não voltou em 7 dias ganha o ponto;
- **performance:** 100% das ligações atendidas = 10 pts; 90% a 99% = 7 pts;
  abaixo de 90% não pontua (o documento dizia 95%);
- **critério de desempate:** ainda não definido.

---

## Hansei — números com as regras da premiação, e os enviados recalculados (22/09/2026)

**O que estava errado** (conta herdada do Base44): CSAT = média dos CSATs de
cada dia, **pulando os dias com 0%** (Ana: 91,7% no Hansei, 64,9% de verdade);
dia importado duas vezes contava duas vezes; a avaliação CX nunca era lida;
os "pontos do trimestre" vinham da tabela antiga do Base44.

**Agora** (`src/lib/hanseiDados.js`): CSAT, performance e CX com a mesma conta
da premiação (`indicadoresDoCiclo`) aplicada ao período do Hansei; pontos =
os acumulados no ciclo até o último dia do período (mesma conta do ranking);
período antes do Ciclo 1 fica sem pontos ("—"). Os alertas do Hansei usam as
faixas do POP 11 (CSAT 85/90/95, performance 90/100), não mais metas soltas.

**Decisão de Pedro:** recalcular os já enviados. Feito em 22/09/2026 com
`node ferramentas/recalcular-hansei.mjs --gravar` — 23 de 23; só
`dados_consolidados` mudou (comentário, envio e visualização ficaram).

---

## Relatórios organizados por pergunta, e as contas refeitas (22/09/2026)

**Decisão (Pedro):** uma página de Relatórios com seis grupos, cada um
respondendo a uma pergunta, com "Como calculamos" em português:
Operação, Canais, Qualidade, Pessoas e premiação, Financeiro, Jornada do
cliente. As contas moram em `src/lib/relatorios/*.js` (testadas).

**Contestação — o que é perda (decisão A):** perda = sem acordo, sem contato,
contestou (prazo de cancelamento ou duplicidade); acordo = perde só a
diferença inicial − acordado; recuperado = pagou ou cancelou; em andamento
fica fora das somas.

**Risco reputacional (decisão B):** sai da soma em R$; vira contagem de casos.
O "custo de retrabalho" também saiu (somava de novo metade das horas da
mesma tratativa).

**Custo operacional:** todas as telas usam o valor oficial do servidor
(dividido pela carga simultânea); o módulo financeiro recalculava sem essa
divisão e mostrava R$ 882 mil contra R$ 197 mil.

**Analytics Preditivo → grupo Operação:** saíram "risco de SLA" (dava 130%),
saturação, simulações e o texto "CMMI"; ficaram fila de hoje, entrada × saída
no mesmo período, dias para zerar a fila e tempo típico (mediana) por canal.

**Outras correções:** nota média do Reclame Aqui conta as notas 0; filtro
"até" inclui o último dia (horário de Brasília); CSAT da equipe ponderado pelo
volume; dia de apuração importado duas vezes conta uma vez; a aba Ranking lia
a tabela antiga do Base44 — agora é o ranking oficial, e a rotina que gravava
nessa tabela saiu.

---

## Escalas ainda apontavam para os ids do Base44 (22/09/2026)

**O que estava quebrado.** A escala guarda a pessoa dentro de um JSON
(`turnos[].manha[].colaborador_id` e `colaboradores_participantes`), e esses
ids continuaram sendo os do Base44 depois da migração. O relatório de
Produtividade por Turno mostrava **0 tratativas para todo mundo, em todos os
dias** — sem erro nenhum na tela, só zeros. É o mesmo caso das observações
(migration 15), que já tinha aparecido antes.

**Correção:** `supabase/migrations/21_escalas_com_ids_novos.sql` troca, dentro
do JSON, cada id antigo pelo id novo (608 referências em 17 escalas). Uma
varredura em todas as tabelas confirmou que só as escalas tinham o problema.

**No mesmo relatório:** o dia passou a ser comparado em horário de Brasília
(antes em UTC, o que jogava tratativas do fim do dia para o dia seguinte),
tratativas excluídas saíram da conta, e quem trabalha nos dois turnos do mesmo
dia deixou de ter as tratativas contadas duas vezes.

**Oráculo:** o contexto do colaborador (CSAT, tratativas e pontos) vinha da
tabela de pontuação antiga e de uma apuração solta — mostrava 3 pontos para
quem tinha 77,5. Agora usa as contas oficiais do ciclo ativo.

---

## Escalas e Turnos viraram um módulo só (24/09/2026)

**Por quê.** Eram dois módulos falando da mesma semana — "Escalas" com um
calendário mensal de eventos por equipe e "Turnos" com um painel WFM de slots
— e nunca batiam. Pedro: *"O modulo vai se chamar Escalas e lá dentro terá
Escala de Trabalho e Escala de Turno"*. Sem visão de mês: a semana é a unidade
de trabalho do CRC.

**Escala de Trabalho.** Três presenciais e dois em home office por dia. O botão
"Montar a semana" distribui os dois home office revezando quem ficou menos
vezes em casa nas últimas quatro semanas, e é **determinístico** — a mesma
semana montada duas vezes dá o mesmo resultado. O antigo gerador sorteava
aleatoriamente, e o gestor não conseguia repetir o que tinha visto. Cada
célula continua editável à mão, e a conferência acusa na hora dia com menos de
três presenciais ou com home office demais. Férias aprovadas travam o dia.

**Escala de Turno.** Duas pessoas atendendo de manhã; as demais analisam
tickets. À tarde inverte. O gestor só escolhe a dupla da manhã — a tarde é o
espelho, calculado na hora. A dupla gira a cada dia, e o "Equilíbrio da semana"
mostra quantas metades de dia cada pessoa passou atendendo.

**Compatibilidade.** As 17 escalas de turno e as 388 atribuições de trabalho
que vieram do Base44 continuam sendo lidas: `EscalaTurno.turnos[].manha/tarde`
guarda quem está **atendendo** (o relatório de Produtividade já lia assim) e as
atribuições antigas, que cobrem períodos, valem para todos os dias que elas
pegam. As novas são de um dia só, e a marcação mais recente ganha.

**Saiu:** a página Turnos (agora redireciona para Escalas), o painel WFM com
slots e travas, o calendário mensal por equipe e o card "Meu turno hoje" — que
virou "Minha semana", com o local de trabalho e o papel de cada metade do dia.

---

## Pesquisa anônima de verdade, e quem respondeu (24/09/2026)

**O pedido.** Pedro: *"o sistema tem que guardar quem respondeu a pesquisa, a
não ser que ela seja configurada como anônima"*.

**O problema de guardar tudo na mesma linha.** Se a resposta anônima ficasse
na mesma tabela com o `colaborador_id` só escondido na tela, bastaria abrir o
banco para saber quem disse o quê — e aí o anonimato é só uma promessa. Por
outro lado, sem saber quem respondeu, o popup de pendências ficaria pedindo
resposta para sempre a quem já respondeu.

**A solução (migration 23):** duas coisas separadas. `PesquisaParticipacao`
guarda *que* a pessoa respondeu (pesquisa, pessoa, data, sem as respostas);
`RespostaPesquisa` guarda *o que* foi respondido — e, quando a pesquisa é
anônima, nasce sem `colaborador_id` e sem nome. O gestor vê quem falta
responder e vê todas as respostas, mas não consegue ligar uma coisa na outra.

**De quebra, um buraco fechado.** A política antiga dizia apenas "colaborador
ativo lê", então qualquer pessoa da equipe conseguia listar as respostas de
todo mundo pelo console do navegador. Agora o gestor lê tudo e cada pessoa lê
só as próprias.

**Na tela:** cards por pesquisa separados em No ar / Encerradas / Arquivadas,
com "X de Y responderam" já na lista; dentro, o resultado por pergunta (média
e distribuição nas escalas, contagem nas escolhas, lista nos textos), quem
respondeu com data, quem falta, e Editar / Duplicar / Reenviar / Arquivar. O
gestor também responde: o que falta para ele fica no topo da tela. Saíram o
painel de agendamento (metadado que nunca disparou nada) e a tabela de ícones.

---

## Férias: o pedido e a aprovação passam a acontecer no Portal (24/09/2026)

**Como era.** Só o gestor entrava no módulo. Ele lançava à mão cada período
no ciclo do colaborador, e o agente via uma lista sem poder pedir nada. A
tabela `SolicitacaoFerias` existia desde o Base44 com um único registro — o
fluxo nunca tinha sido ligado.

**Como ficou.** O agente abre Férias e vê o próprio saldo por período
aquisitivo, quando cada um vence, quem já está de férias e os próprios
pedidos. Pede pelo Portal; a gestão aprova, recusa (com motivo) ou sugere
outra data na aba Pedidos. Aprovar grava um fragmento no `CicloFerias` — é
assim que o saldo baixa, sem lançamento manual em paralelo.

**As regras que Pedro definiu**, conferidas enquanto a pessoa escolhe a data:
até **3 pessoas de férias ao mesmo tempo** (a conta olha o dia mais cheio do
período, não só a data de início), **30 dias de antecedência** (Art. 135 da
CLT), mínimo de 5 dias corridos por período, aviso quando nenhum período do
ano chega a 14 dias, venda de até 10 dias e saldo suficiente no período
aquisitivo. Um pedido que fere uma dessas regras nem chega a ser enviado.

**O período que vence primeiro é usado primeiro.** Sem isso, o saldo mais
antigo vence enquanto o mais novo é gasto — e férias vencida vira dobra de
pagamento pela CLT.

**Nas outras telas:** a Escala de Trabalho trava o dia de quem está de férias
aprovadas, e o card do painel do operador passou a mostrar saldo, vencimento e
pedido em análise em vez do antigo "períodos esperando validação", que não
validava nada.

---

## A escala de turno virou grade de meio período (24/09/2026)

**O que faltava.** A primeira versão assumia que todo mundo trabalha o dia
inteiro e só troca de função no meio dele — duas pessoas atendendo de manhã,
invertendo à tarde. Pedro, usando a tela: *"eu não posso alocar pessoas em
turnos diferentes... hoje elas estão de tarde, amanhã de manhã"*. Faltava o
turno de verdade: alguém que só trabalha de manhã, outro só de tarde.

**Como ficou.** A escala de turno agora é uma grade de pessoas × dias com
**duas células por dia** (manhã e tarde). Cada célula tem três estados e gira
no clique: **atende → analisa tickets → fora**. "Fora" é o que permite o meio
período. Por dia ainda dá para **inverter** (troca manhã por tarde do time
inteiro), **copiar o dia anterior** e marcar **sem operação**; "Montar no
padrão" continua fazendo o 2-atendendo-invertendo, que é o normal do CRC.

**No banco:** cada dia passou a ter quatro listas — `manha`/`tarde` (quem
atende, as mesmas chaves que o relatório de produtividade lê desde o Base44) e
`analisa_manha`/`analisa_tarde`. Quem não está em nenhuma das duas listas da
metade não trabalha naquela metade.

**Semanas antigas.** As 17 escalas que vieram do Base44 guardavam turno de
horário (metade do time de manhã, metade à tarde) — e é assim que elas
aparecem agora: quem está na lista da manhã trabalha de manhã, quem não está
aparece como fora naquela metade. Nada foi reescrito.

**No relatório de produtividade**, a metade do dia passou a contar quem
atendeu *e* quem analisou tickets: antes, quem só analisava não aparecia.

---

## O turno vem do relógio, e a produtividade mudou de lugar (24/09/2026)

**Turno automático na distribuição.** Em "+ Nova Atribuição" o turno era um
campo para escolher à mão, ao lado do horário — dava para registrar 09:15 e
marcar "tarde", e aí o relatório contava o contrário do que tinha acontecido.
Agora o turno sai do horário: **até 11:59 é manhã, das 12:00 em diante é
tarde** (o expediente vai das 08:00 às 18:00). O campo continua sendo gravado,
só deixou de ser escolhível.

**Produtividade por turno saiu de Escalas e foi para Relatórios.** Pedro:
*"esta que deve ficar em relatórios e desvincular de escalas"*. Faz sentido:
**Escalas planeja, Relatórios mede**. O bloco agora vive no grupo Operação e
obedece ao filtro de período dos relatórios, em vez do seletor de semana que
só existia ali dentro.

**A conta ficou mais honesta.** Antes, toda tratativa do dia era contada nos
dois turnos em que a pessoa estava escalada, e a escala decidia o turno. Agora
o turno da tratativa vem do **horário em que ela foi registrada** — o número
não muda quando a escala é editada depois. A escala entra só para dizer
**quantas pessoas estavam de pé em cada metade do dia**, o que permite ler
volume por pessoa escalada.

---

## Apuração, Fase 1: o arquivo lido de verdade (24/09/2026)

**O erro silencioso que foi embora.** O leitor de CSV da Apuração era um
`split` por vírgula ou ponto e vírgula. Qualquer campo com vírgula dentro — uma
observação, o motivo de um cliente — empurrava as colunas daquela linha para o
lado, sem erro na tela: o número saía errado e ninguém via. Agora o arquivo é
lido caractere a caractere (`src/lib/csv.js`), respeitando aspas, aspas duplas
dentro do campo, quebra de linha dentro do campo, separador `,` ou `;` e o BOM
que o Excel põe no começo.

**O período passou a sair do arquivo.** Antes o gestor escolhia ano e mês, e a
apuração era gravada como "01 a 31" daquele mês mesmo que o arquivo tivesse
uma semana. Agora cada pessoa recebe o primeiro e o último dia que o arquivo
trouxe dela.

**O sistema lembra.** O de-para de colunas e o vínculo "nome no arquivo → pessoa
do Portal" ficam guardados por fonte (`apuracao_mapeamento`, migration 24). Na
semana seguinte o arquivo entra praticamente pronto — e o que o gestor corrigir
uma vez ganha da adivinhação automática.

**Nada entra sem conferência.** Antes de salvar, a tela mostra quantas linhas
foram lidas, quantas entram, quantas foram descartadas e por quê, o período, os
dias que já tinham sido importados (salvar de novo substitui) e quem ficou sem
vínculo. Salvar com nome solto é bloqueado.

**Dá para desfazer.** Cada importação virou um lote (`importacao_id`) com
arquivo, autor e contagem de linhas. O histórico lista os lotes e desfaz o lote
inteiro. As apurações antigas, sem lote, aparecem agrupadas por momento da
apuração (foi assim que o assistente antigo gravou) e não podem ser desfeitas
em massa, porque não há como saber o que veio junto com o quê.

**O que continua igual:** as contas de cada canal (`calculosApuracao.jsx`),
inclusive as três regras do telefone — avaliada exige FCR 1 ou 2, positiva exige
CSAT 4 ou 5 com FCR 1, e transferência de fila conta como atendida mas não gera
avaliação. Elas ainda precisam ser confirmadas e escritas no POP (Fase 3).

---

## Ouvidoria do chat: nota 3 é neutra, e é o Pedro quem classifica (24/09/2026)

**A regra de Pedro.** O relatório do Zendesk traz duas colunas booleanas —
"satisfação boa" e "satisfação ruim", 1 ou 0. A empresa hoje trata
"satisfação ruim" como sempre negativo, mas dentro desse grupo existem
tickets nota 3, que são **neutros**, não negativos de verdade. Pedro não quer
seguir esse critério da empresa: quer poder dizer "esse ticket ruim é nota 1,
esse é nota 2, mas aquele ali é nota 3 — é neutro", sem que isso mude o
resultado oficial, e quer o comparativo (com e sem os neutros) num relatório.

**Primeira versão, corrigida.** A ideia inicial foi pedir uma coluna de nota
no próprio arquivo do Zendesk. Pedro apontou o erro: **o Zendesk não manda
nota nenhuma** — só as duas colunas booleanas. Não tem como saber quem é
nota 1, 2 ou 3 na importação; quem sabe é ele, olhando ticket por ticket.

**Como ficou.** A classificação virou manual, numa tela própria — **Apuração
→ Ouvidoria**. Lá aparece a fila de todos os tickets marcados "ruim", de
todas as apurações de chat, com três botões por linha: **1**, **2** (negativo
confirmado) e **3 · neutro**. Marcar um ticket:
- **Nunca muda o CSAT oficial** (`csatPercentual`, o que vale na premiação,
  no ranking, no Hansei e no Oráculo) — "ruim=1" sempre conta como negativo
  ali, classificado ou não.
- Atualiza só os campos informativos (`total_neutros`, `negativos_confirmados`,
  `csat_sem_neutros`), recalculados a partir do `historico_detalhado` da
  apuração (`src/lib/apuracao/ouvidoriaChat.js`) e salvos de volta no registro.
- Aparece no comparativo da aba Chat de Análise assim que o primeiro ticket
  é classificado — o quadro "Ouvidoria" mostra o CSAT oficial ao lado do CSAT
  desconsiderando os neutros já revisados.

Ticket nunca classificado continua contando como negativo em tudo — inclusive
no comparativo — exatamente como "ruim" sempre significou.

---

## Regras do telefone (55PBX) confirmadas, sem mudança (24/09/2026)

Pedro confirmou as três regras que já estavam em `calcularTelefone` desde a
Fase 1, sem alteração de código:

1. **Avaliada** exige FCR 1 (resolvido) ou 2 (não resolvido) — sem FCR
   reconhecível, a ligação conta no total e na performance, mas não entra
   no CSAT.
2. **Positiva** exige CSAT 4 ou 5 **e** FCR igual a 1. FCR 2 nunca gera
   positiva, mesmo com nota alta.
3. **Transferência de fila** conta como atendida (entra na performance),
   mas nunca gera avaliação — não é FCR 1 nem 2, some do CSAT.

Nenhuma dessas regras mudou. Ficam registradas aqui porque, diferente do
chat, elas dependiam de confirmação e agora estão fechadas.

---

## Telefone (55PBX): nota 3 é neutra, FCR 2 é sempre negativo (24/09/2026)

**A regra de Pedro**, a partir de um relatório real do 55PBX: "*para a questão
CSAT é considerada a seguinte combinação: FCR 1 e CSAT 4 até 5 positivo, FCR 1
CSAT 1,2 negativo, nota 3 neutro. FCR 2 CSAT 1 a 5 é negativo*". Isso refina a
regra 2 do bloco anterior — "positiva exige CSAT 4/5 com FCR 1" já estava
certa, mas o que sobrava de "não-positiva" estava caindo tudo em negativa,
inclusive a nota 3, que não deveria contar nem a favor nem contra.

**A classificação (`calcularTelefone`, em `calculosApuracao.jsx`):**

| FCR | CSAT | Classificação |
|---|---|---|
| 1 | 4 ou 5 | **Positiva** |
| 1 | 3 | **Neutra** — não é positiva nem negativa, mas conta como avaliada |
| 1 | 1 ou 2 | **Negativa** |
| 1 | ausente/inválida (ex.: "Abandonada") | **Incompleta** — erro operacional da avaliação por parte do cliente. **Não conta como avaliada** (confirmado por Pedro, 24/09/2026) |
| 2 | 1 a 5 (qualquer nota) | **Negativa sempre**, independente do CSAT |

**Por que o CSAT não pode dividir por "avaliadas".** `total_avaliadas` (quem
respondeu FCR **de verdade**) inclui as neutras, mas não as incompletas — a
incompleta é tratada como se a ligação não tivesse sido avaliada, porque a
falha foi do cliente ao preencher a pesquisa, não uma resposta neutra dele. A
fórmula antiga (`positivas / avaliadas`) sub-avaliava quem tivesse notas 3: o
CSAT correto é **positivas ÷ (positivas + negativas)**, só essas duas
categorias no denominador. A taxa de resposta (`% avaliados`) continua sendo
`avaliadas / atendidas` — e agora também exclui as incompletas do numerador,
porque elas não são uma resposta válida.

**Isso corrigiu a fórmula em cinco lugares**, que precisam ficar sempre
coerentes entre si: `calculosApuracao.jsx` (o cálculo por dia/semana/total),
`indicadoresCiclo.js` (o número oficial da premiação), `relatorios/qualidade.js`
e `pages/RelatoriosApuracao.jsx` (os relatórios). No caminho, apareceu um
esquecimento antigo, sem relação com esta regra: `RelatoriosApuracao.jsx` nunca
somava `total_negativas` do telefone na agregação por agente — só a do chat.

**O arquivo real também exigiu ajustar o de-para de colunas.** O 55PBX de
verdade não tem uma coluna "origem" categórica — tem **"Id ligação de
origem"**, vazia na maioria das linhas e preenchida com um texto contendo
"transferência fila" quando a ligação veio de uma transferência. Existe uma
coluna **"Fila"**, de nome parecido, que é só o id da fila de atendimento e
não tem nada a ver com transferência — o mapeamento automático estava
escolhendo "Fila" por engano (sinônimo exato bate antes de um sinônimo
parcial). Corrigido em `CAMPOS.telefone` (`src/lib/apuracao/importacao.js`).

**Verificado com o arquivo real do Pedro** (32 linhas, 8 dias, 4 agentes):
fonte, as 6 colunas e o vínculo de nome bateram certo na importação; o exemplo
de FCR 2 (Bárbara, 23/09, FCR "2" CSAT "1") entrou como negativa; as duas
ligações com "transferência fila" na origem (Bárbara, 17/09) saíram do CSAT.

**Onde vive:** `src/components/apuracao/calculosApuracao.jsx`,
`src/lib/indicadoresCiclo.js`, `src/lib/relatorios/qualidade.js`,
`src/pages/RelatoriosApuracao.jsx`, `src/lib/apuracao/importacao.js`.

---

## CX: a média é por critérios respondidos, não por 6 fixo (24/09/2026)

**A regra de Pedro.** A planilha de CX tem 6 critérios por avaliação
(empatia, cordialidade, comunicação, escrita, profissionalismo, resolução).
A média de cada avaliação soma as notas dos critérios **preenchidos** e
divide pela **quantidade de critérios avaliados** naquela linha — não por 6
fixo. Uma coluna em branco não vira nota zero; ela sai da conta inteira,
soma e denominador.

**O que estava errado.** `calcularCX` fazia `parseFloat(...) || 0` em cada
coluna e dividia sempre por 6. Uma avaliação com só 2 dos 6 critérios
preenchidos (nota 4 e nota 2) saía com média **1,0** (`(4+2+0+0+0+0)/6`) em
vez de **3,0** (`(4+2)/2`) — arrastando pra baixo a média de quem avaliou
poucos critérios, com um número que parecia real mas media outra coisa.

**Efeito em cascata.** A avaliação CX entra direto na premiação
(`indicadoresDoCiclo` em `indicadoresCiclo.js`, lendo `historico_detalhado[].media`),
no Hansei, no Oráculo, no ranking e nos relatórios de Qualidade — todos
usam esse número sem recalcular nada, então o erro se propagava para todo
mundo que lê apuração de CX.

**Linha sem nenhum critério preenchido não é avaliação.** Assumido, não
pedido explicitamente por Pedro: uma linha com os 6 critérios em branco não
entra em `totalAvaliacoes` nem em `porData`, como se a linha não existisse.

**Onde vive:** `calcularCX` em `src/components/apuracao/calculosApuracao.jsx`.

---

## Três ajustes na importação, depois de um erro real de gravação (29/09/2026)

**O gatilho.** Pedro tentou salvar uma importação e recebeu
`[Apuracao.bulkCreate] Could not find the 'arquivo_nome' column of
'apuracao' in the schema cache` — o cache do PostgREST no Supabase estava
desatualizado em relação à migration 24 (ou ela não tinha rodado de fato).
Isso é operação de banco, não de código; resolvido à parte, recarregando o
schema (`NOTIFY pgrst, 'reload schema';`) ou rodando a migration de novo
(ela é idempotente).

**A partir daí, três pedidos de Pedro sobre a experiência de importar:**

1. **"Não tenho uma prévia e confirmação daquelas informações."** A tela de
   importação já mostrava linhas lidas e período, mas não os NÚMEROS —
   CSAT, positivas, negativas — que vão ser gravados. Agora, entre a
   conferência e o "quem é quem", aparece "Números que vão ser salvos, por
   pessoa": o resultado do mesmo cálculo que roda no salvar
   (`calcularTelefone`/`calcularChat`/`calcularCX`), mas ANTES de confirmar.
   Onde vive: `ImportarApuracao.jsx`.

2. **"A Ouvidoria... não consigo alternar entre os canais chat e 55pbx."**
   A Ouvidoria sempre foi só do chat — o Zendesk não manda nota, por isso a
   revisão manual. O 55PBX não tinha nada parecido porque não precisa: a
   nota já vem no arquivo, a classificação é automática. Pedro queria poder
   auditar o 55PBX mesmo assim — conferir, ligação por ligação, se a fórmula
   classificou certo. A aba Ouvidoria virou duas sub-abas: **Chat —
   classificar** (o que já existia) e **Telefone — auditoria** (nova, só
   leitura, lista cada ligação com a classificação que a fórmula deu, com
   filtro por pessoa). Onde vive: `src/lib/apuracao/auditoriaTelefone.js`
   (puro, testado) e `src/components/apuracao/AuditoriaTelefone.jsx`.

3. **"As avaliações do chat estão se confundindo."** A regra que Pedro
   descreveu (`ruim=1` é ruim; `ruim=0` e `bom=0` é neutro, não conta em
   nada) já era exatamente o que `calcularChat` fazia — a "confusão" não
   era a fórmula, era o **de-para de colunas**. No arquivo real do Zendesk
   (`Relatório_CSAT_CHAT_CRC...csv`), a coluna do agente se chama "Nome do
   atribuído" — os sinônimos cadastrados só tinham "atribuido **a**" (com
   um "a" no final), que não bate nem por igualdade nem por trecho com
   "nome do atribuido". Sem essa coluna reconhecida, a importação travava
   pedindo pra escolher Agente à mão toda vez — nenhum dado chegava a ser
   calculado errado, mas a fricção dava a impressão de bagunça. Corrigido em
   `CAMPOS.chat` (`src/lib/apuracao/importacao.js`), acrescentando
   "atribuido"/"atribuído"/"nome do atribuido" aos sinônimos. Verificado com
   o arquivo real: CSAT de cada pessoa bateu com a conferência manual linha
   a linha (ex.: Sirlene 17 positivos e 1 negativo em 18 avaliados = 95%).

**Fora de escopo, sinalizado à parte:** durante os testes, o mesmo bug de
UI já registrado antes (comboboxes "Escolha a pessoa" ligando ao vínculo
errado quando clicados em sequência rápida) apareceu de novo — confirmado
com dois listboxes abertos ao mesmo tempo no DOM. Está sendo investigado em
sessão separada.
