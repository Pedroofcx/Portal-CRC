-- ============================================================
-- PORTAL CRC — E-MAIL ÚNICO EM COLABORADOR
--
-- Rode no SQL Editor do Supabase.
--
-- POR QUE ISTO É DE SEGURANÇA, NÃO DE ARRUMAÇÃO
--
-- papel_atual() descobre quem é o usuário assim:
--     select papel from colaborador_base
--     where lower(email) = lower(auth.jwt() ->> 'email')
--     limit 1
--
-- Com dois cadastros para o mesmo e-mail, o "limit 1" escolhe um ao acaso.
-- Se os papéis diferirem, a mesma pessoa pode ser gestor numa consulta e
-- agente na seguinte — e toda a segurança das Fases 03 se apoia nesse campo.
--
-- O e-mail também é a chave que liga o login ao cadastro, e vai ser a chave
-- de conferência quando os dados do Base44 forem importados. Duplicata aqui
-- vira registro órfão ou vínculo errado depois.
--
-- MOMENTO CERTO: agora, com o banco praticamente vazio. Fazer isso depois da
-- importação significaria decidir, caso a caso, qual cadastro é o verdadeiro.
-- ============================================================

-- 1) Quem está duplicado? Leia ANTES de seguir.
select lower(email) as email, count(*) as cadastros,
       string_agg(nome_completo || ' [' || coalesce(papel,'sem papel') || ']', ' | ') as linhas
from public.colaborador_base
group by lower(email)
having count(*) > 1;

-- 2) Mantém o cadastro mais antigo de cada e-mail e remove os repetidos.
--    Seguro enquanto não há dados reais. Depois da importação, NÃO rode isto
--    sem antes decidir manualmente qual cadastro fica.
delete from public.colaborador_base c
where exists (
  select 1 from public.colaborador_base mais_antigo
  where lower(mais_antigo.email) = lower(c.email)
    and mais_antigo.criado_em < c.criado_em
);

-- 3) Impede que volte a acontecer — inclusive por diferença de maiúsculas,
--    porque "Pedro@x.com" e "pedro@x.com" são a mesma pessoa no login.
create unique index if not exists ux_colaborador_email
  on public.colaborador_base (lower(email));

-- 4) Confere: a primeira consulta deve voltar vazia agora.
select lower(email) as email, count(*) as cadastros
from public.colaborador_base
group by lower(email)
having count(*) > 1;

select nome_completo, email, papel from public.colaborador_base order by papel, email;
