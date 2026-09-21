-- ============================================================
-- PORTAL CRC — FEEDBACKS APONTANDO PARA AS PESSOAS CERTAS (migration 15)
--
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez: na segunda,
-- não encontra mais nada para trocar.
--
--
-- O PROBLEMA
--
-- Na importação do Base44, cada registro ganhou um id novo, e os vínculos
-- (campos que terminam em _id) foram trocados para os ids novos. Mas
-- observacao.colaboradores_ids é uma LISTA de ids — termina em _ids, e o
-- importador não a tocou. Ela ficou com os ids antigos do Base44.
--
-- Resultado: nenhuma tela encontra os feedbacks de ninguém. O Histórico do
-- colaborador, a Minha Performance do agente, os Relatórios e o
-- "Último feedback" da tela do gestor procuram pelo id novo e não acham nada
-- — a Dayane tem 25 feedbacks invisíveis.
--
--
-- O QUE ISTO FAZ
--
-- Troca, dentro de cada lista, o id antigo pelo id novo da mesma pessoa
-- (colaborador_base.base44_id guarda o antigo). Ids que não são de nenhum
-- colaborador ficam como estão, e a ordem da lista é mantida.
--
-- O importador (ferramentas/importar-dados.mjs) também foi corrigido: na
-- migração completa, as listas _ids já chegam com os ids novos.
-- ============================================================

update public."observacao" o
set colaboradores_ids = (
  select jsonb_agg(coalesce(c.id::text, e.antigo) order by e.ordem)
  from jsonb_array_elements_text(o.colaboradores_ids) with ordinality as e(antigo, ordem)
  left join public."colaborador_base" c on c.base44_id = e.antigo
)
where jsonb_typeof(o.colaboradores_ids) = 'array'
  and exists (
    select 1
    from jsonb_array_elements_text(o.colaboradores_ids) as e(antigo)
    join public."colaborador_base" c on c.base44_id = e.antigo
  );


-- ------------------------------------------------------------
-- CONFERÊNCIA — o resultado esperado:
--   ainda_com_id_antigo = 0
--   com_id_novo         = 99 (numa cópia de 21/09: 99 de 101 — as outras 2
--                         são de pessoas que já não estão no cadastro)
-- ------------------------------------------------------------
select
  count(*) filter (where exists (
    select 1 from jsonb_array_elements_text(o.colaboradores_ids) e(x)
    join public."colaborador_base" c on c.base44_id = e.x
  )) as ainda_com_id_antigo,
  count(*) filter (where exists (
    select 1 from jsonb_array_elements_text(o.colaboradores_ids) e(x)
    join public."colaborador_base" c on c.id::text = e.x
  )) as com_id_novo,
  count(*) as total
from public."observacao" o
where jsonb_typeof(o.colaboradores_ids) = 'array';
