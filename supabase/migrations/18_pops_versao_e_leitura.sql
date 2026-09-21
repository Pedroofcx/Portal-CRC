-- ============================================================
-- PORTAL CRC — POPs COM VERSÃO E CONFIRMAÇÃO DE LEITURA (migration 18)
--
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
--
--
-- O QUE MUDA
--
-- 1. O POP ganha o que a Estrutura de Trabalho 2026 pede e a tela precisa:
--      prazos           os prazos e números-chave em destaque no topo
--                       ([{rotulo, valor}] — "1º contato: até 1h")
--      tipos_tratativa  a que tipos de tratativa o POP se aplica
--                       (o botão "Ver POP" dentro da tratativa usa)
--      ordem, vigencia, o_que_mudou, publicado_em, publicado_por_nome,
--      exige_ciencia    (a versão atual pede confirmação de leitura)
--
-- 2. pop_versao — o histórico: cada versão publicada fica guardada inteira
--    (o manual exige que toda alteração seja "documentada e versionada").
--
-- 3. pop_leitura — quem confirmou a leitura de qual versão. A confirmação
--    entra na central de pendências da tela inicial.
--
-- 4. SEGURANÇA: até aqui QUALQUER colaborador podia criar, alterar e apagar
--    POP pelo console do navegador. Agora só o gestor grava POP e versão; na
--    confirmação de leitura, cada pessoa grava só a própria.
--
-- Fonte: base44/entities/POP.jsonc, PopVersao.jsonc, PopLeitura.jsonc e
-- ferramentas/gerar-seguranca.py — o 01_tabelas.sql e o 04_politicas.sql
-- gerados já têm tudo isto para quem montar o banco do zero.
-- ============================================================

-- 1) POP: colunas novas
alter table public."pop" add column if not exists "prazos" jsonb;
alter table public."pop" add column if not exists "tipos_tratativa" jsonb;
alter table public."pop" add column if not exists "ordem" numeric default 0;
alter table public."pop" add column if not exists "vigencia" date;
alter table public."pop" add column if not exists "o_que_mudou" text;
alter table public."pop" add column if not exists "publicado_em" timestamptz;
alter table public."pop" add column if not exists "publicado_por_nome" text;
alter table public."pop" add column if not exists "exige_ciencia" boolean default true;

-- 2) Histórico de versões
create table if not exists public."pop_versao" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "pop_id" text not null,
  "versao" text not null,
  "snapshot" jsonb,
  "o_que_mudou" text,
  "publicado_em" timestamptz,
  "publicado_por_id" text,
  "publicado_por_nome" text
);
create index if not exists "ix_pop_versao_base44_id" on public."pop_versao" ("base44_id");
create index if not exists "ix_pop_versao_pop_id" on public."pop_versao" ("pop_id");
create index if not exists "ix_pop_versao_publicado_por_id" on public."pop_versao" ("publicado_por_id");

-- 3) Confirmações de leitura
create table if not exists public."pop_leitura" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "pop_id" text not null,
  "versao" text not null,
  "colaborador_id" text not null,
  "data_leitura" timestamptz
);
create index if not exists "ix_pop_leitura_base44_id" on public."pop_leitura" ("base44_id");
create index if not exists "ix_pop_leitura_pop_id" on public."pop_leitura" ("pop_id");
create index if not exists "ix_pop_leitura_colaborador_id" on public."pop_leitura" ("colaborador_id");
-- Uma confirmação por pessoa por versão: clicar duas vezes não duplica.
create unique index if not exists "ux_pop_leitura_uma_por_versao"
  on public."pop_leitura" ("pop_id", "versao", "colaborador_id");

alter table public."pop_versao" enable row level security;
alter table public."pop_leitura" enable row level security;

-- 4) Políticas
drop policy if exists "pop_ler"     on public."pop";
drop policy if exists "pop_inserir" on public."pop";
drop policy if exists "pop_alterar" on public."pop";
drop policy if exists "pop_apagar"  on public."pop";
create policy "pop_ler" on public."pop" for select to authenticated using (public.eh_colaborador());
create policy "pop_inserir" on public."pop" for insert to authenticated with check (public.eh_gestor());
create policy "pop_alterar" on public."pop" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "pop_apagar" on public."pop" for delete to authenticated using (public.eh_gestor());

drop policy if exists "pop_versao_ler"     on public."pop_versao";
drop policy if exists "pop_versao_inserir" on public."pop_versao";
drop policy if exists "pop_versao_alterar" on public."pop_versao";
drop policy if exists "pop_versao_apagar"  on public."pop_versao";
create policy "pop_versao_ler" on public."pop_versao" for select to authenticated using (public.eh_colaborador());
create policy "pop_versao_inserir" on public."pop_versao" for insert to authenticated with check (public.eh_gestor());
create policy "pop_versao_alterar" on public."pop_versao" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "pop_versao_apagar" on public."pop_versao" for delete to authenticated using (public.eh_gestor());

drop policy if exists "pop_leitura_ler"     on public."pop_leitura";
drop policy if exists "pop_leitura_inserir" on public."pop_leitura";
drop policy if exists "pop_leitura_alterar" on public."pop_leitura";
drop policy if exists "pop_leitura_apagar"  on public."pop_leitura";
create policy "pop_leitura_ler" on public."pop_leitura" for select to authenticated using (public.eh_colaborador());
create policy "pop_leitura_inserir" on public."pop_leitura" for insert to authenticated with check (colaborador_id = public.meu_colaborador_id());
create policy "pop_leitura_alterar" on public."pop_leitura" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "pop_leitura_apagar" on public."pop_leitura" for delete to authenticated using (public.eh_gestor());

notify pgrst, 'reload schema';


-- ------------------------------------------------------------
-- CONFERÊNCIA — o resultado esperado: 12 linhas (4 políticas × 3 tabelas),
-- e nenhuma com "eh_colaborador" em inserir/alterar/apagar
-- ------------------------------------------------------------
select tablename as tabela, policyname as politica, cmd as operacao,
       coalesce(qual, '') || ' ' || coalesce(with_check, '') as regra
from pg_policies
where schemaname = 'public' and tablename in ('pop', 'pop_versao', 'pop_leitura')
order by tablename, policyname;
