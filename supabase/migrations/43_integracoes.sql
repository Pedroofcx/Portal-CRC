-- ============================================================
-- PORTAL CRC — INTEGRAÇÕES: A BASE (migration 43)
--
-- Rode no SQL Editor do Supabase, DEPOIS da migration 42.
--
-- O QUE ENTRA
--   A base para outros sistemas falarem com o Portal por uma API própria
--   (a Edge Function "api"), com tudo ligável e desligável pela tela
--   Configurações > Integrações:
--
--     integracao_geral          a CHAVE GERAL (uma linha): desliga toda a API
--     integracao                cada sistema que se conecta: ligada ou não,
--                               quais recursos pode acessar e se só LÊ, só
--                               GRAVA ou os dois, e o limite de chamadas
--     integracao_chave          as chaves de cada integração (cada uma pode
--                               ser desligada sozinha)
--     integracao_chave_segredo  o resumo (hash) de cada chave. Ninguém lê
--                               pelo app: só a Edge Function, com a chave de
--                               serviço
--     integracao_log            o registro de cada chamada (aceita ou recusada)
--
--   criar_chave_integracao()    gera a chave e devolve o texto UMA ÚNICA VEZ.
--                               No banco fica só o hash.
--
-- A CHAVE GERAL NASCE DESLIGADA. Nada de fora entra até você ligar.
--
-- PERMISSÃO NOVA: gerenciar_integracoes (gestor tem por padrão; dá para
--   retirar ou conceder em Configurações > Permissões).
--
-- COMO DESFAZER (se algum dia precisar):
--   drop table integracao_log, integracao_chave_segredo, integracao_chave,
--              integracao, integracao_geral cascade;
--   drop function criar_chave_integracao(uuid, text, timestamptz);
-- ============================================================

-- ---------- permissão nova ----------

insert into public.permissao (chave, modulo, rotulo, descricao, ordem) values
  ('gerenciar_integracoes', 'Configurações', 'Integrações e chaves de API',
   'Ligar e desligar integrações, escolher o que cada uma acessa, criar e revogar chaves e ver o registro de uso.', 86)
on conflict (chave) do update set
  modulo = excluded.modulo, rotulo = excluded.rotulo,
  descricao = excluded.descricao, ordem = excluded.ordem;

-- ---------- chave geral ----------

create table if not exists public."integracao_geral" (
  "id" integer primary key default 1 check ("id" = 1),
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "habilitada" boolean not null default false
);
insert into public."integracao_geral" ("id", "habilitada") values (1, false) on conflict ("id") do nothing;

-- ---------- integrações ----------

create table if not exists public."integracao" (
  "id" uuid primary key default gen_random_uuid(),
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "nome" text not null unique,
  "descricao" text,
  -- quem inicia a conversa: o outro sistema chama o Portal (entrada), o Portal
  -- chama o outro (saida) ou os dois
  "sentido" text not null default 'entrada' check ("sentido" in ('entrada', 'saida', 'ambos')),
  "ativa" boolean not null default false,
  -- { "tratativas": { "ler": true, "gravar": false }, "colaboradores": { "ler": true } }
  "recursos" jsonb not null default '{}'::jsonb,
  "limite_por_minuto" integer not null default 60 check ("limite_por_minuto" between 1 and 6000),
  "criada_por_nome" text
);

-- ---------- chaves ----------

create table if not exists public."integracao_chave" (
  "id" uuid primary key default gen_random_uuid(),
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "integracao_id" uuid not null references public."integracao" ("id") on delete cascade,
  "nome" text not null,
  -- os primeiros caracteres, só para reconhecer a chave na lista
  "prefixo" text not null,
  "ativa" boolean not null default true,
  "expira_em" timestamptz,
  "ultimo_uso" timestamptz,
  "criada_por_nome" text
);
create index if not exists "ix_integracao_chave_integracao" on public."integracao_chave" ("integracao_id");

create table if not exists public."integracao_chave_segredo" (
  "chave_id" uuid primary key references public."integracao_chave" ("id") on delete cascade,
  "hash" text not null unique
);

-- ---------- registro de uso ----------

create table if not exists public."integracao_log" (
  "id" uuid primary key default gen_random_uuid(),
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "integracao_id" uuid references public."integracao" ("id") on delete set null,
  "integracao_nome" text,
  "chave_id" uuid,
  "metodo" text,
  "caminho" text,
  "recurso" text,
  "acao" text,
  "resultado" text not null check ("resultado" in ('aceita', 'recusada')),
  "status_http" integer,
  "motivo" text,
  "duracao_ms" integer
);
create index if not exists "ix_integracao_log_integracao_data" on public."integracao_log" ("integracao_id", "created_date" desc);
create index if not exists "ix_integracao_log_data" on public."integracao_log" ("created_date" desc);

-- ---------- segurança ----------

alter table public."integracao_geral"          enable row level security;
alter table public."integracao"                enable row level security;
alter table public."integracao_chave"          enable row level security;
alter table public."integracao_chave_segredo"  enable row level security;
alter table public."integracao_log"            enable row level security;

-- O resumo das chaves não abre para ninguém pelo app, nem para o gestor.
revoke all on public."integracao_chave_segredo" from anon, authenticated;

drop policy if exists "integracao_geral_ler"     on public."integracao_geral";
drop policy if exists "integracao_geral_alterar" on public."integracao_geral";
create policy "integracao_geral_ler"     on public."integracao_geral" for select to authenticated using (public.tem_permissao('gerenciar_integracoes'));
create policy "integracao_geral_alterar" on public."integracao_geral" for update to authenticated using (public.tem_permissao('gerenciar_integracoes')) with check (public.tem_permissao('gerenciar_integracoes'));

drop policy if exists "integracao_ler"     on public."integracao";
drop policy if exists "integracao_inserir" on public."integracao";
drop policy if exists "integracao_alterar" on public."integracao";
drop policy if exists "integracao_apagar"  on public."integracao";
create policy "integracao_ler"     on public."integracao" for select to authenticated using (public.tem_permissao('gerenciar_integracoes'));
create policy "integracao_inserir" on public."integracao" for insert to authenticated with check (public.tem_permissao('gerenciar_integracoes'));
create policy "integracao_alterar" on public."integracao" for update to authenticated using (public.tem_permissao('gerenciar_integracoes')) with check (public.tem_permissao('gerenciar_integracoes'));
create policy "integracao_apagar"  on public."integracao" for delete to authenticated using (public.tem_permissao('gerenciar_integracoes'));

-- Chave: nasce só pela função criar_chave_integracao (sem política de insert).
drop policy if exists "integracao_chave_ler"     on public."integracao_chave";
drop policy if exists "integracao_chave_alterar" on public."integracao_chave";
drop policy if exists "integracao_chave_apagar"  on public."integracao_chave";
create policy "integracao_chave_ler"     on public."integracao_chave" for select to authenticated using (public.tem_permissao('gerenciar_integracoes'));
create policy "integracao_chave_alterar" on public."integracao_chave" for update to authenticated using (public.tem_permissao('gerenciar_integracoes')) with check (public.tem_permissao('gerenciar_integracoes'));
create policy "integracao_chave_apagar"  on public."integracao_chave" for delete to authenticated using (public.tem_permissao('gerenciar_integracoes'));

-- Registro: só lê (quem grava é a Edge Function, com a chave de serviço).
drop policy if exists "integracao_log_ler" on public."integracao_log";
create policy "integracao_log_ler" on public."integracao_log" for select to authenticated using (public.tem_permissao('gerenciar_integracoes'));

-- ---------- gerar chave ----------

create or replace function public.criar_chave_integracao(
  p_integracao uuid,
  p_nome text,
  p_expira_em timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_chave text;
  v_id uuid;
  v_prefixo text;
  v_quem text;
begin
  if not public.tem_permissao('gerenciar_integracoes') then
    raise exception 'Sem permissão para criar chaves de integração.' using errcode = '42501';
  end if;
  if coalesce(trim(p_nome), '') = '' then
    raise exception 'Dê um nome para a chave.';
  end if;
  if not exists (select 1 from public.integracao where id = p_integracao) then
    raise exception 'Integração não encontrada.';
  end if;

  -- "crc_" + 48 caracteres hexadecimais aleatórios (192 bits)
  v_chave := 'crc_' || encode(extensions.gen_random_bytes(24), 'hex');
  v_prefixo := left(v_chave, 8);
  select nome_completo into v_quem from public.colaborador_base where id::text = public.meu_colaborador_id();

  insert into public.integracao_chave (integracao_id, nome, prefixo, expira_em, criada_por_nome)
  values (p_integracao, trim(p_nome), v_prefixo, p_expira_em, v_quem)
  returning id into v_id;

  insert into public.integracao_chave_segredo (chave_id, hash)
  values (v_id, encode(extensions.digest(convert_to(v_chave, 'utf8'), 'sha256'), 'hex'));

  -- O texto da chave sai daqui UMA vez. No banco fica só o hash.
  return jsonb_build_object('id', v_id, 'prefixo', v_prefixo, 'chave', v_chave);
end;
$$;

revoke all on function public.criar_chave_integracao(uuid, text, timestamptz) from public, anon;
grant execute on function public.criar_chave_integracao(uuid, text, timestamptz) to authenticated;

-- ---------- conferência ----------
-- Deve listar as 5 tabelas, a chave geral desligada e a permissão nova.
select 'tabela' as item, table_name::text as nome
from information_schema.tables
where table_schema = 'public' and table_name like 'integracao%'
union all
select 'chave geral habilitada', habilitada::text from public.integracao_geral
union all
select 'permissão', chave from public.permissao where chave = 'gerenciar_integracoes'
order by 1, 2;
