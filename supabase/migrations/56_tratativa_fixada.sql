-- ============================================================
-- PORTAL CRC — FIXAR TRATATIVAS NO TOPO DA LISTA (migration 56)
--
-- Rode no SQL Editor do Supabase, DEPOIS da migration 55.
--
-- POR QUE
--   Cada pessoa quer manter à mão as tratativas em que está trabalhando. Com
--   "fixar", ela marca as que quiser e elas ficam no topo da lista dela.
--
-- O QUE ENTRA
--   tratativa_fixada: uma linha por pessoa e por tratativa fixada. É pessoal:
--   o que um fixa não muda a lista de ninguém. Cada pessoa vê, cria e apaga só
--   as dela; a gestão não mexe nas fixações dos outros.
--
-- COMO DESFAZER
--   drop table public.tratativa_fixada;
-- ============================================================

create table if not exists public."tratativa_fixada" (
  "id" uuid primary key default gen_random_uuid(),
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "colaborador_id" text not null,
  "tratativa_id" text not null,
  unique ("colaborador_id", "tratativa_id")
);

create index if not exists "ix_tratativa_fixada_colaborador" on public."tratativa_fixada" ("colaborador_id");

alter table public."tratativa_fixada" enable row level security;

drop policy if exists "tratativa_fixada_ler"     on public."tratativa_fixada";
drop policy if exists "tratativa_fixada_inserir" on public."tratativa_fixada";
drop policy if exists "tratativa_fixada_apagar"  on public."tratativa_fixada";

create policy "tratativa_fixada_ler" on public."tratativa_fixada"
  for select to authenticated
  using (colaborador_id = public.meu_colaborador_id());

create policy "tratativa_fixada_inserir" on public."tratativa_fixada"
  for insert to authenticated
  with check (colaborador_id = public.meu_colaborador_id());

create policy "tratativa_fixada_apagar" on public."tratativa_fixada"
  for delete to authenticated
  using (colaborador_id = public.meu_colaborador_id());

grant select, insert, delete on public."tratativa_fixada" to authenticated;


-- ---------- conferência ----------
-- Deve listar a tabela e as 3 regras de acesso.
select 'tabela' as item, count(*)::text as ok
from information_schema.tables where table_schema = 'public' and table_name = 'tratativa_fixada'
union all
select 'regras de acesso', count(*)::text
from pg_policies where schemaname = 'public' and tablename = 'tratativa_fixada';
