-- ============================================================
-- PORTAL CRC — SLA E CUSTO TAMBÉM NA RECLAMAÇÃO INTERNA (migration 39)
--
-- Rode no SQL Editor do Supabase, DEPOIS da migration 38.
--
--
-- O DEFEITO
--
-- Os gatilhos calcular_sla_ao_encerrar e calcular_custo_ao_encerrar só
-- disparam quando o status vira "encerrada". Mas a reclamação interna NÃO
-- vira "encerrada" quando o agente encerra: vai para
-- "aguardando_confirmacao_reabertura" (a janela de 7 dias) e só chega em
-- "encerrada" quando alguém clica em "Concluir", depois dos 7 dias.
--
-- Efeito: durante os 7 dias — e para sempre, se ninguém clicar — a reclamação
-- interna fica com encerrado_no_sla, tempo_total_minutos e custo vazios. A tela
-- conta a tratativa no ciclo (aguardando_confirmacao_reabertura é encerrada
-- para a pontuação), mas sem o +1 de "encerramento no SLA". É a tratativa
-- "encerrada no prazo, mas não avaliada".
--
-- É o tipo mais comum (241 das 350 encerradas).
--
-- A CORREÇÃO
--
-- Os dois gatilhos passam a disparar também na entrada em
-- "aguardando_confirmacao_reabertura". A transição seguinte (para "encerrada",
-- ao concluir a janela) não recalcula: o valor já está gravado.
--
-- E o histórico: preenche as que ficaram vazias.
-- ============================================================


create or replace function public.calcular_sla_ao_encerrar()
returns trigger
language plpgsql
as $$
declare
  horas    integer;
  minutos  integer;
  fechado  timestamptz;
  comeco   timestamptz;
begin
  if new.status not in ('encerrada', 'aguardando_confirmacao_reabertura')
     or old.status in ('encerrada', 'aguardando_confirmacao_reabertura') then
    return new;
  end if;

  fechado := coalesce(new.data_encerramento, now());
  new.data_encerramento := fechado;

  horas := coalesce(new.sla_atribuido, public.sla_horas(new.tipo_tratativa, new.prazo_sla_dias));
  new.sla_atribuido := horas;

  comeco := coalesce(new.data_inicio_tratativa, new.data_registro, new.created_date);

  minutos := public.tempo_sla_efetivo_minutos(comeco, fechado, new.historico_estados);

  new.tempo_total_minutos := minutos;
  new.encerrado_no_sla := minutos <= (horas * 60);

  return new;
end $$;


create or replace function public.calcular_custo_ao_encerrar()
returns trigger
language plpgsql
as $$
begin
  if new.status not in ('encerrada', 'aguardando_confirmacao_reabertura')
     or old.status in ('encerrada', 'aguardando_confirmacao_reabertura') then
    return new;
  end if;

  new.custo_operacional_reais := public.custo_operacional_ajustado(
    new.id,
    new.historico_estados,
    new.agente_responsavel_id,
    coalesce(new.data_encerramento, now())
  );

  return new;
end $$;


-- ------------------------------------------------------------------
-- PREENCHE O QUE FICOU VAZIO
-- ------------------------------------------------------------------
-- Roda como administrador (sem usuário), então os gatilhos de proteção não
-- revertem os valores.
update public.tratativa_base t
set
  sla_atribuido       = coalesce(t.sla_atribuido, public.sla_horas(t.tipo_tratativa, t.prazo_sla_dias)),
  tempo_total_minutos = public.tempo_sla_efetivo_minutos(
                          coalesce(t.data_inicio_tratativa, t.data_registro, t.created_date),
                          t.data_encerramento,
                          t.historico_estados
                        ),
  encerrado_no_sla    = public.tempo_sla_efetivo_minutos(
                          coalesce(t.data_inicio_tratativa, t.data_registro, t.created_date),
                          t.data_encerramento,
                          t.historico_estados
                        ) <= (coalesce(t.sla_atribuido, public.sla_horas(t.tipo_tratativa, t.prazo_sla_dias)) * 60)
where t.status in ('encerrada', 'aguardando_confirmacao_reabertura')
  and t.data_encerramento is not null
  and t.encerrado_no_sla is null;

update public.tratativa_base t
set custo_operacional_reais = public.custo_operacional_ajustado(
      t.id, t.historico_estados, t.agente_responsavel_id, t.data_encerramento
    )
where t.status = 'aguardando_confirmacao_reabertura'
  and t.data_encerramento is not null
  and t.custo_operacional_reais is null;


-- ------------------------------------------------------------------
-- CONFERÊNCIA
-- ------------------------------------------------------------------
-- Esperado: zero em "sem_sla" para tratativas com data de encerramento.
select
  count(*) filter (where status in ('encerrada', 'aguardando_confirmacao_reabertura')
                     and data_encerramento is not null)                        as fechadas,
  count(*) filter (where status in ('encerrada', 'aguardando_confirmacao_reabertura')
                     and data_encerramento is not null
                     and encerrado_no_sla is null)                              as sem_sla
from public.tratativa_base;
