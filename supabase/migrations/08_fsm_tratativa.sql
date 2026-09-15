-- ============================================================
-- PORTAL CRC — MÁQUINA DE ESTADOS DA TRATATIVA (Fase 04, item 1)
--
-- Rode no SQL Editor do Supabase.
--
-- O QUE MUDA
--
-- Até agora, a ordem dos estados de uma tratativa existia só no navegador,
-- no objeto FSM_TRANSITIONS de TratativaDetalhe.jsx. A tela oferecia apenas
-- os botões permitidos — mas a regra morava no mesmo lugar que o usuário
-- controla. Pelo console, qualquer pessoa logada conseguia:
--
--     db.entities.Tratativa.update(id, { status: 'encerrada' })
--
-- pulando de "registrada" direto para "encerrada", sem passar por nenhuma
-- etapa, sem registrar tempo e sem gerar histórico. O indicador de SLA e a
-- pontuação saem desse caminho.
--
-- Agora a regra vive no banco. A tela continua mostrando só o que é
-- permitido — isso é conveniência. O banco RECUSA o resto — isso é garantia.
--
--
-- O MAPA AQUI É MAIOR QUE O DO CÓDIGO, E DE PROPÓSITO
--
-- O FSM_TRANSITIONS declarado no JavaScript está incompleto: congelamento de
-- SLA e exclusão mudam o status por fora dele, em handlers próprios. Um mapa
-- fiel só ao que estava declarado bloquearia operações que o sistema faz
-- todo dia. As transições abaixo foram levantadas de TODOS os pontos do
-- código que gravam status, não apenas do objeto declarado.
-- ============================================================

create or replace function public.transicao_de_status_permitida(
  anterior text,
  novo     text
) returns boolean
language sql
immutable
as $$
  select case
    -- Primeiro registro: só pode ser iniciada (ou excluída).
    when anterior = 'registrada' then
      novo in ('tratativa_iniciada', 'excluida')

    -- Em atendimento: pode avançar, travar por dependência, congelar SLA
    -- (contestações) ou encerrar.
    when anterior in ('tratativa_iniciada', 'em_andamento', 'dependencia_externa') then
      novo in ('tratativa_iniciada', 'em_andamento', 'dependencia_externa',
               'aguardando_financeiro', 'encerrada',
               'aguardando_confirmacao_reabertura', 'excluida')

    -- SLA congelado aguardando o financeiro: volta a andar ou encerra.
    when anterior = 'aguardando_financeiro' then
      novo in ('em_andamento', 'dependencia_externa', 'encerrada', 'excluida')

    -- Encerrada: só sai para o período de confirmação de reabertura.
    when anterior = 'encerrada' then
      novo in ('aguardando_confirmacao_reabertura', 'excluida')

    -- Janela de 7 dias: confirma sem reabertura, ou o cliente reabriu.
    when anterior = 'aguardando_confirmacao_reabertura' then
      novo in ('encerrada', 'em_andamento', 'excluida')

    -- Excluída é terminal. Reverter exige o SQL Editor, de propósito:
    -- desfazer uma exclusão é decisão de gestão, não clique de tela.
    when anterior = 'excluida' then
      false

    else false
  end
$$;


create or replace function public.validar_transicao_tratativa()
returns trigger
language plpgsql
as $$
begin
  -- Status não mudou: nada a validar.
  if new.status is not distinct from old.status then
    return new;
  end if;

  /*
   * O SQL Editor e o importador rodam como service_role, sem usuário
   * autenticado. Precisam passar: a importação grava o status histórico de
   * cada tratativa, e a correção de um dado errado não pode depender de
   * percorrer a máquina de estados de novo.
   */
  if auth.uid() is null then
    return new;
  end if;

  if not public.transicao_de_status_permitida(old.status, new.status) then
    raise exception
      'Transição de status não permitida: % → %. A tratativa % está em "%" e não pode ir direto para "%".',
      old.status, new.status, coalesce(new.id_interno, new.id::text), old.status, new.status
      using errcode = 'check_violation';
  end if;

  -- O servidor carimba a data da alteração. Antes vinha do navegador, que
  -- pode estar com o relógio errado ou ser editado por quem envia.
  new.updated_date := now();

  return new;
end $$;


drop trigger if exists valida_transicao_tratativa on public.tratativa_base;

create trigger valida_transicao_tratativa
  before update on public.tratativa_base
  for each row
  execute function public.validar_transicao_tratativa();


-- ------------------------------------------------------------------
-- CONFERÊNCIA
-- ------------------------------------------------------------------
-- Mostra a matriz completa. Leia antes de sair: é a regra que passa a valer.
select
  anterior,
  string_agg(novo, ', ' order by novo) filter (
    where public.transicao_de_status_permitida(anterior, novo)
  ) as pode_ir_para
from
  unnest(array['registrada','tratativa_iniciada','em_andamento','dependencia_externa',
               'aguardando_financeiro','encerrada','aguardando_confirmacao_reabertura',
               'excluida']) as anterior,
  unnest(array['registrada','tratativa_iniciada','em_andamento','dependencia_externa',
               'aguardando_financeiro','encerrada','aguardando_confirmacao_reabertura',
               'excluida']) as novo
group by anterior
order by anterior;
