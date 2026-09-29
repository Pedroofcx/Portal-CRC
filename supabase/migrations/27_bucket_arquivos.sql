-- =====================================================================
-- 27 — Bucket "arquivos" e permissão de upload
-- =====================================================================
-- O upload de foto do colaborador (db.integrations.Core.UploadFile) grava
-- no bucket "arquivos" do Storage. Ele nunca chegou a existir neste
-- projeto — todo upload falhava, silenciosamente até o toast de erro.
--
-- O bucket em si foi criado à parte (Storage API, não dá para criar bucket
-- por SQL comum). Este script só garante a política de RLS que faltava:
-- sem ela, mesmo com o bucket existindo, o Postgres recusa todo INSERT em
-- storage.objects ("new row violates row-level security policy").
--
-- Rodar uma vez no SQL Editor. Rodar de novo não duplica nada.
-- =====================================================================

drop policy if exists "arquivos_upload_autenticado" on storage.objects;
drop policy if exists "arquivos_leitura_publica" on storage.objects;

-- Qualquer pessoa logada pode enviar arquivo para este bucket (é o que já
-- valia para toda escrita no sistema antes do RLS por tabela — upload de
-- foto não carrega informação sensível).
create policy "arquivos_upload_autenticado" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'arquivos');

-- O bucket já é público (leitura da URL funciona sem policy), mas a policy
-- de select cobre quem lista/baixa autenticado pela API do Storage também.
create policy "arquivos_leitura_publica" on storage.objects
  for select to public
  using (bucket_id = 'arquivos');

-- Confere:
-- select policyname, cmd from pg_policies where tablename = 'objects' and schemaname = 'storage' and policyname like 'arquivos_%';
