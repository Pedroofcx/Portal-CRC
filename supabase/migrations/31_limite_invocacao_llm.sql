-- ============================================================
-- PORTAL CRC — LIMITE DIÁRIO DE CHAMADAS À IA (migration 31, Fase 4)
--
-- Rode no SQL Editor do Supabase.
--
--
-- O BURACO QUE ISTO FECHA
--
-- A Edge Function `invocar-llm` exige login, mas depois disso aceita
-- qualquer prompt, de qualquer colaborador ativo, sem limite de
-- quantidade. Pelo console do navegador (com a sessão já aberta), dá para
-- chamar a função em loop e gastar a cota/orçamento da conta Gemini da
-- empresa sem que ninguém perceba até a fatura ou até a cota acabar para
-- todo mundo.
--
-- Esta tabela registra cada chamada (quem, quando, se deu certo) e a Edge
-- Function passa a negar a chamada quando a pessoa já bateu o teto do dia.
-- Não guarda o prompt nem a resposta — só o necessário para contar e para
-- auditar quem usou o quê, quando.
-- ============================================================

create table if not exists public."log_invocacao_llm" (
  "id" uuid primary key default gen_random_uuid(),
  "colaborador_id" uuid not null references public."colaborador_base"("id"),
  "criado_em" timestamptz not null default now(),
  "sucesso" boolean
);

create index if not exists "ix_log_invocacao_llm_colaborador_dia"
  on public."log_invocacao_llm" ("colaborador_id", "criado_em");

alter table public."log_invocacao_llm" enable row level security;

drop policy if exists "log_invocacao_llm_inserir" on public."log_invocacao_llm";
drop policy if exists "log_invocacao_llm_ler"     on public."log_invocacao_llm";

-- Só em nome de si mesma: a Edge Function roda com o JWT de quem chamou,
-- não com a service_role, então a política vale também para ela.
create policy "log_invocacao_llm_inserir" on public."log_invocacao_llm"
  for insert to authenticated
  with check (colaborador_id = public.meu_colaborador_id()::uuid);

-- Cada um lê só o próprio uso (a Edge Function precisa contar antes de
-- decidir se deixa passar). Gestor não precisa ver o uso alheio aqui — se
-- um dia precisar de um painel de custo de IA, isso é outra tela, com
-- leitura própria.
create policy "log_invocacao_llm_ler" on public."log_invocacao_llm"
  for select to authenticated
  using (colaborador_id = public.meu_colaborador_id()::uuid);

-- ------------------------------------------------------------------
-- CONFERÊNCIA
-- ------------------------------------------------------------------
select
  policyname as politica,
  cmd        as operacao
from pg_policies
where schemaname = 'public' and tablename = 'log_invocacao_llm'
order by cmd;
