-- ============================================================
-- PORTAL CRC — FOTO DE PERFIL PELO PRÓPRIO USUÁRIO (migration 37)
--
-- Rode no SQL Editor do Supabase.
--
-- Hoje só o gestor altera a tabela colaborador (policy colaborador_alterar).
-- Abrir UPDATE para o próprio colaborador deixaria ele mudar também papel,
-- salário e e-mail. Esta função muda UMA coluna — foto_url — e só da linha de
-- quem está logado. O arquivo em si sobe pelo bucket "arquivos" (migration 27).
-- ============================================================

create or replace function public.atualizar_minha_foto(nova_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  meu_id text := public.meu_colaborador_id();
begin
  if meu_id is null then
    raise exception 'Você precisa ser um colaborador ativo para trocar a foto.';
  end if;

  -- Só aceita endereço do nosso bucket: impede apontar a foto para um site
  -- externo (rastreamento) ou para algo que não é imagem enviada pelo Portal.
  if nova_url is not null
     and nova_url <> ''
     and position('/storage/v1/object/public/arquivos/' in nova_url) = 0 then
    raise exception 'Endereço de foto inválido.';
  end if;

  update public.colaborador_base
     set foto_url = nullif(nova_url, ''),
         atualizado_em = now()
   where id::text = meu_id;
end $$;

revoke execute on function public.atualizar_minha_foto(text) from public, anon;
grant  execute on function public.atualizar_minha_foto(text) to authenticated;
