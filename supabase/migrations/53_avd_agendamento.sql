-- ============================================================
-- PORTAL CRC — AGENDAR A AVD PARA UM HORÁRIO (migration 53)
--
-- Rode no SQL Editor do Supabase, DEPOIS da migration 52.
--
-- POR QUE
--   Quando a AVD aparece na tela, o agente pode estar no meio de um
--   atendimento. Em vez de a AVD cobrar na hora, ele escolhe um horário (até 7
--   dias à frente). Nesse horário ela volta e aí é obrigatória, sem poder
--   agendar de novo.
--
-- O QUE ENTRA
--   avd_agendamento: uma linha por pessoa e por AVD, com o horário escolhido.
--     - cada pessoa agenda UMA vez por AVD (não dá para empurrar para sempre);
--       só a gestão apaga o agendamento, se precisar liberar outro;
--     - só o próprio agente cria o dele, e só a gestão e ele leem;
--     - o banco confere: tem que ser uma AVD aberta, a pessoa ainda não pode
--       ter respondido, e o horário vai de daqui a 1 minuto até 7 dias.
--
-- COMO DESFAZER
--   drop table public.avd_agendamento;
-- ============================================================

create table if not exists public."avd_agendamento" (
  "id" uuid primary key default gen_random_uuid(),
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "pesquisa_id" text not null,
  "colaborador_id" text not null,
  "colaborador_nome" text,
  "agendada_para" timestamptz not null,
  unique ("pesquisa_id", "colaborador_id")
);

create index if not exists "ix_avd_agendamento_colaborador" on public."avd_agendamento" ("colaborador_id");

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
  if new.agendada_para > now() + interval '7 days' then
    raise exception 'O horário pode ser de até 7 dias à frente.';
  end if;
  return new;
end $$;

drop trigger if exists "avd_agendamento_validar" on public."avd_agendamento";
create trigger "avd_agendamento_validar"
  before insert on public."avd_agendamento"
  for each row execute function public.validar_avd_agendamento();

alter table public."avd_agendamento" enable row level security;

drop policy if exists "avd_agendamento_ler"      on public."avd_agendamento";
drop policy if exists "avd_agendamento_inserir"  on public."avd_agendamento";
drop policy if exists "avd_agendamento_apagar"   on public."avd_agendamento";

create policy "avd_agendamento_ler" on public."avd_agendamento"
  for select to authenticated
  using (public.eh_gestor() or colaborador_id = public.meu_colaborador_id());

create policy "avd_agendamento_inserir" on public."avd_agendamento"
  for insert to authenticated
  with check (colaborador_id = public.meu_colaborador_id());

create policy "avd_agendamento_apagar" on public."avd_agendamento"
  for delete to authenticated
  using (public.eh_gestor());

grant select, insert, delete on public."avd_agendamento" to authenticated;


-- ---------- conferência ----------
-- Deve listar a tabela, as 3 regras e a trava.
select 'tabela' as item, count(*)::text as ok
from information_schema.tables where table_schema = 'public' and table_name = 'avd_agendamento'
union all
select 'regras de acesso', count(*)::text
from pg_policies where schemaname = 'public' and tablename = 'avd_agendamento'
union all
select 'trava do horário', count(*)::text
from pg_trigger where tgname = 'avd_agendamento_validar';
