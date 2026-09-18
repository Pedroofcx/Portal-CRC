-- ============================================================
-- PORTAL CRC — PONTUAÇÃO CONFIÁVEL (Fase 04, item 4)
--
-- Rode no SQL Editor do Supabase.
--
--
-- O BURACO QUE ISTO FECHA
--
-- A pontuação do agente é calculada ao vivo, no navegador, a partir de campos
-- da própria tratativa: encerrado_no_sla, status_reabertura,
-- solucao_replicavel, nota_reclame_aqui, voltaria_fazer_negocio, as duas
-- flags do Google e o desfecho da contestação.
--
-- A Fase 03 travou a tabela `pontuacao` para escrita de gestor. Mas não
-- travou os campos que a ALIMENTAM — e `tratativa` é gravável por qualquer
-- usuário logado. Pelo console:
--
--     db.entities.Tratativa.update(id, {
--       encerrado_no_sla: true, solucao_replicavel: true, nota_reclame_aqui: 10
--     })
--
-- e a pontuação do trimestre sobe. Como a pontuação define premiação, esse é
-- o caminho mais direto de fraude que restava no sistema.
--
--
-- A SOLUÇÃO NÃO É MOVER O CÁLCULO
--
-- O cálculo é determinístico: mesmas entradas, mesmo resultado. Se as
-- ENTRADAS forem confiáveis, o resultado é confiável mesmo calculado no
-- navegador — e a tela continua respondendo na hora, sem ida ao servidor.
--
-- Então esta migration torna as entradas imutáveis, em duas camadas:
--
--   1. campos que o SERVIDOR calcula nunca aceitam valor vindo do cliente;
--   2. campos que o AGENTE preenche ficam congelados depois do encerramento —
--      gestor ainda corrige, porque auditoria e correção são função dele.
-- ============================================================


-- ------------------------------------------------------------------
-- 1) PONTOS DE UMA TRATATIVA — a mesma regra, agora também no servidor
-- ------------------------------------------------------------------
-- Espelha calculateTratativaPoints de src/components/utils/helpers.js.
-- Serve de referência para auditoria e para conferir se a tela e o banco
-- concordam.
create or replace function public.pontos_da_tratativa(t public.tratativa_base)
returns numeric
language sql
immutable
as $$
  select coalesce(
    case
      -- Reclamação interna
      when t.tipo_tratativa = 'reclamacao_interna' then
          (case when t.encerrado_no_sla then 1 else 0 end)
        + (case when t.status_reabertura = 'nao_houve' then 1 else 0 end)
        + (case when t.solucao_replicavel then 0.5 else 0 end)

      -- Reclame Aqui
      when t.tipo_tratativa = 'reclame_aqui' then
          (case
             when t.nota_reclame_aqui between 7 and 8 then 0.5
             when t.nota_reclame_aqui = 9  then 1.5
             when t.nota_reclame_aqui = 10 then 2.5
             else 0
           end)
        + (case when t.voltaria_fazer_negocio and t.nota_reclame_aqui > 8 then 1 else 0 end)

      -- Google Meu Negócio
      when t.tipo_tratativa = 'google_meu_negocio' then
          (case when t.reavaliacao_positiva_google then 2 else 0 end)
        + (case when t.exclusao_avaliacao_negativa_google then 1 else 0 end)

      -- Contestação
      when t.tipo_tratativa = 'contestacao' then
          (case
             when t.tipo_resolucao_contestacao in ('cancelamento', 'pagamento_integral', 'acordo_custo_reduzido')
               or t.status_resolucao_contestacao in ('cancelou_contestacao', 'pagou', 'acordo')
             then 2.5
             else 0
           end)

      else 0
    end, 0)
$$;


-- ------------------------------------------------------------------
-- 2) CAMPOS QUE O CLIENTE NUNCA ESCREVE
-- ------------------------------------------------------------------
create or replace function public.proteger_campos_calculados()
returns trigger
language plpgsql
as $$
begin
  -- service_role (SQL Editor, importador) passa: correção de dado e carga
  -- histórica precisam poder escrever qualquer coisa.
  if auth.uid() is null then
    return new;
  end if;

  /*
   * Estes quatro são calculados pelos gatilhos das migrations 09 a 11. Valor
   * vindo do cliente é descartado — não é erro, é ruído: o frontend pode
   * mandar o objeto inteiro de volta num update e não deve conseguir alterar
   * o que o servidor apurou.
   */
  new.encerrado_no_sla        := old.encerrado_no_sla;
  new.tempo_total_minutos     := old.tempo_total_minutos;
  new.sla_atribuido           := old.sla_atribuido;
  new.custo_operacional_reais := old.custo_operacional_reais;

  return new;
end $$;

-- Roda ANTES dos gatilhos de cálculo, para eles poderem gravar o valor novo.
-- O Postgres dispara gatilhos BEFORE na ordem alfabética do nome: "aa_" vem
-- antes de "calcula_".
drop trigger if exists aa_protege_campos_calculados on public.tratativa_base;

create trigger aa_protege_campos_calculados
  before update on public.tratativa_base
  for each row
  execute function public.proteger_campos_calculados();


-- ------------------------------------------------------------------
-- 3) CAMPOS QUE GERAM PONTO CONGELAM NO ENCERRAMENTO
-- ------------------------------------------------------------------
-- Depois que a tratativa encerra, o que virou nota não muda mais — a não ser
-- por gestor, porque auditar e corrigir é função dele. O campo
-- `solucao_replicavel_auditada` existe justamente para isso.
create or replace function public.congelar_campos_de_pontuacao()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;   -- service_role
  end if;

  -- Só congela depois de encerrada. Antes disso o agente preenche livremente.
  if old.status <> 'encerrada' then
    return new;
  end if;

  if public.eh_gestor() then
    return new;   -- gestor corrige e audita
  end if;

  new.status_reabertura                   := old.status_reabertura;
  new.solucao_replicavel                  := old.solucao_replicavel;
  new.nota_reclame_aqui                   := old.nota_reclame_aqui;
  new.voltaria_fazer_negocio              := old.voltaria_fazer_negocio;
  new.reavaliacao_positiva_google         := old.reavaliacao_positiva_google;
  new.exclusao_avaliacao_negativa_google  := old.exclusao_avaliacao_negativa_google;
  new.tipo_resolucao_contestacao          := old.tipo_resolucao_contestacao;
  new.status_resolucao_contestacao        := old.status_resolucao_contestacao;

  return new;
end $$;

drop trigger if exists ab_congela_pontuacao on public.tratativa_base;

create trigger ab_congela_pontuacao
  before update on public.tratativa_base
  for each row
  execute function public.congelar_campos_de_pontuacao();


-- ------------------------------------------------------------------
-- 4) CONSULTA DE PONTUAÇÃO — para auditoria e conferência
-- ------------------------------------------------------------------
-- Devolve os pontos de um colaborador dentro de um período, calculados pelo
-- servidor. Serve para conferir se a tela e o banco concordam.
create or replace function public.pontos_do_colaborador(
  p_colaborador_id text,
  p_inicio         date,
  p_fim            date
) returns table (
  tratativas integer,
  pontos     numeric
)
language sql
stable
as $$
  select
    count(*)::integer,
    coalesce(sum(public.pontos_da_tratativa(t)), 0)
  from public.tratativa_base t
  where t.agente_responsavel_id = p_colaborador_id
    and t.status = 'encerrada'
    and coalesce(t.excluida, false) = false
    and coalesce(t.data_encerramento, t.data_registro)::date between p_inicio and p_fim
$$;

grant execute on function public.pontos_do_colaborador(text, date, date) to authenticated;


-- ------------------------------------------------------------------
-- CONFERÊNCIA
-- ------------------------------------------------------------------
-- Pontuação por agente no ciclo trimestral ativo. Compare com o que a tela
-- de Minha Performance mostra: os dois números têm que bater.
select
  c.nome_completo,
  p.tratativas,
  p.pontos
from public.colaborador_base c
cross join lateral public.pontos_do_colaborador(
  c.id::text,
  coalesce((select data_inicio from public.ciclo_trimestral where ativo order by data_inicio desc limit 1),
           date_trunc('quarter', current_date)::date),
  coalesce((select data_fim    from public.ciclo_trimestral where ativo order by data_inicio desc limit 1),
           (date_trunc('quarter', current_date) + interval '3 months - 1 day')::date)
) p
where c.papel = 'agente' and coalesce(c.ativo, true)
order by p.pontos desc;
