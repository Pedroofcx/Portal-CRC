-- ============================================================
-- PORTAL CRC — APROVAÇÃO DAS SOLUÇÕES REPLICÁVEIS E NOVAS REGRAS DE PONTOS
--
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
--
--
-- DECISÕES DE PEDRO (22/09/2026, documentacao/decisoes-de-regra.md)
--
--   1. Solução replicável: do Ciclo 2 em diante (encerradas desde 16/06/2026)
--      o +0,5 só conta depois que o GESTOR aprova, na tela "Soluções
--      replicáveis". Contestar exige parecer.
--   2. Reabertura: o +1 da reclamação interna é perdido se o mesmo cliente
--      abrir qualquer nova tratativa em até 7 dias do encerramento; passados
--      os 7 dias sem nova abertura, conta sozinho.
--   3. Cada tratativa aberta vale 0,5 para o agente, do Ciclo 2 em diante.
--
--
-- O QUE MUDA NO BANCO
--
--   1. três colunas novas: parecer, quem decidiu e quando;
--   2. a view "tratativa" é recriada para enxergá-las (trecho de 05_mascaras);
--   3. aprovar/contestar é SÓ do gestor: para qualquer outra pessoa, esses
--      campos voltam ao valor anterior em silêncio (sem isso, um agente se
--      aprovaria pelo console);
--   4. pontos_da_tratativa e pontos_do_colaborador (migration 12), as contas
--      de conferência do banco, passam a seguir as regras novas.
-- ============================================================


-- ------------------------------------------------------------------
-- 1) COLUNAS NOVAS
-- ------------------------------------------------------------------
alter table public.tratativa_base add column if not exists solucao_replicavel_parecer text;
alter table public.tratativa_base add column if not exists solucao_replicavel_auditada_por_nome text;
alter table public.tratativa_base add column if not exists solucao_replicavel_auditada_em timestamptz;


-- ------------------------------------------------------------------
-- 2) VIEW "tratativa" COM AS COLUNAS NOVAS (trecho de 05_mascaras.sql)
-- ------------------------------------------------------------------
-- ===================== tratativa =====================

do $$
begin
  if to_regclass('public.tratativa_base') is null then
    alter table public."tratativa" rename to "tratativa_base";
  end if;
end $$;

drop view if exists public."tratativa";

create view public."tratativa" with (security_invoker = true) as
select
  b."id",
  b."base44_id",
  b."created_date",
  b."updated_date",
  b."created_by",
  b."importado_em",
  b."criado_em",
  b."atualizado_em",
  b."id_interno",
  b."link_zendesk",
  b."link_intranet",
  b."id_base_cliente",
  b."nome_cliente",
  b."cliente_recorrente",
  b."numero_ocorrencias",
  b."motivo_id",
  b."motivo_nome",
  b."submotivos",
  b."motivo_confirmado",
  b."etapa_jornada_id",
  b."etapa_jornada_nome",
  b."causa_primaria",
  b."tipo_tratativa",
  b."prioridade",
  b."status",
  b."agente_responsavel_id",
  b."agente_responsavel_nome",
  b."data_registro",
  b."data_inicio_tratativa",
  b."data_encerramento",
  b."tempo_total_minutos",
  b."sla_atribuido",
  b."encerrado_no_sla",
  b."houve_reabertura",
  b."status_reabertura",
  b."data_confirmacao_reabertura",
  b."solucao_replicavel",
  b."solucao_replicavel_auditada",
  b."solucao_replicavel_valida",
  b."solucao_replicavel_parecer",
  b."solucao_replicavel_auditada_por_nome",
  b."solucao_replicavel_auditada_em",
  b."descricao_solucao",
  b."houve_devolucao_financeira",
  b."valor_devolvido_cliente",
  b."historico_estados",
  b."nota_reclame_aqui",
  b."voltaria_fazer_negocio",
  b."categoria_reclame_aqui",
  b."situacao_comentario_google",
  b."reavaliacao_positiva_google",
  b."exclusao_avaliacao_negativa_google",
  b."inativada_na_plataforma",
  b."categoria_contestacao",
  b."tipo_resolucao_contestacao",
  b."valor_contestacao",
  b."valor_recuperado",
  b."excluida",
  b."justificativa_exclusao",
  b."data_exclusao",
  b."excluida_por_id",
  b."excluida_por_nome",
  b."numero_case_contestacao",
  b."motivo_contestacao",
  b."valor_contestado_inicial",
  b."valor_contestado_final",
  b."prazo_sla_dias",
  b."status_resolucao_contestacao",
  b."status_final_contestacao",
  b."resolvemos_contestacao",
  b."conta_bloqueada_contestacao",
  b."motivo_reducao_acordo",
  b."congelamento_sla",
  b."desfecho_contestacao",
  b."pontuacao_calculada",
  b."teve_churn",
  b."valor_perda_receita",
  case when public.eh_gestor() then b."custo_operacional_reais" else null end as "custo_operacional_reais",
  b."plano_cliente",
  b."modalidade_plano",
  b."valor_contratacao_plano_atual",
  b."data_primeira_contratacao",
  b."data_contratacao_plano_atual",
  b."tempo_contrato_meses",
  b."segmento_cliente",
  b."lider_tecnico_id",
  b."lider_tecnico_nome",
  b."tipo_acionamento_lider",
  b."data_acionamento_lider",
  b."usuario_acionamento_lider",
  b."n2_id",
  b."n2_nome",
  b."tipo_acionamento_n2",
  b."data_acionamento_n2",
  b."usuario_acionamento_n2"
from public."tratativa_base" b;

revoke all on public."tratativa" from anon;
grant select, insert, update, delete on public."tratativa" to authenticated;

create or replace function public."tratativa_gravar"()
returns trigger language plpgsql security invoker as $$
declare b public."tratativa_base"%rowtype;
begin
  if tg_op = 'INSERT' then
    insert into public."tratativa_base" ("base44_id", "created_date", "updated_date", "created_by", "importado_em", "atualizado_em", "id_interno", "link_zendesk", "link_intranet", "id_base_cliente", "nome_cliente", "cliente_recorrente", "numero_ocorrencias", "motivo_id", "motivo_nome", "submotivos", "motivo_confirmado", "etapa_jornada_id", "etapa_jornada_nome", "causa_primaria", "tipo_tratativa", "prioridade", "status", "agente_responsavel_id", "agente_responsavel_nome", "data_registro", "data_inicio_tratativa", "data_encerramento", "tempo_total_minutos", "sla_atribuido", "encerrado_no_sla", "houve_reabertura", "status_reabertura", "data_confirmacao_reabertura", "solucao_replicavel", "solucao_replicavel_auditada", "solucao_replicavel_valida", "solucao_replicavel_parecer", "solucao_replicavel_auditada_por_nome", "solucao_replicavel_auditada_em", "descricao_solucao", "houve_devolucao_financeira", "valor_devolvido_cliente", "historico_estados", "nota_reclame_aqui", "voltaria_fazer_negocio", "categoria_reclame_aqui", "situacao_comentario_google", "reavaliacao_positiva_google", "exclusao_avaliacao_negativa_google", "inativada_na_plataforma", "categoria_contestacao", "tipo_resolucao_contestacao", "valor_contestacao", "valor_recuperado", "excluida", "justificativa_exclusao", "data_exclusao", "excluida_por_id", "excluida_por_nome", "numero_case_contestacao", "motivo_contestacao", "valor_contestado_inicial", "valor_contestado_final", "prazo_sla_dias", "status_resolucao_contestacao", "status_final_contestacao", "resolvemos_contestacao", "conta_bloqueada_contestacao", "motivo_reducao_acordo", "congelamento_sla", "desfecho_contestacao", "pontuacao_calculada", "teve_churn", "valor_perda_receita", "custo_operacional_reais", "plano_cliente", "modalidade_plano", "valor_contratacao_plano_atual", "data_primeira_contratacao", "data_contratacao_plano_atual", "tempo_contrato_meses", "segmento_cliente", "lider_tecnico_id", "lider_tecnico_nome", "tipo_acionamento_lider", "data_acionamento_lider", "usuario_acionamento_lider", "n2_id", "n2_nome", "tipo_acionamento_n2", "data_acionamento_n2", "usuario_acionamento_n2") values (new."base44_id", new."created_date", new."updated_date", new."created_by", new."importado_em", new."atualizado_em", new."id_interno", new."link_zendesk", new."link_intranet", new."id_base_cliente", new."nome_cliente", new."cliente_recorrente", new."numero_ocorrencias", new."motivo_id", new."motivo_nome", new."submotivos", new."motivo_confirmado", new."etapa_jornada_id", new."etapa_jornada_nome", new."causa_primaria", new."tipo_tratativa", new."prioridade", new."status", new."agente_responsavel_id", new."agente_responsavel_nome", new."data_registro", new."data_inicio_tratativa", new."data_encerramento", new."tempo_total_minutos", new."sla_atribuido", new."encerrado_no_sla", new."houve_reabertura", new."status_reabertura", new."data_confirmacao_reabertura", new."solucao_replicavel", new."solucao_replicavel_auditada", new."solucao_replicavel_valida", new."solucao_replicavel_parecer", new."solucao_replicavel_auditada_por_nome", new."solucao_replicavel_auditada_em", new."descricao_solucao", new."houve_devolucao_financeira", new."valor_devolvido_cliente", new."historico_estados", new."nota_reclame_aqui", new."voltaria_fazer_negocio", new."categoria_reclame_aqui", new."situacao_comentario_google", new."reavaliacao_positiva_google", new."exclusao_avaliacao_negativa_google", new."inativada_na_plataforma", new."categoria_contestacao", new."tipo_resolucao_contestacao", new."valor_contestacao", new."valor_recuperado", new."excluida", new."justificativa_exclusao", new."data_exclusao", new."excluida_por_id", new."excluida_por_nome", new."numero_case_contestacao", new."motivo_contestacao", new."valor_contestado_inicial", new."valor_contestado_final", new."prazo_sla_dias", new."status_resolucao_contestacao", new."status_final_contestacao", new."resolvemos_contestacao", new."conta_bloqueada_contestacao", new."motivo_reducao_acordo", new."congelamento_sla", new."desfecho_contestacao", new."pontuacao_calculada", new."teve_churn", new."valor_perda_receita", new."custo_operacional_reais", new."plano_cliente", new."modalidade_plano", new."valor_contratacao_plano_atual", new."data_primeira_contratacao", new."data_contratacao_plano_atual", new."tempo_contrato_meses", new."segmento_cliente", new."lider_tecnico_id", new."lider_tecnico_nome", new."tipo_acionamento_lider", new."data_acionamento_lider", new."usuario_acionamento_lider", new."n2_id", new."n2_nome", new."tipo_acionamento_n2", new."data_acionamento_n2", new."usuario_acionamento_n2")
    returning * into b;
    return new;

  elsif tg_op = 'UPDATE' then
    select * into b from public."tratativa_base" where id = old.id;
    update public."tratativa_base" set
    "base44_id" = new."base44_id",
    "created_date" = new."created_date",
    "updated_date" = new."updated_date",
    "created_by" = new."created_by",
    "importado_em" = new."importado_em",
    "atualizado_em" = new."atualizado_em",
    "id_interno" = new."id_interno",
    "link_zendesk" = new."link_zendesk",
    "link_intranet" = new."link_intranet",
    "id_base_cliente" = new."id_base_cliente",
    "nome_cliente" = new."nome_cliente",
    "cliente_recorrente" = new."cliente_recorrente",
    "numero_ocorrencias" = new."numero_ocorrencias",
    "motivo_id" = new."motivo_id",
    "motivo_nome" = new."motivo_nome",
    "submotivos" = new."submotivos",
    "motivo_confirmado" = new."motivo_confirmado",
    "etapa_jornada_id" = new."etapa_jornada_id",
    "etapa_jornada_nome" = new."etapa_jornada_nome",
    "causa_primaria" = new."causa_primaria",
    "tipo_tratativa" = new."tipo_tratativa",
    "prioridade" = new."prioridade",
    "status" = new."status",
    "agente_responsavel_id" = new."agente_responsavel_id",
    "agente_responsavel_nome" = new."agente_responsavel_nome",
    "data_registro" = new."data_registro",
    "data_inicio_tratativa" = new."data_inicio_tratativa",
    "data_encerramento" = new."data_encerramento",
    "tempo_total_minutos" = new."tempo_total_minutos",
    "sla_atribuido" = new."sla_atribuido",
    "encerrado_no_sla" = new."encerrado_no_sla",
    "houve_reabertura" = new."houve_reabertura",
    "status_reabertura" = new."status_reabertura",
    "data_confirmacao_reabertura" = new."data_confirmacao_reabertura",
    "solucao_replicavel" = new."solucao_replicavel",
    "solucao_replicavel_auditada" = new."solucao_replicavel_auditada",
    "solucao_replicavel_valida" = new."solucao_replicavel_valida",
    "solucao_replicavel_parecer" = new."solucao_replicavel_parecer",
    "solucao_replicavel_auditada_por_nome" = new."solucao_replicavel_auditada_por_nome",
    "solucao_replicavel_auditada_em" = new."solucao_replicavel_auditada_em",
    "descricao_solucao" = new."descricao_solucao",
    "houve_devolucao_financeira" = new."houve_devolucao_financeira",
    "valor_devolvido_cliente" = new."valor_devolvido_cliente",
    "historico_estados" = new."historico_estados",
    "nota_reclame_aqui" = new."nota_reclame_aqui",
    "voltaria_fazer_negocio" = new."voltaria_fazer_negocio",
    "categoria_reclame_aqui" = new."categoria_reclame_aqui",
    "situacao_comentario_google" = new."situacao_comentario_google",
    "reavaliacao_positiva_google" = new."reavaliacao_positiva_google",
    "exclusao_avaliacao_negativa_google" = new."exclusao_avaliacao_negativa_google",
    "inativada_na_plataforma" = new."inativada_na_plataforma",
    "categoria_contestacao" = new."categoria_contestacao",
    "tipo_resolucao_contestacao" = new."tipo_resolucao_contestacao",
    "valor_contestacao" = new."valor_contestacao",
    "valor_recuperado" = new."valor_recuperado",
    "excluida" = new."excluida",
    "justificativa_exclusao" = new."justificativa_exclusao",
    "data_exclusao" = new."data_exclusao",
    "excluida_por_id" = new."excluida_por_id",
    "excluida_por_nome" = new."excluida_por_nome",
    "numero_case_contestacao" = new."numero_case_contestacao",
    "motivo_contestacao" = new."motivo_contestacao",
    "valor_contestado_inicial" = new."valor_contestado_inicial",
    "valor_contestado_final" = new."valor_contestado_final",
    "prazo_sla_dias" = new."prazo_sla_dias",
    "status_resolucao_contestacao" = new."status_resolucao_contestacao",
    "status_final_contestacao" = new."status_final_contestacao",
    "resolvemos_contestacao" = new."resolvemos_contestacao",
    "conta_bloqueada_contestacao" = new."conta_bloqueada_contestacao",
    "motivo_reducao_acordo" = new."motivo_reducao_acordo",
    "congelamento_sla" = new."congelamento_sla",
    "desfecho_contestacao" = new."desfecho_contestacao",
    "pontuacao_calculada" = new."pontuacao_calculada",
    "teve_churn" = new."teve_churn",
    "valor_perda_receita" = new."valor_perda_receita",
    "custo_operacional_reais" = case when public.eh_gestor() then new."custo_operacional_reais" else b."custo_operacional_reais" end,
    "plano_cliente" = new."plano_cliente",
    "modalidade_plano" = new."modalidade_plano",
    "valor_contratacao_plano_atual" = new."valor_contratacao_plano_atual",
    "data_primeira_contratacao" = new."data_primeira_contratacao",
    "data_contratacao_plano_atual" = new."data_contratacao_plano_atual",
    "tempo_contrato_meses" = new."tempo_contrato_meses",
    "segmento_cliente" = new."segmento_cliente",
    "lider_tecnico_id" = new."lider_tecnico_id",
    "lider_tecnico_nome" = new."lider_tecnico_nome",
    "tipo_acionamento_lider" = new."tipo_acionamento_lider",
    "data_acionamento_lider" = new."data_acionamento_lider",
    "usuario_acionamento_lider" = new."usuario_acionamento_lider",
    "n2_id" = new."n2_id",
    "n2_nome" = new."n2_nome",
    "tipo_acionamento_n2" = new."tipo_acionamento_n2",
    "data_acionamento_n2" = new."data_acionamento_n2",
    "usuario_acionamento_n2" = new."usuario_acionamento_n2"
    where id = old.id;
    return new;

  elsif tg_op = 'DELETE' then
    delete from public."tratativa_base" where id = old.id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists "tratativa_ins" on public."tratativa";
drop trigger if exists "tratativa_upd" on public."tratativa";
drop trigger if exists "tratativa_del" on public."tratativa";

create trigger "tratativa_ins" instead of insert on public."tratativa"
  for each row execute function public."tratativa_gravar"();
create trigger "tratativa_upd" instead of update on public."tratativa"
  for each row execute function public."tratativa_gravar"();
create trigger "tratativa_del" instead of delete on public."tratativa"
  for each row execute function public."tratativa_gravar"();


-- ------------------------------------------------------------------
-- 3) SÓ O GESTOR APROVA OU CONTESTA
-- ------------------------------------------------------------------
create or replace function public.proteger_auditoria_replicavel()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or public.eh_gestor() then
    return new;   -- service_role (importador) e gestor passam
  end if;

  if tg_op = 'INSERT' then
    new.solucao_replicavel_auditada          := false;
    new.solucao_replicavel_valida            := null;
    new.solucao_replicavel_parecer           := null;
    new.solucao_replicavel_auditada_por_nome := null;
    new.solucao_replicavel_auditada_em       := null;
  else
    new.solucao_replicavel_auditada          := old.solucao_replicavel_auditada;
    new.solucao_replicavel_valida            := old.solucao_replicavel_valida;
    new.solucao_replicavel_parecer           := old.solucao_replicavel_parecer;
    new.solucao_replicavel_auditada_por_nome := old.solucao_replicavel_auditada_por_nome;
    new.solucao_replicavel_auditada_em       := old.solucao_replicavel_auditada_em;
  end if;
  return new;
end $$;

drop trigger if exists ab_protege_auditoria_replicavel on public.tratativa_base;

create trigger ab_protege_auditoria_replicavel
  before insert or update on public.tratativa_base
  for each row
  execute function public.proteger_auditoria_replicavel();


-- ------------------------------------------------------------------
-- 4a) PONTOS DE UMA TRATATIVA — espelha calculateTratativaPoints
-- ------------------------------------------------------------------
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
        + (case when t.solucao_replicavel
                 and (t.data_encerramento is null
                      or t.data_encerramento < timestamptz '2026-06-16 00:00:00-03'
                      or coalesce(t.solucao_replicavel_valida, false))
                then 0.5 else 0 end)

      -- Reclame Aqui
      when t.tipo_tratativa = 'reclame_aqui' then
          (case
             when t.nota_reclame_aqui between 7 and 8 then 0.5
             when t.nota_reclame_aqui = 9  then 1.5
             when t.nota_reclame_aqui = 10 then 2.5
             else 0
           end)
        + (case when t.voltaria_fazer_negocio and t.nota_reclame_aqui > 8 then 1 else 0 end)
        + (case when t.inativada_na_plataforma
                 and t.data_encerramento >= timestamptz '2026-09-17 00:00:00-03' then 1 else 0 end)

      -- Google Meu Negócio
      when t.tipo_tratativa = 'google_meu_negocio' then
          (case when t.reavaliacao_positiva_google then 2 else 0 end)
        + (case when t.exclusao_avaliacao_negativa_google then 1 else 0 end)
        + (case when t.inativada_na_plataforma
                 and t.data_encerramento >= timestamptz '2026-09-17 00:00:00-03' then 1 else 0 end)

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
-- 4b) PONTOS DE TRATATIVAS DE UM AGENTE NO PERÍODO — espelha
--     src/lib/pontuacaoCiclo.js (encerradas + reabertura apurada + 0,5 por
--     abertura). NÃO inclui indicadores nem bônus manual: é a parte de
--     tratativas do total, para conferir com a tela.
-- ------------------------------------------------------------------
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
  with encerradas as (
    select
      public.pontos_da_tratativa(t) as base,
      t.tipo_tratativa,
      t.status_reabertura,
      -- Período que começa antes do Ciclo 2 (Ciclo 1): a solução replicável
      -- não exige aprovação, nem para o dia 16/06, que é dos dois ciclos.
      (p_inicio < date '2026-06-16'
        and t.tipo_tratativa = 'reclamacao_interna'
        and t.solucao_replicavel
        and t.data_encerramento >= timestamptz '2026-06-16 00:00:00-03'
        and not coalesce(t.solucao_replicavel_valida, false)) as replicavel_do_ciclo1,
      case
        when t.tipo_tratativa <> 'reclamacao_interna' or t.data_encerramento is null then null
        when t.status_reabertura = 'cliente_reabriu' or exists (
          select 1 from public.tratativa_base o
          where o.id <> t.id
            and not coalesce(o.excluida, false)
            and btrim(coalesce(t.id_base_cliente, '')) <> ''
            and btrim(coalesce(o.id_base_cliente, '')) = btrim(t.id_base_cliente)
            and o.data_registro >  t.data_encerramento
            and o.data_registro <= t.data_encerramento + interval '7 days'
        ) then 'cliente_reabriu'
        when now() < t.data_encerramento + interval '7 days' then 'aguardando'
        else 'nao_houve'
      end as reabertura
    from public.tratativa_base t
    where t.agente_responsavel_id = p_colaborador_id
      and t.status in ('encerrada', 'aguardando_confirmacao_reabertura')
      and not coalesce(t.excluida, false)
      and (coalesce(t.data_encerramento, t.data_registro) at time zone 'America/Sao_Paulo')::date between p_inicio and p_fim
  ),
  aberturas as (
    select count(*) as n
    from public.tratativa_base t
    where p_inicio >= date '2026-06-16'
      and t.agente_responsavel_id = p_colaborador_id
      and not coalesce(t.excluida, false)
      and (t.data_registro at time zone 'America/Sao_Paulo')::date between p_inicio and p_fim
  )
  select
    (select count(*) from encerradas)::integer,
    coalesce((select sum(
        base
        - (case when tipo_tratativa = 'reclamacao_interna' and status_reabertura = 'nao_houve' then 1 else 0 end)
        + (case when reabertura = 'nao_houve' then 1 else 0 end)
        + (case when replicavel_do_ciclo1 then 0.5 else 0 end)
      ) from encerradas), 0)
    + (select n from aberturas) * 0.5
$$;

grant execute on function public.pontos_do_colaborador(text, date, date) to authenticated;


-- ------------------------------------------------------------------
-- CONFERÊNCIA
-- ------------------------------------------------------------------
-- Parte de tratativas de cada agente no ciclo ativo (sem indicadores e sem
-- bônus). Deve bater com a soma "Reclame Aqui + Reclamação Interna + Google
-- + Contestação + Tratativas abertas" da página do agente.
select
  c.nome_completo,
  p.tratativas,
  p.pontos
from public.colaborador_base c
cross join lateral public.pontos_do_colaborador(
  c.id::text,
  (select data_inicio from public.ciclo_trimestral where ativo order by data_inicio desc limit 1),
  (select data_fim    from public.ciclo_trimestral where ativo order by data_inicio desc limit 1)
) p
where c.papel = 'agente' and coalesce(c.ativo, true)
order by p.pontos desc;
