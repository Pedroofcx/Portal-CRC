-- ============================================================
-- PORTAL CRC — AVD SEMPRE COM O NOME DA PESSOA (migration 51)
--
-- Rode no SQL Editor do Supabase, DEPOIS da migration 50.
--
-- POR QUE
--   A migration 50 impediu responder em nome de outra pessoa, mas deixou uma
--   porta aberta: a resposta sem nome (colaborador_id vazio) passava em
--   qualquer pesquisa, não só nas anônimas. A AVD NÃO é anônima: sem o nome, o
--   dado não se liga à pessoa e o Oráculo não o encontra.
--
-- O QUE MUDA
--   1) Resposta sem nome só é aceita em pesquisa marcada como anônima. Em
--      qualquer outra, precisa vir com o id de quem respondeu, e ele tem que
--      ser o de quem está logado (ou de um gestor, na importação/correção).
--   2) Trava no próprio dado, que vale até para o gestor e para a importação:
--        - uma pesquisa do tipo AVD não pode ser anônima;
--        - uma resposta de AVD não pode ficar sem colaborador.
--
-- COMO DESFAZER
--   alter table pesquisa drop constraint pesquisa_avd_nao_anonima;
--   alter table resposta_pesquisa drop constraint resposta_avd_com_colaborador;
--   e rodar de novo a migration 50 (regra de inserção anterior).
-- ============================================================

drop policy if exists "resposta_pesquisa_inserir" on public."resposta_pesquisa";

create policy "resposta_pesquisa_inserir" on public."resposta_pesquisa"
  for insert to authenticated
  with check (
    public.eh_colaborador()
    and (
      -- com nome: o da própria pessoa (o gestor também pode, para importar/corrigir)
      (colaborador_id is not null
        and (colaborador_id = public.meu_colaborador_id() or public.eh_gestor()))
      -- sem nome: só em pesquisa anônima
      or (colaborador_id is null
        and exists (
          select 1 from public."pesquisa" p
          where p.id::text = resposta_pesquisa.pesquisa_id and coalesce(p.anonima, false)
        ))
    )
  );

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'pesquisa_avd_nao_anonima') then
    alter table public."pesquisa"
      add constraint "pesquisa_avd_nao_anonima"
      check (tipo is distinct from 'avd' or not coalesce(anonima, false));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'resposta_avd_com_colaborador') then
    alter table public."resposta_pesquisa"
      add constraint "resposta_avd_com_colaborador"
      check (pesquisa_tipo is distinct from 'avd' or colaborador_id is not null);
  end if;
end $$;


-- ---------- conferência ----------
-- Deve listar a regra de inserção e as duas travas novas.
select 'regra de inserção' as item, count(*)::text as ok
from pg_policies
where schemaname = 'public' and tablename = 'resposta_pesquisa' and policyname = 'resposta_pesquisa_inserir'
union all
select 'trava: AVD não anônima', count(*)::text from pg_constraint where conname = 'pesquisa_avd_nao_anonima'
union all
select 'trava: resposta de AVD com nome', count(*)::text from pg_constraint where conname = 'resposta_avd_com_colaborador';
