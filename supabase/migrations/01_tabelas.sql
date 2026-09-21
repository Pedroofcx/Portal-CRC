-- ============================================================
-- PORTAL CRC — gerado por ferramentas/gerar-sql.py
-- Não edite à mão: altere o schema ou o gerador e rode de novo.
-- ============================================================


create extension if not exists "pgcrypto";


-- AcionamentoLiderTecnico  (11 campos)
create table if not exists public."acionamento_lider_tecnico" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "tratativa_id" text,
  "tratativa_id_interno" text,
  "tratativa_nome_cliente" text,
  "lider_tecnico_id" text,
  "lider_tecnico_nome" text,
  "lider_tecnico_ordem" numeric,
  "tipo_acionamento" text,
  "usuario_id" text,
  "usuario_nome" text,
  "status_lider_momento" text,
  "data_acionamento" timestamptz,
  CHECK ("tipo_acionamento" IS NULL OR "tipo_acionamento" IN ('rodizio', 'supervisor')),
  CHECK ("status_lider_momento" IS NULL OR "status_lider_momento" IN ('permitido', 'ferias', 'bloqueado'))
);

create index if not exists "ix_acionamento_lider_tecnico_base44_id" on public."acionamento_lider_tecnico" ("base44_id");
create index if not exists "ix_acionamento_lider_tecnico_tratativa_id" on public."acionamento_lider_tecnico" ("tratativa_id");
create index if not exists "ix_acionamento_lider_tecnico_lider_tecnico_id" on public."acionamento_lider_tecnico" ("lider_tecnico_id");
create index if not exists "ix_acionamento_lider_tecnico_usuario_id" on public."acionamento_lider_tecnico" ("usuario_id");

-- AcionamentoN2  (12 campos)
create table if not exists public."acionamento_n2" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "tratativa_id" text,
  "tratativa_id_interno" text,
  "tratativa_nome_cliente" text,
  "tratativa_tipo" text,
  "agente_n2_id" text,
  "agente_n2_nome" text,
  "agente_n2_ordem" numeric,
  "tipo_acionamento" text,
  "usuario_id" text,
  "usuario_nome" text,
  "status_n2_momento" text,
  "data_acionamento" timestamptz,
  CHECK ("tipo_acionamento" IS NULL OR "tipo_acionamento" IN ('rodizio', 'supervisor')),
  CHECK ("status_n2_momento" IS NULL OR "status_n2_momento" IN ('permitido', 'ferias', 'bloqueado'))
);

create index if not exists "ix_acionamento_n2_base44_id" on public."acionamento_n2" ("base44_id");
create index if not exists "ix_acionamento_n2_tratativa_id" on public."acionamento_n2" ("tratativa_id");
create index if not exists "ix_acionamento_n2_agente_n2_id" on public."acionamento_n2" ("agente_n2_id");
create index if not exists "ix_acionamento_n2_usuario_id" on public."acionamento_n2" ("usuario_id");

-- AgenteN2  (5 campos)
create table if not exists public."agente_n2" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "colaborador_id" text,
  "colaborador_nome" text,
  "ordem" numeric,
  "status" text DEFAULT 'permitido',
  "ativo" boolean DEFAULT true,
  CHECK ("status" IS NULL OR "status" IN ('permitido', 'ferias', 'bloqueado'))
);

create index if not exists "ix_agente_n2_base44_id" on public."agente_n2" ("base44_id");
create index if not exists "ix_agente_n2_colaborador_id" on public."agente_n2" ("colaborador_id");
create index if not exists "ix_agente_n2_status" on public."agente_n2" ("status");
create index if not exists "ix_agente_n2_ativo" on public."agente_n2" ("ativo");

-- AnotacaoPessoal  (10 campos)
create table if not exists public."anotacao_pessoal" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "colaborador_id" text,
  "colaborador_nome" text,
  "titulo" text,
  "conteudo" text,
  "tipo" text DEFAULT 'anotacao',
  "data_alerta" date,
  "visualizado" boolean DEFAULT false,
  "data_visualizacao" timestamptz,
  "cor" text DEFAULT 'amarelo',
  "prioridade" text DEFAULT 'media',
  CHECK ("tipo" IS NULL OR "tipo" IN ('anotacao', 'aviso')),
  CHECK ("cor" IS NULL OR "cor" IN ('amarelo', 'azul', 'verde', 'rosa', 'roxo')),
  CHECK ("prioridade" IS NULL OR "prioridade" IN ('baixa', 'media', 'alta'))
);

create index if not exists "ix_anotacao_pessoal_base44_id" on public."anotacao_pessoal" ("base44_id");
create index if not exists "ix_anotacao_pessoal_colaborador_id" on public."anotacao_pessoal" ("colaborador_id");

-- Apuracao  (17 campos)
create table if not exists public."apuracao" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "colaborador_id" text,
  "colaborador_nome" text,
  "periodo_inicio" date,
  "periodo_fim" date,
  "modo" text,
  "tipo_apuracao" text,
  "intervalo" text,
  "dados_por_data" jsonb,
  "canal_telefone" jsonb,
  "canal_chat" jsonb,
  "avaliacao_cx" jsonb,
  "satisfacao_media" numeric,
  "percentual_avaliados" numeric,
  "historico_detalhado" jsonb,
  "data_apuracao" timestamptz,
  "apurado_por_id" text,
  "apurado_por_nome" text,
  CHECK ("modo" IS NULL OR "modo" IN ('incremental', 'completo')),
  CHECK ("tipo_apuracao" IS NULL OR "tipo_apuracao" IN ('telefone', 'chat', 'cx')),
  CHECK ("intervalo" IS NULL OR "intervalo" IN ('semanal', 'total'))
);

create index if not exists "ix_apuracao_base44_id" on public."apuracao" ("base44_id");
create index if not exists "ix_apuracao_colaborador_id" on public."apuracao" ("colaborador_id");
create index if not exists "ix_apuracao_apurado_por_id" on public."apuracao" ("apurado_por_id");

-- Aviso  (11 campos)
create table if not exists public."aviso" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "titulo" text,
  "conteudo" text,
  "tipo" text DEFAULT 'informativo',
  "prioridade" text DEFAULT 'media',
  "destinatarios" text DEFAULT 'todos',
  "data_publicacao" timestamptz,
  "data_expiracao" timestamptz,
  "autor_id" text,
  "autor_nome" text,
  "ativo" boolean DEFAULT true,
  "lido_por" jsonb,
  CHECK ("tipo" IS NULL OR "tipo" IN ('informativo', 'urgente', 'alerta', 'comunicado')),
  CHECK ("prioridade" IS NULL OR "prioridade" IN ('baixa', 'media', 'alta')),
  CHECK ("destinatarios" IS NULL OR "destinatarios" IN ('todos', 'agentes', 'gestores'))
);

create index if not exists "ix_aviso_base44_id" on public."aviso" ("base44_id");
create index if not exists "ix_aviso_autor_id" on public."aviso" ("autor_id");
create index if not exists "ix_aviso_ativo" on public."aviso" ("ativo");

-- AvisoLeitura  (4 campos)
create table if not exists public."aviso_leitura" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "aviso_id" text,
  "colaborador_id" text,
  "data_leitura" timestamptz,
  "confirmou" boolean DEFAULT false
);

create index if not exists "ix_aviso_leitura_base44_id" on public."aviso_leitura" ("base44_id");
create index if not exists "ix_aviso_leitura_aviso_id" on public."aviso_leitura" ("aviso_id");
create index if not exists "ix_aviso_leitura_colaborador_id" on public."aviso_leitura" ("colaborador_id");

-- CategoriaTratativa  (4 campos)
create table if not exists public."categoria_tratativa" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "nome" text,
  "descricao" text,
  "cor" text,
  "ativa" boolean DEFAULT true
);

create index if not exists "ix_categoria_tratativa_base44_id" on public."categoria_tratativa" ("base44_id");

-- CicloFerias  (12 campos)
create table if not exists public."ciclo_ferias" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "colaborador_id" text,
  "colaborador_nome" text,
  "colaborador_setor" text,
  "data_admissao" date,
  "aquisitivo_inicio" date,
  "aquisitivo_fim" date,
  "concessivo_fim" date,
  "dias_direito" numeric DEFAULT 30,
  "abono_dias" numeric DEFAULT 0,
  "fragmentos" jsonb,
  "dias_utilizados" numeric DEFAULT 0,
  "status" text DEFAULT 'em_aquisicao',
  CHECK ("abono_dias" IS NULL OR "abono_dias" IN (0, 10)),
  CHECK ("status" IS NULL OR "status" IN ('em_aquisicao', 'disponivel', 'parcialmente_utilizado', 'utilizado', 'vencendo', 'vencido'))
);

create index if not exists "ix_ciclo_ferias_base44_id" on public."ciclo_ferias" ("base44_id");
create index if not exists "ix_ciclo_ferias_colaborador_id" on public."ciclo_ferias" ("colaborador_id");
create index if not exists "ix_ciclo_ferias_status" on public."ciclo_ferias" ("status");

-- CicloTrimestral  (6 campos)
create table if not exists public."ciclo_trimestral" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "nome" text,
  "data_inicio" date,
  "data_fim" date,
  "mes_pagamento" text,
  "ativo" boolean DEFAULT false,
  "descricao" text
);

create index if not exists "ix_ciclo_trimestral_base44_id" on public."ciclo_trimestral" ("base44_id");
create index if not exists "ix_ciclo_trimestral_ativo" on public."ciclo_trimestral" ("ativo");

-- Colaborador  (15 campos)
create table if not exists public."colaborador" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "nome_completo" text,
  "email" text,
  "cargo_atual" text,
  "salario" numeric,
  "historico_cargos" jsonb,
  "promocoes" jsonb,
  "data_admissao" date,
  "foto_url" text,
  "papel" text,
  "is_facilitador_interno" boolean DEFAULT false,
  "fi_expiracao" date,
  "ativo" boolean DEFAULT true,
  "user_id" text,
  "equipe_id" text,
  "equipe_nome" text,
  CHECK ("papel" IS NULL OR "papel" IN ('agente', 'gestor', 'fi'))
);

create index if not exists "ix_colaborador_base44_id" on public."colaborador" ("base44_id");
create index if not exists "ix_colaborador_email" on public."colaborador" ("email");
create index if not exists "ix_colaborador_ativo" on public."colaborador" ("ativo");
create index if not exists "ix_colaborador_user_id" on public."colaborador" ("user_id");
create index if not exists "ix_colaborador_equipe_id" on public."colaborador" ("equipe_id");

-- ConfigEstorno  (11 campos)
create table if not exists public."config_estorno" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "nome" text,
  "iss" numeric DEFAULT 2.5,
  "pis" numeric DEFAULT 0.65,
  "cofins" numeric DEFAULT 3.0,
  "irpj" numeric DEFAULT 4.8,
  "csll" numeric DEFAULT 2.88,
  "comissao_vendedor" numeric DEFAULT 4.0,
  "multa_contratual" numeric DEFAULT 10.0,
  "ativa" boolean DEFAULT true,
  "atualizado_por_nome" text,
  "log_alteracoes" jsonb
);

create index if not exists "ix_config_estorno_base44_id" on public."config_estorno" ("base44_id");

-- Configuracao  (5 campos)
create table if not exists public."configuracao" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "chave" text,
  "valor" text,
  "tipo" text,
  "categoria" text,
  "descricao" text,
  CHECK ("tipo" IS NULL OR "tipo" IN ('texto', 'numero', 'boolean', 'json', 'lista')),
  CHECK ("categoria" IS NULL OR "categoria" IN ('geral', 'metas', 'categorias', 'sla', 'governanca', 'ranking'))
);

create index if not exists "ix_configuracao_base44_id" on public."configuracao" ("base44_id");

-- ConfiguracaoHomeOffice  (11 campos)
create table if not exists public."configuracao_home_office" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "mes_referencia" text,
  "dias_elegiveis_home_office" jsonb,
  "prazo_minimo_dias" numeric DEFAULT 7,
  "maximo_semanas_mes" numeric DEFAULT 2,
  "intervalo_minimo_dias_uteis" numeric DEFAULT 5,
  "minimo_colaboradores_presenciais" numeric DEFAULT 2,
  "click_days" jsonb,
  "reunioes_obrigatorias" jsonb,
  "liberacao_coletiva" boolean DEFAULT false,
  "motivo_liberacao" text,
  "ativo" boolean DEFAULT true
);

create index if not exists "ix_configuracao_home_office_base44_id" on public."configuracao_home_office" ("base44_id");
create index if not exists "ix_configuracao_home_office_ativo" on public."configuracao_home_office" ("ativo");

-- Curso  (8 campos)
create table if not exists public."curso" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "titulo" text,
  "descricao" text,
  "categoria" text,
  "carga_horaria" numeric,
  "conteudo_url" text,
  "obrigatorio" boolean DEFAULT false,
  "ativo" boolean DEFAULT true,
  "data_criacao" timestamptz
);

create index if not exists "ix_curso_base44_id" on public."curso" ("base44_id");
create index if not exists "ix_curso_ativo" on public."curso" ("ativo");

-- CursoMatricula  (8 campos)
create table if not exists public."curso_matricula" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "curso_id" text,
  "curso_titulo" text,
  "colaborador_id" text,
  "colaborador_nome" text,
  "status" text DEFAULT 'inscrito',
  "progresso" numeric DEFAULT 0,
  "data_inscricao" timestamptz,
  "data_conclusao" timestamptz,
  CHECK ("status" IS NULL OR "status" IN ('inscrito', 'em_andamento', 'concluido'))
);

create index if not exists "ix_curso_matricula_base44_id" on public."curso_matricula" ("base44_id");
create index if not exists "ix_curso_matricula_curso_id" on public."curso_matricula" ("curso_id");
create index if not exists "ix_curso_matricula_colaborador_id" on public."curso_matricula" ("colaborador_id");
create index if not exists "ix_curso_matricula_status" on public."curso_matricula" ("status");

-- DistribuicaoTratativa  (15 campos)
create table if not exists public."distribuicao_tratativa" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "agente_id" text,
  "agente_nome" text,
  "ticket_id" text,
  "tipo_tratativa" text,
  "prioridade" text DEFAULT 'media',
  "data_atribuicao" date,
  "horario_atribuicao" text,
  "turno" text,
  "gestor_id" text,
  "gestor_nome" text,
  "observacao" text,
  "override_rodizio" boolean DEFAULT false,
  "justificativa_override" text,
  "agente_sugerido_id" text,
  "agente_sugerido_nome" text,
  CHECK ("tipo_tratativa" IS NULL OR "tipo_tratativa" IN ('google_meu_negocio', 'reclame_aqui', 'reclamacao_interna', 'contestacao_compra', 'procon')),
  CHECK ("prioridade" IS NULL OR "prioridade" IN ('baixa', 'media', 'alta', 'critica')),
  CHECK ("turno" IS NULL OR "turno" IN ('manha', 'tarde'))
);

create index if not exists "ix_distribuicao_tratativa_base44_id" on public."distribuicao_tratativa" ("base44_id");
create index if not exists "ix_distribuicao_tratativa_agente_id" on public."distribuicao_tratativa" ("agente_id");
create index if not exists "ix_distribuicao_tratativa_ticket_id" on public."distribuicao_tratativa" ("ticket_id");
create index if not exists "ix_distribuicao_tratativa_gestor_id" on public."distribuicao_tratativa" ("gestor_id");
create index if not exists "ix_distribuicao_tratativa_agente_sugerido_id" on public."distribuicao_tratativa" ("agente_sugerido_id");

-- ElegibilidadePremio  (9 campos)
create table if not exists public."elegibilidade_premio" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "nome_exigencia" text,
  "descricao" text,
  "tipo_validacao" text,
  "valor_minimo" numeric,
  "categorias_tratativa" jsonb,
  "volume_minimo_canal" numeric DEFAULT 4,
  "ativa" boolean DEFAULT true,
  "obrigatoria" boolean DEFAULT true,
  "ordem" numeric,
  CHECK ("tipo_validacao" IS NULL OR "tipo_validacao" IN ('csat_minimo', 'performance_minima', 'presenca_minima', 'tratativas_minimas', 'cursos_obrigatorios', 'avaliacoes_cx', 'execucao_tratativas_categoria', 'volume_minimo_canal', 'personalizado'))
);

create index if not exists "ix_elegibilidade_premio_base44_id" on public."elegibilidade_premio" ("base44_id");

-- Equipe  (6 campos)
create table if not exists public."equipe" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "nome" text,
  "descricao" text,
  "cor" text DEFAULT '#3B82F6',
  "gestor_id" text,
  "gestor_nome" text,
  "ativa" boolean DEFAULT true
);

create index if not exists "ix_equipe_base44_id" on public."equipe" ("base44_id");
create index if not exists "ix_equipe_gestor_id" on public."equipe" ("gestor_id");

-- Escala  (4 campos)
create table if not exists public."escala" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "nome" text,
  "descricao" text,
  "turnos" jsonb,
  "ativa" boolean DEFAULT true
);

create index if not exists "ix_escala_base44_id" on public."escala" ("base44_id");

-- EscalaAtribuicao  (8 campos)
create table if not exists public."escala_atribuicao" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "escala_id" text,
  "escala_nome" text,
  "colaborador_id" text,
  "colaborador_nome" text,
  "data_inicio" date,
  "data_fim" date,
  "tipo_evento" text DEFAULT 'presencial',
  "ativa" boolean DEFAULT true,
  CHECK ("tipo_evento" IS NULL OR "tipo_evento" IN ('home_office', 'presencial', 'hibrido', 'ferias', 'day_off', 'falta', 'treinamento', 'evento_especial'))
);

create index if not exists "ix_escala_atribuicao_base44_id" on public."escala_atribuicao" ("base44_id");
create index if not exists "ix_escala_atribuicao_escala_id" on public."escala_atribuicao" ("escala_id");
create index if not exists "ix_escala_atribuicao_colaborador_id" on public."escala_atribuicao" ("colaborador_id");

-- EscalaTurno  (9 campos)
create table if not exists public."escala_turno" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "semana_referencia" text,
  "data_inicio_semana" date,
  "colaboradores_participantes" jsonb,
  "turnos" jsonb,
  "gerado_por_id" text,
  "gerado_por_nome" text,
  "alertas" jsonb,
  "publicada" boolean DEFAULT false,
  "ativa" boolean DEFAULT true
);

create index if not exists "ix_escala_turno_base44_id" on public."escala_turno" ("base44_id");
create index if not exists "ix_escala_turno_gerado_por_id" on public."escala_turno" ("gerado_por_id");

-- EstornoParcial  (23 campos)
create table if not exists public."estorno_parcial" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "numero_calculo" text,
  "ticket_zendesk" text,
  "tratativa_id" text,
  "tratativa_id_interno" text,
  "nome_cliente" text,
  "documento_cliente" text,
  "operador_id" text,
  "operador_nome" text,
  "data_solicitacao" date,
  "tipo_estorno" text,
  "classificacao_plano" text,
  "tipo_plano" text,
  "meses_usados" numeric,
  "dias_adicionais" numeric,
  "valor_nota_fiscal" numeric,
  "valor_contratado" numeric,
  "tempo_uso_valor" numeric,
  "tempo_uso_unidade" text,
  "tempo_uso_dias_convertido" numeric,
  "percentuais_snapshot" jsonb,
  "resultado" jsonb,
  "observacao_operacional" text,
  "status" text DEFAULT 'rascunho',
  CHECK ("tipo_estorno" IS NULL OR "tipo_estorno" IN ('contestacao_compra', 'reclamacao_interna', 'cancelamento', 'devolucao_proporcional', 'ajuste_financeiro', 'reclame_aqui', 'procon', 'outros')),
  CHECK ("classificacao_plano" IS NULL OR "classificacao_plano" IN ('bronze', 'prata', 'ouro', 'platina', 'outros')),
  CHECK ("tipo_plano" IS NULL OR "tipo_plano" IN ('mensal', 'trimestral', 'semestral', 'anual')),
  CHECK ("tempo_uso_unidade" IS NULL OR "tempo_uso_unidade" IN ('dias', 'semanas', 'meses')),
  CHECK ("status" IS NULL OR "status" IN ('rascunho', 'finalizado', 'vinculado', 'cancelado'))
);

create index if not exists "ix_estorno_parcial_base44_id" on public."estorno_parcial" ("base44_id");
create index if not exists "ix_estorno_parcial_tratativa_id" on public."estorno_parcial" ("tratativa_id");
create index if not exists "ix_estorno_parcial_operador_id" on public."estorno_parcial" ("operador_id");
create index if not exists "ix_estorno_parcial_status" on public."estorno_parcial" ("status");

-- EtapaJornada  (5 campos)
create table if not exists public."etapa_jornada" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "nome" text,
  "descricao" text,
  "cor" text DEFAULT '#3B82F6',
  "ordem" numeric,
  "ativa" boolean DEFAULT true
);

create index if not exists "ix_etapa_jornada_base44_id" on public."etapa_jornada" ("base44_id");

-- FraseMotivacional  (4 campos)
create table if not exists public."frase_motivacional" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "texto" text,
  "autor" text,
  "categoria" text,
  "ativa" boolean DEFAULT true,
  CHECK ("categoria" IS NULL OR "categoria" IN ('proposito', 'qualidade', 'cx', 'crescimento', 'equipe'))
);

create index if not exists "ix_frase_motivacional_base44_id" on public."frase_motivacional" ("base44_id");

-- HanseiComentario  (6 campos)
create table if not exists public."hansei_comentario" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "hansei_envio_id" text,
  "colaborador_id" text,
  "colaborador_nome" text,
  "comentario" text,
  "sentimento" text,
  "data_comentario" timestamptz,
  CHECK ("sentimento" IS NULL OR "sentimento" IN ('positivo', 'neutro', 'negativo'))
);

create index if not exists "ix_hansei_comentario_base44_id" on public."hansei_comentario" ("base44_id");
create index if not exists "ix_hansei_comentario_hansei_envio_id" on public."hansei_comentario" ("hansei_envio_id");
create index if not exists "ix_hansei_comentario_colaborador_id" on public."hansei_comentario" ("colaborador_id");

-- HanseiEnvio  (12 campos)
create table if not exists public."hansei_envio" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "colaborador_id" text,
  "colaborador_nome" text,
  "periodo_inicio" date,
  "periodo_fim" date,
  "periodicidade" text DEFAULT 'semanal',
  "dados_consolidados" jsonb,
  "comentario_gestor" text,
  "data_envio" timestamptz,
  "enviado_por_id" text,
  "enviado_por_nome" text,
  "visualizado" boolean DEFAULT false,
  "data_visualizacao" timestamptz,
  CHECK ("periodicidade" IS NULL OR "periodicidade" IN ('diario', 'semanal', 'mensal', 'personalizado'))
);

create index if not exists "ix_hansei_envio_base44_id" on public."hansei_envio" ("base44_id");
create index if not exists "ix_hansei_envio_colaborador_id" on public."hansei_envio" ("colaborador_id");
create index if not exists "ix_hansei_envio_enviado_por_id" on public."hansei_envio" ("enviado_por_id");

-- LiderTecnico  (4 campos)
create table if not exists public."lider_tecnico" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "colaborador_nome" text,
  "ordem" numeric,
  "status" text DEFAULT 'permitido',
  "ativo" boolean DEFAULT true,
  CHECK ("status" IS NULL OR "status" IN ('permitido', 'ferias', 'bloqueado'))
);

create index if not exists "ix_lider_tecnico_base44_id" on public."lider_tecnico" ("base44_id");
create index if not exists "ix_lider_tecnico_status" on public."lider_tecnico" ("status");
create index if not exists "ix_lider_tecnico_ativo" on public."lider_tecnico" ("ativo");

-- LogAuditoria  (11 campos)
create table if not exists public."log_auditoria" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "acao" text,
  "modulo" text,
  "entidade" text,
  "entidade_id" text,
  "usuario_id" text,
  "usuario_nome" text,
  "usuario_papel" text,
  "dados_anteriores" text,
  "dados_novos" text,
  "ip" text,
  "data_hora" timestamptz,
  CHECK ("acao" IS NULL OR "acao" IN ('criar', 'editar', 'excluir', 'visualizar', 'exportar', 'login', 'logout'))
);

create index if not exists "ix_log_auditoria_base44_id" on public."log_auditoria" ("base44_id");
create index if not exists "ix_log_auditoria_entidade_id" on public."log_auditoria" ("entidade_id");
create index if not exists "ix_log_auditoria_usuario_id" on public."log_auditoria" ("usuario_id");

-- MotivoTratativa  (7 campos)
create table if not exists public."motivo_tratativa" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "motivo" text,
  "descricao" text,
  "submotivos" jsonb,
  "cor" text DEFAULT '#3B82F6',
  "ativo" boolean DEFAULT true,
  "ordem" numeric,
  "esforco_correcao_ti" text,
  CHECK ("esforco_correcao_ti" IS NULL OR "esforco_correcao_ti" IN ('Baixo', 'Medio', 'Alto'))
);

create index if not exists "ix_motivo_tratativa_base44_id" on public."motivo_tratativa" ("base44_id");
create index if not exists "ix_motivo_tratativa_ativo" on public."motivo_tratativa" ("ativo");

-- Observacao  (14 campos)
create table if not exists public."observacao" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "colaboradores_ids" jsonb,
  "colaboradores_nomes" jsonb,
  "tipo" text,
  "titulo" text,
  "conteudo" text,
  "visibilidade" text,
  "data_registro" timestamptz,
  "autor_id" text,
  "autor_nome" text,
  "sugestao_ia_soft_skills" jsonb,
  "sugestao_ia_hard_skills" jsonb,
  "analise_swot" jsonb,
  "soft_skills_avaliadas" jsonb,
  "hard_skills_avaliadas" jsonb,
  CHECK ("visibilidade" IS NULL OR "visibilidade" IN ('gestor', 'agente', 'ambos'))
);

create index if not exists "ix_observacao_base44_id" on public."observacao" ("base44_id");
create index if not exists "ix_observacao_autor_id" on public."observacao" ("autor_id");

-- OraculoLancamento  (11 campos)
create table if not exists public."oraculo_lancamento" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "colaborador_id" text,
  "colaborador_nome" text,
  "gestor_id" text,
  "gestor_nome" text,
  "pergunta_gerada" text,
  "palavras_chave" jsonb,
  "soft_skills" jsonb,
  "hard_skills" jsonb,
  "texto_livre" text,
  "contexto_performance" jsonb,
  "data_lancamento" timestamptz
);

create index if not exists "ix_oraculo_lancamento_base44_id" on public."oraculo_lancamento" ("base44_id");
create index if not exists "ix_oraculo_lancamento_colaborador_id" on public."oraculo_lancamento" ("colaborador_id");
create index if not exists "ix_oraculo_lancamento_gestor_id" on public."oraculo_lancamento" ("gestor_id");

-- OraculoPalavra  (5 campos)
create table if not exists public."oraculo_palavra" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "palavra" text,
  "categoria" text,
  "valenca" text,
  "status" text DEFAULT 'ativa',
  "ordem" numeric,
  CHECK ("categoria" IS NULL OR "categoria" IN ('engajamento', 'ritmo_cadencia', 'comunicacao', 'responsabilidade', 'qualidade_entrega', 'postura_profissional', 'colaboracao_time', 'aprendizado_evolucao', 'organizacao_metodo', 'foco_prioridade')),
  CHECK ("valenca" IS NULL OR "valenca" IN ('positiva', 'neutra', 'atencao')),
  CHECK ("status" IS NULL OR "status" IN ('ativa', 'validacao'))
);

create index if not exists "ix_oraculo_palavra_base44_id" on public."oraculo_palavra" ("base44_id");
create index if not exists "ix_oraculo_palavra_status" on public."oraculo_palavra" ("status");

-- PDI  (10 campos)
create table if not exists public."pdi" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "colaborador_id" text,
  "colaborador_nome" text,
  "titulo" text,
  "objetivo_geral" text,
  "etapas" jsonb,
  "status" text DEFAULT 'em_andamento',
  "data_criacao" timestamptz,
  "criado_por_id" text,
  "criado_por_nome" text,
  "percentual_conclusao" numeric DEFAULT 0,
  CHECK ("status" IS NULL OR "status" IN ('em_andamento', 'concluido', 'cancelado'))
);

create index if not exists "ix_pdi_base44_id" on public."pdi" ("base44_id");
create index if not exists "ix_pdi_colaborador_id" on public."pdi" ("colaborador_id");
create index if not exists "ix_pdi_status" on public."pdi" ("status");
create index if not exists "ix_pdi_criado_por_id" on public."pdi" ("criado_por_id");

-- PermissaoModulo  (8 campos)
create table if not exists public."permissao_modulo" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "modulo_nome" text,
  "modulo_rota" text,
  "visivel_para_agente" boolean DEFAULT true,
  "visivel_para_gestor" boolean DEFAULT true,
  "colaboradores_excecao" jsonb,
  "ordem" numeric,
  "icone" text,
  "ativo" boolean DEFAULT true
);

create index if not exists "ix_permissao_modulo_base44_id" on public."permissao_modulo" ("base44_id");
create index if not exists "ix_permissao_modulo_ativo" on public."permissao_modulo" ("ativo");

-- Pesquisa  (16 campos)
create table if not exists public."pesquisa" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "titulo" text,
  "descricao" text,
  "tipo" text,
  "categoria" text DEFAULT 'interna',
  "perguntas" jsonb,
  "ativa" boolean DEFAULT true,
  "data_inicio" date,
  "data_fim" date,
  "agendamento" jsonb,
  "requer_confirmacao_leitura" boolean DEFAULT true,
  "peso_health_score" numeric DEFAULT 0,
  "publicada" boolean DEFAULT false,
  "data_publicacao" timestamptz,
  "criado_por_id" text,
  "criado_por_nome" text,
  "reenviar_timestamp" timestamptz,
  CHECK ("tipo" IS NULL OR "tipo" IN ('csat', 'nps', 'ces', 'clima_organizacional', 'personalizada')),
  CHECK ("categoria" IS NULL OR "categoria" IN ('cliente', 'interna'))
);

create index if not exists "ix_pesquisa_base44_id" on public."pesquisa" ("base44_id");
create index if not exists "ix_pesquisa_criado_por_id" on public."pesquisa" ("criado_por_id");

-- PlanoSetorial  (9 campos)
create table if not exists public."plano_setorial" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "titulo" text,
  "periodo" text,
  "estrategias" jsonb,
  "objetivos" jsonb,
  "acoes" jsonb,
  "indicadores" jsonb,
  "criado_por_id" text,
  "criado_por_nome" text,
  "data_criacao" timestamptz
);

create index if not exists "ix_plano_setorial_base44_id" on public."plano_setorial" ("base44_id");
create index if not exists "ix_plano_setorial_criado_por_id" on public."plano_setorial" ("criado_por_id");

-- Pontuacao  (17 campos)
create table if not exists public."pontuacao" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "tipo" text,
  "ciclo_id" text,
  "descricao" text,
  "lancado_por_id" text,
  "lancado_por_nome" text,
  "colaborador_id" text,
  "colaborador_nome" text,
  "periodo_trimestre" text,
  "pontos_reclamacoes_internas" numeric DEFAULT 0,
  "pontos_reclame_aqui" numeric DEFAULT 0,
  "pontos_google" numeric DEFAULT 0,
  "pontos_contestacao" numeric DEFAULT 0,
  "pontos_csat" numeric DEFAULT 0,
  "pontos_performance" numeric DEFAULT 0,
  "pontos_avaliacao_cx" numeric DEFAULT 0,
  "total_pontos" numeric DEFAULT 0,
  "detalhamento" jsonb,
  CHECK ("tipo" IS NULL OR "tipo" IN ('bonus_manual'))
);

create index if not exists "ix_pontuacao_base44_id" on public."pontuacao" ("base44_id");
create index if not exists "ix_pontuacao_ciclo_id" on public."pontuacao" ("ciclo_id");
create index if not exists "ix_pontuacao_lancado_por_id" on public."pontuacao" ("lancado_por_id");
create index if not exists "ix_pontuacao_colaborador_id" on public."pontuacao" ("colaborador_id");

-- POP  (20 campos)
create table if not exists public."pop" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "codigo" text,
  "titulo" text,
  "categoria" text,
  "objetivo" text,
  "ferramentas" text,
  "criterio_qualidade" text,
  "fluxo_operacional" text,
  "outras_informacoes" text,
  "raci" jsonb,
  "versao" text DEFAULT '1.0',
  "ativo" boolean DEFAULT true,
  "data_criacao" timestamptz,
  "prazos" jsonb,
  "tipos_tratativa" jsonb,
  "ordem" numeric DEFAULT 0,
  "vigencia" date,
  "o_que_mudou" text,
  "publicado_em" timestamptz,
  "publicado_por_nome" text,
  "exige_ciencia" boolean DEFAULT true
);

create index if not exists "ix_pop_base44_id" on public."pop" ("base44_id");
create index if not exists "ix_pop_ativo" on public."pop" ("ativo");

-- PopLeitura  (4 campos)
create table if not exists public."pop_leitura" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "pop_id" text,
  "versao" text,
  "colaborador_id" text,
  "data_leitura" timestamptz
);

create index if not exists "ix_pop_leitura_base44_id" on public."pop_leitura" ("base44_id");
create index if not exists "ix_pop_leitura_pop_id" on public."pop_leitura" ("pop_id");
create index if not exists "ix_pop_leitura_colaborador_id" on public."pop_leitura" ("colaborador_id");

-- PopVersao  (7 campos)
create table if not exists public."pop_versao" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "pop_id" text,
  "versao" text,
  "snapshot" jsonb,
  "o_que_mudou" text,
  "publicado_em" timestamptz,
  "publicado_por_id" text,
  "publicado_por_nome" text
);

create index if not exists "ix_pop_versao_base44_id" on public."pop_versao" ("base44_id");
create index if not exists "ix_pop_versao_pop_id" on public."pop_versao" ("pop_id");
create index if not exists "ix_pop_versao_publicado_por_id" on public."pop_versao" ("publicado_por_id");

-- RespostaPesquisa  (12 campos)
create table if not exists public."resposta_pesquisa" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "pesquisa_id" text,
  "pesquisa_titulo" text,
  "pesquisa_tipo" text,
  "colaborador_id" text,
  "colaborador_nome" text,
  "respostas" jsonb,
  "confirmou_leitura" boolean DEFAULT false,
  "data_leitura" timestamptz,
  "data_resposta" timestamptz,
  "nota_calculada" numeric,
  "sentimento" text,
  "contribuiu_health_score" boolean DEFAULT false,
  CHECK ("sentimento" IS NULL OR "sentimento" IN ('positivo', 'neutro', 'negativo'))
);

create index if not exists "ix_resposta_pesquisa_base44_id" on public."resposta_pesquisa" ("base44_id");
create index if not exists "ix_resposta_pesquisa_pesquisa_id" on public."resposta_pesquisa" ("pesquisa_id");
create index if not exists "ix_resposta_pesquisa_colaborador_id" on public."resposta_pesquisa" ("colaborador_id");

-- SaldoFerias  (6 campos)
create table if not exists public."saldo_ferias" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "colaborador_id" text,
  "colaborador_nome" text,
  "data_admissao" date,
  "periodos" jsonb,
  "staff_critico" boolean DEFAULT false,
  "ultima_atualizacao" timestamptz
);

create index if not exists "ix_saldo_ferias_base44_id" on public."saldo_ferias" ("base44_id");
create index if not exists "ix_saldo_ferias_colaborador_id" on public."saldo_ferias" ("colaborador_id");

-- SkillMestre  (5 campos)
create table if not exists public."skill_mestre" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "nome" text,
  "tipo" text,
  "descricao" text,
  "ativa" boolean DEFAULT true,
  "ordem" numeric,
  CHECK ("tipo" IS NULL OR "tipo" IN ('soft', 'hard'))
);

create index if not exists "ix_skill_mestre_base44_id" on public."skill_mestre" ("base44_id");

-- SolicitacaoApoio  (17 campos)
create table if not exists public."solicitacao_apoio" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "tipo_apoio" text,
  "tipo_apoio_outro" text,
  "tipo_zendesk" text,
  "nome_cliente" text,
  "cnpj_cliente" text,
  "operador_id" text,
  "operador_nome" text,
  "data_solicitacao" date,
  "tratativa_id" text,
  "vinculo_crc" text,
  "descricao_justificativa" text,
  "horas_solicitadas" numeric,
  "minutos_solicitados" numeric,
  "status" text DEFAULT 'solicitada',
  "historico_status" jsonb,
  "mes_referencia" text,
  "observacoes" text,
  CHECK ("tipo_apoio" IS NULL OR "tipo_apoio" IN ('treinamento', 'consultoria', 'implantacao', 'outro')),
  CHECK ("status" IS NULL OR "status" IN ('solicitada', 'em_analise', 'aprovada', 'em_execucao', 'concluida', 'cancelada'))
);

create index if not exists "ix_solicitacao_apoio_base44_id" on public."solicitacao_apoio" ("base44_id");
create index if not exists "ix_solicitacao_apoio_operador_id" on public."solicitacao_apoio" ("operador_id");
create index if not exists "ix_solicitacao_apoio_tratativa_id" on public."solicitacao_apoio" ("tratativa_id");
create index if not exists "ix_solicitacao_apoio_status" on public."solicitacao_apoio" ("status");

-- SolicitacaoFerias  (31 campos)
create table if not exists public."solicitacao_ferias" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "colaborador_id" text,
  "colaborador_nome" text,
  "colaborador_funcao" text,
  "data_inicio" date,
  "data_fim" date,
  "dias_corridos" numeric,
  "dias_uteis" numeric,
  "periodo_aquisitivo_inicio" date,
  "periodo_aquisitivo_fim" date,
  "periodo_concessivo_inicio" date,
  "periodo_concessivo_fim" date,
  "tipo_fracionamento" text DEFAULT 'integral',
  "fracionamento_numero" numeric,
  "venda_dias" numeric DEFAULT 0,
  "status" text DEFAULT 'em_analise',
  "aprovador_id" text,
  "aprovador_nome" text,
  "data_aprovacao" timestamptz,
  "motivo_recusa" text,
  "sugestao_nova_data_inicio" date,
  "sugestao_nova_data_fim" date,
  "observacoes_gestor" text,
  "observacoes_colaborador" text,
  "validacoes_aplicadas" jsonb,
  "conflitos_detectados" jsonb,
  "data_solicitacao" timestamptz,
  "versao_regra" text DEFAULT '1.0',
  "adicional_um_terco" numeric,
  "data_limite_pagamento" date,
  "staff_critico" boolean DEFAULT false,
  "historico" jsonb,
  CHECK ("tipo_fracionamento" IS NULL OR "tipo_fracionamento" IN ('integral', 'fracionado_2', 'fracionado_3')),
  CHECK ("status" IS NULL OR "status" IN ('em_analise', 'aprovada', 'recusada', 'sugestao_nova_data', 'cancelada'))
);

create index if not exists "ix_solicitacao_ferias_base44_id" on public."solicitacao_ferias" ("base44_id");
create index if not exists "ix_solicitacao_ferias_colaborador_id" on public."solicitacao_ferias" ("colaborador_id");
create index if not exists "ix_solicitacao_ferias_status" on public."solicitacao_ferias" ("status");
create index if not exists "ix_solicitacao_ferias_aprovador_id" on public."solicitacao_ferias" ("aprovador_id");

-- SolicitacaoHomeOffice  (18 campos)
create table if not exists public."solicitacao_home_office" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "colaborador_id" text,
  "colaborador_nome" text,
  "semana_inicio" date,
  "semana_fim" date,
  "dias_escolhidos" jsonb,
  "dias_semana_escolhidos" jsonb,
  "justificativa" text,
  "status" text DEFAULT 'pendente',
  "data_solicitacao" timestamptz,
  "data_resposta" timestamptz,
  "aprovador_id" text,
  "aprovador_nome" text,
  "motivo_recusa" text,
  "validacoes" jsonb,
  "alertas" jsonb,
  "mes_referencia" text,
  "prazo_solicitacao_dias" numeric DEFAULT 7,
  "fora_do_prazo" boolean DEFAULT false,
  CHECK ("status" IS NULL OR "status" IN ('pendente', 'aprovada', 'recusada', 'cancelada'))
);

create index if not exists "ix_solicitacao_home_office_base44_id" on public."solicitacao_home_office" ("base44_id");
create index if not exists "ix_solicitacao_home_office_colaborador_id" on public."solicitacao_home_office" ("colaborador_id");
create index if not exists "ix_solicitacao_home_office_status" on public."solicitacao_home_office" ("status");
create index if not exists "ix_solicitacao_home_office_aprovador_id" on public."solicitacao_home_office" ("aprovador_id");

-- TipoObservacao  (4 campos)
create table if not exists public."tipo_observacao" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "nome" text,
  "descricao" text,
  "cor" text,
  "ativa" boolean DEFAULT true
);

create index if not exists "ix_tipo_observacao_base44_id" on public."tipo_observacao" ("base44_id");

-- TipoTratativa  (8 campos)
create table if not exists public."tipo_tratativa" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "nome" text,
  "chave" text,
  "descricao" text,
  "sla_horas" numeric DEFAULT 24,
  "permite_reabertura" boolean DEFAULT false,
  "campos_especificos" jsonb,
  "ativa" boolean DEFAULT true,
  "cor" text
);

create index if not exists "ix_tipo_tratativa_base44_id" on public."tipo_tratativa" ("base44_id");

-- Tratativa  (83 campos)
create table if not exists public."tratativa" (
  "id" uuid primary key default gen_random_uuid(),
  "base44_id" text unique,
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "importado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "id_interno" text,
  "link_zendesk" text,
  "link_intranet" text,
  "id_base_cliente" text,
  "nome_cliente" text,
  "cliente_recorrente" boolean DEFAULT false,
  "numero_ocorrencias" numeric DEFAULT 0,
  "motivo_id" text,
  "motivo_nome" text,
  "submotivos" jsonb,
  "motivo_confirmado" boolean DEFAULT false,
  "etapa_jornada_id" text,
  "etapa_jornada_nome" text,
  "causa_primaria" text,
  "tipo_tratativa" text,
  "prioridade" text,
  "status" text DEFAULT 'registrada',
  "agente_responsavel_id" text,
  "agente_responsavel_nome" text,
  "data_registro" timestamptz,
  "data_inicio_tratativa" timestamptz,
  "data_encerramento" timestamptz,
  "tempo_total_minutos" numeric,
  "sla_atribuido" numeric,
  "encerrado_no_sla" boolean,
  "houve_reabertura" boolean DEFAULT false,
  "status_reabertura" text,
  "data_confirmacao_reabertura" timestamptz,
  "solucao_replicavel" boolean DEFAULT false,
  "solucao_replicavel_auditada" boolean DEFAULT false,
  "solucao_replicavel_valida" boolean,
  "descricao_solucao" text,
  "houve_devolucao_financeira" boolean DEFAULT false,
  "valor_devolvido_cliente" numeric,
  "historico_estados" jsonb,
  "nota_reclame_aqui" numeric,
  "voltaria_fazer_negocio" boolean,
  "categoria_reclame_aqui" text,
  "situacao_comentario_google" text,
  "reavaliacao_positiva_google" boolean,
  "exclusao_avaliacao_negativa_google" boolean,
  "categoria_contestacao" text,
  "tipo_resolucao_contestacao" text,
  "valor_contestacao" numeric,
  "valor_recuperado" numeric,
  "excluida" boolean DEFAULT false,
  "justificativa_exclusao" text,
  "data_exclusao" timestamptz,
  "excluida_por_id" text,
  "excluida_por_nome" text,
  "numero_case_contestacao" text,
  "motivo_contestacao" text,
  "valor_contestado_inicial" numeric,
  "valor_contestado_final" numeric,
  "prazo_sla_dias" numeric,
  "status_resolucao_contestacao" text,
  "status_final_contestacao" text,
  "resolvemos_contestacao" boolean,
  "conta_bloqueada_contestacao" boolean,
  "motivo_reducao_acordo" text,
  "congelamento_sla" jsonb,
  "desfecho_contestacao" jsonb,
  "pontuacao_calculada" boolean DEFAULT false,
  "teve_churn" boolean DEFAULT false,
  "valor_perda_receita" numeric DEFAULT 0,
  "custo_operacional_reais" numeric DEFAULT 0,
  "plano_cliente" text,
  "modalidade_plano" text,
  "valor_contratacao_plano_atual" numeric,
  "data_primeira_contratacao" date,
  "data_contratacao_plano_atual" date,
  "tempo_contrato_meses" numeric,
  "segmento_cliente" text,
  "lider_tecnico_id" text,
  "lider_tecnico_nome" text,
  "tipo_acionamento_lider" text,
  "data_acionamento_lider" timestamptz,
  "usuario_acionamento_lider" text,
  "n2_id" text,
  "n2_nome" text,
  "tipo_acionamento_n2" text,
  "data_acionamento_n2" timestamptz,
  "usuario_acionamento_n2" text,
  CHECK ("causa_primaria" IS NULL OR "causa_primaria" IN ('processo', 'produto_sistema', 'comunicacao', 'expectativa_cliente', 'operacao_interna', 'terceiro')),
  CHECK ("tipo_tratativa" IS NULL OR "tipo_tratativa" IN ('reclamacao_interna', 'reclame_aqui', 'google_meu_negocio', 'contestacao', 'administrativas', 'procon')),
  CHECK ("prioridade" IS NULL OR "prioridade" IN ('baixa', 'media', 'alta', 'critica')),
  CHECK ("status" IS NULL OR "status" IN ('registrada', 'tratativa_iniciada', 'em_andamento', 'dependencia_externa', 'aguardando_financeiro', 'encerrada', 'aguardando_confirmacao_reabertura', 'excluida')),
  CHECK ("status_reabertura" IS NULL OR "status_reabertura" IN ('aguardando', 'nao_houve', 'cliente_reabriu')),
  CHECK ("situacao_comentario_google" IS NULL OR "situacao_comentario_google" IN ('comentario_mantido', 'comentario_editado', 'comentario_excluido')),
  CHECK ("categoria_contestacao" IS NULL OR "categoria_contestacao" IN ('erro_cobranca', 'fraude', 'cancelamento_compra', 'erro_operacional', 'outros')),
  CHECK ("tipo_resolucao_contestacao" IS NULL OR "tipo_resolucao_contestacao" IN ('cancelamento', 'pagamento_integral', 'acordo_custo_reduzido')),
  CHECK ("status_resolucao_contestacao" IS NULL OR "status_resolucao_contestacao" IN ('acordo', 'cancelou_contestacao', 'contestou_prazo_cancelamento', 'contestou_pagamento_duplicidade', 'pagou', 'sem_acordo', 'sem_contato')),
  CHECK ("status_final_contestacao" IS NULL OR "status_final_contestacao" IN ('finalizada', 'cancelada', 'defesa_enviada')),
  CHECK ("motivo_reducao_acordo" IS NULL OR char_length("motivo_reducao_acordo") <= 50),
  CHECK ("plano_cliente" IS NULL OR "plano_cliente" IN ('Bronze', 'Prata', 'Ouro', 'Platina', 'ClickNotas', 'Outros', 'Essencial')),
  CHECK ("modalidade_plano" IS NULL OR "modalidade_plano" IN ('Mensal', 'Trimestral', 'Semestral', 'Anual')),
  CHECK ("tipo_acionamento_lider" IS NULL OR "tipo_acionamento_lider" IN ('rodizio', 'supervisor')),
  CHECK ("tipo_acionamento_n2" IS NULL OR "tipo_acionamento_n2" IN ('rodizio', 'supervisor'))
);

create index if not exists "ix_tratativa_base44_id" on public."tratativa" ("base44_id");
create index if not exists "ix_tratativa_motivo_id" on public."tratativa" ("motivo_id");
create index if not exists "ix_tratativa_etapa_jornada_id" on public."tratativa" ("etapa_jornada_id");
create index if not exists "ix_tratativa_status" on public."tratativa" ("status");
create index if not exists "ix_tratativa_agente_responsavel_id" on public."tratativa" ("agente_responsavel_id");
create index if not exists "ix_tratativa_excluida" on public."tratativa" ("excluida");
create index if not exists "ix_tratativa_excluida_por_id" on public."tratativa" ("excluida_por_id");
create index if not exists "ix_tratativa_lider_tecnico_id" on public."tratativa" ("lider_tecnico_id");
create index if not exists "ix_tratativa_n2_id" on public."tratativa" ("n2_id");
