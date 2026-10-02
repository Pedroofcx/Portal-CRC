-- ============================================================
-- PORTAL CRC — SLA CONTA DO INÍCIO DA TRATATIVA E PAUSA EM DEPENDÊNCIA
--   EXTERNA (migration 38)
--
-- Rode no SQL Editor do Supabase.
--
--
-- A REGRA, DECIDIDA POR PEDRO EM 02/10/2026 (substitui a de 15/09)
--
--   Tempo de SLA = do INÍCIO da tratativa (data_inicio_tratativa) ao
--   encerramento, descontando o tempo em que ela esteve em
--   "dependencia_externa" ou "aguardando_financeiro".
--
-- Antes: contava do registro e só descontava aguardando_financeiro.
--
--
-- O QUE ESTA MIGRATION FAZ
--
--   1. cria minutos_pausados() e tempo_sla_efetivo_minutos();
--   2. troca o gatilho calcular_sla_ao_encerrar para usar a regra nova;
--   3. GUARDA os valores atuais em sla_recalculo_38 (para poder desfazer);
--   4. RECALCULA tempo_total_minutos e encerrado_no_sla de todas as
--      tratativas encerradas.
--
-- Simulação feita antes sobre 349 encerradas: o percentual dentro do SLA vai
-- de 39,3% para 61,9% (79 passam para "dentro", nenhuma passa para "fora").
--
-- ATENÇÃO — EFEITO CONHECIDO: sem teto de pausa, uma tratativa parada em
-- dependência externa por meses conta como "dentro do SLA". Foi decisão
-- consciente; 72 das 349 passaram mais de 90% do tempo em pausa.
--
-- COMO DESFAZER (se precisar):
--   update public.tratativa_base t
--      set encerrado_no_sla = b.encerrado_no_sla,
--          tempo_total_minutos = b.tempo_total_minutos
--     from public.sla_recalculo_38 b where b.id = t.id;
-- ============================================================


-- ------------------------------------------------------------------
-- 1) MINUTOS EM PAUSA
-- ------------------------------------------------------------------
-- Percorre o histórico como uma linha do tempo de ESTADOS: só contam as
-- entradas em que o estado mudou. Notas livres (estado_anterior = estado_novo)
-- não interrompem o período — um comentário em dependência externa não
-- encerra a pausa.
create or replace function public.minutos_pausados(
  historico jsonb,
  inicio    timestamptz,
  fim       timestamptz
) returns integer
language sql
stable
as $$
  with ev as (
    select e ->> 'estado_novo'                   as estado,
           (e ->> 'data_mudanca')::timestamptz   as quando
    from jsonb_array_elements(
           case when jsonb_typeof(historico) = 'array' then historico else '[]'::jsonb end
         ) e
    where e ->> 'estado_novo' is not null
      and e ->> 'estado_novo' is distinct from e ->> 'estado_anterior'
      and (e ->> 'data_mudanca') ~ '^\d{4}-\d{2}-\d{2}'
  ),
  seq as (
    select estado, quando, lead(quando) over (order by quando) as prox
    from ev
  )
  select coalesce(
           round(sum(
             extract(epoch from (least(coalesce(prox, fim), fim) - greatest(quando, inicio))) / 60
           )),
           0
         )::integer
  from seq
  where estado in ('dependencia_externa', 'aguardando_financeiro')
    and least(coalesce(prox, fim), fim) > greatest(quando, inicio)
$$;


-- ------------------------------------------------------------------
-- 2) TEMPO DE SLA
-- ------------------------------------------------------------------
create or replace function public.tempo_sla_efetivo_minutos(
  inicio    timestamptz,
  fim       timestamptz,
  historico jsonb
) returns integer
language sql
stable
as $$
  select greatest(
    0,
    round(extract(epoch from (fim - inicio)) / 60)::integer
      - public.minutos_pausados(historico, inicio, fim)
  )
$$;


-- ------------------------------------------------------------------
-- 3) O GATILHO DO ENCERRAMENTO
-- ------------------------------------------------------------------
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
  if new.status <> 'encerrada' or old.status = 'encerrada' then
    return new;
  end if;

  fechado := coalesce(new.data_encerramento, now());
  new.data_encerramento := fechado;

  horas := coalesce(new.sla_atribuido, public.sla_horas(new.tipo_tratativa, new.prazo_sla_dias));
  new.sla_atribuido := horas;

  -- Começa no início da tratativa; se nunca foi iniciada, cai para o registro.
  comeco := coalesce(new.data_inicio_tratativa, new.data_registro, new.created_date);

  minutos := public.tempo_sla_efetivo_minutos(comeco, fechado, new.historico_estados);

  new.tempo_total_minutos := minutos;
  new.encerrado_no_sla := minutos <= (horas * 60);

  return new;
end $$;


-- ------------------------------------------------------------------
-- 4) COPIA DE SEGURANÇA DOS VALORES ATUAIS
-- ------------------------------------------------------------------
create table if not exists public.sla_recalculo_38 as
select id, id_interno, encerrado_no_sla, tempo_total_minutos
from public.tratativa_base
where status = 'encerrada' and data_encerramento is not null;

-- Tabela só para conferência: ninguém lê pela API.
alter table public.sla_recalculo_38 enable row level security;
revoke all on public.sla_recalculo_38 from anon, authenticated;


-- ------------------------------------------------------------------
-- 5) RECÁLCULO DO HISTÓRICO
-- ------------------------------------------------------------------
-- Roda como administrador no SQL Editor (sem usuário), então passa pelos
-- gatilhos de proteção sem ser revertido.
update public.tratativa_base t
set
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
where t.status = 'encerrada'
  and t.data_encerramento is not null;


-- ------------------------------------------------------------------
-- CONFERÊNCIA
-- ------------------------------------------------------------------
-- Esperado (simulação feita antes): dentro_agora ≈ 216 de 349 (61,9%),
-- passaram_para_dentro = 79, passaram_para_fora = 0.
select
  count(*)                                                              as encerradas,
  count(*) filter (where b.encerrado_no_sla)                            as dentro_antes,
  count(*) filter (where t.encerrado_no_sla)                            as dentro_agora,
  count(*) filter (where not coalesce(b.encerrado_no_sla, false) and t.encerrado_no_sla) as passaram_para_dentro,
  count(*) filter (where b.encerrado_no_sla and not t.encerrado_no_sla)                  as passaram_para_fora
from public.tratativa_base t
join public.sla_recalculo_38 b on b.id = t.id;
