-- =====================================================================
-- 22 — A leitura de pessoas passa a morar em Observações
-- =====================================================================
-- Decisão de Pedro (23/09/2026): "os lançamentos deveriam ser feitos no
-- módulo de observações. O Oráculo CRC concentraria as informações em
-- relação ao colaborador."
--
-- O que muda:
--   1. A observação ganha três campos: as competências avaliadas (1 a 5),
--      as palavras-chave escolhidas e a pergunta que guiou a conversa.
--   2. Os lançamentos que já existem no Oráculo viram observações do tipo
--      'leitura', sem perder nada e sem apagar a tabela antiga.
--
-- As competências antigas tinham outros nomes. O de-para abaixo usa só o
-- que tem o mesmo significado; o que não tinha equivalente (disciplina e
-- negociação) fica vazio nas leituras antigas — melhor vazio do que
-- inventado. A escala já era de 1 a 5 nos dois casos.
--
-- Rodar uma vez no SQL Editor. Rodar de novo não duplica nada.
-- =====================================================================

alter table public."observacao" add column if not exists "competencias" jsonb;
alter table public."observacao" add column if not exists "palavras_chave" jsonb;
alter table public."observacao" add column if not exists "pergunta_gerada" text;

comment on column public."observacao"."competencias" is
  'Leitura de pessoas: { humanas: {chave: 1..5}, tecnicas: {chave: 1..5} }. Lista fixa em src/lib/competencias.js.';

insert into public."observacao" (
  "base44_id", "created_date", "updated_date", "criado_em", "atualizado_em", "created_by",
  "colaboradores_ids", "colaboradores_nomes", "tipo", "titulo", "conteudo", "visibilidade",
  "data_registro", "autor_id", "autor_nome",
  "competencias", "palavras_chave", "pergunta_gerada"
)
select
  'leitura:' || l."id",
  l."created_date", l."updated_date", l."criado_em", l."atualizado_em", l."created_by",
  to_jsonb(array[l."colaborador_id"]),
  to_jsonb(array[coalesce(l."colaborador_nome", '')]),
  'leitura',
  'Leitura de pessoas',
  coalesce(nullif(l."texto_livre", ''), 'Lançamento do Oráculo, sem texto livre.'),
  'gestor',
  coalesce(l."data_lancamento", l."created_date"),
  l."gestor_id", l."gestor_nome",
  jsonb_build_object(
    'humanas', jsonb_strip_nulls(jsonb_build_object(
      'comunicacao',    l."soft_skills" -> 'Comunicação',
      'empatia',        l."soft_skills" -> 'Empatia',
      'colaboracao',    l."soft_skills" -> 'Trabalho em Equipe',
      'adaptabilidade', l."soft_skills" -> 'Resiliência',
      'iniciativa',     l."soft_skills" -> 'Proatividade'
    )),
    'tecnicas', jsonb_strip_nulls(jsonb_build_object(
      'dominio_produto',  l."hard_skills" -> 'Conhecimento Técnico',
      'uso_dos_pops',     l."hard_skills" -> 'Uso de Ferramentas',
      'investigacao',     l."hard_skills" -> 'Resolução de Problemas',
      'registro_clareza', l."hard_skills" -> 'Análise de Dados',
      'gestao_de_prazo',  l."hard_skills" -> 'Organização'
    ))
  ),
  l."palavras_chave",
  l."pergunta_gerada"
from public."oraculo_lancamento" l
on conflict ("base44_id") do nothing;

-- Confere: deve mostrar 31 leituras (uma por lançamento migrado).
-- select count(*) from public."observacao" where "tipo" = 'leitura';
