-- ============================================================
-- PORTAL CRC — CRIAR O PRIMEIRO GESTOR
--
-- Rode no SQL Editor do Supabase DEPOIS do 04 e do 05.
--
-- Por que isto é preciso: as regras dizem que só gestor grava em colaborador.
-- Só que ainda não existe nenhum gestor, então ninguém conseguiria criar o
-- primeiro. O SQL Editor roda como administrador do banco e passa por cima
-- das regras — é a única porta para esse primeiro cadastro.
--
-- IMPORTANTE: o e-mail aqui tem que ser EXATAMENTE o mesmo que você usou em
-- Authentication > Users. É por ele que o sistema descobre que você é gestor.
-- ============================================================

insert into public.colaborador_base (
  nome_completo,
  email,
  cargo_atual,
  papel,
  ativo,
  data_admissao
)
values (
  'Pedro Soares',                     -- <<< seu nome completo
  'pedro.soares@clickdigital.com.br', -- <<< o MESMO e-mail do login
  'Gestor',
  'gestor',
  true,
  current_date
)
on conflict do nothing;

-- Confere se deu certo. Deve devolver uma linha com papel = gestor.
select nome_completo, email, papel, ativo
from public.colaborador_base
where papel = 'gestor';
