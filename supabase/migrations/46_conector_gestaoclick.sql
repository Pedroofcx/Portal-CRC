-- ============================================================
-- PORTAL CRC — CONECTOR COM O GESTÃO CLICK: FÉRIAS (migration 46)
--
-- Rode no SQL Editor do Supabase, DEPOIS da migration 45.
--
-- DECISÃO (05/10/2026): o Gestão Click é a fonte OFICIAL de saldo, períodos
-- aquisitivos e gozo de férias. O Portal busca lá (só leitura) e espelha:
--   - ciclo_ferias: direito, abono, dias gozados, vencimento e as parcelas;
--   - solicitacao_ferias: as parcelas que ainda não terminaram viram férias
--     APROVADAS no Portal, para travar a Escala e o rodízio.
--
-- O QUE ENTRA
--   ciclo_ferias.gestaoclick_id, .origem, .sincronizado_em
--   solicitacao_ferias.gestaoclick_id, .origem
--       O id do período (ou da parcela) lá, para a sincronização achar o
--       mesmo registro de novo e atualizar em vez de duplicar.
--   conector                 uma linha por conector externo: ligado ou não,
--                            quando rodou, se deu certo e o resumo
--   conector_execucao        o registro de cada execução (resultado, números,
--                            avisos e erro)
--
-- O CONECTOR NASCE DESLIGADO. Quem liga é a gestão, em
-- Configurações > Integrações (permissão gerenciar_integracoes).
--
-- O TOKEN do Gestão Click NÃO fica no banco: é segredo da Edge Function
-- (GESTAOCLICK_TOKEN), como a chave da IA.
--
-- COMO DESFAZER
--   drop table conector_execucao, conector;
--   alter table ciclo_ferias drop column gestaoclick_id, drop column origem, drop column sincronizado_em;
--   alter table solicitacao_ferias drop column gestaoclick_id, drop column origem;
-- ============================================================

-- ---------- marcas de origem nas férias ----------

alter table public."ciclo_ferias"
  add column if not exists "gestaoclick_id" text,
  add column if not exists "origem" text,
  add column if not exists "sincronizado_em" timestamptz;

alter table public."solicitacao_ferias"
  add column if not exists "gestaoclick_id" text,
  add column if not exists "origem" text not null default 'portal';

create unique index if not exists "ux_ciclo_ferias_gestaoclick"
  on public."ciclo_ferias" ("gestaoclick_id") where "gestaoclick_id" is not null;
create unique index if not exists "ux_solicitacao_ferias_gestaoclick"
  on public."solicitacao_ferias" ("gestaoclick_id") where "gestaoclick_id" is not null;

-- ---------- o conector ----------

create table if not exists public."conector" (
  "id" uuid primary key default gen_random_uuid(),
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "chave" text not null unique,
  "nome" text not null,
  "descricao" text,
  "ativo" boolean not null default false,
  "ultima_execucao_em" timestamptz,
  "ultimo_sucesso_em" timestamptz,
  "ultimo_resultado" text check ("ultimo_resultado" in ('rodando', 'ok', 'erro')),
  "ultimo_resumo" jsonb,
  "ultimo_erro" text
);

insert into public."conector" ("chave", "nome", "descricao") values
  ('gestaoclick_ferias', 'Gestão Click — férias',
   'Traz do Gestão Click o saldo, os períodos aquisitivos e as férias (gozadas e planejadas). Só leitura. O Gestão Click é a fonte oficial.')
on conflict ("chave") do nothing;

create table if not exists public."conector_execucao" (
  "id" uuid primary key default gen_random_uuid(),
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "conector_chave" text not null,
  "iniciada_em" timestamptz not null default now(),
  "concluida_em" timestamptz,
  "resultado" text not null default 'rodando' check ("resultado" in ('rodando', 'ok', 'erro')),
  "resumo" jsonb,
  "avisos" jsonb,
  "erro" text,
  "disparada_por" text
);
create index if not exists "ix_conector_execucao_chave_data"
  on public."conector_execucao" ("conector_chave", "iniciada_em" desc);

-- ---------- segurança ----------

alter table public."conector" enable row level security;
alter table public."conector_execucao" enable row level security;

drop policy if exists "conector_ler"     on public."conector";
drop policy if exists "conector_alterar" on public."conector";
-- Qualquer colaborador ativo vê o estado (as telas de férias mostram "atualizado em");
-- só quem gerencia integrações liga e desliga.
create policy "conector_ler"     on public."conector" for select to authenticated using (public.eh_colaborador());
create policy "conector_alterar" on public."conector" for update to authenticated using (public.tem_permissao('gerenciar_integracoes')) with check (public.tem_permissao('gerenciar_integracoes'));

drop policy if exists "conector_execucao_ler" on public."conector_execucao";
create policy "conector_execucao_ler" on public."conector_execucao" for select to authenticated using (public.tem_permissao('gerenciar_integracoes'));
-- (sem política de escrita: quem grava a execução é a Edge Function, com a chave de serviço)

-- ---------- conferência ----------
-- Deve listar o conector desligado e as colunas novas.
select 'conector' as item, chave::text || ' (ativo=' || ativo::text || ')' as detalhe from public.conector
union all
select 'coluna', table_name::text || '.' || column_name::text
from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'ciclo_ferias' and column_name in ('gestaoclick_id', 'origem', 'sincronizado_em'))
    or (table_name = 'solicitacao_ferias' and column_name in ('gestaoclick_id', 'origem')))
order by 1, 2;
