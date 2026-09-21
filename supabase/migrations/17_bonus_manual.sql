-- ============================================================
-- PORTAL CRC — ONDE GRAVAR O BÔNUS MANUAL (migration 17)
--
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
--
--
-- O PROBLEMA
--
-- O ranking e o "Meu ciclo" somam o bônus manual procurando, na tabela
-- pontuacao, os registros com tipo = 'bonus_manual' do ciclo (ciclo_id).
-- Mas a tabela não tinha essas colunas: o bônus nunca teve onde ser gravado,
-- e não havia tela para lançar.
--
--
-- O QUE ISTO FAZ
--
-- Acrescenta à pontuacao o que um lançamento de bônus precisa:
--   tipo              'bonus_manual' (vazio nos registros antigos)
--   ciclo_id          o ciclo a que o bônus vale
--   descricao         o motivo, escrito pelo gestor
--   lancado_por_id    quem lançou
--   lancado_por_nome
-- Os pontos ficam em total_pontos, como o ranking já lê.
--
-- Escrita em pontuacao continua só do gestor (políticas da migration 13).
-- A fonte destas colunas é base44/entities/Pontuacao.jsonc — o
-- 01_tabelas.sql gerado já as tem, para quem montar o banco do zero.
-- ============================================================

alter table public."pontuacao" add column if not exists "tipo" text;
alter table public."pontuacao" add column if not exists "ciclo_id" text;
alter table public."pontuacao" add column if not exists "descricao" text;
alter table public."pontuacao" add column if not exists "lancado_por_id" text;
alter table public."pontuacao" add column if not exists "lancado_por_nome" text;

alter table public."pontuacao" drop constraint if exists "pontuacao_tipo_check";
alter table public."pontuacao" add constraint "pontuacao_tipo_check"
  check ("tipo" is null or "tipo" in ('bonus_manual'));

-- Bônus é sempre positivo e sempre tem ciclo, pessoa e motivo. Para
-- desfazer um bônus lançado errado, apaga-se o lançamento.
alter table public."pontuacao" drop constraint if exists "pontuacao_bonus_completo";
alter table public."pontuacao" add constraint "pontuacao_bonus_completo"
  check ("tipo" is distinct from 'bonus_manual' or (
    "total_pontos" > 0
    and "ciclo_id" is not null
    and "colaborador_id" is not null
    and coalesce(trim("descricao"), '') <> ''
  ));

create index if not exists "ix_pontuacao_ciclo_id" on public."pontuacao" ("ciclo_id");
create index if not exists "ix_pontuacao_lancado_por_id" on public."pontuacao" ("lancado_por_id");

-- A API (PostgREST) guarda a estrutura das tabelas em cache: sem isto, as
-- colunas novas podem levar alguns minutos para aparecer.
notify pgrst, 'reload schema';


-- ------------------------------------------------------------
-- CONFERÊNCIA — o resultado esperado: 5 linhas, uma por coluna nova
-- ------------------------------------------------------------
select column_name as coluna, data_type as tipo
from information_schema.columns
where table_schema = 'public' and table_name = 'pontuacao'
  and column_name in ('tipo', 'ciclo_id', 'descricao', 'lancado_por_id', 'lancado_por_nome')
order by column_name;
