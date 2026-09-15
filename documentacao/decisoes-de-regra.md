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
