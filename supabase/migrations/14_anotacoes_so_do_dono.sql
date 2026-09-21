-- ============================================================
-- PORTAL CRC — ANOTAÇÕES PESSOAIS SÓ PARA A DONA (migration 14)
--
-- Rode no SQL Editor do Supabase, DEPOIS da migration 13.
--
--
-- O BURACO QUE ISTO FECHA
--
-- As políticas genéricas da migration 13 dizem "colaborador ativo lê e
-- grava" em quase todas as tabelas — inclusive em anotacao_pessoal. A tela
-- "Minhas anotações" filtra pelas da própria pessoa, mas o banco não: com a
-- sessão aberta, qualquer colaborador consegue, pelo console do navegador,
--
--     db.entities.AnotacaoPessoal.list()              -- ler as de todos
--     db.entities.AnotacaoPessoal.update(id, {...})   -- alterar a de outro
--     db.entities.AnotacaoPessoal.delete(id)          -- apagar a de outro
--
-- Anotação pessoal é, por definição, privada. Aqui o banco passa a garantir
-- isso, e não só a tela.
--
--
-- DECISÃO: NEM O GESTOR LÊ
--
-- Em quase todo o sistema o gestor vê tudo. Aqui não: são lembretes da
-- própria pessoa, não registro de trabalho. Se algum dia precisar de uma
-- nota que o gestor veja, ela é outra coisa (observação, feedback) e mora
-- em outra tabela.
-- ============================================================


-- ------------------------------------------------------------------
-- 1) QUEM SOU EU
-- ------------------------------------------------------------------
-- O id do colaborador ativo dono do e-mail do login. SECURITY DEFINER pelo
-- mesmo motivo de eh_colaborador(): a consulta precisa furar o RLS de
-- colaborador para responder.
create or replace function public.meu_colaborador_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.id::text
  from public.colaborador c
  where lower(c.email) = lower(auth.jwt() ->> 'email')
    and coalesce(c.ativo, true)
  limit 1
$$;

revoke execute on function public.meu_colaborador_id() from anon;
grant  execute on function public.meu_colaborador_id() to authenticated;


-- ------------------------------------------------------------------
-- 2) AS QUATRO POLÍTICAS, AGORA POR DONO
-- ------------------------------------------------------------------
drop policy if exists "anotacao_pessoal_ler"     on public."anotacao_pessoal";
drop policy if exists "anotacao_pessoal_inserir" on public."anotacao_pessoal";
drop policy if exists "anotacao_pessoal_alterar" on public."anotacao_pessoal";
drop policy if exists "anotacao_pessoal_apagar"  on public."anotacao_pessoal";

create policy "anotacao_pessoal_ler" on public."anotacao_pessoal"
  for select to authenticated
  using (colaborador_id = public.meu_colaborador_id());

-- Criar só em nome de si mesma: sem isto, daria para "plantar" uma
-- anotação na lista de outra pessoa.
create policy "anotacao_pessoal_inserir" on public."anotacao_pessoal"
  for insert to authenticated
  with check (colaborador_id = public.meu_colaborador_id());

-- O with check impede também de "doar" a própria anotação a outra pessoa,
-- trocando o colaborador_id num update.
create policy "anotacao_pessoal_alterar" on public."anotacao_pessoal"
  for update to authenticated
  using (colaborador_id = public.meu_colaborador_id())
  with check (colaborador_id = public.meu_colaborador_id());

create policy "anotacao_pessoal_apagar" on public."anotacao_pessoal"
  for delete to authenticated
  using (colaborador_id = public.meu_colaborador_id());


-- ------------------------------------------------------------------
-- CONFERÊNCIA — as quatro políticas têm que citar meu_colaborador_id
-- ------------------------------------------------------------------
select
  policyname                                                    as politica,
  cmd                                                           as operacao,
  coalesce(qual, '') || coalesce(' / ' || with_check, '') like '%meu_colaborador_id%' as so_do_dono
from pg_policies
where schemaname = 'public' and tablename = 'anotacao_pessoal'
order by policyname;
-- Esperado: 4 linhas, todas com so_do_dono = true
