-- ============================================================
-- PORTAL CRC — ENCERRAR SOZINHAS AS RECLAMAÇÕES INTERNAS DEPOIS DOS 7 DIAS (migration 55)
--
-- Rode no SQL Editor do Supabase, DEPOIS da migration 54.
--
-- POR QUE
--   A reclamação interna encerrada fica em "aguardando confirmação de
--   reabertura" por 7 dias. Passado o prazo, ninguém a movia para
--   "encerrada": dependia de alguém clicar. Agora o sistema encerra sozinho.
--
-- O QUE ENTRA
--   encerrar_prazo_reabertura(): pega as reclamações internas em "aguardando
--   confirmação" cujo prazo de 7 dias passou e as move para "encerrada":
--     - se o mesmo cliente (id da base) abriu outra tratativa no prazo, marca
--       "cliente reabriu"; se não, "sem reabertura" (a mesma conta da
--       pontuação);
--     - registra no histórico da tratativa, como "Sistema", com a marca
--       "automatica": é isso que a tela inicial e a tratativa usam para avisar;
--     - devolve quantas foram encerradas. É segura de rodar quantas vezes
--       quiser: só mexe no que já venceu.
--   Quem roda: o agendador do banco (pg_cron, de hora em hora, se a extensão
--   estiver disponível) e o próprio Portal, quando alguém o abre.
--
-- COMO DESFAZER
--   select cron.unschedule('encerrar-prazo-reabertura');   -- se o agendador foi criado
--   drop function public.encerrar_prazo_reabertura();
-- ============================================================

create or replace function public.encerrar_prazo_reabertura()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tratativa_base%rowtype;
  reabriu boolean;
  n integer := 0;
  agora timestamptz := now();
begin
  for t in
    select * from public.tratativa_base
    where status = 'aguardando_confirmacao_reabertura'
      and tipo_tratativa = 'reclamacao_interna'
      and data_encerramento is not null
      and data_encerramento + interval '7 days' <= agora
      and not coalesce(excluida, false)
    for update skip locked
  loop
    reabriu := t.status_reabertura = 'cliente_reabriu' or exists (
      select 1 from public.tratativa_base o
      where o.id <> t.id
        and not coalesce(o.excluida, false)
        and btrim(coalesce(t.id_base_cliente, '')) <> ''
        and btrim(coalesce(o.id_base_cliente, '')) = btrim(t.id_base_cliente)
        and o.data_registro >  t.data_encerramento
        and o.data_registro <= t.data_encerramento + interval '7 days'
    );

    update public.tratativa_base set
      status = 'encerrada',
      status_reabertura = case when reabriu then 'cliente_reabriu' else 'nao_houve' end,
      houve_reabertura = reabriu,
      data_confirmacao_reabertura = agora,
      historico_estados = coalesce(historico_estados, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'estado_anterior', t.status,
        'estado_novo', 'encerrada',
        'data_mudanca', agora,
        'usuario', 'Sistema',
        'automatica', true,
        'observacao', case when reabriu
          then 'Prazo de 7 dias vencido: o cliente reabriu. Encerrada automaticamente.'
          else 'Prazo de 7 dias vencido sem reabertura. Encerrada automaticamente.' end
      ))
    where id = t.id;

    n := n + 1;
  end loop;
  return n;
end $$;

revoke execute on function public.encerrar_prazo_reabertura() from public, anon;
grant  execute on function public.encerrar_prazo_reabertura() to authenticated;


-- Agendador do banco: de hora em hora. Se o pg_cron não puder ser ligado aqui,
-- o Portal roda a função sempre que alguém o abre (e a cada 30 minutos aberto).
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron indisponível (%). O Portal roda a função ao ser aberto.', sqlerrm;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule(jobid) from cron.job where jobname = 'encerrar-prazo-reabertura';
      perform cron.schedule('encerrar-prazo-reabertura', '5 * * * *', 'select public.encerrar_prazo_reabertura()');
    exception when others then
      raise notice 'Não consegui agendar no pg_cron (%). O Portal roda a função ao ser aberto.', sqlerrm;
    end;
  end if;
end $$;


-- ---------- conferência ----------
-- A função existe? O agendador do banco está ligado? (Se não estiver, não é
-- problema: o Portal roda a função ao ser aberto.)
select 'função' as item, count(*)::text as ok
from pg_proc where proname = 'encerrar_prazo_reabertura' and pronamespace = 'public'::regnamespace
union all
select 'agendador (pg_cron)',
  case when exists (select 1 from pg_extension where extname = 'pg_cron')
       then 'ligado (confira em cron.job)' else 'não ligado: o Portal roda a função ao ser aberto' end;
