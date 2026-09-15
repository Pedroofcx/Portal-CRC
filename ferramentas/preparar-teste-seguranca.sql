-- ============================================================
-- PORTAL CRC — PREPARAR O TESTE DE SEGURANÇA
--
-- Rode no SQL Editor DEPOIS de criar o usuário de teste em
-- Authentication > Users (marcando "Auto Confirm User").
--
-- O que ele faz:
--   1. põe um salário conhecido no SEU cadastro de gestor
--   2. cria um colaborador com papel 'agente' para o usuário de teste
--
-- Sem o passo 1 não há o que proteger: um salário nulo pareceria protegido
-- mesmo com a segurança desligada, e o teste passaria por engano.
-- ============================================================

-- 1) Salário conhecido no cadastro do gestor. É este valor que o agente
--    NÃO pode conseguir enxergar.
update public.colaborador_base
set salario = 12345.67
where lower(email) = lower('pedro.soares@clickdigital.com.br');

-- 2) Cadastro do agente de teste.
--    O e-mail tem que ser IDÊNTICO ao criado em Authentication > Users.
insert into public.colaborador_base (
  nome_completo, email, cargo_atual, papel, ativo, data_admissao, salario
)
values (
  'Agente de Teste',
  'teste.agente@clickdigital.com.br',   -- <<< troque se usou outro e-mail
  'Agente',
  'agente',
  true,
  current_date,
  3000.00
)
on conflict do nothing;

-- ATENÇÃO: o "on conflict do nothing" acima só funciona se existir restrição
-- de unicidade no e-mail. Rode o 06_email_unico.sql antes de repetir este
-- arquivo, ou cada execução cria um cadastro duplicado do agente.

-- Confere: devem aparecer duas linhas, uma gestor e uma agente.
select nome_completo, email, papel, salario
from public.colaborador_base
order by papel;

-- ============================================================
-- 3) DADOS PARA OS TESTES QUE ESTAVAM INCONCLUSIVOS
--
-- Sem uma tratativa no banco, o teste de custo operacional lia zero linhas
-- e "passava" sem ter testado nada. Sem um registro de auditoria, o teste de
-- exclusão era pulado. Passar por falta de alvo não é passar.
-- ============================================================

insert into public.tratativa_base (
  id_interno, link_zendesk, link_intranet, id_base_cliente, nome_cliente,
  tipo_tratativa, prioridade, status, custo_operacional_reais
)
values (
  'TRT-TESTE-0001',
  'https://exemplo.zendesk.com/tickets/1',
  'https://intranet.exemplo/1',
  'CLI-TESTE',
  'Cliente de Teste',
  'reclamacao_interna',
  'media',
  'encerrada',
  987.65                      -- valor-alvo: o agente NÃO pode enxergar
)
on conflict do nothing;

insert into public.log_auditoria (acao, modulo, usuario_id, usuario_nome)
values ('login', 'Teste', 'sistema', 'Preparacao do teste')
on conflict do nothing;

-- Confere os alvos do teste.
select 'tratativa' as onde, count(*) as registros,
       count(*) filter (where custo_operacional_reais is not null) as com_custo
from public.tratativa_base
union all
select 'log_auditoria', count(*), count(*) from public.log_auditoria;
