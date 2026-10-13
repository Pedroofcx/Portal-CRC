# Publicar a IA (Edge Function `invocar-llm`)

Passo a passo para ligar a IA do Portal. São três coisas: pegar a chave do
Gemini, guardá-la como segredo no Supabase e publicar a função.

Nada disso mexe no banco. Se algo der errado no meio, o Portal continua
funcionando — só as duas telas de IA é que ficam sem resposta.

---

## Por que o provedor é o Gemini

O plano de migração já previa o Gemini pelo plano gratuito, e a documentação do
próprio Base44 diz que o `InvokeLLM` de lá rodava em modelos `gemini_*`. Ou
seja: manter o Gemini é a opção que menos muda o comportamento das duas telas e
que custa R$ 0.

Se um dia você quiser trocar de provedor, o único arquivo que muda é
`supabase/functions/invocar-llm/index.ts`. As telas não sabem qual modelo
responde — elas falam com o adaptador, e o adaptador fala com a função.

---

## 1. A chave do Gemini

1. Abra **https://aistudio.google.com/apikey** e entre com uma conta Google.
2. Clique em **Create API key** e escolha criar num projeto novo.
3. Copie a chave. Ela começa com `AIza...`.

Guarde num lugar seguro. Essa chave é o que autoriza gastos na conta — trate
como senha. Ela **não** vai para o GitHub nem para o `.env.local`.

---

## 2. Guardar a chave como segredo no Supabase

1. Painel do Supabase → seu projeto.
2. Menu lateral: **Edge Functions** → aba **Secrets**.
3. **Add new secret**:
   - Name: `GEMINI_API_KEY`
   - Value: a chave que você copiou
4. **Save**.

A partir daqui a chave existe só dentro do servidor do Supabase. O navegador
nunca a recebe, e ninguém consegue lê-la pelo Portal.

---

## 3. Publicar a função

1. Painel do Supabase → **Edge Functions** → **Deploy a new function** →
   **Via Editor**.
2. Nome da função: `invocar-llm` — exatamente assim, minúsculo e com hífen. É
   esse nome que o Portal chama.
3. Apague o exemplo que vem escrito e cole **todo** o conteúdo do arquivo
   `supabase/functions/invocar-llm/index.ts` deste repositório.
4. **Deploy function**.

Leva menos de um minuto. Quando terminar, a função aparece na lista com o
status `ACTIVE`.

---

## 4. Conferir

No terminal, na pasta do projeto:

```bash
node ferramentas/testar-ia.mjs seu-email@empresa.com sua-senha
```

O teste faz quatro coisas:

1. chama sem estar logado e espera ser **recusado** (é o que protege a chave de
   ser gasta por qualquer um);
2. pede um texto simples e confere que voltou texto;
3. pede uma resposta com formato definido (`response_json_schema`) e confere
   que voltou um objeto com os campos certos;
4. manda um texto acima do limite e espera ser recusado.

---

## Usar o Groq em vez do Gemini

A função aceita os dois provedores. Se existir o segredo `GROQ_API_KEY`, o Groq
responde; se não existir, continua o Gemini.

1. Crie a chave em **https://console.groq.com/keys** (começa com `gsk_`).
2. Supabase → **Edge Functions** → **Secrets** → **Add new secret**:
   `GROQ_API_KEY` = a chave. (Opcional: `GROQ_MODELO` para trocar o modelo; o
   padrão é `llama-3.3-70b-versatile`.)
3. Republique a função `invocar-llm` com o conteúdo atual do arquivo
   `supabase/functions/invocar-llm/index.ts` (passo 3 acima).
4. Rode o teste do passo 4. Para voltar ao Gemini, apague o segredo
   `GROQ_API_KEY`.

No Groq o formato da resposta é sempre pedido no texto, com o modo JSON ligado
(a resposta traz `via: "prompt"`).

---

## O que esperar na prática

**Limite gratuito.** O plano gratuito do Gemini tem cota diária. As duas telas
do Portal são acionadas sob demanda, por gestor, então a cota sobra. Se acabar,
a mensagem que aparece é *"A cota gratuita de IA do dia acabou"* — e volta a
funcionar no dia seguinte, sozinha.

**Quem pode usar.** Só usuário logado no Portal e com colaborador ativo. Conta
de autenticação sem colaborador correspondente é recusada antes de chegar ao
modelo.

**Se você não publicar a função.** As duas telas mostram erro ao acionar a IA.
O `RelatorioJornadaDiretoria` tem um resumo de reserva calculado dos próprios
dados, então ele continua legível; o `ResumoIAEtapa` avisa que não conseguiu.
Nenhuma outra tela do Portal depende disso.

---

## Uma coisa aprendida na primeira configuração

O Gemini aceita um **contrato formal de formato** (`responseSchema`): você
descreve os campos que quer e o provedor garante a resposta naquele molde. Era
assim que a função começou.

Na prática, nos testes de setembro de 2026, o `gemini-3.6-flash` recusou todo
pedido que levava esse contrato — devolvendo erro de servidor, como se
estivesse sobrecarregado. O mesmo pedido, sem o contrato, funcionava. Duas
rodadas seguidas mostraram o padrão: sobrecarga não escolhe requisição.

Por isso a função tem **duas vias**. Ela tenta primeiro com o contrato formal,
que é o jeito mais garantido; se o provedor recusar, refaz o pedido descrevendo
o formato dentro do próprio texto. Quem chamou recebe o mesmo objeto nos dois
casos, e a resposta traz um campo `via` dizendo qual caminho respondeu.

Isso tem duas consequências práticas:

- **Se um dia o provedor voltar a aceitar o contrato formal**, a função passa a
  usá-lo sozinha, sem ninguém mexer em nada. A primeira via é sempre tentada.
- **Enquanto estiver pela segunda via**, o formato é garantido por instrução e
  não por contrato. É mais frágil: um modelo pode, raramente, devolver algo
  fora do molde. Nesse caso a tela avisa "o modelo devolveu um JSON inválido"
  em vez de mostrar dado errado.
