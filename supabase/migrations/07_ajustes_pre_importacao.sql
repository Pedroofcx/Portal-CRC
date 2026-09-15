-- ============================================================
-- PORTAL CRC — AJUSTES ANTES DE REIMPORTAR
--
-- Rode no SQL Editor, depois rode o importador de novo.
-- Resolve as 3 tabelas que falharam na primeira importação.
-- ============================================================


-- ------------------------------------------------------------------
-- 1) OS VALORES QUE A OPERAÇÃO USA DE VERDADE
-- ------------------------------------------------------------------
-- O schema do Base44 declarava listas fechadas de valores, mas o Base44 não
-- as aplicava — eram sugestão, não regra. O Postgres aplica, e por isso a
-- divergência só apareceu agora, na importação.
--
-- Estes valores estão nos dados reais e são legítimos do negócio. Quem estava
-- desatualizado era o schema, não a operação:
--     tipo_tratativa : 'administrativas' (5 registros), 'procon' (1)
--     plano_cliente  : 'Essencial' (2)
--     categoria      : 'ranking' (1)
--
-- Os arquivos em base44/entities/ já foram atualizados, então uma instalação
-- nova nasce correta. Este bloco corrige o banco que já existe.

-- Os nomes das restrições foram gerados pelo Postgres, não por nós. Em vez de
-- adivinhá-los, este bloco procura toda restrição CHECK que mencione a coluna
-- e a remove — depois cria a versão correta. Adivinhar o nome errado deixaria
-- a restrição antiga de pé, e a importação falharia de novo.

do $$
declare
  alvo record;
begin
  for alvo in
    select c.conname, c.conrelid::regclass::text as tabela
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and c.contype = 'c'
      and (
        (t.relname = 'tratativa_base' and pg_get_constraintdef(c.oid) like '%tipo_tratativa%') or
        (t.relname = 'tratativa_base' and pg_get_constraintdef(c.oid) like '%plano_cliente%')  or
        (t.relname = 'configuracao'   and pg_get_constraintdef(c.oid) like '%categoria%')
      )
  loop
    execute format('alter table %s drop constraint %I', alvo.tabela, alvo.conname);
    raise notice 'removida: % em %', alvo.conname, alvo.tabela;
  end loop;
end $$;

alter table public.tratativa_base add constraint tratativa_tipo_tratativa_check
  check ("tipo_tratativa" is null or "tipo_tratativa" in
    ('reclamacao_interna', 'reclame_aqui', 'google_meu_negocio', 'contestacao',
     'administrativas', 'procon'));

alter table public.tratativa_base add constraint tratativa_plano_cliente_check
  check ("plano_cliente" is null or "plano_cliente" in
    ('Bronze', 'Prata', 'Ouro', 'Platina', 'ClickNotas', 'Outros', 'Essencial'));

alter table public.configuracao add constraint configuracao_categoria_check
  check ("categoria" is null or "categoria" in
    ('geral', 'metas', 'categorias', 'sla', 'governanca', 'ranking'));

-- Nota: distribuicao_tratativa também tem uma coluna tipo_tratativa, com lista
-- própria e diferente. Os dados dela conferem com o schema, então fica intacta.

-- ------------------------------------------------------------------
-- 2) O CADASTRO PROVISÓRIO DE GESTOR SAI DE CENA
-- ------------------------------------------------------------------
-- No começo foi preciso criar um colaborador à mão, porque só gestor grava em
-- colaborador e não existia nenhum. Esse cadastro provisório tem o mesmo
-- e-mail do cadastro verdadeiro que vem do Base44 — e o índice único de
-- e-mail, criado na Fase 03, barrou a importação dos 9 colaboradores.
--
-- Apaga só o provisório: base44_id nulo indica registro que não veio da
-- importação. O agente de teste também tem base44_id nulo, por isso o filtro
-- por e-mail.

delete from public.colaborador_base
where base44_id is null
  and lower(email) = lower('pedro.soares@clickdigital.com.br');


-- Confere o que sobrou antes de reimportar.
select nome_completo, email, papel,
       case when base44_id is null then 'criado à mão' else 'do Base44' end as origem
from public.colaborador_base
order by email;
