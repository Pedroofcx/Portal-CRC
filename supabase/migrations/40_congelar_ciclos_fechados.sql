-- ============================================================
-- PORTAL CRC — CICLOS 1 E 2 FICAM COMO FORAM APURADOS (migration 40)
--
-- Rode no SQL Editor do Supabase, DEPOIS da migration 39.
--
--
-- POR QUE
--
-- Os ciclos 1 e 2 já foram apurados, e a premiação do Ciclo 2 tem decisões
-- humanas em cima desses números (Pedro, 02/10/2026). As correções de pontuação
-- discutidas hoje valem SÓ a partir do Ciclo 3.
--
-- A migration 38 recalculou o SLA do histórico inteiro com a regra nova
-- (contar do início e pausar em dependência externa). Isso mexeu nos ciclos
-- fechados — no Ciclo 2, por exemplo, a Ana passou à frente da Sirlene. Esta
-- migration DEVOLVE os valores que estavam gravados antes, usando a cópia que a
-- 38 guardou em sla_recalculo_38.
--
-- A regra nova de SLA continua valendo para quem encerrou de 17/09/2026 em
-- diante (o Ciclo 3) e para tudo que for encerrado daqui para frente.
--
--
-- O QUE FAZ
--
--   1. devolve encerrado_no_sla e tempo_total_minutos das tratativas
--      encerradas até 16/09/2026 (horário de Brasília);
--   2. marca como APROVADAS as soluções replicáveis dos ciclos 1 e 2 (decisão
--      de Pedro) — menos as que o gestor já CONTESTOU, que são decisão humana
--      anterior e ficam como estão;
--   3. guarda cópia do que mudou em replicaveis_aprovacao_40.
--
-- COMO DESFAZER A APROVAÇÃO EM LOTE:
--   update public.tratativa_base t
--      set solucao_replicavel_auditada = b.solucao_replicavel_auditada,
--          solucao_replicavel_valida = b.solucao_replicavel_valida,
--          solucao_replicavel_parecer = b.solucao_replicavel_parecer,
--          solucao_replicavel_auditada_por_nome = b.solucao_replicavel_auditada_por_nome,
--          solucao_replicavel_auditada_em = b.solucao_replicavel_auditada_em
--     from public.replicaveis_aprovacao_40 b where b.id = t.id;
-- ============================================================


-- ------------------------------------------------------------------
-- 1) DEVOLVE O SLA DOS CICLOS FECHADOS
-- ------------------------------------------------------------------
-- Roda como administrador (sem usuário): os gatilhos de proteção deixam passar.
update public.tratativa_base t
set
  encerrado_no_sla    = b.encerrado_no_sla,
  tempo_total_minutos = b.tempo_total_minutos
from public.sla_recalculo_38 b
where b.id = t.id
  and t.data_encerramento < timestamptz '2026-09-17 00:00:00-03';


-- ------------------------------------------------------------------
-- 2) SOLUÇÕES REPLICÁVEIS DOS CICLOS 1 E 2 — APROVADAS
-- ------------------------------------------------------------------
create table if not exists public.replicaveis_aprovacao_40 as
select id, id_interno,
       solucao_replicavel_auditada, solucao_replicavel_valida,
       solucao_replicavel_parecer, solucao_replicavel_auditada_por_nome,
       solucao_replicavel_auditada_em
from public.tratativa_base
where tipo_tratativa = 'reclamacao_interna'
  and solucao_replicavel
  and data_encerramento < timestamptz '2026-09-17 00:00:00-03'
  and solucao_replicavel_valida is distinct from true
  and not (coalesce(solucao_replicavel_auditada, false) and solucao_replicavel_valida = false);

alter table public.replicaveis_aprovacao_40 enable row level security;
revoke all on public.replicaveis_aprovacao_40 from anon, authenticated;

update public.tratativa_base t
set
  solucao_replicavel_auditada          = true,
  solucao_replicavel_valida            = true,
  solucao_replicavel_parecer           = coalesce(t.solucao_replicavel_parecer,
                                           'Aprovada em lote por decisão da gestão (02/10/2026) para os ciclos 1 e 2.'),
  solucao_replicavel_auditada_por_nome = coalesce(t.solucao_replicavel_auditada_por_nome, 'Pedro Henrique Soares'),
  solucao_replicavel_auditada_em       = coalesce(t.solucao_replicavel_auditada_em, now())
from public.replicaveis_aprovacao_40 b
where b.id = t.id;


-- ------------------------------------------------------------------
-- CONFERÊNCIA
-- ------------------------------------------------------------------
-- 1) SLA dos fechados de volta (esperado: dentro_agora = dentro_antes_da_38
--    para tudo que foi encerrado até 16/09).
select
  count(*) filter (where t.data_encerramento < timestamptz '2026-09-17 00:00:00-03')                              as fechadas_ate_16_09,
  count(*) filter (where t.data_encerramento < timestamptz '2026-09-17 00:00:00-03' and t.encerrado_no_sla)        as dentro_agora,
  count(*) filter (where t.data_encerramento < timestamptz '2026-09-17 00:00:00-03' and b.encerrado_no_sla)        as dentro_antes_da_38,
  count(*) filter (where t.data_encerramento < timestamptz '2026-09-17 00:00:00-03'
                     and t.encerrado_no_sla is distinct from b.encerrado_no_sla)                                   as diferentes
from public.tratativa_base t
join public.sla_recalculo_38 b on b.id = t.id;

-- 2) Replicáveis (esperado: pendentes = 0; contestadas = as que já eram).
select
  count(*) filter (where solucao_replicavel_valida is true)                                      as aprovadas,
  count(*) filter (where solucao_replicavel_valida is false)                                     as contestadas,
  count(*) filter (where solucao_replicavel_valida is null)                                      as pendentes
from public.tratativa_base
where tipo_tratativa = 'reclamacao_interna'
  and solucao_replicavel
  and data_encerramento < timestamptz '2026-09-17 00:00:00-03';
