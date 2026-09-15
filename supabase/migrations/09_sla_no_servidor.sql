-- ============================================================
-- PORTAL CRC — CÁLCULO DE SLA NO SERVIDOR (Fase 04, item 2)
--
-- Rode no SQL Editor do Supabase.
--
--
-- ISTO NÃO É SÓ UMA MIGRAÇÃO — É UMA RESTAURAÇÃO
--
-- `encerrado_no_sla` e `tempo_total_minutos` são LIDOS em seis pontos do
-- sistema: o contador "Fora do SLA" do Dashboard, o consolidado do Hansei, o
-- percentual de SLA da Jornada, a análise profunda do colaborador, o
-- Analytics Preditivo e a lista de tratativas.
--
-- E não são ESCRITOS em lugar nenhum do código exportado. Os 310 registros
-- importados têm valores porque o Base44 os preenchia — provavelmente numa
-- função de servidor que não veio no export. A tratativa criada no sistema
-- novo está com os dois campos nulos.
--
-- Sem isto, toda tratativa encerrada de hoje em diante sairia dos indicadores
-- em silêncio: o percentual continuaria na tela, calculado sobre uma base que
-- para de crescer.
--
--
-- POR QUE NÃO COPIAMOS A REGRA DO BASE44
--
-- Porque ela não é reproduzível. Analisando as 309 encerradas:
--
--   - o `tempo_total_minutos` gravado equivale ao tempo corrido em 236 casos
--     e é muito menor em 73, sem padrão que explique a diferença;
--   - três tratativas estão marcadas como "fora do SLA" com 2, 10 e 1.070
--     minutos contra um prazo de 24 horas — nenhuma fórmula produz isso.
--
-- Os dados da origem não são internamente consistentes. Então a regra foi
-- ESCOLHIDA, não deduzida, e está escrita aqui por extenso.
--
--
-- A REGRA, DECIDIDA EM 15/09/2026
--
-- Tempo de SLA = do registro ao encerramento, descontando apenas os períodos
-- em que o SLA esteve FORMALMENTE CONGELADO.
--
--   - O relógio NÃO para em dependência externa. SLA é promessa ao cliente,
--     e ele espera o mesmo tanto independentemente de quem travou o caso.
--     Dependência externa é 17% de todo o tempo da operação; descontá-la
--     levaria o indicador de 35% para 53% sem que nada tivesse melhorado.
--
--   - O relógio PARA no congelamento explícito (aguardando_financeiro), que é
--     um ato registrado, com data e responsável. É 1,7% do tempo. Se não
--     parasse aqui, o botão "Congelar SLA" do produto não faria nada.
--
-- Efeito medido nos dados reais: 35% das tratativas encerradas ficam dentro
-- do SLA, contra os 40% que o registro do Base44 indicava.
-- ============================================================


-- ------------------------------------------------------------------
-- 1) PRAZO DE SLA, EM HORAS
-- ------------------------------------------------------------------
-- Contestação tem prazo informado caso a caso, porque depende da bandeira e
-- do tipo de disputa: nos dados reais varia de 48 a 360 horas. Os demais
-- tipos têm prazo fixo.
--
-- ATENÇÃO: 'procon' e 'administrativas' caem no padrão de 24h, que é o que o
-- código sempre fez. Para Procon isso pode estar errado — prazos legais
-- costumam ser contados em dias. Há 1 registro na base. Se o prazo correto
-- for outro, esta função é o único lugar a mudar.
create or replace function public.sla_horas(
  tipo            text,
  prazo_sla_dias  numeric default null
) returns integer
language sql
immutable
as $$
  select case
    when tipo = 'contestacao' and coalesce(prazo_sla_dias, 0) > 0
      then (prazo_sla_dias * 24)::integer
    when tipo = 'reclamacao_interna'  then 24
    when tipo = 'reclame_aqui'        then 48
    when tipo = 'google_meu_negocio'  then 72
    when tipo = 'contestacao'         then 72
    else 24
  end
$$;


-- ------------------------------------------------------------------
-- 2) MINUTOS COM O SLA CONGELADO
-- ------------------------------------------------------------------
-- Percorre historico_estados e soma os períodos em aguardando_financeiro.
create or replace function public.minutos_congelados(
  historico          jsonb,
  data_encerramento  timestamptz default null
) returns integer
language plpgsql
stable
as $$
declare
  total   numeric := 0;
  n       integer;
  i       integer;
  inicio  timestamptz;
  fim     timestamptz;
begin
  if historico is null or jsonb_typeof(historico) <> 'array' then
    return 0;
  end if;

  n := jsonb_array_length(historico);

  for i in 0 .. n - 1 loop
    if coalesce((historico -> i) ->> 'estado_novo', '') <> 'aguardando_financeiro' then
      continue;
    end if;

    begin
      inicio := ((historico -> i) ->> 'data_mudanca')::timestamptz;
    exception when others then
      continue;   -- data ilegível não derruba o cálculo
    end;
    if inicio is null then continue; end if;

    if i < n - 1 then
      begin
        fim := ((historico -> (i + 1)) ->> 'data_mudanca')::timestamptz;
      exception when others then
        fim := null;
      end;
    else
      fim := coalesce(data_encerramento, now());
    end if;

    if fim is not null and fim > inicio then
      total := total + extract(epoch from (fim - inicio)) / 60;
    end if;
  end loop;

  return round(total)::integer;
end $$;


-- ------------------------------------------------------------------
-- 3) TEMPO DE SLA
-- ------------------------------------------------------------------
create or replace function public.tempo_sla_minutos(
  data_registro      timestamptz,
  data_encerramento  timestamptz,
  historico          jsonb
) returns integer
language sql
stable
as $$
  select greatest(
    0,
    round(extract(epoch from (coalesce(data_encerramento, now()) - data_registro)) / 60)::integer
      - public.minutos_congelados(historico, data_encerramento)
  )
$$;


-- ------------------------------------------------------------------
-- 4) O GATILHO DO ENCERRAMENTO
-- ------------------------------------------------------------------
create or replace function public.calcular_sla_ao_encerrar()
returns trigger
language plpgsql
as $$
declare
  horas    integer;
  minutos  integer;
  fechado  timestamptz;
begin
  if new.status <> 'encerrada' or old.status = 'encerrada' then
    return new;
  end if;

  fechado := coalesce(new.data_encerramento, now());
  new.data_encerramento := fechado;

  -- O prazo é definido na abertura; se não foi, define aqui.
  horas := coalesce(new.sla_atribuido, public.sla_horas(new.tipo_tratativa, new.prazo_sla_dias));
  new.sla_atribuido := horas;

  minutos := public.tempo_sla_minutos(
    coalesce(new.data_registro, new.created_date),
    fechado,
    new.historico_estados
  );

  new.tempo_total_minutos := minutos;
  new.encerrado_no_sla := minutos <= (horas * 60);

  return new;
end $$;

drop trigger if exists calcula_sla_ao_encerrar on public.tratativa_base;

create trigger calcula_sla_ao_encerrar
  before update on public.tratativa_base
  for each row
  execute function public.calcular_sla_ao_encerrar();


-- ------------------------------------------------------------------
-- 5) RECÁLCULO DO HISTÓRICO
-- ------------------------------------------------------------------
-- Decisão de 15/09/2026: passado e futuro passam a usar a mesma régua, para
-- comparações entre períodos serem válidas.
--
-- O indicador VAI MUDAR: o registro do Base44 dizia 40% dentro do SLA; com
-- esta régua ficam cerca de 35%. Se algum número já foi reportado à diretoria
-- com a régua antiga, ele deixa de bater — e é bom saber disso antes.
--
-- Roda como administrador no SQL Editor, então passa pelos gatilhos de status.
update public.tratativa_base
set
  sla_atribuido       = coalesce(sla_atribuido, public.sla_horas(tipo_tratativa, prazo_sla_dias)),
  tempo_total_minutos = public.tempo_sla_minutos(
                          coalesce(data_registro, created_date),
                          data_encerramento,
                          historico_estados
                        ),
  encerrado_no_sla    = public.tempo_sla_minutos(
                          coalesce(data_registro, created_date),
                          data_encerramento,
                          historico_estados
                        ) <= (coalesce(sla_atribuido, public.sla_horas(tipo_tratativa, prazo_sla_dias)) * 60)
where status = 'encerrada'
  and data_registro is not null;


-- ------------------------------------------------------------------
-- CONFERÊNCIA
-- ------------------------------------------------------------------
select
  count(*)                                          as encerradas,
  count(*) filter (where encerrado_no_sla)          as dentro_do_sla,
  round(100.0 * count(*) filter (where encerrado_no_sla) / nullif(count(*), 0), 1) as pct_dentro,
  count(*) filter (where encerrado_no_sla is null)  as sem_indicador,
  round(avg(tempo_total_minutos) / 60.0, 1)         as media_horas
from public.tratativa_base
where status = 'encerrada';
