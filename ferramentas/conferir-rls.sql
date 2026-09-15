-- ============================================================
-- PORTAL CRC — CONFERÊNCIA DE SEGURANÇA
-- Rode no SQL Editor do Supabase. Só lê, não altera nada.
--
-- Mostra, tabela por tabela, se o Row Level Security está ligado.
-- Tabela com RLS desligado fica legível e gravável por qualquer
-- pessoa que tenha a chave anon — que vai no navegador dos 10 usuários.
-- ============================================================

select
  c.relname                                as tabela,
  case when c.relrowsecurity then 'PROTEGIDA' else '>>> EXPOSTA <<<' end as situacao,
  count(p.policyname)                      as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
       on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relrowsecurity asc, c.relname;

-- Resumo em uma linha:
select
  count(*)                                           as tabelas,
  count(*) filter (where relrowsecurity)              as protegidas,
  count(*) filter (where not relrowsecurity)          as expostas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';
