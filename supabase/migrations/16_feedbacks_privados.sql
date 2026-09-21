-- ============================================================
-- PORTAL CRC — FEEDBACKS SÓ PARA QUEM PODE VER (migration 16)
--
-- Rode no SQL Editor do Supabase, DEPOIS da migration 14 (que cria a
-- função meu_colaborador_id). Pode rodar mais de uma vez.
--
--
-- O BURACO QUE ISTO FECHA
--
-- Cada feedback (tabela observacao) tem uma visibilidade: "gestor" (só o
-- gestor vê) ou "ambos" (a pessoa citada também vê). A tela respeita isso,
-- mas o banco não: com a sessão aberta, qualquer agente conseguia, pelo
-- console do navegador,
--
--     db.entities.Observacao.list()        -- ler TODOS os feedbacks, de todos
--     db.entities.Observacao.update(...)   -- alterar um feedback
--     db.entities.Observacao.delete(...)   -- apagar um feedback
--
-- Numa cópia de 21/09: 76 dos 101 feedbacks são "só gestor".
--
--
-- A REGRA, AGORA NO BANCO
--
--   ler                 o gestor lê todos; o agente lê só os que o citam
--                       (colaboradores_ids) E estão marcados como visíveis
--                       para ele ("agente" ou "ambos")
--   criar/alterar/apagar só o gestor — a tela de Observações já é só dele
--
-- Fonte: ferramentas/gerar-seguranca.py (LEITURA_DO_CITADO), que gera as
-- mesmas políticas no 04_politicas.sql.
-- ============================================================

drop policy if exists "observacao_ler"     on public."observacao";
drop policy if exists "observacao_inserir" on public."observacao";
drop policy if exists "observacao_alterar" on public."observacao";
drop policy if exists "observacao_apagar"  on public."observacao";

-- "colaboradores_ids ? id" = a lista de ids citados contém o meu.
create policy "observacao_ler" on public."observacao"
  for select to authenticated
  using (
    public.eh_gestor()
    or (visibilidade in ('agente', 'ambos') and colaboradores_ids ? public.meu_colaborador_id())
  );

create policy "observacao_inserir" on public."observacao"
  for insert to authenticated
  with check (public.eh_gestor());

create policy "observacao_alterar" on public."observacao"
  for update to authenticated
  using (public.eh_gestor())
  with check (public.eh_gestor());

create policy "observacao_apagar" on public."observacao"
  for delete to authenticated
  using (public.eh_gestor());


-- ------------------------------------------------------------
-- CONFERÊNCIA — o resultado esperado: 4 linhas, todas com
-- so_gestor_ou_citado = true
-- ------------------------------------------------------------
select
  policyname as politica,
  cmd        as operacao,
  coalesce(qual, '') || coalesce(with_check, '') like '%eh_gestor%'
    and coalesce(qual, '') || coalesce(with_check, '') not like '%eh_colaborador%'
             as so_gestor_ou_citado
from pg_policies
where schemaname = 'public' and tablename = 'observacao'
order by policyname;
