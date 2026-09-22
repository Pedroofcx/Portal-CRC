-- ============================================================
-- PORTAL CRC — RECLAME AQUI E GMN INATIVADOS PONTUAM (+1) A PARTIR DO CICLO 3
--
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
--
--
-- A REGRA (decidida por Pedro em 22/09/2026, informada no POP 04, 05 e 11)
--
-- Reclamação do Reclame Aqui inativada e avaliação do Google Meu Negócio
-- inativada passam a valer +1 ponto. SOMENTE a partir do Ciclo 3: a pontuação
-- dos ciclos 1 e 2 não muda.
--
-- "A partir do Ciclo 3" = tratativa ENCERRADA de 17/09/2026 em diante (horário
-- de Brasília). O Ciclo 2 termina em 16/09/2026; o Ciclo 3 ainda não está
-- cadastrado. Usar a data, e não o cadastro do ciclo, garante que nada do
-- Ciclo 2 mude — mesmo que o Ciclo 3 seja cadastrado começando no dia 16.
--
--
-- O QUE MUDA NO BANCO
--
--   1. coluna nova tratativa.inativada_na_plataforma (sim/não);
--   2. a view "tratativa" (máscara da migration 05) é recriada para enxergar a
--      coluna — é o mesmo trecho que ferramentas/gerar-seguranca.py gera;
--   3. pontos_da_tratativa (migration 12) ganha o +1;
--   4. o campo novo também congela quando a tratativa encerra (só o gestor
--      corrige depois), como os outros campos que geram ponto.
-- ============================================================


-- ------------------------------------------------------------------
-- 1) COLUNA NOVA
-- ------------------------------------------------------------------
alter table public.tratativa_base
  add column if not exists inativada_na_plataforma boolean;


-- ------------------------------------------------------------------
-- 2) VIEW "tratativa" COM A COLUNA NOVA (trecho de 05_mascaras.sql)
-- ------------------------------------------------------------------
-- ===================== tratativa =====================

do $
begin
  if to_regclass('public.tratativa_base') is null then
    alter table public."tratativa" rename to "tratativa_base";
  end if;
end $;

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
returns trigger language plpgsql security invoker as $
declare b public."tratativa_base"%rowtype;
begin
  if tg_op = 'INSERT' then
    insert into public."tratativa_base" ("base44_id", "created_date", "updated_date", "created_by", "importado_em", "atualizado_em", "id_interno", "link_zendesk", "link_intranet", "id_base_cliente", "nome_cliente", "cliente_recorrente", "numero_ocorrencias", "motivo_id", "motivo_nome", "submotivos", "motivo_confirmado", "etapa_jornada_id", "etapa_jornada_nome", "causa_primaria", "tipo_tratativa", "prioridade", "status", "agente_responsavel_id", "agente_responsavel_nome", "data_registro", "data_inicio_tratativa", "data_encerramento", "tempo_total_minutos", "sla_atribuido", "encerrado_no_sla", "houve_reabertura", "status_reabertura", "data_confirmacao_reabertura", "solucao_replicavel", "solucao_replicavel_auditada", "solucao_replicavel_valida", "descricao_solucao", "houve_devolucao_financeira", "valor_devolvido_cliente", "historico_estados", "nota_reclame_aqui", "voltaria_fazer_negocio", "categoria_reclame_aqui", "situacao_comentario_google", "reavaliacao_positiva_google", "exclusao_avaliacao_negativa_google", "inativada_na_plataforma", "categoria_contestacao", "tipo_resolucao_contestacao", "valor_contestacao", "valor_recuperado", "excluida", "justificativa_exclusao", "data_exclusao", "excluida_por_id", "excluida_por_nome", "numero_case_contestacao", "motivo_contestacao", "valor_contestado_inicial", "valor_contestado_final", "prazo_sla_dias", "status_resolucao_contestacao", "status_final_contestacao", "resolvemos_contestacao", "conta_bloqueada_contestacao", "motivo_reducao_acordo", "congelamento_sla", "desfecho_contestacao", "pontuacao_calculada", "teve_churn", "valor_perda_receita", "custo_operacional_reais", "plano_cliente", "modalidade_plano", "valor_contratacao_plano_atual", "data_primeira_contratacao", "data_contratacao_plano_atual", "tempo_contrato_meses", "segmento_cliente", "lider_tecnico_id", "lider_tecnico_nome", "tipo_acionamento_lider", "data_acionamento_lider", "usuario_acionamento_lider", "n2_id", "n2_nome", "tipo_acionamento_n2", "data_acionamento_n2", "usuario_acionamento_n2") values (new."base44_id", new."created_date", new."updated_date", new."created_by", new."importado_em", new."atualizado_em", new."id_interno", new."link_zendesk", new."link_intranet", new."id_base_cliente", new."nome_cliente", new."cliente_recorrente", new."numero_ocorrencias", new."motivo_id", new."motivo_nome", new."submotivos", new."motivo_confirmado", new."etapa_jornada_id", new."etapa_jornada_nome", new."causa_primaria", new."tipo_tratativa", new."prioridade", new."status", new."agente_responsavel_id", new."agente_responsavel_nome", new."data_registro", new."data_inicio_tratativa", new."data_encerramento", new."tempo_total_minutos", new."sla_atribuido", new."encerrado_no_sla", new."houve_reabertura", new."status_reabertura", new."data_confirmacao_reabertura", new."solucao_replicavel", new."solucao_replicavel_auditada", new."solucao_replicavel_valida", new."descricao_solucao", new."houve_devolucao_financeira", new."valor_devolvido_cliente", new."historico_estados", new."nota_reclame_aqui", new."voltaria_fazer_negocio", new."categoria_reclame_aqui", new."situacao_comentario_google", new."reavaliacao_positiva_google", new."exclusao_avaliacao_negativa_google", new."inativada_na_plataforma", new."categoria_contestacao", new."tipo_resolucao_contestacao", new."valor_contestacao", new."valor_recuperado", new."excluida", new."justificativa_exclusao", new."data_exclusao", new."excluida_por_id", new."excluida_por_nome", new."numero_case_contestacao", new."motivo_contestacao", new."valor_contestado_inicial", new."valor_contestado_final", new."prazo_sla_dias", new."status_resolucao_contestacao", new."status_final_contestacao", new."resolvemos_contestacao", new."conta_bloqueada_contestacao", new."motivo_reducao_acordo", new."congelamento_sla", new."desfecho_contestacao", new."pontuacao_calculada", new."teve_churn", new."valor_perda_receita", new."custo_operacional_reais", new."plano_cliente", new."modalidade_plano", new."valor_contratacao_plano_atual", new."data_primeira_contratacao", new."data_contratacao_plano_atual", new."tempo_contrato_meses", new."segmento_cliente", new."lider_tecnico_id", new."lider_tecnico_nome", new."tipo_acionamento_lider", new."data_acionamento_lider", new."usuario_acionamento_lider", new."n2_id", new."n2_nome", new."tipo_acionamento_n2", new."data_acionamento_n2", new."usuario_acionamento_n2")
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
end $;

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
-- 3) PONTOS DE UMA TRATATIVA — espelha calculateTratativaPoints
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
-- 4) O CAMPO NOVO TAMBÉM CONGELA NO ENCERRAMENTO
-- ------------------------------------------------------------------
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
  new.inativada_na_plataforma             := old.inativada_na_plataforma;
  new.tipo_resolucao_contestacao          := old.tipo_resolucao_contestacao;
  new.status_resolucao_contestacao        := old.status_resolucao_contestacao;

  return new;
end $$;


-- ------------------------------------------------------------------
-- CONFERÊNCIA — deve devolver uma linha: coluna_existe = true,
-- view_enxerga = true, pontos_ciclo2 = 0, pontos_ciclo3 = 1
-- ------------------------------------------------------------------
select
  exists (select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'tratativa_base'
            and column_name = 'inativada_na_plataforma')                      as coluna_existe,
  exists (select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'tratativa'
            and column_name = 'inativada_na_plataforma')                      as view_enxerga,
  public.pontos_da_tratativa(jsonb_populate_record(null::public.tratativa_base,
    '{"tipo_tratativa":"reclame_aqui","inativada_na_plataforma":true,"data_encerramento":"2026-09-16T20:00:00-03:00"}')) as pontos_ciclo2,
  public.pontos_da_tratativa(jsonb_populate_record(null::public.tratativa_base,
    '{"tipo_tratativa":"google_meu_negocio","inativada_na_plataforma":true,"data_encerramento":"2026-09-17T09:00:00-03:00"}')) as pontos_ciclo3;
