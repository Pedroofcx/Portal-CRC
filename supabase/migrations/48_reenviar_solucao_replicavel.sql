-- ============================================================
-- PORTAL CRC — AGENTE EDITA E REENVIA A SOLUÇÃO REPLICÁVEL CONTESTADA (migration 48)
--
-- Rode no SQL Editor do Supabase, DEPOIS da migration 47.
--
-- POR QUE
--   Quando o gestor contesta uma solução replicável, o meio ponto não conta e
--   o agente só via o parecer. Agora o agente pode editar a solução e mandar
--   de novo: ela volta para "pendente" e o gestor decide outra vez. Se for
--   aprovada, o +0,5 entra na pontuação (a conta do ponto não mudou: ela já só
--   conta solução aprovada).
--
-- O QUE ENTRA
--   reenviar_solucao_replicavel(p_tratativa_id, p_descricao): só quem atendeu a
--   tratativa chama, só vale para solução CONTESTADA e exige o texto. Grava a
--   solução nova, volta a análise para pendente (o parecer anterior fica, para o
--   gestor ver o que faltava) e registra no histórico da tratativa.
--
--   A trava que impedia o agente de mexer na análise continua valendo para
--   todo o resto: a única exceção é o reenvio feito por esta função.
--
-- COMO DESFAZER
--   drop function public.reenviar_solucao_replicavel(uuid, text);
--   e rodar de novo a migration 41 (restaura a função da trava).
-- ============================================================

create or replace function public.proteger_auditoria_replicavel()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or public.tem_permissao('aprovar_solucao_replicavel') then
    return new;   -- service_role (importador) e quem aprova passam
  end if;

  -- O reenvio da solução contestada (função reenviar_solucao_replicavel)
  -- avisa a trava por uma marca que só vale dentro da própria transação.
  if current_setting('portal.reenvio_replicavel', true) = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.solucao_replicavel_auditada          := false;
    new.solucao_replicavel_valida            := null;
    new.solucao_replicavel_parecer           := null;
    new.solucao_replicavel_auditada_por_nome := null;
    new.solucao_replicavel_auditada_em       := null;
  else
    new.solucao_replicavel_auditada          := old.solucao_replicavel_auditada;
    new.solucao_replicavel_valida            := old.solucao_replicavel_valida;
    new.solucao_replicavel_parecer           := old.solucao_replicavel_parecer;
    new.solucao_replicavel_auditada_por_nome := old.solucao_replicavel_auditada_por_nome;
    new.solucao_replicavel_auditada_em       := old.solucao_replicavel_auditada_em;
  end if;
  return new;
end $$;


create or replace function public.reenviar_solucao_replicavel(p_tratativa_id uuid, p_descricao text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tratativa_base%rowtype;
  texto text := btrim(coalesce(p_descricao, ''));
begin
  select * into t from public.tratativa_base where id = p_tratativa_id;
  if not found then
    raise exception 'Tratativa não encontrada.';
  end if;
  if t.agente_responsavel_id is distinct from public.meu_colaborador_id() then
    raise exception 'Só quem atendeu a tratativa pode reenviar a solução.' using errcode = 'insufficient_privilege';
  end if;
  if not (coalesce(t.solucao_replicavel, false)
          and coalesce(t.solucao_replicavel_auditada, false)
          and t.solucao_replicavel_valida is false) then
    raise exception 'Só uma solução replicável contestada pode ser reenviada.';
  end if;
  if texto = '' then
    raise exception 'Escreva a solução antes de reenviar.';
  end if;

  perform set_config('portal.reenvio_replicavel', 'on', true);

  update public.tratativa_base set
    descricao_solucao = texto,
    solucao_replicavel_auditada = false,
    solucao_replicavel_valida = null,
    historico_estados = coalesce(historico_estados, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'estado_anterior', status,
      'estado_novo', status,
      'data_mudanca', now(),
      'usuario', (select c.nome_completo from public.colaborador c where c.id::text = public.meu_colaborador_id()),
      'observacao', 'Solução replicável editada e reenviada para nova análise'
    ))
  where id = p_tratativa_id;

  perform set_config('portal.reenvio_replicavel', 'off', true);
end $$;

revoke execute on function public.reenviar_solucao_replicavel(uuid, text) from public, anon;
grant  execute on function public.reenviar_solucao_replicavel(uuid, text) to authenticated;


-- ---------- conferência ----------
-- Deve listar a função nova.
select proname::text as funcao
from pg_proc
where proname = 'reenviar_solucao_replicavel' and pronamespace = 'public'::regnamespace;
