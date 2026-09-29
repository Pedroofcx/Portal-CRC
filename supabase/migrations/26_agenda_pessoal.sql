-- =====================================================================
-- 26 — Minha Agenda (agenda pessoal, para todo mundo)
-- =====================================================================
-- Pedido de Pedro (29/09/2026): "Minha Agenda" em Principal, para todos,
-- onde cada um escreve o que vai fazer, com data e hora.
--
-- É pessoal, como anotacao_pessoal: só o dono lê, cria, altera e apaga —
-- nem o gestor vê a agenda de outra pessoa (mesma decisão da migration 14).
-- Reaproveita meu_colaborador_id(), já criada ali.
--
-- Rodar uma vez no SQL Editor. Rodar de novo não duplica nada.
-- =====================================================================

create table if not exists public."agenda_pessoal" (
  "id" uuid primary key default gen_random_uuid(),
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "colaborador_id" text not null,
  "data" date not null,
  "hora" time,
  "titulo" text not null,
  "descricao" text,
  "concluido" boolean not null default false
);

create index if not exists "ix_agenda_pessoal_colaborador_data" on public."agenda_pessoal" ("colaborador_id", "data");

alter table public."agenda_pessoal" enable row level security;

drop policy if exists "agenda_pessoal_ler"     on public."agenda_pessoal";
drop policy if exists "agenda_pessoal_inserir" on public."agenda_pessoal";
drop policy if exists "agenda_pessoal_alterar" on public."agenda_pessoal";
drop policy if exists "agenda_pessoal_apagar"  on public."agenda_pessoal";

create policy "agenda_pessoal_ler" on public."agenda_pessoal"
  for select to authenticated
  using (colaborador_id = public.meu_colaborador_id());

create policy "agenda_pessoal_inserir" on public."agenda_pessoal"
  for insert to authenticated
  with check (colaborador_id = public.meu_colaborador_id());

create policy "agenda_pessoal_alterar" on public."agenda_pessoal"
  for update to authenticated
  using (colaborador_id = public.meu_colaborador_id())
  with check (colaborador_id = public.meu_colaborador_id());

create policy "agenda_pessoal_apagar" on public."agenda_pessoal"
  for delete to authenticated
  using (colaborador_id = public.meu_colaborador_id());

-- Confere:
-- select policyname, cmd from pg_policies where tablename = 'agenda_pessoal' order by 1;
