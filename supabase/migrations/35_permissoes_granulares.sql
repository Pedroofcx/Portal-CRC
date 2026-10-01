-- ============================================================
-- PORTAL CRC — PERMISSÕES GRANULARES: INFRAESTRUTURA (migration 35)
--
-- Rode no SQL Editor do Supabase.
--
--
-- POR QUE ISTO EXISTE
--
-- Até aqui o sistema inteiro tinha só dois níveis de acesso: papel
-- 'agente' ou 'gestor'. Essa única flag decidia tudo — inclusive dado
-- sensível (salário, custo operacional), junto com "pode gerenciar". Não
-- dava pra criar um substituto que cobre a gestão sem enxergar salário.
--
-- Esta migration cria a base: um catálogo de permissões (uma por módulo/
-- ação) e uma tabela de EXCEÇÕES por colaborador. Sem exceção registrada,
-- vale o padrão do papel (gestor tem tudo, agente não tem nada) — exatamente
-- o que já acontecia. Com uma exceção, dá pra tirar de um gestor ou dar a
-- um agente, módulo por módulo.
--
-- Esta migration SÓ cria a infraestrutura. Nenhuma política existente muda
-- de comportamento ainda — isso é a migration 36 em diante, uma de cada vez.
-- ============================================================

create table if not exists public."permissao" (
  "chave" text primary key,
  "modulo" text not null,
  "rotulo" text not null,
  "descricao" text,
  "ordem" numeric
);

create table if not exists public."colaborador_permissao" (
  "id" uuid primary key default gen_random_uuid(),
  "colaborador_id" text not null,
  "permissao_chave" text not null references public."permissao"("chave"),
  "concedida" boolean not null,
  "concedido_por_id" text,
  "concedido_por_nome" text,
  "concedido_em" timestamptz not null default now(),
  unique ("colaborador_id", "permissao_chave")
);

create index if not exists "ix_colaborador_permissao_colaborador" on public."colaborador_permissao" ("colaborador_id");

-- ------------------------------------------------------------------
-- A FUNÇÃO
-- ------------------------------------------------------------------
-- Mesmo padrão de eh_gestor()/meu_colaborador_id(): SECURITY DEFINER
-- porque precisa furar o RLS de colaborador_permissao pra responder.
--
-- Sem exceção pra essa chave: vale eh_gestor() (o padrão de hoje).
-- Com exceção: vale o que foi registrado, mesmo contra o padrão do papel
-- — é isso que permite tirar uma permissão de um gestor (o substituto) ou
-- dar a um agente.
create or replace function public.tem_permissao(p_chave text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select cp."concedida"
      from public."colaborador_permissao" cp
      where cp."colaborador_id" = public.meu_colaborador_id()
        and cp."permissao_chave" = p_chave
    ),
    public.eh_gestor()
  )
$$;

revoke execute on function public.tem_permissao(text) from anon;
grant  execute on function public.tem_permissao(text) to authenticated;

-- RPC: todas as chaves que o usuário logado tem agora. O front busca essa
-- lista uma vez por sessão em vez de chamar tem_permissao() chave por chave.
create or replace function public.minhas_permissoes()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select p."chave"
  from public."permissao" p
  where public.tem_permissao(p."chave")
$$;

revoke execute on function public.minhas_permissoes() from anon;
grant  execute on function public.minhas_permissoes() to authenticated;

-- ------------------------------------------------------------------
-- RLS DAS DUAS TABELAS NOVAS
-- ------------------------------------------------------------------
-- IMPORTANTE: as políticas aqui usam eh_gestor() DIRETO, nunca
-- tem_permissao('gerenciar_permissoes'). Se usassem a própria permissão
-- que está sendo gerenciada por esta tela, um gestor que perdesse essa
-- permissão por engano ficaria travado pra sempre — ninguém mais
-- conseguiria devolver a ele. O controle de quem mexe em permissões fica
-- sempre amarrado ao papel puro, fora do sistema de exceções.

alter table public."permissao" enable row level security;
alter table public."colaborador_permissao" enable row level security;

drop policy if exists "permissao_ler" on public."permissao";
create policy "permissao_ler" on public."permissao"
  for select to authenticated
  using (public.eh_colaborador());

drop policy if exists "colaborador_permissao_ler" on public."colaborador_permissao";
create policy "colaborador_permissao_ler" on public."colaborador_permissao"
  for select to authenticated
  using (public.eh_gestor() or "colaborador_id" = public.meu_colaborador_id());

drop policy if exists "colaborador_permissao_inserir" on public."colaborador_permissao";
create policy "colaborador_permissao_inserir" on public."colaborador_permissao"
  for insert to authenticated
  with check (public.eh_gestor());

drop policy if exists "colaborador_permissao_alterar" on public."colaborador_permissao";
create policy "colaborador_permissao_alterar" on public."colaborador_permissao"
  for update to authenticated
  using (public.eh_gestor())
  with check (public.eh_gestor());

drop policy if exists "colaborador_permissao_apagar" on public."colaborador_permissao";
create policy "colaborador_permissao_apagar" on public."colaborador_permissao"
  for delete to authenticated
  using (public.eh_gestor());

-- ------------------------------------------------------------------
-- O CATÁLOGO
-- ------------------------------------------------------------------
insert into public."permissao" ("chave", "modulo", "rotulo", "descricao", "ordem") values
  ('ver_salario',                'Colaboradores', 'Ver salário e promoções',                       'Enxerga o salário e o histórico de promoções no cadastro de cada pessoa.', 10),
  ('gerenciar_colaboradores',     'Colaboradores', 'Criar/editar colaboradores',                     'Cadastrar, editar e desativar colaboradores.', 20),
  ('ver_custo_operacional',       'Tratativas',    'Ver custo operacional',                          'Enxerga o custo operacional calculado de cada tratativa.', 30),
  ('aprovar_solucao_replicavel',  'Tratativas',    'Aprovar solução replicável',                     'Aprova ou contesta soluções marcadas como replicáveis.', 40),
  ('corrigir_tratativa_encerrada','Tratativas',    'Corrigir tratativa já encerrada',                'Edita campos de resultado de uma tratativa depois que ela foi encerrada.', 50),
  ('gerenciar_tipos_tratativa',   'Configurações', 'Tipos, categorias e motivos de tratativa',       'Cria e edita os tipos, categorias e motivos usados no registro de tratativas.', 60),
  ('gerenciar_pop',               'POP',           'Criar/editar POP',                               'Cria, edita e publica Procedimentos Operacionais Padrão.', 70),
  ('gerenciar_escalas',           'Escalas',       'Montar escalas',                                 'Monta e edita a escala de trabalho e de turno da equipe.', 80),
  ('aprovar_ferias',              'Férias',        'Aprovar pedidos de férias',                      'Aprova ou recusa pedidos de férias da equipe.', 90),
  ('gerenciar_avisos',            'Avisos',        'Publicar avisos',                                'Cria e remove avisos para a equipe.', 100),
  ('gerenciar_pesquisas',         'Pesquisas',     'Criar pesquisas',                                'Cria, edita e encerra pesquisas internas.', 110),
  ('ver_respostas_pesquisa',      'Pesquisas',     'Ver quem respondeu o quê',                       'Enxerga as respostas individuais de cada pesquisa, não só o resultado agregado.', 120),
  ('ver_pdi_equipe',              'PDI',           'Ver o PDI de todo mundo',                        'Enxerga o Plano de Desenvolvimento Individual de qualquer pessoa, não só o próprio.', 130),
  ('ver_observacoes_equipe',      'Observações',   'Ver observações de todo mundo',                  'Enxerga observações da equipe inteira, não só as que te citam.', 140),
  ('acessar_oraculo',             'Oráculo',       'Usar o Oráculo CRC',                             'Acessa a ferramenta de leitura e análise de pessoas.', 150),
  ('ver_log_auditoria',           'Auditoria',     'Ver o log de auditoria',                         'Enxerga o histórico de ações registradas no sistema.', 160),
  ('gerenciar_apuracao',          'Apuração',      'Importar e configurar apuração',                 'Importa arquivos de apuração e ajusta o mapeamento de colunas.', 170),
  ('gerenciar_operacao',          'Operação',      'Distribuição de tratativas e plano setorial',    'Gerencia a distribuição de tratativas entre agentes e o plano setorial.', 180),
  ('gerenciar_permissoes',        'Configurações', 'Editar as permissões de cada pessoa',            'Abre esta própria tela e muda quem tem qual permissão. Informativo — o controle de verdade é o papel de gestor.', 190)
on conflict ("chave") do update set
  "modulo" = excluded."modulo",
  "rotulo" = excluded."rotulo",
  "descricao" = excluded."descricao",
  "ordem" = excluded."ordem";

-- ------------------------------------------------------------------
-- CONFERÊNCIA
-- ------------------------------------------------------------------
select count(*) as permissoes_no_catalogo from public."permissao";
