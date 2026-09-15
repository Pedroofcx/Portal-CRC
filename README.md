# Portal CRC

Sistema operacional da Central de Relacionamento com o Cliente: tratativas,
escalas, férias, apuração de pontos, PDI, pesquisas e universidade corporativa.

Em migração do **Base44** para **Supabase**. O plano completo, com as seis fases,
está no documento de migração compartilhado com o responsável pelo projeto.

## Estado atual

| Fase | O quê | Situação |
|------|-------|----------|
| 00 | Recuperar os dados do Base44 | **Pendente** — acesso ao construtor perdido, ver trilhas abaixo |
| 01 | Banco novo a partir dos schemas | **Concluída** — 48 tabelas aplicadas no Supabase |
| 02 | Adaptador (`src/api/db.js`) | **Concluída** — app roda no Supabase, com login próprio |
| 03 | Segurança (RLS) | **Concluída** — 9 testes de invasão passando |
| 04 | Regras de negócio no servidor | Próxima |
| 05 | Frontend e design | Não iniciada |
| 06 | Publicação e backup automático | Não iniciada |

## Estrutura

```
base44/entities/      Os 48 JSON Schemas exportados do Base44 (fonte da verdade)
supabase/migrations/  SQL gerado a partir dos schemas — não editar à mão
ferramentas/          Scripts de migração
documentacao/         Regras de negócio extraídas do sistema antigo
src/                  Aplicação React (Vite + Tailwind + shadcn/ui)
```

## Como o banco é gerado

As migrations **não são escritas à mão**. Elas saem dos schemas:

```bash
python ferramentas/gerar-sql.py
```

Se um schema mudar, rode de novo. Editar o SQL diretamente faz o próximo
`gerar-sql.py` desfazer a alteração.

### Os três arquivos, e a ordem deles

1. **`01_tabelas.sql`** — 48 tabelas, 554 campos, 65 restrições de valor.
   Cada tabela tem uma coluna `base44_id` que guarda o identificador do
   registro no sistema antigo. É ela que vai permitir remontar as ligações
   entre `tratativa`, `colaborador`, `motivo_tratativa` e `etapa_jornada`
   quando os dados forem importados.

2. **`02_rls.sql`** — liga Row Level Security em todas as tabelas **sem criar
   nenhuma política**, o que bloqueia tudo. No Supabase, tabela sem RLS fica
   exposta na API pública; este arquivo garante que isso nunca aconteça por
   descuido. As regras de quem vê o quê entram na Fase 03.

3. **`03_ajuste_datas.sql`** — dá `default now()` a `created_date` e `updated_date`
   em bancos criados antes desse ajuste. O app ordena por `-created_date` em
   108 chamadas; sem default, todo registro novo nasceria com data nula e
   apareceria fora de ordem. Seguro rodar mais de uma vez.

4. **`99_restricoes_pos_importacao.sql`** — campos obrigatórios (`NOT NULL`).
   **Aplicar somente depois da importação dos dados.** Dado histórico costuma
   ter campos em branco que hoje são obrigatórios; se estas restrições
   existissem antes, a importação falharia linha a linha.

## Sobre os dados do sistema antigo

O export do Base44 trouxe o código e os 48 schemas, mas **nenhum registro**.
A extração é feita com `ferramentas/extrair-dados-base44.js`, colado no console
do navegador com uma sessão do **portal** aberta
(`preview--portal-crc-*.base44.app` — não o construtor `app.base44.com`).

O acesso ao construtor foi perdido. Trilhas de recuperação, em ordem de custo:

1. Sessão do portal ainda ativa em algum navegador.
2. Cookie do portal ainda válido ao reabrir o endereço.
3. Sessão de qualquer um dos outros 9 usuários — basta uma.
4. Suporte do Base44, com o `app_id` em mãos.

## Aplicação

```bash
npm install
cp .env.local.example .env.local   # e preencha com os dados do Supabase
npm run dev
```

## Teste de segurança

Fecha a Fase 03. Entra como agente comum, com a mesma chave que vai no
navegador dos usuários, e tenta fazer o que agente não deveria conseguir.

```bash
node ferramentas/testar-seguranca.mjs <email-do-agente> <senha>
```

Preparação em `ferramentas/preparar-teste-seguranca.sql`.

## Pendências conhecidas

- **`src/pages/JornadaCliente.jsx`** — o export do Base44 truncou o arquivo na
  linha 50. O trecho recuperado está em `JornadaCliente.jsx.truncado`; os
  componentes em `src/components/jornada/` estão todos íntegros. A página hoje
  mostra um aviso no lugar do conteúdo.
- **`InvokeLLM`** — falha com mensagem explícita. Passa a rodar numa Edge
  Function na Fase 04, porque a chave da API não pode ficar no navegador.
  Dois pontos de uso: `ResumoIAEtapa` e `RelatorioJornadaDiretoria`.
