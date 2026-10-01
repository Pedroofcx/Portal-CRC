-- =====================================================================
-- 30 — Nove tabelas que só o gestor deveria poder escrever
-- =====================================================================
-- Fase 2 do plano de blindagem (01/10/2026), com auditoria_rls() (migration
-- 29): estas tabelas tinham escrita (insert/update/delete) liberada pra
-- qualquer colaborador ativo (eh_colaborador()), mas a tela só deixa o
-- GESTOR criar/editar — ou seja, qualquer agente conseguia, pelo console
-- do navegador, criar/alterar/apagar aviso, pesquisa, plano setorial,
-- escala, distribuição de tratativas, saldo de férias e dados do Oráculo
-- de qualquer pessoa, sem passar pela tela.
--
-- A leitura continua igual em quase todas (é informação que o time
-- legitimamente usa: ver avisos, ver a própria escala, responder
-- pesquisa). As exceções são oraculo_lancamento e oraculo_palavra — o
-- Oráculo é ferramenta exclusiva da gestão (ComoFunciona, nav), sem
-- nenhum caso de uso pra um agente ler.
--
-- log_auditoria: só a leitura fica restrita a gestor (é o que a tela
-- Configurações → Logs, já travada, mostra). A inserção continua aberta
-- a colaborador — é o próprio agente que gera o registro ao usar Apoio N2
-- e Líder Técnico.
--
-- Rodar uma vez no SQL Editor. Rodar de novo não duplica nada.
-- =====================================================================

do $$
declare
  tabela text;
  tabelas_so_leitura_colaborador text[] := array[
    'aviso', 'pesquisa', 'plano_setorial', 'escala_atribuicao',
    'escala_turno', 'distribuicao_tratativa', 'saldo_ferias'
  ];
begin
  foreach tabela in array tabelas_so_leitura_colaborador loop
    execute format('drop policy if exists %I on public.%I', tabela || '_inserir', tabela);
    execute format('drop policy if exists %I on public.%I', tabela || '_alterar', tabela);
    execute format('drop policy if exists %I on public.%I', tabela || '_apagar', tabela);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.eh_gestor())', tabela || '_inserir', tabela);
    execute format('create policy %I on public.%I for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor())', tabela || '_alterar', tabela);
    execute format('create policy %I on public.%I for delete to authenticated using (public.eh_gestor())', tabela || '_apagar', tabela);
  end loop;
end $$;

-- Oráculo: ferramenta inteira é exclusiva da gestão — leitura e escrita.
drop policy if exists "oraculo_lancamento_ler"     on public."oraculo_lancamento";
drop policy if exists "oraculo_lancamento_inserir" on public."oraculo_lancamento";
drop policy if exists "oraculo_lancamento_alterar" on public."oraculo_lancamento";
drop policy if exists "oraculo_lancamento_apagar"  on public."oraculo_lancamento";
create policy "oraculo_lancamento_ler"      on public."oraculo_lancamento" for select to authenticated using (public.eh_gestor());
create policy "oraculo_lancamento_inserir"  on public."oraculo_lancamento" for insert to authenticated with check (public.eh_gestor());
create policy "oraculo_lancamento_alterar"  on public."oraculo_lancamento" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "oraculo_lancamento_apagar"   on public."oraculo_lancamento" for delete to authenticated using (public.eh_gestor());

drop policy if exists "oraculo_palavra_ler"     on public."oraculo_palavra";
drop policy if exists "oraculo_palavra_inserir" on public."oraculo_palavra";
drop policy if exists "oraculo_palavra_alterar" on public."oraculo_palavra";
drop policy if exists "oraculo_palavra_apagar"  on public."oraculo_palavra";
create policy "oraculo_palavra_ler"      on public."oraculo_palavra" for select to authenticated using (public.eh_gestor());
create policy "oraculo_palavra_inserir"  on public."oraculo_palavra" for insert to authenticated with check (public.eh_gestor());
create policy "oraculo_palavra_alterar"  on public."oraculo_palavra" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "oraculo_palavra_apagar"   on public."oraculo_palavra" for delete to authenticated using (public.eh_gestor());

-- log_auditoria: só a leitura vira exclusiva de gestor. Inserção continua
-- aberta — o próprio agente gera o log ao usar Apoio N2 / Líder Técnico.
drop policy if exists "log_auditoria_ler" on public."log_auditoria";
create policy "log_auditoria_ler" on public."log_auditoria" for select to authenticated using (public.eh_gestor());

-- Confere: todas devem aparecer com escrever=gestor agora (exceto
-- log_auditoria, que só restringe a leitura).
select tabela, operacao, usa_eh_gestor, usa_eh_colaborador
from public.auditoria_rls()
where tabela in (
  'aviso','pesquisa','plano_setorial','escala_atribuicao','escala_turno',
  'distribuicao_tratativa','saldo_ferias','oraculo_lancamento','oraculo_palavra','log_auditoria'
)
order by tabela, operacao;
