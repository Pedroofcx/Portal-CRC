-- ============================================================
-- PORTAL CRC — ARQUIVAR O LEGADO DO BASE44 (migration 42)
--
-- Rode no SQL Editor do Supabase, DEPOIS da migration 41.
--
-- O QUE FAZ
--   1. Tira do esquema "public" as sete tabelas que nenhuma tela usa mais,
--      movendo-as para o esquema "arquivo_legado". Nada é apagado: os dados
--      continuam lá, só que fora da API (o app não enxerga mais) e sem acesso
--      para ninguém além do administrador do banco.
--   2. Apaga quatro funções antigas que nenhuma tela nem gatilho usa.
--
-- POR QUE MOVER EM VEZ DE APAGAR
--   Não há backup automático do banco. Mover é reversível; apagar não é.
--
-- COMO DESFAZER (uma tabela, por exemplo):
--   alter table arquivo_legado.curso set schema public;
--
-- TABELAS: escala (0 linhas), saldo_ferias (3), configuracao_home_office (0),
--   solicitacao_home_office (0), curso (0), curso_matricula (0) e
--   oraculo_lancamento (31, já convertidas em observações na migration 22).
--
-- FUNÇÕES: minutos_congelados e tempo_sla_minutos (substituídas pela
--   migration 38) e pontos_da_tratativa / pontos_do_colaborador (espelho em
--   SQL que as telas nunca usaram). Cada uma só é apagada se nada depender
--   dela; se algo depender, o script avisa e deixa como está.
-- ============================================================

create schema if not exists arquivo_legado;
revoke all on schema arquivo_legado from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'escala', 'saldo_ferias', 'configuracao_home_office', 'solicitacao_home_office',
    'curso', 'curso_matricula', 'oraculo_lancamento'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I set schema arquivo_legado', t);
      raise notice 'tabela % movida para arquivo_legado', t;
    end if;
  end loop;
end $$;

do $$
declare
  f record;
begin
  -- pontos_do_colaborador usa pontos_da_tratativa: cai primeiro.
  for f in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('pontos_do_colaborador', 'pontos_da_tratativa', 'tempo_sla_minutos', 'minutos_congelados')
    order by array_position(array['pontos_do_colaborador', 'pontos_da_tratativa', 'tempo_sla_minutos', 'minutos_congelados'], p.proname::text)
  loop
    begin
      execute format('drop function public.%I(%s)', f.proname, f.args);
      raise notice 'função %(%) apagada', f.proname, f.args;
    exception when others then
      raise notice 'função % mantida: %', f.proname, sqlerrm;
    end;
  end loop;
end $$;

-- Conferência: deve listar as 7 tabelas em arquivo_legado e nenhuma das 4 funções em public.
select 'tabela arquivada' as item, table_name::text as nome
from information_schema.tables where table_schema = 'arquivo_legado'
union all
select 'função que ainda existe', p.proname::text
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('pontos_do_colaborador', 'pontos_da_tratativa', 'tempo_sla_minutos', 'minutos_congelados')
order by 1, 2;
