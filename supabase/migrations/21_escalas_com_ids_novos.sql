-- ============================================================
-- PORTAL CRC — ESCALAS APONTANDO PARA OS IDs NOVOS DOS COLABORADORES
--
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
--
--
-- O PROBLEMA
--
-- As escalas guardam a pessoa dentro de um JSON:
--   turnos: [{ data, manha: [{ colaborador_id, colaborador_nome }], tarde: [...] }]
--   colaboradores_participantes: [ids]
--
-- Esses ids são os do BASE44. Na migração o colaborador ganhou id novo no
-- Supabase (o antigo ficou guardado em colaborador.base44_id), e a ligação
-- passou a falhar em silêncio: o relatório de Produtividade por Turno mostrava
-- 0 tratativas para todo mundo, em todos os dias.
--
-- É o mesmo caso das observações (migration 15), agora nas escalas:
-- 530 posições de turno e 78 participantes, em 17 escalas.
--
--
-- O QUE ESTA MIGRATION FAZ
--
-- Troca, dentro do JSON, cada id antigo pelo id novo do mesmo colaborador.
-- Quem não tiver correspondência fica como está (e aparece na conferência).
-- ============================================================

do $$
declare
  c record;
  trocados int := 0;
begin
  for c in select id, base44_id from public.colaborador_base where base44_id is not null loop
    update public.escala_turno
       set turnos = replace(turnos::text, c.base44_id, c.id::text)::jsonb
     where turnos::text like '%' || c.base44_id || '%';
    get diagnostics trocados = row_count;
    raise notice 'turnos: % escala(s) atualizadas para %', trocados, c.base44_id;

    update public.escala_turno
       set colaboradores_participantes = replace(colaboradores_participantes::text, c.base44_id, c.id::text)::jsonb
     where colaboradores_participantes::text like '%' || c.base44_id || '%';
  end loop;
end $$;


-- ------------------------------------------------------------------
-- CONFERÊNCIA — deve devolver zero linhas
-- ------------------------------------------------------------------
-- Qualquer id de colaborador do Base44 que ainda tenha sobrado numa escala.
select e.id, e.semana_referencia, c.nome_completo as ainda_com_id_antigo
from public.escala_turno e
join public.colaborador_base c on c.base44_id is not null
where e.turnos::text like '%' || c.base44_id || '%'
   or e.colaboradores_participantes::text like '%' || c.base44_id || '%';
