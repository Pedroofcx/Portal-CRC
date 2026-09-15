-- ============================================================
-- PORTAL CRC — CUSTO OPERACIONAL NO SERVIDOR (Fase 04, item 3)
--
-- Rode no SQL Editor do Supabase.
--
--
-- DUAS RÉGUAS DE TEMPO, DE PROPÓSITO
--
-- SLA usa tempo CORRIDO: mede a espera do cliente, e ele espera igual
-- independentemente de quem travou o caso. Está na migration 09.
--
-- Custo usa tempo EFETIVO: mede o esforço da equipe, e ninguém trabalhou
-- enquanto o caso esperava um terceiro. É o que esta migration implementa.
--
-- Confundir as duas é o erro fácil aqui. Uma tratativa pode estourar o SLA
-- (cliente esperou 10 dias) e custar pouco (a equipe trabalhou 40 minutos) —
-- e as duas afirmações estão certas ao mesmo tempo.
--
--
-- POR QUE SAI DO NAVEGADOR
--
-- O custo é gravado hoje por `aplicarCustoOperacional`, no TratativaDetalhe:
-- o navegador procura o colaborador na lista carregada, lê o salário, calcula
-- e grava. Três fragilidades nisso:
--
--   1. depende de a lista de colaboradores ter sido carregada e estar
--      atualizada naquele instante;
--   2. o número entra no relatório financeiro vindo de um cálculo feito na
--      máquina de quem encerrou;
--   3. o salário precisa trafegar até o navegador para o cálculo acontecer.
--
-- No servidor, a função lê o salário direto da tabela — inclusive de quem a
-- máscara da Fase 03 esconde — sem que o valor saia do banco.
-- ============================================================


-- ------------------------------------------------------------------
-- 1) TEMPO EFETIVO, EM MINUTOS
-- ------------------------------------------------------------------
-- Conta apenas os períodos em `tratativa_iniciada` e `em_andamento`. Fica de
-- fora dependência externa, SLA congelado e a janela de confirmação de
-- reabertura — em nenhum deles alguém está trabalhando no caso.
create or replace function public.tempo_efetivo_minutos(historico jsonb)
returns integer
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
    if coalesce((historico -> i) ->> 'estado_novo', '')
       not in ('tratativa_iniciada', 'em_andamento') then
      continue;
    end if;

    begin
      inicio := ((historico -> i) ->> 'data_mudanca')::timestamptz;
    exception when others then
      continue;
    end;
    if inicio is null then continue; end if;

    if i < n - 1 then
      begin
        fim := ((historico -> (i + 1)) ->> 'data_mudanca')::timestamptz;
      exception when others then
        fim := null;
      end;
    else
      fim := now();
    end if;

    if fim is not null and fim > inicio then
      total := total + extract(epoch from (fim - inicio)) / 60;
    end if;
  end loop;

  return round(total)::integer;
end $$;


-- ------------------------------------------------------------------
-- 2) CUSTO OPERACIONAL
-- ------------------------------------------------------------------
-- custo = minutos efetivos × ((salário × encargos) / carga mensal) / 60
--
-- SECURITY DEFINER porque precisa ler `colaborador_base.salario`, que a
-- máscara da Fase 03 esconde de quem não é gestor. O salário é lido DENTRO do
-- banco e nunca sai dele: o que volta é o custo, já calculado.
--
-- Sem salário cadastrado devolve NULL, não zero. Zero é uma afirmação — diz
-- que a tratativa não custou nada. NULL diz "não dá para calcular", que é a
-- verdade, e força quem consome a decidir o que fazer com a lacuna.
--
-- O SEGUNDO PARÂMETRO É TEXT, NÃO UUID. A coluna `agente_responsavel_id` é
-- texto: os campos de vínculo vieram dos schemas do Base44 como string, e o
-- importador gravou o uuid novo dentro de um campo de texto. O drop abaixo
-- remove uma versão com assinatura uuid que pode ter ficado de uma execução
-- anterior — duas funções de mesmo nome deixariam o Postgres sem saber qual
-- chamar.
drop function if exists public.custo_operacional(jsonb, uuid, numeric, numeric);

create or replace function public.custo_operacional(
  p_historico              jsonb,
  p_agente_id              text,
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
  v_minutos      integer;
  v_custo_minuto numeric;
  v_id           uuid;
begin
  if p_agente_id is null or p_agente_id = '' then
    return null;
  end if;

  /*
   * O campo é texto e quase sempre guarda um uuid — mas 18 referências dos
   * dados importados apontam para registros que já não existiam no Base44,
   * e podem não ser uuid. Um cast direto derrubaria o cálculo da tratativa
   * inteira por causa de um vínculo órfão.
   */
  begin
    v_id := p_agente_id::uuid;
  exception when others then
    return null;
  end;

  select salario into v_salario
  from public.colaborador_base
  where id = v_id;

  if v_salario is null or v_salario <= 0 then
    return null;   -- cadastro incompleto: não inventa número
  end if;

  v_minutos := public.tempo_efetivo_minutos(p_historico);
  v_custo_minuto := ((v_salario * p_multiplicador_encargos) / p_carga_horaria_mensal) / 60;

  return round(v_custo_minuto * v_minutos, 2);
end $$;

revoke execute on function public.custo_operacional(jsonb, text, numeric, numeric) from anon;
grant  execute on function public.custo_operacional(jsonb, text, numeric, numeric) to authenticated;


-- ------------------------------------------------------------------
-- 3) GRAVAÇÃO AO ENCERRAR
-- ------------------------------------------------------------------
-- O gatilho da migration 09 já roda no encerramento; este acrescenta o custo.
-- Ordem alfabética dos gatilhos importa no Postgres, e "calcula_custo" roda
-- antes de "calcula_sla" — o que não é problema, porque as duas contas são
-- independentes uma da outra.
create or replace function public.calcular_custo_ao_encerrar()
returns trigger
language plpgsql
as $$
begin
  if new.status <> 'encerrada' or old.status = 'encerrada' then
    return new;
  end if;

  new.custo_operacional_reais := public.custo_operacional(
    new.historico_estados,
    new.agente_responsavel_id
  );

  return new;
end $$;

drop trigger if exists calcula_custo_ao_encerrar on public.tratativa_base;

create trigger calcula_custo_ao_encerrar
  before update on public.tratativa_base
  for each row
  execute function public.calcular_custo_ao_encerrar();


-- ------------------------------------------------------------------
-- 4) RECÁLCULO DO HISTÓRICO
-- ------------------------------------------------------------------
-- O campo vinha zerado ou ausente nos dados importados: das 354 tratativas,
-- NENHUMA tinha custo_operacional_reais preenchido. Preenche agora, com a
-- mesma régua que vale daqui para frente.
update public.tratativa_base t
set custo_operacional_reais = public.custo_operacional(t.historico_estados, t.agente_responsavel_id)
where t.status = 'encerrada';


-- ------------------------------------------------------------------
-- CONFERÊNCIA
-- ------------------------------------------------------------------
select
  count(*)                                                  as encerradas,
  count(*) filter (where custo_operacional_reais is not null) as com_custo,
  count(*) filter (where custo_operacional_reais is null)     as sem_custo_salario_ausente,
  to_char(coalesce(sum(custo_operacional_reais), 0), 'FM999G999G990D00') as custo_total_reais,
  to_char(coalesce(avg(custo_operacional_reais), 0), 'FM999G990D00')     as custo_medio_reais,
  round(avg(public.tempo_efetivo_minutos(historico_estados)) / 60.0, 1)  as media_horas_efetivas
from public.tratativa_base
where status = 'encerrada';
