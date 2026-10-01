-- =====================================================================
-- 29 — Função de auditoria das políticas de RLS
-- =====================================================================
-- Fase 2 do plano de blindagem (01/10/2026): conferir, tabela por tabela,
-- se o banco real bate com o que as migrations dizem que deveria ser —
-- sem isso, qualquer auditoria depende de reler os arquivos .sql e torcer
-- pra terem rodado todos, na ordem certa, sem erro no meio.
--
-- Só devolve METADADO de política (nome, tabela, operação, se cita
-- eh_gestor/eh_colaborador/meu_colaborador_id, se está "aberta"). Nunca
-- devolve uma linha de dado de verdade. Só o service_role executa —
-- revogado de anon e authenticated, então nenhum usuário do Portal chega
-- nela por nenhum caminho do frontend.
--
-- Rodar uma vez no SQL Editor. Rodar de novo não duplica nada.
-- =====================================================================

create or replace function public.auditoria_rls()
returns table (
  tabela           text,
  politica         text,
  operacao         text,
  usa_eh_gestor    boolean,
  usa_eh_colaborador boolean,
  usa_dono         boolean,
  aberta_geral     boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    tablename::text,
    policyname::text,
    cmd::text,
    (coalesce(qual, '') || coalesce(with_check, '')) like '%eh_gestor%',
    (coalesce(qual, '') || coalesce(with_check, '')) like '%eh_colaborador%',
    (coalesce(qual, '') || coalesce(with_check, '')) like '%meu_colaborador_id%'
      or (coalesce(qual, '') || coalesce(with_check, '')) like '%colaboradores_ids%',
    (qual = 'true' or with_check = 'true')
  from pg_policies
  where schemaname = 'public'
  order by tablename, policyname;
$$;

revoke execute on function public.auditoria_rls() from anon;
revoke execute on function public.auditoria_rls() from authenticated;
grant  execute on function public.auditoria_rls() to service_role;

-- Confere: tem que aparecer pelo menos uma linha por tabela, e
-- aberta_geral tem que ser "false" em todas (nenhuma política deveria
-- continuar liberando geral desde a migration 13).
select tabela, count(*) as politicas, bool_or(aberta_geral) as alguma_aberta
from public.auditoria_rls()
group by tabela
order by tabela;
