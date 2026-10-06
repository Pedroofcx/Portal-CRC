-- ============================================================
-- PORTAL CRC — AVD (AVALIAÇÃO DE DESEMPENHO SETORIAL) COMO PESQUISA (migration 49)
--
-- Rode no SQL Editor do Supabase, DEPOIS da migration 48.
--
-- POR QUE
--   A AVD é feita todo mês no Google Forms, com as mesmas perguntas. Ela passa
--   a viver dentro de Pesquisas, e as respostas alimentam o Oráculo CRC (a
--   aba AVD de cada pessoa). O Kaizen também ganha um tipo próprio.
--
-- O QUE ENTRA
--   1) pesquisa.tipo aceita 'avd' e 'kaizen' (além de csat, nps, ces,
--      clima_organizacional e personalizada).
--   2) pesquisa.competencia ('AAAA-MM'): o mês do trabalho avaliado. A AVD é
--      respondida no fim do mês, ou na volta de férias, então o carimbo de
--      data não serve para saber a que mês ela pertence.
--
--   Nada muda nas regras de acesso: as respostas continuam visíveis só para o
--   gestor (todas, identificadas) e para a própria pessoa (a dela). A AVD não
--   entra na pontuação nem na premiação.
--
-- COMO DESFAZER
--   delete from resposta_pesquisa where pesquisa_tipo in ('avd','kaizen');
--   delete from pesquisa where tipo in ('avd','kaizen');
--   alter table pesquisa drop column competencia;
--   e recriar a restrição de tipo sem 'avd' e 'kaizen'.
-- ============================================================

alter table public."pesquisa" add column if not exists "competencia" text;

do $$
declare nome text;
begin
  for nome in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.pesquisa'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%clima_organizacional%'
  loop
    execute format('alter table public."pesquisa" drop constraint %I', nome);
  end loop;
end $$;

alter table public."pesquisa"
  add constraint "pesquisa_tipo_check"
  check ("tipo" is null or "tipo" in ('csat', 'nps', 'ces', 'clima_organizacional', 'personalizada', 'avd', 'kaizen'));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'pesquisa_competencia_formato') then
    alter table public."pesquisa"
      add constraint "pesquisa_competencia_formato"
      check ("competencia" is null or "competencia" ~ '^\d{4}-(0[1-9]|1[0-2])$');
  end if;
end $$;

create index if not exists "ix_pesquisa_tipo_competencia" on public."pesquisa" ("tipo", "competencia");


-- ---------- conferência ----------
-- Deve listar as duas colunas/restrições novas.
select 'coluna competencia' as item, count(*)::text as ok
from information_schema.columns
where table_schema = 'public' and table_name = 'pesquisa' and column_name = 'competencia'
union all
select 'tipo aceita avd', count(*)::text
from pg_constraint
where conrelid = 'public.pesquisa'::regclass and conname = 'pesquisa_tipo_check'
  and pg_get_constraintdef(oid) like '%avd%';
