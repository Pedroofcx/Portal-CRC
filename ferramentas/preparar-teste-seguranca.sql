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

-- Confere: devem aparecer duas linhas, uma gestor e uma agente.
select nome_completo, email, papel, salario
from public.colaborador_base
order by papel;
