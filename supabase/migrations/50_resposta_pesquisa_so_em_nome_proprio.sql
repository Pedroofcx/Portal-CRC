-- ============================================================
-- PORTAL CRC — RESPOSTA DE PESQUISA SÓ EM NOME PRÓPRIO (migration 50)
--
-- Rode no SQL Editor do Supabase, DEPOIS da migration 49.
--
-- POR QUE
--   Um teste de segurança da AVD mostrou que qualquer colaborador conseguia
--   gravar uma resposta de pesquisa EM NOME DE OUTRA PESSOA: a regra de
--   inserção só exigia ser colaborador, sem conferir de quem é a resposta.
--   Numa AVD (autoavaliação identificada) isso permitiria forjar a avaliação
--   de um colega.
--
-- O QUE MUDA
--   A resposta só pode ser gravada:
--     - em nome de quem está logado (colaborador_id = a própria pessoa), ou
--     - sem nome nenhum (pesquisa anônima, colaborador_id vazio), ou
--     - por quem é gestor (importação e correções).
--   Nada muda para quem responde normalmente: a tela já grava o próprio id.
--
-- COMO DESFAZER
--   Rodar de novo a regra de inserção da migration 04 (só eh_colaborador()).
-- ============================================================

drop policy if exists "resposta_pesquisa_inserir" on public."resposta_pesquisa";

create policy "resposta_pesquisa_inserir" on public."resposta_pesquisa"
  for insert to authenticated
  with check (
    public.eh_colaborador()
    and (
      colaborador_id is null
      or colaborador_id = public.meu_colaborador_id()
      or public.eh_gestor()
    )
  );


-- ---------- conferência ----------
-- Deve listar a regra de inserção com a condição nova.
select policyname::text as regra, cmd::text as comando
from pg_policies
where schemaname = 'public' and tablename = 'resposta_pesquisa' and policyname = 'resposta_pesquisa_inserir';
