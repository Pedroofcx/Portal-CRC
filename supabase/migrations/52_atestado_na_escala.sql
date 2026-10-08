-- ============================================================
-- PORTAL CRC — ATESTADO MÉDICO NA ESCALA (migration 52)
--
-- Rode no SQL Editor do Supabase, DEPOIS da migration 51.
--
-- POR QUE
--   A Escala de Trabalho só tinha presencial, home office, day off, férias,
--   falta e treinamento. Faltava o atestado médico, e o rodízio de tratativas
--   precisa pular quem está com atestado (como já pula férias e day off).
--
-- O QUE MUDA
--   escala_atribuicao.tipo_evento passa a aceitar 'atestado'. O resto é da tela
--   e das regras: quem está com atestado é indisponível no rodízio e na
--   montagem da semana, e mantém a vez para quando voltar.
--
-- COMO DESFAZER
--   update escala_atribuicao set tipo_evento = 'falta' where tipo_evento = 'atestado';
--   e recriar a restrição sem 'atestado'.
-- ============================================================

do $$
declare nome text;
begin
  for nome in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.escala_atribuicao'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%tipo_evento%'
  loop
    execute format('alter table public."escala_atribuicao" drop constraint %I', nome);
  end loop;
end $$;

alter table public."escala_atribuicao"
  add constraint "escala_atribuicao_tipo_evento_check"
  check ("tipo_evento" is null or "tipo_evento" in
    ('home_office', 'presencial', 'hibrido', 'ferias', 'day_off', 'falta', 'atestado', 'treinamento', 'evento_especial'));


-- ---------- conferência ----------
-- Deve listar a restrição aceitando atestado.
select conname::text as restricao, (pg_get_constraintdef(oid) like '%atestado%') as aceita_atestado
from pg_constraint
where conrelid = 'public.escala_atribuicao'::regclass and conname = 'escala_atribuicao_tipo_evento_check';
