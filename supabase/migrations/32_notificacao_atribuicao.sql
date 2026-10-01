-- ============================================================
-- PORTAL CRC — NOTIFICAÇÃO DE NOVA ATRIBUIÇÃO (migration 32)
--
-- Rode no SQL Editor do Supabase.
--
-- Pedido do Pedro: quando o gestor vincula um ticket a um agente em
-- "Nova Atribuição de Tratativa", o agente deve ver um aviso simples (só um
-- botão "OK") na próxima vez que abrir o Portal. Atribuições de ANTES desta
-- migration não devem aparecer — só as feitas a partir de agora.
-- ============================================================

-- 1) A coluna que marca se o agente já confirmou a atribuição.
--
-- O DEFAULT true na hora de criar a coluna vale para as linhas que já
-- existem (o Postgres preenche todo mundo com true ao adicionar a coluna) —
-- é isso que garante que o histórico não aparece. Só depois o DEFAULT muda
-- para false, passando a valer só para atribuições novas.
alter table public."distribuicao_tratativa"
  add column if not exists "confirmado_pelo_agente" boolean not null default true;

alter table public."distribuicao_tratativa"
  add column if not exists "confirmado_em" timestamptz;

alter table public."distribuicao_tratativa"
  alter column "confirmado_pelo_agente" set default false;

-- 2) Confirmar é uma ação do próprio agente, mas a escrita em
-- distribuicao_tratativa é exclusiva de gestor (migration 30) — e está
-- certo que continue assim para os outros campos (ticket, prioridade etc).
-- Por isso uma função própria, estreita: só deixa marcar a própria
-- atribuição como confirmada, nada mais.
create or replace function public.confirmar_atribuicao(id_atribuicao uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public."distribuicao_tratativa"
  set "confirmado_pelo_agente" = true,
      "confirmado_em" = now()
  where "id" = id_atribuicao
    and "agente_id" = public.meu_colaborador_id()::uuid;
$$;

revoke execute on function public.confirmar_atribuicao(uuid) from anon;
grant  execute on function public.confirmar_atribuicao(uuid) to authenticated;

-- ------------------------------------------------------------------
-- CONFERÊNCIA
-- ------------------------------------------------------------------
-- Tem que dar 0: nenhuma atribuição antiga marcada como pendente.
select count(*) as atribuicoes_antigas_pendentes
from public."distribuicao_tratativa"
where "confirmado_pelo_agente" = false;
