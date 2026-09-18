# Publicar o Portal

Hoje o sistema só existe na sua máquina, com `npm run dev`. Este documento o
coloca num endereço na internet, para os seus colegas usarem.

**A ordem importa.** Os três primeiros passos fecham o acesso; só depois o
endereço passa a existir. Publicar antes de fechar é deixar a porta aberta
enquanto se procura a chave.

---

## Antes de tudo: o que muda quando o sistema fica público

Enquanto o Portal roda só aqui, a tela de login é alcançável por você. Publicado,
ela é alcançável por qualquer pessoa do mundo — e o Supabase, de fábrica, deixa
qualquer pessoa criar uma conta.

Isso não é motivo para não publicar. É motivo para fazer os passos 1 a 3 antes
do passo 4.

---

## Passo 1 — Rodar a migration 13

No **SQL Editor** do Supabase, cole e execute
`supabase/migrations/13_acesso_so_para_colaborador.sql`.

O que ela faz: as políticas do banco deixam de dizer *"quem está logado lê"* e
passam a dizer *"quem é colaborador ativo lê"*. Ter conta de login e trabalhar
na empresa viram duas coisas diferentes — e quem decide a segunda é o cadastro
em `colaborador`, que só gestor altera.

Ela traz duas conferências no fim:

- **`ainda_liberadas` tem que ser 0.** Qualquer número acima disso é uma
  política que continua liberando geral.
- **A segunda consulta tem que voltar vazia.** Cada linha ali é uma conta que
  consegue entrar mas não enxerga nada — ou falta cadastrar a pessoa, ou a
  conta é de alguém que não deveria ter uma.

Efeito colateral desejado: desligar alguém da empresa (`ativo = false`) passa a
cortar o acesso ao sistema, sem precisar mexer em conta de login.

---

## Passo 2 — Desligar o cadastro aberto

Painel do Supabase → **Authentication** → **Sign In / Providers** → **Email** →
desligue **"Allow new users to sign up"** → **Save**.

A partir daí, conta de login só nasce por você. Os seus colegas não se
cadastram: você os cadastra.

Isso é redundante com o passo 1, e de propósito. O passo 1 é regra no banco, e
ninguém esbarra nela por acidente; o passo 2 é uma caixinha num painel, que
alguém pode religar um dia sem perceber. As duas proteções se somam.

---

## Passo 3 — Criar as contas dos colegas

Para cada pessoa da equipe:

1. Confira que ela existe em `colaborador` **com o mesmo e-mail** e com
   `ativo = true`. O e-mail é o que liga a conta de login ao cadastro — se
   estiverem diferentes, a pessoa entra e não vê nada.
2. Painel → **Authentication** → **Users** → **Add user** → **Create new user**.
3. Preencha o e-mail, defina uma senha provisória e marque
   **Auto Confirm User** (senão a pessoa precisa confirmar por e-mail, e o
   projeto ainda não tem serviço de e-mail próprio configurado).
4. Passe a senha provisória para a pessoa por um canal privado e peça que ela
   troque no primeiro acesso.

São 10 colaboradores cadastrados e, hoje, 2 contas de login. Faltam 8.

---

## Passo 4 — Publicar no Cloudflare Pages

Gratuito, sem cartão, e republica sozinho a cada `git push`.

1. Crie conta em **https://dash.cloudflare.com** (ou entre na sua).
2. Menu lateral: **Workers & Pages** → **Create** → aba **Pages** →
   **Connect to Git**.
3. Autorize o GitHub e escolha o repositório **`Pedroofcx/Portal-CRC`**.
4. Nas configurações de build:

   | Campo | Valor |
   |---|---|
   | Framework preset | `Vite` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Branch | `main` |

5. Ainda nessa tela, em **Environment variables**, adicione as duas:

   | Nome | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | o mesmo do seu `.env.local` |
   | `VITE_SUPABASE_ANON_KEY` | o mesmo do seu `.env.local` |

   Sem elas o site sobe e mostra erro de configuração: o `.env.local` fica só
   na sua máquina, de propósito.

6. **Save and Deploy**. Em poucos minutos sai um endereço como
   `portal-crc.pages.dev`.

### Sobre a chave `anon` ir para o navegador

Ela vai, e está certo assim. Essa chave não dá poder nenhum sozinha: tudo o que
ela pode fazer é limitado pelas políticas do banco, que é justamente o que os
passos 1 a 3 apertaram. É a chave `service_role` que nunca pode sair daqui — e
ela não está em lugar nenhum do código publicado.

---

## Passo 5 — Avisar o Supabase do novo endereço

Painel → **Authentication** → **URL Configuration**:

- **Site URL**: o endereço que o Cloudflare gerou
  (ex.: `https://portal-crc.pages.dev`)
- **Redirect URLs**: adicione o mesmo endereço

Isso importa para recuperação de senha: o link do e-mail precisa saber para
onde mandar a pessoa de volta.

---

## Passo 6 — Conferir

Abra o endereço publicado e:

1. **Entre com a sua conta.** Deve funcionar igual ao `npm run dev`.
2. **Navegue até uma tela qualquer e aperte F5.** Tem que recarregar naquela
   tela, não dar erro 404. É o que o arquivo `public/_redirects` garante.
3. **Abra numa janela anônima, sem entrar.** Tem que parar no login e não
   mostrar dado nenhum.

---

## O que passa a acontecer sozinho

A cada `git push` para o `main`, o Cloudflare rebuilda e republica. Você não
precisa fazer nada além do push.

---

## O que este documento NÃO resolve

**Não há backup do banco.** Publicar aumenta o número de pessoas que podem
alterar dados que não têm cópia. Se o projeto Supabase for perdido ou alguém
apagar algo por engano, não há de onde restaurar — o Base44 não é mais uma via
de recuperação. Isso é uma decisão tomada conscientemente, e continua em aberto.
