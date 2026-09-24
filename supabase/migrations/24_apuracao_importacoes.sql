-- =====================================================================
-- 24 — Apuração: de onde veio cada número, e como desfazer
-- =====================================================================
-- Fase 1 do plano da Apuração (documentacao/plano-apuracao.md).
--
-- Hoje a apuração guarda o resultado, mas não guarda a origem: de qual
-- arquivo veio, quem importou junto com quem, quantas linhas o arquivo
-- tinha. Sem isso não dá para conferir uma importação nem desfazê-la.
--
--   1. A apuração ganha a origem: fonte, importacao_id, arquivo e contagem
--      de linhas lidas/descartadas.
--   2. Nasce `apuracao_mapeamento`: o de-para de colunas e de nomes de
--      agente, por fonte. É o que faz o sistema lembrar do mapeamento em
--      vez de pedir tudo de novo toda semana.
--
-- Rodar uma vez no SQL Editor. Rodar de novo não duplica nada.
-- =====================================================================

alter table public."apuracao" add column if not exists "fonte" text;
alter table public."apuracao" add column if not exists "importacao_id" text;
alter table public."apuracao" add column if not exists "arquivo_nome" text;
alter table public."apuracao" add column if not exists "linhas_lidas" integer;
alter table public."apuracao" add column if not exists "linhas_descartadas" integer;

comment on column public."apuracao"."importacao_id" is
  'Agrupa todos os registros salvos numa mesma importação — é o que permite desfazer o lote inteiro.';
comment on column public."apuracao"."fonte" is
  '55pbx | zendesk | planilha_cx. O tipo_apuracao (telefone/chat/cx) continua sendo o indicador.';

create index if not exists "ix_apuracao_importacao" on public."apuracao" ("importacao_id");

-- ------------------------------------------------------------------
-- O de-para que o sistema lembra
-- ------------------------------------------------------------------
create table if not exists public."apuracao_mapeamento" (
  "id" uuid primary key default gen_random_uuid(),
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "fonte" text not null unique,
  "tipo_apuracao" text,
  -- { agente: "Agente", data: "Data", ... } — coluna do arquivo por campo
  "colunas" jsonb not null default '{}'::jsonb,
  -- { "Ana Flavia G. Amarante": "<colaborador_id>" }
  "agentes" jsonb not null default '{}'::jsonb,
  "atualizado_por_nome" text
);

alter table public."apuracao_mapeamento" enable row level security;

drop policy if exists "apuracao_mapeamento_ler"     on public."apuracao_mapeamento";
drop policy if exists "apuracao_mapeamento_inserir" on public."apuracao_mapeamento";
drop policy if exists "apuracao_mapeamento_alterar" on public."apuracao_mapeamento";
drop policy if exists "apuracao_mapeamento_apagar"  on public."apuracao_mapeamento";

-- Apuração é coisa da gestão, e o de-para também.
create policy "apuracao_mapeamento_ler" on public."apuracao_mapeamento"
  for select to authenticated using (public.eh_gestor());
create policy "apuracao_mapeamento_inserir" on public."apuracao_mapeamento"
  for insert to authenticated with check (public.eh_gestor());
create policy "apuracao_mapeamento_alterar" on public."apuracao_mapeamento"
  for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "apuracao_mapeamento_apagar" on public."apuracao_mapeamento"
  for delete to authenticated using (public.eh_gestor());

-- Confere:
-- select column_name from information_schema.columns where table_name = 'apuracao' and column_name in ('fonte','importacao_id','arquivo_nome','linhas_lidas','linhas_descartadas');
-- select policyname, cmd from pg_policies where tablename = 'apuracao_mapeamento' order by 1;
