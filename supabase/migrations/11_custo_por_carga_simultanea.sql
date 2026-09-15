-- ============================================================
-- PORTAL CRC — CUSTO AJUSTADO PELA CARGA SIMULTÂNEA (Fase 04, item 3b)
--
-- Rode no SQL Editor DEPOIS da migration 10.
--
--
-- O PROBLEMA QUE ISTO RESOLVE
--
-- A migration 10 passou a calcular o custo operacional a partir do tempo em
-- que a tratativa esteve em atendimento. O número saiu do zero e apareceu:
-- R$ 683.446 no total, 125 horas efetivas por tratativa.
--
-- 125 horas são mais de 15 dias úteis de alguém dedicado a uma única
-- reclamação. Isso não descreve a operação. O que a conta media não era tempo
-- TRABALHADO, e sim tempo no estado `em_andamento` — e uma tratativa fica
-- nesse estado durante dias enquanto o agente atende outras ao mesmo tempo.
--
-- A premissa de dedicação exclusiva veio herdada do Base44 e só ficou visível
-- quando o número deixou de ser zero.
--
--
-- COMO FICA
--
-- Se o agente tinha 6 tratativas em atendimento simultâneo, cada uma recebe
-- 1/6 do custo daquele período. A atenção é dividida; o custo também.
--
-- Medido nos dados reais: o total cai de R$ 683.446 para cerca de
-- R$ 212.679, uma redução de 69%.
--
--
-- A RESSALVA, QUE PRECISA ANDAR JUNTO COM O NÚMERO
--
-- A carga simultânea é deduzida de como cada pessoa usa o sistema, não de
-- quanto ela trabalha. Nos dados atuais um agente tem carga 6,65 e outro tem
-- 1,03 — o segundo simplesmente não deixa casos abertos em paralelo, encerra
-- e passa ao próximo. Isso muda o custo por tratativa de cada um sem que
-- nenhum dos dois tenha trabalhado mais ou menos.
--
-- O número ficou muito mais defensável que antes, mas continua sendo uma
-- estimativa de ocupação, não uma medição de esforço. Medir esforço de
-- verdade exigiria cronômetro na tratativa.
-- ============================================================


-- ------------------------------------------------------------------
-- 1) INTERVALOS EM ATENDIMENTO
-- ------------------------------------------------------------------
-- Expande historico_estados nos períodos em que a tratativa esteve
-- efetivamente em atendimento.
create or replace function public.intervalos_ativos(
  p_historico  jsonb,
  p_fim_padrao timestamptz default null
) returns table (ini timestamptz, fim timestamptz)
language plpgsql
stable
as $$
declare
  n integer;
  i integer;
  v_ini timestamptz;
  v_fim timestamptz;
begin
  if p_historico is null or jsonb_typeof(p_historico) <> 'array' then
    return;
  end if;

  n := jsonb_array_length(p_historico);

  for i in 0 .. n - 1 loop
    if coalesce((p_historico -> i) ->> 'estado_novo', '')
       not in ('tratativa_iniciada', 'em_andamento') then
      continue;
    end if;

    begin
      v_ini := ((p_historico -> i) ->> 'data_mudanca')::timestamptz;
    exception when others then
      continue;
    end;
    if v_ini is null then continue; end if;

    if i < n - 1 then
      begin
        v_fim := ((p_historico -> (i + 1)) ->> 'data_mudanca')::timestamptz;
      exception when others then
        v_fim := null;
      end;
    else
      v_fim := coalesce(p_fim_padrao, now());
    end if;

    if v_fim is not null and v_fim > v_ini then
      ini := v_ini;
      fim := v_fim;
      return next;
    end if;
  end loop;
end $$;


-- ------------------------------------------------------------------
-- 2) MINUTOS EFETIVOS PONDERADOS PELA CARGA
-- ------------------------------------------------------------------
-- Para cada intervalo desta tratativa, mede quantas OUTRAS tratativas do
-- mesmo agente estavam em atendimento ao mesmo tempo, ponderado pela duração
-- da sobreposição. A concorrência média do intervalo é:
--
--     1 + (tempo de outras tratativas sobreposto) / (duração do intervalo)
--
-- e os minutos do intervalo são divididos por ela.
--
-- Nota de precisão: dividir pela concorrência MÉDIA não é idêntico a
-- integrar 1/N minuto a minuto — quando a concorrência varia muito dentro de
-- um mesmo intervalo, os dois resultados divergem um pouco. A diferença é
-- pequena diante da imprecisão da própria premissa, e a forma exata exigiria
-- varredura minuto a minuto sobre todo o histórico.
create or replace function public.minutos_efetivos_ponderados(
  p_tratativa_id uuid,
  p_agente_id    text,
  p_historico    jsonb,
  p_encerramento timestamptz default null
) returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r             record;
  v_duracao     numeric;
  v_sobreposto  numeric;
  v_concorrencia numeric;
  v_total       numeric := 0;
begin
  if p_agente_id is null or p_agente_id = '' then
    return 0;
  end if;

  for r in
    select ini, fim from public.intervalos_ativos(p_historico, p_encerramento)
  loop
    v_duracao := extract(epoch from (r.fim - r.ini)) / 60;
    if v_duracao <= 0 then continue; end if;

    -- Quanto tempo de OUTRAS tratativas do mesmo agente cai dentro deste
    -- intervalo. least/greatest recortam a sobreposição.
    select coalesce(sum(
             extract(epoch from (least(o.fim, r.fim) - greatest(o.ini, r.ini))) / 60
           ), 0)
      into v_sobreposto
    from public.tratativa_base t
    cross join lateral public.intervalos_ativos(t.historico_estados, t.data_encerramento) o
    where t.agente_responsavel_id = p_agente_id
      and t.id <> p_tratativa_id
      and o.ini < r.fim
      and o.fim > r.ini;

    v_concorrencia := 1 + (v_sobreposto / v_duracao);
    v_total := v_total + (v_duracao / v_concorrencia);
  end loop;

  return round(v_total, 2);
end $$;


-- ------------------------------------------------------------------
-- 3) CUSTO OPERACIONAL, AJUSTADO
-- ------------------------------------------------------------------
create or replace function public.custo_operacional_ajustado(
  p_tratativa_id           uuid,
  p_historico              jsonb,
  p_agente_id              text,
  p_encerramento           timestamptz default null,
  p_multiplicador_encargos numeric default 1.6,
  p_carga_horaria_mensal   numeric default 220
) returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_salario      numeric;
  v_id           uuid;
  v_minutos      numeric;
  v_custo_minuto numeric;
begin
  if p_agente_id is null or p_agente_id = '' then
    return null;
  end if;

  begin
    v_id := p_agente_id::uuid;
  exception when others then
    return null;     -- vínculo órfão herdado da importação
  end;

  select salario into v_salario from public.colaborador_base where id = v_id;

  if v_salario is null or v_salario <= 0 then
    return null;     -- cadastro incompleto: não inventa número
  end if;

  v_minutos := public.minutos_efetivos_ponderados(
    p_tratativa_id, p_agente_id, p_historico, p_encerramento
  );

  v_custo_minuto := ((v_salario * p_multiplicador_encargos) / p_carga_horaria_mensal) / 60;
  return round(v_custo_minuto * v_minutos, 2);
end $$;

revoke execute on function public.custo_operacional_ajustado(uuid, jsonb, text, timestamptz, numeric, numeric) from anon;
grant  execute on function public.custo_operacional_ajustado(uuid, jsonb, text, timestamptz, numeric, numeric) to authenticated;


-- ------------------------------------------------------------------
-- 4) O GATILHO PASSA A USAR A VERSÃO AJUSTADA
-- ------------------------------------------------------------------
create or replace function public.calcular_custo_ao_encerrar()
returns trigger
language plpgsql
as $$
begin
  if new.status <> 'encerrada' or old.status = 'encerrada' then
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
-- 5) RECÁLCULO DO HISTÓRICO
-- ------------------------------------------------------------------
-- Pode demorar: cada tratativa consulta os intervalos de todas as outras do
-- mesmo agente. São ~310 encerradas, então é questão de segundos.
update public.tratativa_base t
set custo_operacional_reais = public.custo_operacional_ajustado(
      t.id, t.historico_estados, t.agente_responsavel_id, t.data_encerramento
    )
where t.status = 'encerrada';


-- ------------------------------------------------------------------
-- CONFERÊNCIA
-- ------------------------------------------------------------------
select
  count(*)                                                     as encerradas,
  count(*) filter (where custo_operacional_reais is not null)  as com_custo,
  to_char(coalesce(sum(custo_operacional_reais), 0), 'FM999G999G990D00') as custo_total_reais,
  to_char(coalesce(avg(custo_operacional_reais), 0), 'FM999G990D00')     as custo_medio_reais,
  round(avg(public.tempo_efetivo_minutos(historico_estados)) / 60.0, 1)  as horas_em_atendimento,
  round(avg(public.minutos_efetivos_ponderados(id, agente_responsavel_id, historico_estados, data_encerramento)) / 60.0, 1)
                                                               as horas_ponderadas
from public.tratativa_base
where status = 'encerrada';
