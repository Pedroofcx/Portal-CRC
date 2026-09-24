-- =====================================================================
-- 23 — Pesquisas: quem respondeu, e o anonimato valendo de verdade
-- =====================================================================
-- Decisão de Pedro (23/09/2026): "o sistema tem que guardar quem respondeu
-- a pesquisa, a não ser que ela seja configurada como anônima".
--
-- O QUE ESTA MIGRATION FAZ
--
-- 1. A pesquisa ganha o campo `anonima`.
--
-- 2. Nasce a tabela `pesquisa_participacao`: uma linha por pessoa que
--    respondeu, SEM as respostas. É ela que diz "fulano já respondeu" e
--    "fulano ainda falta" — inclusive nas pesquisas anônimas, onde a
--    resposta em si não guarda o nome de ninguém.
--
--    Guardar as duas coisas na mesma linha seria mentir: bastaria abrir o
--    banco para saber quem disse o quê. Separadas, o gestor sabe QUEM
--    respondeu e O QUE foi respondido, mas não consegue ligar uma coisa na
--    outra numa pesquisa anônima.
--
-- 3. `resposta_pesquisa.colaborador_id` passa a aceitar vazio (é o que
--    acontece numa resposta anônima).
--
-- 4. Fecha um buraco antigo: hoje QUALQUER colaborador ativo consegue ler
--    TODAS as respostas de TODO MUNDO pelo console do navegador
--    (`db.entities.RespostaPesquisa.list()`), porque a política diz apenas
--    "colaborador ativo lê". Passa a ser: o gestor lê tudo, e cada pessoa
--    lê só as próprias.
--
-- 5. Preenche a participação a partir das respostas que já existem, para
--    o histórico não começar vazio.
--
-- Rodar uma vez no SQL Editor. Rodar de novo não duplica nada.
-- =====================================================================

alter table public."pesquisa" add column if not exists "anonima" boolean not null default false;

comment on column public."pesquisa"."anonima" is
  'Quando true, a resposta não guarda quem respondeu — só a participação, em pesquisa_participacao.';

alter table public."resposta_pesquisa" alter column "colaborador_id" drop not null;

-- ------------------------------------------------------------------
-- Quem respondeu (sem as respostas)
-- ------------------------------------------------------------------
create table if not exists public."pesquisa_participacao" (
  "id" uuid primary key default gen_random_uuid(),
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "pesquisa_id" text not null,
  "colaborador_id" text not null,
  "colaborador_nome" text,
  "respondida_em" timestamptz not null default now(),
  unique ("pesquisa_id", "colaborador_id")
);

create index if not exists "ix_pesquisa_participacao_pesquisa" on public."pesquisa_participacao" ("pesquisa_id");
create index if not exists "ix_pesquisa_participacao_colaborador" on public."pesquisa_participacao" ("colaborador_id");

alter table public."pesquisa_participacao" enable row level security;

drop policy if exists "pesquisa_participacao_ler"     on public."pesquisa_participacao";
drop policy if exists "pesquisa_participacao_inserir" on public."pesquisa_participacao";
drop policy if exists "pesquisa_participacao_apagar"  on public."pesquisa_participacao";

-- O gestor precisa ver quem falta responder; cada pessoa vê a própria linha.
create policy "pesquisa_participacao_ler" on public."pesquisa_participacao"
  for select to authenticated
  using (public.eh_gestor() or colaborador_id = public.meu_colaborador_id());

-- Só dá para registrar a própria participação — ninguém "responde" no lugar de outro.
create policy "pesquisa_participacao_inserir" on public."pesquisa_participacao"
  for insert to authenticated
  with check (colaborador_id = public.meu_colaborador_id());

create policy "pesquisa_participacao_apagar" on public."pesquisa_participacao"
  for delete to authenticated
  using (public.eh_gestor());

-- Sem política de update: participação não se edita, se registra.

-- ------------------------------------------------------------------
-- As respostas deixam de ficar abertas para a equipe inteira
-- ------------------------------------------------------------------
drop policy if exists "resposta_pesquisa_ler"     on public."resposta_pesquisa";
drop policy if exists "resposta_pesquisa_alterar" on public."resposta_pesquisa";
drop policy if exists "resposta_pesquisa_apagar"  on public."resposta_pesquisa";

create policy "resposta_pesquisa_ler" on public."resposta_pesquisa"
  for select to authenticated
  using (public.eh_gestor() or colaborador_id = public.meu_colaborador_id());

-- Alterar e apagar resposta de pesquisa: só a gestão.
create policy "resposta_pesquisa_alterar" on public."resposta_pesquisa"
  for update to authenticated
  using (public.eh_gestor()) with check (public.eh_gestor());

create policy "resposta_pesquisa_apagar" on public."resposta_pesquisa"
  for delete to authenticated
  using (public.eh_gestor());

-- ------------------------------------------------------------------
-- Histórico: quem já respondeu antes desta migration
-- ------------------------------------------------------------------
insert into public."pesquisa_participacao" ("pesquisa_id", "colaborador_id", "colaborador_nome", "respondida_em", "created_date")
select r."pesquisa_id", r."colaborador_id", max(r."colaborador_nome"),
       min(coalesce(r."data_resposta", r."created_date")), min(r."created_date")
from public."resposta_pesquisa" r
where r."colaborador_id" is not null and r."pesquisa_id" is not null
group by r."pesquisa_id", r."colaborador_id"
on conflict ("pesquisa_id", "colaborador_id") do nothing;

-- Confere: deve mostrar a participação preenchida e as políticas novas.
-- select count(*) from public."pesquisa_participacao";
-- select policyname, cmd from pg_policies where tablename in ('pesquisa_participacao','resposta_pesquisa') order by 1;
