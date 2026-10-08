-- ============================================================
-- PORTAL CRC — PRAZO DE 48 HORAS PARA AGENDAR A AVD (migration 54)
--
-- Rode no SQL Editor do Supabase, DEPOIS da migration 53.
--
-- POR QUE
--   A migration 53 deixava agendar a AVD até 7 dias à frente. A regra é de
--   até 48 horas: o agente tem 2 dias, no máximo, para escolher o horário em
--   que vai responder.
--
-- O QUE MUDA
--   Só a conferência do banco: o horário vai de 1 minuto a 48 horas à frente.
--   Agendamentos já gravados continuam como estão.
--
-- COMO DESFAZER
--   Rodar de novo a migration 53 (restaura o prazo de 7 dias).
-- ============================================================

create or replace function public.validar_avd_agendamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare p public."pesquisa"%rowtype;
begin
  if auth.uid() is null then
    return new;   -- service_role
  end if;

  select * into p from public."pesquisa" where id::text = new.pesquisa_id;
  if not found or p.tipo is distinct from 'avd' or coalesce(p.ativa, false) = false then
    raise exception 'Só dá para agendar uma AVD que está aberta.';
  end if;
  if exists (
    select 1 from public."pesquisa_participacao" x
    where x.pesquisa_id = new.pesquisa_id and x.colaborador_id = new.colaborador_id
  ) then
    raise exception 'Você já respondeu esta AVD.';
  end if;
  if new.agendada_para < now() + interval '1 minute' then
    raise exception 'Escolha um horário daqui a pelo menos 1 minuto.';
  end if;
  if new.agendada_para > now() + interval '48 hours' then
    raise exception 'O horário pode ser de até 48 horas à frente.';
  end if;
  return new;
end $$;


-- ---------- conferência ----------
-- Deve mostrar que a função agora fala em 48 horas.
select proname::text as funcao, (pg_get_functiondef(oid) like '%48 hours%') as prazo_48h
from pg_proc
where proname = 'validar_avd_agendamento' and pronamespace = 'public'::regnamespace;
