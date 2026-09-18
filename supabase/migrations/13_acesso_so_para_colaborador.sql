-- ============================================================
-- PORTAL CRC — ACESSO SÓ PARA COLABORADOR ATIVO (Fase 06, pré-publicação)
--
-- Rode no SQL Editor do Supabase ANTES de publicar o sistema na internet.
--
--
-- O QUE MUDA, E POR QUE AGORA
--
-- Até aqui as políticas diziam "quem está logado lê". Isso bastava enquanto o
-- Portal rodava numa máquina só. Publicar muda a pergunta: a tela de login
-- passa a ser alcançável por qualquer pessoa, e o Supabase permite que
-- qualquer pessoa crie uma conta.
--
-- Ou seja: sem esta migration, bastaria alguém se cadastrar sozinho no
-- endereço público para ler a base inteira de clientes e tratativas — sem
-- precisar invadir nada, usando a porta da frente.
--
-- "Tem conta de login" e "trabalha aqui" viram duas coisas diferentes. Quem
-- decide a segunda é o cadastro em `colaborador`, que só gestor altera.
--
--
-- POR QUE NÃO BASTA DESLIGAR O CADASTRO NO PAINEL
--
-- Desligar "Allow new users to sign up" é necessário e está no passo a passo
-- de publicação. Mas é uma caixinha num painel: alguém religa sem perceber, um
-- dia, e a base fica aberta sem que nada avise. Aqui a regra está no banco,
-- onde ninguém esbarra nela por acidente — e as duas proteções se somam em vez
-- de uma substituir a outra.
--
--
-- EFEITO COLATERAL DESEJADO
--
-- Desligar alguém da empresa (`ativo = false` em colaborador) passa a cortar o
-- acesso ao sistema, sem precisar mexer em conta de login. Antes, o ex-
-- funcionário continuava enxergando tudo enquanto a conta existisse.
-- ============================================================


-- ------------------------------------------------------------------
-- 1) QUEM É DA CASA
-- ------------------------------------------------------------------
-- SECURITY DEFINER porque a consulta precisa furar o RLS de colaborador para
-- conseguir responder — sem isso seria uma pergunta que depende da própria
-- resposta.
create or replace function public.eh_colaborador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.colaborador c
    where lower(c.email) = lower(auth.jwt() ->> 'email')
      and coalesce(c.ativo, true)
  )
$$;

revoke execute on function public.eh_colaborador() from anon;
grant  execute on function public.eh_colaborador() to authenticated;


-- ------------------------------------------------------------------
-- 2) GESTOR DESLIGADO DEIXA DE SER GESTOR
-- ------------------------------------------------------------------
-- `papel_atual` não olhava o campo `ativo`. Um gestor desligado mantinha os
-- poderes de gestor enquanto a linha existisse no cadastro.
create or replace function public.papel_atual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.papel
  from public.colaborador c
  where lower(c.email) = lower(auth.jwt() ->> 'email')
    and coalesce(c.ativo, true)
  limit 1
$$;


-- ------------------------------------------------------------------
-- 3) AS POLÍTICAS QUE DIZIAM "true" PASSAM A EXIGIR COLABORADOR
-- ------------------------------------------------------------------
-- As políticas não são recriadas a partir do 04_politicas.sql porque as
-- tabelas mascaradas foram renomeadas para `<nome>_base` na migration 05 —
-- rodar o 04 de novo tentaria criar política sobre uma view e falharia.
--
-- Em vez disso, este bloco percorre as políticas que existem de fato e troca
-- só as que liberavam geral (`true`). As que já exigem `eh_gestor()` ficam
-- como estão: gestor desligado já foi resolvido no passo 2.
do $$
declare
  r        record;
  trocadas integer := 0;
begin
  for r in
    select schemaname, tablename, policyname, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (qual = 'true' or with_check = 'true')
  loop
    if r.qual = 'true' and r.with_check = 'true' then
      execute format(
        'alter policy %I on %I.%I using (public.eh_colaborador()) with check (public.eh_colaborador())',
        r.policyname, r.schemaname, r.tablename);
    elsif r.qual = 'true' then
      execute format(
        'alter policy %I on %I.%I using (public.eh_colaborador())',
        r.policyname, r.schemaname, r.tablename);
    else
      execute format(
        'alter policy %I on %I.%I with check (public.eh_colaborador())',
        r.policyname, r.schemaname, r.tablename);
    end if;
    trocadas := trocadas + 1;
  end loop;

  raise notice 'Políticas ajustadas: %', trocadas;
end $$;


-- ------------------------------------------------------------------
-- CONFERÊNCIA 1 — nenhuma política pode continuar liberando geral
-- ------------------------------------------------------------------
select
  count(*) filter (where qual = 'true' or with_check = 'true') as ainda_liberadas,
  count(*) filter (where coalesce(qual, '') like '%eh_colaborador%'
                      or coalesce(with_check, '') like '%eh_colaborador%') as exigem_colaborador,
  count(*) filter (where coalesce(qual, '') like '%eh_gestor%'
                      or coalesce(with_check, '') like '%eh_gestor%') as exigem_gestor,
  count(*) as total
from pg_policies
where schemaname = 'public';
-- Esperado: ainda_liberadas = 0


-- ------------------------------------------------------------------
-- CONFERÊNCIA 2 — contas de login sem colaborador ativo
-- ------------------------------------------------------------------
-- Qualquer linha aqui é uma conta que consegue entrar mas não vai enxergar
-- nada. Se for alguém da equipe, falta cadastrar em colaborador; se não for,
-- a conta deve ser apagada em Authentication > Users.
select
  u.email,
  u.created_at::date as conta_criada_em,
  case when u.email_confirmed_at is null then 'e-mail não confirmado' else 'confirmada' end as situacao,
  case
    when c.id is null            then 'SEM CADASTRO'
    when coalesce(c.ativo, true) then c.papel
    else 'cadastro INATIVO'
  end as no_portal
from auth.users u
left join public.colaborador_base c on lower(c.email) = lower(u.email)
where c.id is null or not coalesce(c.ativo, true)
order by u.created_at;
-- Esperado hoje: nenhuma linha
