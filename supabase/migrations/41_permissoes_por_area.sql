-- ============================================================
-- PORTAL CRC — PERMISSÃO POR ÁREA NO BANCO (migration 41)
--
-- Rode no SQL Editor do Supabase, DEPOIS da migration 40.
--
--
-- O QUE MUDA
--
-- Até a migration 36 só salário e custo operacional dependiam de permissão.
-- Todo o resto dizia "é gestor?" (eh_gestor()), então não dava para criar um
-- substituto que gerencia o POP mas não mexe em colaboradores, nem dar a um
-- agente a permissão de publicar avisos.
--
-- Esta migration troca eh_gestor() por tem_permissao('<chave>') nas políticas
-- de cada área. Sem nenhuma exceção cadastrada, NADA muda: tem_permissao() cai
-- em eh_gestor() por padrão. O efeito só aparece quando alguém registra uma
-- exceção em colaborador_permissao (tela Configurações > Permissões).
--
--
-- COMO FUNCIONA
--
-- Em vez de recriar cada política à mão, lê o que está EM PRODUÇÃO
-- (pg_policies) e reescreve só a chamada: eh_gestor() vira
-- tem_permissao('<chave da área>'). O resto de cada política (condições de
-- dono, ler/inserir/alterar/apagar) fica exatamente como está.
--
-- FICAM FORA, DE PROPÓSITO
--   - permissao e colaborador_permissao: continuam eh_gestor(). Se a política
--     que decide quem edita permissões dependesse de permissão, um gestor que a
--     perdesse sem querer nunca mais conseguiria devolvê-la.
--   - tabelas que não aparecem no mapa: continuam como estão.
--
-- Também troca nos dois gatilhos que tinham a mesma trava:
--   - congelar_campos_de_pontuacao  → corrigir_tratativa_encerrada
--   - proteger_auditoria_replicavel → aprovar_solucao_replicavel
--
-- COMO DESFAZER: a mudança é só trocar o nome da função nas políticas. Para
-- voltar tudo ao "só gestor", troque tem_permissao('<chave>') por eh_gestor()
-- (a conferência no fim lista o que foi alterado).
-- ============================================================


-- ------------------------------------------------------------------
-- 1) DUAS PERMISSÕES NOVAS NO CATÁLOGO
-- ------------------------------------------------------------------
-- Faltava onde encaixar a premiação (ciclos, elegibilidade, bônus) e as
-- configurações gerais do sistema.
insert into public.permissao (chave, modulo, rotulo, descricao, ordem) values
  ('gerenciar_premiacao',     'Premiação',     'Ciclos, elegibilidade e bônus',
     'Cadastrar ciclos trimestrais, exigências de elegibilidade e lançar bônus manual.', 205),
  ('gerenciar_configuracoes', 'Configurações', 'Configurações gerais do sistema',
     'Etapas da jornada, habilidades, tipos de observação, estorno e demais parâmetros.', 85)
on conflict (chave) do update set
  modulo = excluded.modulo, rotulo = excluded.rotulo,
  descricao = excluded.descricao, ordem = excluded.ordem;


-- ------------------------------------------------------------------
-- 2) AS POLÍTICAS
-- ------------------------------------------------------------------
do $$
declare
  mapa jsonb := '{
    "colaborador":               "gerenciar_colaboradores",
    "colaborador_base":          "gerenciar_colaboradores",
    "equipe":                    "gerenciar_colaboradores",

    "tipo_tratativa":            "gerenciar_tipos_tratativa",
    "categoria_tratativa":       "gerenciar_tipos_tratativa",
    "motivo_tratativa":          "gerenciar_tipos_tratativa",

    "etapa_jornada":             "gerenciar_configuracoes",
    "skill_mestre":              "gerenciar_configuracoes",
    "tipo_observacao":           "gerenciar_configuracoes",
    "configuracao":              "gerenciar_configuracoes",
    "config_estorno":            "gerenciar_configuracoes",
    "configuracao_home_office":  "gerenciar_configuracoes",

    "ciclo_trimestral":          "gerenciar_premiacao",
    "elegibilidade_premio":      "gerenciar_premiacao",
    "pontuacao":                 "gerenciar_premiacao",

    "pop":                       "gerenciar_pop",
    "pop_versao":                "gerenciar_pop",
    "pop_leitura":               "gerenciar_pop",

    "escala":                    "gerenciar_escalas",
    "escala_atribuicao":         "gerenciar_escalas",
    "escala_turno":              "gerenciar_escalas",

    "saldo_ferias":              "aprovar_ferias",
    "ciclo_ferias":              "aprovar_ferias",

    "aviso":                     "gerenciar_avisos",

    "pesquisa":                  "gerenciar_pesquisas",
    "resposta_pesquisa":         "ver_respostas_pesquisa",
    "pesquisa_participacao":     "ver_respostas_pesquisa",

    "pdi":                       "ver_pdi_equipe",
    "observacao":                "ver_observacoes_equipe",

    "oraculo_lancamento":        "acessar_oraculo",
    "oraculo_palavra":           "acessar_oraculo",

    "log_auditoria":             "ver_log_auditoria",

    "apuracao":                  "gerenciar_apuracao",
    "apuracao_mapeamento":       "gerenciar_apuracao",

    "distribuicao_tratativa":    "gerenciar_operacao",
    "plano_setorial":            "gerenciar_operacao",
    "lider_tecnico":             "gerenciar_operacao",
    "agente_n2":                 "gerenciar_operacao",

    "permissao_modulo":          "gerenciar_permissoes"
  }'::jsonb;
  r      record;
  chave  text;
  cmd    text;
  troca  text;
begin
  for r in
    select p.tablename, p.policyname, p.qual, p.with_check
    from pg_policies p
    where p.schemaname = 'public'
      and (coalesce(p.qual, '') like '%eh_gestor%' or coalesce(p.with_check, '') like '%eh_gestor%')
  loop
    chave := mapa ->> r.tablename;
    if chave is null then
      continue;   -- fora do mapa: continua como está
    end if;

    troca := format('public.tem_permissao(%L)', chave);
    cmd := format('alter policy %I on public.%I', r.policyname, r.tablename);

    if r.qual is not null then
      cmd := cmd || format(' using (%s)',
        regexp_replace(r.qual, '(public\.)?eh_gestor\(\)', troca, 'g'));
    end if;
    if r.with_check is not null then
      cmd := cmd || format(' with check (%s)',
        regexp_replace(r.with_check, '(public\.)?eh_gestor\(\)', troca, 'g'));
    end if;

    execute cmd;
    raise notice 'política % em % -> %', r.policyname, r.tablename, chave;
  end loop;
end $$;


-- ------------------------------------------------------------------
-- 3) OS DOIS GATILHOS
-- ------------------------------------------------------------------
do $$
declare
  def text;
begin
  select pg_get_functiondef('public.congelar_campos_de_pontuacao'::regproc) into def;
  execute regexp_replace(def, '(public\.)?eh_gestor\(\)',
                         'public.tem_permissao(''corrigir_tratativa_encerrada'')', 'g');

  select pg_get_functiondef('public.proteger_auditoria_replicavel'::regproc) into def;
  execute regexp_replace(def, '(public\.)?eh_gestor\(\)',
                         'public.tem_permissao(''aprovar_solucao_replicavel'')', 'g');
end $$;


-- ------------------------------------------------------------------
-- 4) TRAVA CONTRA ESCALADA: QUEM GERENCIA COLABORADORES NÃO SE PROMOVE
-- ------------------------------------------------------------------
-- Com gerenciar_colaboradores, uma pessoa que não é gestor consegue editar
-- linhas de colaborador. Sem esta trava ela poderia mudar o PRÓPRIO papel para
-- gestor, ou trocar um e-mail — e o sistema reconhece quem está logado pelo
-- e-mail (meu_colaborador_id()), então mexer em e-mail é mexer em identidade.
--
-- Só um gestor de verdade (papel) muda papel, e-mail, vínculo com a conta e a
-- marca de Facilitador Interno, e só ele cria alguém que não seja agente.
create or replace function public.proteger_papel_do_colaborador()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or public.eh_gestor() then
    return new;   -- service_role e gestor
  end if;

  if tg_op = 'INSERT' then
    if new.papel is not null and new.papel <> 'agente' then
      raise exception 'Só um gestor pode cadastrar alguém com o papel "%".', new.papel
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;

  if new.papel                  is distinct from old.papel
     or new.email               is distinct from old.email
     or new.user_id             is distinct from old.user_id
     or new.is_facilitador_interno is distinct from old.is_facilitador_interno
     or new.fi_expiracao        is distinct from old.fi_expiracao then
    raise exception 'Papel, e-mail, vínculo de conta e Facilitador Interno só podem ser alterados por um gestor.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end $$;

drop trigger if exists ac_protege_papel_colaborador on public.colaborador_base;

create trigger ac_protege_papel_colaborador
  before insert or update on public.colaborador_base
  for each row
  execute function public.proteger_papel_do_colaborador();


-- ------------------------------------------------------------------
-- CONFERÊNCIA
-- ------------------------------------------------------------------
-- 1) O que ainda depende só de "ser gestor". Esperado: colaborador_permissao
--    e permissao (de propósito) e, no máximo, tabelas que não estão no mapa.
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and (coalesce(qual, '') like '%eh_gestor%' or coalesce(with_check, '') like '%eh_gestor%')
order by tablename, policyname;

-- 2) Quantas políticas passaram a usar cada permissão.
select
  substring(coalesce(qual, '') || ' ' || coalesce(with_check, '') from 'tem_permissao\(''([a-z_]+)''\)') as permissao,
  count(*) as politicas,
  string_agg(distinct tablename, ', ') as tabelas
from pg_policies
where schemaname = 'public'
  and (coalesce(qual, '') like '%tem_permissao%' or coalesce(with_check, '') like '%tem_permissao%')
group by 1
order by 1;
