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
