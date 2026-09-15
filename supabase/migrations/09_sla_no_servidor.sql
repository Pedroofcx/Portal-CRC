-- ============================================================
-- PORTAL CRC — CÁLCULO DE SLA NO SERVIDOR (Fase 04, item 2)
--
-- Rode no SQL Editor do Supabase.
--
--
-- ISTO NÃO É SÓ UMA MIGRAÇÃO — É UMA RESTAURAÇÃO
--
-- Os campos `encerrado_no_sla` e `tempo_total_minutos` são LIDOS em seis
-- pontos do sistema: o contador "Fora do SLA" do Dashboard, o consolidado do
-- Hansei, o percentual de SLA da Jornada do Cliente, a análise profunda do
-- colaborador, o Analytics Preditivo e a lista de tratativas.
--
-- E não são ESCRITOS em lugar nenhum do código exportado.
--
-- Os 310 registros importados têm os valores porque o Base44 os preenchia —
-- provavelmente numa função de servidor que não veio no export. A única
-- tratativa criada no sistema novo está com os dois campos nulos.
--
-- Sem esta migration, toda tratativa encerrada de hoje em diante sairia dos
-- indicadores de SLA em silêncio. O percentual continuaria sendo exibido,
-- calculado sobre uma base que para de crescer.
--
--
-- COMO O TEMPO É CONTADO
--
-- Tempo efetivo conta apenas os períodos em `tratativa_iniciada` e
-- `em_andamento`. Fica de fora o tempo em `dependencia_externa` (esperando
-- terceiro), em `aguardando_financeiro` (SLA congelado) e na janela de
-- confirmação de reabertura — porque em nenhum deles o atraso é da equipe.
--
-- Isso reproduz o `calcularTempoEfetivo` do navegador, que continua existindo
-- para os relatórios exibirem o número antes do encerramento.
-- ============================================================


-- ------------------------------------------------------------------
-- 1) PRAZO DE SLA, EM HORAS
-- ------------------------------------------------------------------
-- Contestação tem prazo informado caso a caso (prazo_sla_dias), porque
-- depende da bandeira e do tipo de disputa — nos dados reais ele varia de 48
-- a 360 horas. Os demais tipos têm prazo fixo.
--
-- ATENÇÃO: 'procon' e 'administrativas' caem no padrão de 24h, que é o que o
-- código sempre fez. Para Procon isso pode estar errado — prazos legais
-- costumam ser contados em dias. Há 1 registro de Procon na base. Se o prazo
-- correto for outro, altere aqui: é o único lugar.
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
-- 2) TEMPO EFETIVO, EM MINUTOS
-- ------------------------------------------------------------------
-- Percorre historico_estados na ordem em que foi gravado e soma o intervalo
-- de cada entrada cujo estado é ativo, até a entrada seguinte.
create or replace function public.tempo_efetivo_minutos(historico jsonb)
returns integer
language plpgsql
stable
as $$
declare
  total   numeric := 0;
  n       integer;
  i       integer;
  atual   jsonb;
  inicio  timestamptz;
  fim     timestamptz;
begin
  if historico is null or jsonb_typeof(historico) <> 'array' then
    return 0;
  end if;

  n := jsonb_array_length(historico);

  for i in 0 .. n - 1 loop
    atual := historico -> i;

    -- Só conta o que é trabalho da equipe.
    if coalesce(atual ->> 'estado_novo', '') not in ('tratativa_iniciada', 'em_andamento') then
      continue;
    end if;

    begin
      inicio := (atual ->> 'data_mudanca')::timestamptz;
    exception when others then
      continue;   -- entrada com data ilegível não derruba o cálculo
    end;

    if inicio is null then
      continue;
    end if;

    if i < n - 1 then
      begin
        fim := ((historico -> (i + 1)) ->> 'data_mudanca')::timestamptz;
      exception when others then
        fim := null;
      end;
    else
      -- Última entrada e ainda ativa: conta até agora.
      fim := now();
    end if;

    if fim is not null and fim > inicio then
      total := total + extract(epoch from (fim - inicio)) / 60;
    end if;
  end loop;

  return round(total)::integer;
end $$;


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
begin
  -- Só age na transição PARA encerrada.
  if new.status <> 'encerrada' or old.status = 'encerrada' then
    return new;
  end if;

  -- O prazo é definido na abertura. Se por algum motivo não foi, define aqui.
  horas := coalesce(new.sla_atribuido, public.sla_horas(new.tipo_tratativa, new.prazo_sla_dias));
  new.sla_atribuido := horas;

  minutos := public.tempo_efetivo_minutos(new.historico_estados);
  new.tempo_total_minutos := minutos;
  new.encerrado_no_sla := minutos <= (horas * 60);

  if new.data_encerramento is null then
    new.data_encerramento := now();
  end if;

  return new;
end $$;

drop trigger if exists calcula_sla_ao_encerrar on public.tratativa_base;

create trigger calcula_sla_ao_encerrar
  before update on public.tratativa_base
  for each row
  execute function public.calcular_sla_ao_encerrar();


-- ------------------------------------------------------------------
-- CONFERÊNCIA — não altera nada
-- ------------------------------------------------------------------
-- Compara o que o Base44 gravou com o que esta função calcularia hoje, nas
-- tratativas encerradas importadas. Divergência grande indica que a regra
-- antiga era diferente da que estamos escrevendo — vale investigar antes de
-- confiar no número.
select
  count(*)                                                        as encerradas,
  count(*) filter (where encerrado_no_sla is null)                as sem_indicador,
  count(*) filter (
    where encerrado_no_sla is not null
      and encerrado_no_sla = (public.tempo_efetivo_minutos(historico_estados)
                              <= coalesce(sla_atribuido, 24) * 60)
  )                                                               as bate_com_o_calculo_novo,
  count(*) filter (
    where encerrado_no_sla is not null
      and encerrado_no_sla <> (public.tempo_efetivo_minutos(historico_estados)
                               <= coalesce(sla_atribuido, 24) * 60)
  )                                                               as diverge
from public.tratativa_base
where status = 'encerrada'
  and base44_id is not null;
