-- ============================================================
-- PORTAL CRC — CARIMBOS DE DATA AUTOMÁTICOS EM TRATATIVA (migration 34)
--
-- Rode no SQL Editor do Supabase.
--
--
-- O BUG QUE ISTO CORRIGE (achado ao testar a migration 33)
--
-- Com cnpj_cliente corrigido, registrar tratativa continuava falhando:
--   "null value in column atualizado_em of relation tratativa_base
--    violates not-null constraint"
--
-- A causa: tratativa_gravar() lista "created_date", "updated_date" e
-- "atualizado_em" no INSERT e grava exatamente o que veio em new.*. O
-- adaptador do frontend (src/api/db.js) nunca manda esses três campos de
-- propósito — são carimbos que o servidor deve preencher, não o navegador
-- (um relógio errado no computador de alguém não pode virar a data oficial
-- do registro). Como a coluna tem "not null default now()", omitir o campo
-- do payload funcionaria; o problema é que o INSERT da trigger inclui a
-- coluna explicitamente com valor NULL, o que pula o default e quebra a
-- constraint.
--
-- A correção: coalesce(new."campo", now()) nos três — usa o valor se vier
-- (importador antigo, por exemplo, pode mandar data real de outro
-- sistema), e now() quando não vier.
-- ============================================================

create or replace function public."tratativa_gravar"()
returns trigger language plpgsql security invoker as $$
declare b public."tratativa_base"%rowtype;
begin
  if tg_op = 'INSERT' then
    insert into public."tratativa_base" ("base44_id", "created_date", "updated_date", "created_by", "importado_em", "atualizado_em", "id_interno", "link_zendesk", "link_intranet", "id_base_cliente", "nome_cliente", "cliente_recorrente", "numero_ocorrencias", "motivo_id", "motivo_nome", "submotivos", "motivo_confirmado", "etapa_jornada_id", "etapa_jornada_nome", "causa_primaria", "tipo_tratativa", "prioridade", "status", "agente_responsavel_id", "agente_responsavel_nome", "data_registro", "data_inicio_tratativa", "data_encerramento", "tempo_total_minutos", "sla_atribuido", "encerrado_no_sla", "houve_reabertura", "status_reabertura", "data_confirmacao_reabertura", "solucao_replicavel", "solucao_replicavel_auditada", "solucao_replicavel_valida", "solucao_replicavel_parecer", "solucao_replicavel_auditada_por_nome", "solucao_replicavel_auditada_em", "descricao_solucao", "houve_devolucao_financeira", "valor_devolvido_cliente", "historico_estados", "nota_reclame_aqui", "voltaria_fazer_negocio", "categoria_reclame_aqui", "situacao_comentario_google", "reavaliacao_positiva_google", "exclusao_avaliacao_negativa_google", "inativada_na_plataforma", "categoria_contestacao", "tipo_resolucao_contestacao", "valor_contestacao", "valor_recuperado", "excluida", "justificativa_exclusao", "data_exclusao", "excluida_por_id", "excluida_por_nome", "numero_case_contestacao", "motivo_contestacao", "valor_contestado_inicial", "valor_contestado_final", "prazo_sla_dias", "status_resolucao_contestacao", "status_final_contestacao", "resolvemos_contestacao", "conta_bloqueada_contestacao", "motivo_reducao_acordo", "congelamento_sla", "desfecho_contestacao", "pontuacao_calculada", "teve_churn", "valor_perda_receita", "custo_operacional_reais", "plano_cliente", "modalidade_plano", "valor_contratacao_plano_atual", "data_primeira_contratacao", "data_contratacao_plano_atual", "tempo_contrato_meses", "segmento_cliente", "lider_tecnico_id", "lider_tecnico_nome", "tipo_acionamento_lider", "data_acionamento_lider", "usuario_acionamento_lider", "n2_id", "n2_nome", "tipo_acionamento_n2", "data_acionamento_n2", "usuario_acionamento_n2", "cnpj_cliente") values (new."base44_id", coalesce(new."created_date", now()), coalesce(new."updated_date", now()), new."created_by", new."importado_em", coalesce(new."atualizado_em", now()), new."id_interno", new."link_zendesk", new."link_intranet", new."id_base_cliente", new."nome_cliente", new."cliente_recorrente", new."numero_ocorrencias", new."motivo_id", new."motivo_nome", new."submotivos", new."motivo_confirmado", new."etapa_jornada_id", new."etapa_jornada_nome", new."causa_primaria", new."tipo_tratativa", new."prioridade", new."status", new."agente_responsavel_id", new."agente_responsavel_nome", new."data_registro", new."data_inicio_tratativa", new."data_encerramento", new."tempo_total_minutos", new."sla_atribuido", new."encerrado_no_sla", new."houve_reabertura", new."status_reabertura", new."data_confirmacao_reabertura", new."solucao_replicavel", new."solucao_replicavel_auditada", new."solucao_replicavel_valida", new."solucao_replicavel_parecer", new."solucao_replicavel_auditada_por_nome", new."solucao_replicavel_auditada_em", new."descricao_solucao", new."houve_devolucao_financeira", new."valor_devolvido_cliente", new."historico_estados", new."nota_reclame_aqui", new."voltaria_fazer_negocio", new."categoria_reclame_aqui", new."situacao_comentario_google", new."reavaliacao_positiva_google", new."exclusao_avaliacao_negativa_google", new."inativada_na_plataforma", new."categoria_contestacao", new."tipo_resolucao_contestacao", new."valor_contestacao", new."valor_recuperado", new."excluida", new."justificativa_exclusao", new."data_exclusao", new."excluida_por_id", new."excluida_por_nome", new."numero_case_contestacao", new."motivo_contestacao", new."valor_contestado_inicial", new."valor_contestado_final", new."prazo_sla_dias", new."status_resolucao_contestacao", new."status_final_contestacao", new."resolvemos_contestacao", new."conta_bloqueada_contestacao", new."motivo_reducao_acordo", new."congelamento_sla", new."desfecho_contestacao", new."pontuacao_calculada", new."teve_churn", new."valor_perda_receita", new."custo_operacional_reais", new."plano_cliente", new."modalidade_plano", new."valor_contratacao_plano_atual", new."data_primeira_contratacao", new."data_contratacao_plano_atual", new."tempo_contrato_meses", new."segmento_cliente", new."lider_tecnico_id", new."lider_tecnico_nome", new."tipo_acionamento_lider", new."data_acionamento_lider", new."usuario_acionamento_lider", new."n2_id", new."n2_nome", new."tipo_acionamento_n2", new."data_acionamento_n2", new."usuario_acionamento_n2", new."cnpj_cliente")
    returning * into b;
    return new;

  elsif tg_op = 'UPDATE' then
    select * into b from public."tratativa_base" where id = old.id;
    update public."tratativa_base" set
    "base44_id" = new."base44_id",
    "created_date" = coalesce(new."created_date", b."created_date"),
    "updated_date" = now(),
    "created_by" = new."created_by",
    "importado_em" = new."importado_em",
    "atualizado_em" = now(),
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
    "usuario_acionamento_n2" = new."usuario_acionamento_n2",
    "cnpj_cliente" = new."cnpj_cliente"
    where id = old.id;
    return new;

  elsif tg_op = 'DELETE' then
    delete from public."tratativa_base" where id = old.id;
    return old;
  end if;
  return null;
end $$;

-- ------------------------------------------------------------------
-- CONFERÊNCIA
-- ------------------------------------------------------------------
-- Confere que a função foi recriada agora.
select routine_name, created
from information_schema.routines
where routine_schema = 'public' and routine_name = 'tratativa_gravar';
