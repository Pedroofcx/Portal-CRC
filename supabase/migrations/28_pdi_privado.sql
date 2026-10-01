-- =====================================================================
-- 28 — PDI é individual: só o dono e o gestor leem; só o gestor grava
-- =====================================================================
-- Pedido de Pedro (01/10/2026): "não se pode ler o PDI do outro, PDI é
-- individual, apenas gestores podem ler o PDI de todos".
--
-- O BURACO QUE ISTO FECHA
--
-- A política de pdi era eh_colaborador() nas quatro operações — ou seja,
-- QUALQUER colaborador ativo conseguia, pelo console do navegador,
--
--     db.entities.PDI.list()               -- ler o PDI de todo mundo
--     db.entities.PDI.create({...})        -- criar PDI em nome de outra pessoa
--     db.entities.PDI.update(id, {...})    -- alterar o PDI de outra pessoa
--     db.entities.PDI.delete(id)           -- apagar o PDI de outra pessoa
--
-- A tela (PlanoSetorial.jsx) já só deixa o GESTOR criar/editar, e PDI.jsx
-- já filtra pra mostrar só os PDIs da própria pessoa — mas isso era regra
-- de tela, não do banco.
--
-- Rode no SQL Editor DEPOIS da migration 14 (cria meu_colaborador_id).
-- Rodar de novo não duplica nada.
-- =====================================================================

drop policy if exists "pdi_ler"      on public."pdi";
drop policy if exists "pdi_inserir"  on public."pdi";
drop policy if exists "pdi_alterar"  on public."pdi";
drop policy if exists "pdi_apagar"   on public."pdi";

create policy "pdi_ler" on public."pdi"
  for select to authenticated
  using (public.eh_gestor() or colaborador_id = public.meu_colaborador_id());

-- Criar, alterar e apagar PDI é coisa de gestor (a tela já só deixa isso
-- pra ele) — ninguém mexe no próprio plano de desenvolvimento sozinho.
create policy "pdi_inserir" on public."pdi"
  for insert to authenticated
  with check (public.eh_gestor());

create policy "pdi_alterar" on public."pdi"
  for update to authenticated
  using (public.eh_gestor())
  with check (public.eh_gestor());

create policy "pdi_apagar" on public."pdi"
  for delete to authenticated
  using (public.eh_gestor());

-- Confere:
-- select policyname, cmd, qual, with_check from pg_policies where tablename = 'pdi' order by 1;
