-- ============================================================
-- PORTAL CRC — gerado por ferramentas/gerar-seguranca.py
-- Não edite à mão: altere o gerador e rode de novo.
-- ============================================================


-- ------------------------------------------------------------------
-- QUEM É QUEM
-- ------------------------------------------------------------------
-- Descobre o papel do usuário logado cruzando o e-mail do login com o
-- cadastro em colaborador. SECURITY DEFINER porque a própria consulta
-- precisa furar o RLS de colaborador para conseguir responder — sem isso
-- teríamos uma pergunta que depende da própria resposta.

create or replace function public.papel_atual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.papel
  from public.colaborador c
  where lower(c.email) = lower(auth.jwt() ->> 'email')
    and coalesce(c.ativo, true)
  limit 1
$$;

create or replace function public.eh_gestor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.papel_atual() = 'gestor', false)
$$;

-- Estar logado NÃO é o mesmo que ser da empresa.
--
-- O Supabase permite que qualquer pessoa crie uma conta de login. Se as
-- políticas dissessem apenas "quem está logado lê", bastaria alguém se
-- cadastrar sozinho para ler a base inteira de clientes — e isso vale ainda
-- mais depois que o sistema ganha um endereço público na internet.
--
-- Esta função é o que separa "tem conta" de "trabalha aqui": só passa quem
-- tem cadastro ATIVO em colaborador. Desligar alguém da empresa é, por
-- consequência, tirar o acesso.
create or replace function public.eh_colaborador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.colaborador c
    where lower(c.email) = lower(auth.jwt() ->> 'email')
      and coalesce(c.ativo, true)
  )
$$;

-- O id do colaborador ativo dono do e-mail do login — usado pelas tabelas
-- privadas de cada pessoa (SO_DO_DONO).
create or replace function public.meu_colaborador_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.id::text
  from public.colaborador c
  where lower(c.email) = lower(auth.jwt() ->> 'email')
    and coalesce(c.ativo, true)
  limit 1
$$;

revoke execute on function public.papel_atual()        from anon;
revoke execute on function public.eh_gestor()          from anon;
revoke execute on function public.eh_colaborador()     from anon;
revoke execute on function public.meu_colaborador_id() from anon;
grant  execute on function public.papel_atual()        to authenticated;
grant  execute on function public.eh_gestor()          to authenticated;
grant  execute on function public.eh_colaborador()     to authenticated;
grant  execute on function public.meu_colaborador_id() to authenticated;

-- ------------------------------------------------------------------
-- POLÍTICAS POR TABELA
-- ------------------------------------------------------------------
-- Regra geral: quem é colaborador ativo lê. Escrita depende da tabela.
-- O anon (visitante sem login) não recebe nada em lugar nenhum, e quem
-- criou conta sozinho sem estar no cadastro também não.


-- acionamento_lider_tecnico
drop policy if exists "acionamento_lider_tecnico_ler"      on public."acionamento_lider_tecnico";
drop policy if exists "acionamento_lider_tecnico_inserir"  on public."acionamento_lider_tecnico";
drop policy if exists "acionamento_lider_tecnico_alterar"  on public."acionamento_lider_tecnico";
drop policy if exists "acionamento_lider_tecnico_apagar"   on public."acionamento_lider_tecnico";
create policy "acionamento_lider_tecnico_ler" on public."acionamento_lider_tecnico" for select to authenticated using (public.eh_colaborador());
-- acionamento_lider_tecnico: qualquer colaborador ativo grava
create policy "acionamento_lider_tecnico_inserir" on public."acionamento_lider_tecnico" for insert to authenticated with check (public.eh_colaborador());
create policy "acionamento_lider_tecnico_alterar" on public."acionamento_lider_tecnico" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "acionamento_lider_tecnico_apagar" on public."acionamento_lider_tecnico" for delete to authenticated using (public.eh_colaborador());

-- acionamento_n2
drop policy if exists "acionamento_n2_ler"      on public."acionamento_n2";
drop policy if exists "acionamento_n2_inserir"  on public."acionamento_n2";
drop policy if exists "acionamento_n2_alterar"  on public."acionamento_n2";
drop policy if exists "acionamento_n2_apagar"   on public."acionamento_n2";
create policy "acionamento_n2_ler" on public."acionamento_n2" for select to authenticated using (public.eh_colaborador());
-- acionamento_n2: qualquer colaborador ativo grava
create policy "acionamento_n2_inserir" on public."acionamento_n2" for insert to authenticated with check (public.eh_colaborador());
create policy "acionamento_n2_alterar" on public."acionamento_n2" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "acionamento_n2_apagar" on public."acionamento_n2" for delete to authenticated using (public.eh_colaborador());

-- agente_n2
drop policy if exists "agente_n2_ler"      on public."agente_n2";
drop policy if exists "agente_n2_inserir"  on public."agente_n2";
drop policy if exists "agente_n2_alterar"  on public."agente_n2";
drop policy if exists "agente_n2_apagar"   on public."agente_n2";
create policy "agente_n2_ler" on public."agente_n2" for select to authenticated using (public.eh_colaborador());
-- agente_n2: só gestor grava
create policy "agente_n2_inserir" on public."agente_n2" for insert to authenticated with check (public.eh_gestor());
create policy "agente_n2_alterar" on public."agente_n2" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "agente_n2_apagar" on public."agente_n2" for delete to authenticated using (public.eh_gestor());

-- anotacao_pessoal
drop policy if exists "anotacao_pessoal_ler"      on public."anotacao_pessoal";
drop policy if exists "anotacao_pessoal_inserir"  on public."anotacao_pessoal";
drop policy if exists "anotacao_pessoal_alterar"  on public."anotacao_pessoal";
drop policy if exists "anotacao_pessoal_apagar"   on public."anotacao_pessoal";
-- anotacao_pessoal: privada — só a dona lê e grava, nem o gestor
create policy "anotacao_pessoal_ler" on public."anotacao_pessoal" for select to authenticated using (colaborador_id = public.meu_colaborador_id());
create policy "anotacao_pessoal_inserir" on public."anotacao_pessoal" for insert to authenticated with check (colaborador_id = public.meu_colaborador_id());
create policy "anotacao_pessoal_alterar" on public."anotacao_pessoal" for update to authenticated using (colaborador_id = public.meu_colaborador_id()) with check (colaborador_id = public.meu_colaborador_id());
create policy "anotacao_pessoal_apagar" on public."anotacao_pessoal" for delete to authenticated using (colaborador_id = public.meu_colaborador_id());

-- apuracao
drop policy if exists "apuracao_ler"      on public."apuracao";
drop policy if exists "apuracao_inserir"  on public."apuracao";
drop policy if exists "apuracao_alterar"  on public."apuracao";
drop policy if exists "apuracao_apagar"   on public."apuracao";
create policy "apuracao_ler" on public."apuracao" for select to authenticated using (public.eh_colaborador());
-- apuracao: só gestor grava
create policy "apuracao_inserir" on public."apuracao" for insert to authenticated with check (public.eh_gestor());
create policy "apuracao_alterar" on public."apuracao" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "apuracao_apagar" on public."apuracao" for delete to authenticated using (public.eh_gestor());

-- aviso
drop policy if exists "aviso_ler"      on public."aviso";
drop policy if exists "aviso_inserir"  on public."aviso";
drop policy if exists "aviso_alterar"  on public."aviso";
drop policy if exists "aviso_apagar"   on public."aviso";
create policy "aviso_ler" on public."aviso" for select to authenticated using (public.eh_colaborador());
-- aviso: qualquer colaborador ativo grava
create policy "aviso_inserir" on public."aviso" for insert to authenticated with check (public.eh_colaborador());
create policy "aviso_alterar" on public."aviso" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "aviso_apagar" on public."aviso" for delete to authenticated using (public.eh_colaborador());

-- aviso_leitura
drop policy if exists "aviso_leitura_ler"      on public."aviso_leitura";
drop policy if exists "aviso_leitura_inserir"  on public."aviso_leitura";
drop policy if exists "aviso_leitura_alterar"  on public."aviso_leitura";
drop policy if exists "aviso_leitura_apagar"   on public."aviso_leitura";
create policy "aviso_leitura_ler" on public."aviso_leitura" for select to authenticated using (public.eh_colaborador());
-- aviso_leitura: qualquer colaborador ativo grava
create policy "aviso_leitura_inserir" on public."aviso_leitura" for insert to authenticated with check (public.eh_colaborador());
create policy "aviso_leitura_alterar" on public."aviso_leitura" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "aviso_leitura_apagar" on public."aviso_leitura" for delete to authenticated using (public.eh_colaborador());

-- categoria_tratativa
drop policy if exists "categoria_tratativa_ler"      on public."categoria_tratativa";
drop policy if exists "categoria_tratativa_inserir"  on public."categoria_tratativa";
drop policy if exists "categoria_tratativa_alterar"  on public."categoria_tratativa";
drop policy if exists "categoria_tratativa_apagar"   on public."categoria_tratativa";
create policy "categoria_tratativa_ler" on public."categoria_tratativa" for select to authenticated using (public.eh_colaborador());
-- categoria_tratativa: só gestor grava
create policy "categoria_tratativa_inserir" on public."categoria_tratativa" for insert to authenticated with check (public.eh_gestor());
create policy "categoria_tratativa_alterar" on public."categoria_tratativa" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "categoria_tratativa_apagar" on public."categoria_tratativa" for delete to authenticated using (public.eh_gestor());

-- ciclo_ferias
drop policy if exists "ciclo_ferias_ler"      on public."ciclo_ferias";
drop policy if exists "ciclo_ferias_inserir"  on public."ciclo_ferias";
drop policy if exists "ciclo_ferias_alterar"  on public."ciclo_ferias";
drop policy if exists "ciclo_ferias_apagar"   on public."ciclo_ferias";
create policy "ciclo_ferias_ler" on public."ciclo_ferias" for select to authenticated using (public.eh_colaborador());
-- ciclo_ferias: só gestor grava
create policy "ciclo_ferias_inserir" on public."ciclo_ferias" for insert to authenticated with check (public.eh_gestor());
create policy "ciclo_ferias_alterar" on public."ciclo_ferias" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "ciclo_ferias_apagar" on public."ciclo_ferias" for delete to authenticated using (public.eh_gestor());

-- ciclo_trimestral
drop policy if exists "ciclo_trimestral_ler"      on public."ciclo_trimestral";
drop policy if exists "ciclo_trimestral_inserir"  on public."ciclo_trimestral";
drop policy if exists "ciclo_trimestral_alterar"  on public."ciclo_trimestral";
drop policy if exists "ciclo_trimestral_apagar"   on public."ciclo_trimestral";
create policy "ciclo_trimestral_ler" on public."ciclo_trimestral" for select to authenticated using (public.eh_colaborador());
-- ciclo_trimestral: só gestor grava
create policy "ciclo_trimestral_inserir" on public."ciclo_trimestral" for insert to authenticated with check (public.eh_gestor());
create policy "ciclo_trimestral_alterar" on public."ciclo_trimestral" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "ciclo_trimestral_apagar" on public."ciclo_trimestral" for delete to authenticated using (public.eh_gestor());

-- colaborador
drop policy if exists "colaborador_ler"      on public."colaborador";
drop policy if exists "colaborador_inserir"  on public."colaborador";
drop policy if exists "colaborador_alterar"  on public."colaborador";
drop policy if exists "colaborador_apagar"   on public."colaborador";
create policy "colaborador_ler" on public."colaborador" for select to authenticated using (public.eh_colaborador());
-- colaborador: só gestor grava
create policy "colaborador_inserir" on public."colaborador" for insert to authenticated with check (public.eh_gestor());
create policy "colaborador_alterar" on public."colaborador" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "colaborador_apagar" on public."colaborador" for delete to authenticated using (public.eh_gestor());

-- config_estorno
drop policy if exists "config_estorno_ler"      on public."config_estorno";
drop policy if exists "config_estorno_inserir"  on public."config_estorno";
drop policy if exists "config_estorno_alterar"  on public."config_estorno";
drop policy if exists "config_estorno_apagar"   on public."config_estorno";
create policy "config_estorno_ler" on public."config_estorno" for select to authenticated using (public.eh_colaborador());
-- config_estorno: só gestor grava
create policy "config_estorno_inserir" on public."config_estorno" for insert to authenticated with check (public.eh_gestor());
create policy "config_estorno_alterar" on public."config_estorno" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "config_estorno_apagar" on public."config_estorno" for delete to authenticated using (public.eh_gestor());

-- configuracao
drop policy if exists "configuracao_ler"      on public."configuracao";
drop policy if exists "configuracao_inserir"  on public."configuracao";
drop policy if exists "configuracao_alterar"  on public."configuracao";
drop policy if exists "configuracao_apagar"   on public."configuracao";
create policy "configuracao_ler" on public."configuracao" for select to authenticated using (public.eh_colaborador());
-- configuracao: só gestor grava
create policy "configuracao_inserir" on public."configuracao" for insert to authenticated with check (public.eh_gestor());
create policy "configuracao_alterar" on public."configuracao" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "configuracao_apagar" on public."configuracao" for delete to authenticated using (public.eh_gestor());

-- configuracao_home_office
drop policy if exists "configuracao_home_office_ler"      on public."configuracao_home_office";
drop policy if exists "configuracao_home_office_inserir"  on public."configuracao_home_office";
drop policy if exists "configuracao_home_office_alterar"  on public."configuracao_home_office";
drop policy if exists "configuracao_home_office_apagar"   on public."configuracao_home_office";
create policy "configuracao_home_office_ler" on public."configuracao_home_office" for select to authenticated using (public.eh_colaborador());
-- configuracao_home_office: só gestor grava
create policy "configuracao_home_office_inserir" on public."configuracao_home_office" for insert to authenticated with check (public.eh_gestor());
create policy "configuracao_home_office_alterar" on public."configuracao_home_office" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "configuracao_home_office_apagar" on public."configuracao_home_office" for delete to authenticated using (public.eh_gestor());

-- curso
drop policy if exists "curso_ler"      on public."curso";
drop policy if exists "curso_inserir"  on public."curso";
drop policy if exists "curso_alterar"  on public."curso";
drop policy if exists "curso_apagar"   on public."curso";
create policy "curso_ler" on public."curso" for select to authenticated using (public.eh_colaborador());
-- curso: qualquer colaborador ativo grava
create policy "curso_inserir" on public."curso" for insert to authenticated with check (public.eh_colaborador());
create policy "curso_alterar" on public."curso" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "curso_apagar" on public."curso" for delete to authenticated using (public.eh_colaborador());

-- curso_matricula
drop policy if exists "curso_matricula_ler"      on public."curso_matricula";
drop policy if exists "curso_matricula_inserir"  on public."curso_matricula";
drop policy if exists "curso_matricula_alterar"  on public."curso_matricula";
drop policy if exists "curso_matricula_apagar"   on public."curso_matricula";
create policy "curso_matricula_ler" on public."curso_matricula" for select to authenticated using (public.eh_colaborador());
-- curso_matricula: qualquer colaborador ativo grava
create policy "curso_matricula_inserir" on public."curso_matricula" for insert to authenticated with check (public.eh_colaborador());
create policy "curso_matricula_alterar" on public."curso_matricula" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "curso_matricula_apagar" on public."curso_matricula" for delete to authenticated using (public.eh_colaborador());

-- distribuicao_tratativa
drop policy if exists "distribuicao_tratativa_ler"      on public."distribuicao_tratativa";
drop policy if exists "distribuicao_tratativa_inserir"  on public."distribuicao_tratativa";
drop policy if exists "distribuicao_tratativa_alterar"  on public."distribuicao_tratativa";
drop policy if exists "distribuicao_tratativa_apagar"   on public."distribuicao_tratativa";
create policy "distribuicao_tratativa_ler" on public."distribuicao_tratativa" for select to authenticated using (public.eh_colaborador());
-- distribuicao_tratativa: qualquer colaborador ativo grava
create policy "distribuicao_tratativa_inserir" on public."distribuicao_tratativa" for insert to authenticated with check (public.eh_colaborador());
create policy "distribuicao_tratativa_alterar" on public."distribuicao_tratativa" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "distribuicao_tratativa_apagar" on public."distribuicao_tratativa" for delete to authenticated using (public.eh_colaborador());

-- elegibilidade_premio
drop policy if exists "elegibilidade_premio_ler"      on public."elegibilidade_premio";
drop policy if exists "elegibilidade_premio_inserir"  on public."elegibilidade_premio";
drop policy if exists "elegibilidade_premio_alterar"  on public."elegibilidade_premio";
drop policy if exists "elegibilidade_premio_apagar"   on public."elegibilidade_premio";
create policy "elegibilidade_premio_ler" on public."elegibilidade_premio" for select to authenticated using (public.eh_colaborador());
-- elegibilidade_premio: só gestor grava
create policy "elegibilidade_premio_inserir" on public."elegibilidade_premio" for insert to authenticated with check (public.eh_gestor());
create policy "elegibilidade_premio_alterar" on public."elegibilidade_premio" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "elegibilidade_premio_apagar" on public."elegibilidade_premio" for delete to authenticated using (public.eh_gestor());

-- equipe
drop policy if exists "equipe_ler"      on public."equipe";
drop policy if exists "equipe_inserir"  on public."equipe";
drop policy if exists "equipe_alterar"  on public."equipe";
drop policy if exists "equipe_apagar"   on public."equipe";
create policy "equipe_ler" on public."equipe" for select to authenticated using (public.eh_colaborador());
-- equipe: só gestor grava
create policy "equipe_inserir" on public."equipe" for insert to authenticated with check (public.eh_gestor());
create policy "equipe_alterar" on public."equipe" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "equipe_apagar" on public."equipe" for delete to authenticated using (public.eh_gestor());

-- escala
drop policy if exists "escala_ler"      on public."escala";
drop policy if exists "escala_inserir"  on public."escala";
drop policy if exists "escala_alterar"  on public."escala";
drop policy if exists "escala_apagar"   on public."escala";
create policy "escala_ler" on public."escala" for select to authenticated using (public.eh_colaborador());
-- escala: só gestor grava
create policy "escala_inserir" on public."escala" for insert to authenticated with check (public.eh_gestor());
create policy "escala_alterar" on public."escala" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "escala_apagar" on public."escala" for delete to authenticated using (public.eh_gestor());

-- escala_atribuicao
drop policy if exists "escala_atribuicao_ler"      on public."escala_atribuicao";
drop policy if exists "escala_atribuicao_inserir"  on public."escala_atribuicao";
drop policy if exists "escala_atribuicao_alterar"  on public."escala_atribuicao";
drop policy if exists "escala_atribuicao_apagar"   on public."escala_atribuicao";
create policy "escala_atribuicao_ler" on public."escala_atribuicao" for select to authenticated using (public.eh_colaborador());
-- escala_atribuicao: qualquer colaborador ativo grava
create policy "escala_atribuicao_inserir" on public."escala_atribuicao" for insert to authenticated with check (public.eh_colaborador());
create policy "escala_atribuicao_alterar" on public."escala_atribuicao" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "escala_atribuicao_apagar" on public."escala_atribuicao" for delete to authenticated using (public.eh_colaborador());

-- escala_turno
drop policy if exists "escala_turno_ler"      on public."escala_turno";
drop policy if exists "escala_turno_inserir"  on public."escala_turno";
drop policy if exists "escala_turno_alterar"  on public."escala_turno";
drop policy if exists "escala_turno_apagar"   on public."escala_turno";
create policy "escala_turno_ler" on public."escala_turno" for select to authenticated using (public.eh_colaborador());
-- escala_turno: qualquer colaborador ativo grava
create policy "escala_turno_inserir" on public."escala_turno" for insert to authenticated with check (public.eh_colaborador());
create policy "escala_turno_alterar" on public."escala_turno" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "escala_turno_apagar" on public."escala_turno" for delete to authenticated using (public.eh_colaborador());

-- estorno_parcial
drop policy if exists "estorno_parcial_ler"      on public."estorno_parcial";
drop policy if exists "estorno_parcial_inserir"  on public."estorno_parcial";
drop policy if exists "estorno_parcial_alterar"  on public."estorno_parcial";
drop policy if exists "estorno_parcial_apagar"   on public."estorno_parcial";
create policy "estorno_parcial_ler" on public."estorno_parcial" for select to authenticated using (public.eh_colaborador());
-- estorno_parcial: qualquer colaborador ativo grava
create policy "estorno_parcial_inserir" on public."estorno_parcial" for insert to authenticated with check (public.eh_colaborador());
create policy "estorno_parcial_alterar" on public."estorno_parcial" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "estorno_parcial_apagar" on public."estorno_parcial" for delete to authenticated using (public.eh_colaborador());

-- etapa_jornada
drop policy if exists "etapa_jornada_ler"      on public."etapa_jornada";
drop policy if exists "etapa_jornada_inserir"  on public."etapa_jornada";
drop policy if exists "etapa_jornada_alterar"  on public."etapa_jornada";
drop policy if exists "etapa_jornada_apagar"   on public."etapa_jornada";
create policy "etapa_jornada_ler" on public."etapa_jornada" for select to authenticated using (public.eh_colaborador());
-- etapa_jornada: só gestor grava
create policy "etapa_jornada_inserir" on public."etapa_jornada" for insert to authenticated with check (public.eh_gestor());
create policy "etapa_jornada_alterar" on public."etapa_jornada" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "etapa_jornada_apagar" on public."etapa_jornada" for delete to authenticated using (public.eh_gestor());

-- frase_motivacional
drop policy if exists "frase_motivacional_ler"      on public."frase_motivacional";
drop policy if exists "frase_motivacional_inserir"  on public."frase_motivacional";
drop policy if exists "frase_motivacional_alterar"  on public."frase_motivacional";
drop policy if exists "frase_motivacional_apagar"   on public."frase_motivacional";
create policy "frase_motivacional_ler" on public."frase_motivacional" for select to authenticated using (public.eh_colaborador());
-- frase_motivacional: qualquer colaborador ativo grava
create policy "frase_motivacional_inserir" on public."frase_motivacional" for insert to authenticated with check (public.eh_colaborador());
create policy "frase_motivacional_alterar" on public."frase_motivacional" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "frase_motivacional_apagar" on public."frase_motivacional" for delete to authenticated using (public.eh_colaborador());

-- hansei_comentario
drop policy if exists "hansei_comentario_ler"      on public."hansei_comentario";
drop policy if exists "hansei_comentario_inserir"  on public."hansei_comentario";
drop policy if exists "hansei_comentario_alterar"  on public."hansei_comentario";
drop policy if exists "hansei_comentario_apagar"   on public."hansei_comentario";
create policy "hansei_comentario_ler" on public."hansei_comentario" for select to authenticated using (public.eh_colaborador());
-- hansei_comentario: qualquer colaborador ativo grava
create policy "hansei_comentario_inserir" on public."hansei_comentario" for insert to authenticated with check (public.eh_colaborador());
create policy "hansei_comentario_alterar" on public."hansei_comentario" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "hansei_comentario_apagar" on public."hansei_comentario" for delete to authenticated using (public.eh_colaborador());

-- hansei_envio
drop policy if exists "hansei_envio_ler"      on public."hansei_envio";
drop policy if exists "hansei_envio_inserir"  on public."hansei_envio";
drop policy if exists "hansei_envio_alterar"  on public."hansei_envio";
drop policy if exists "hansei_envio_apagar"   on public."hansei_envio";
create policy "hansei_envio_ler" on public."hansei_envio" for select to authenticated using (public.eh_colaborador());
-- hansei_envio: qualquer colaborador ativo grava
create policy "hansei_envio_inserir" on public."hansei_envio" for insert to authenticated with check (public.eh_colaborador());
create policy "hansei_envio_alterar" on public."hansei_envio" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "hansei_envio_apagar" on public."hansei_envio" for delete to authenticated using (public.eh_colaborador());

-- lider_tecnico
drop policy if exists "lider_tecnico_ler"      on public."lider_tecnico";
drop policy if exists "lider_tecnico_inserir"  on public."lider_tecnico";
drop policy if exists "lider_tecnico_alterar"  on public."lider_tecnico";
drop policy if exists "lider_tecnico_apagar"   on public."lider_tecnico";
create policy "lider_tecnico_ler" on public."lider_tecnico" for select to authenticated using (public.eh_colaborador());
-- lider_tecnico: só gestor grava
create policy "lider_tecnico_inserir" on public."lider_tecnico" for insert to authenticated with check (public.eh_gestor());
create policy "lider_tecnico_alterar" on public."lider_tecnico" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "lider_tecnico_apagar" on public."lider_tecnico" for delete to authenticated using (public.eh_gestor());

-- log_auditoria
drop policy if exists "log_auditoria_ler"      on public."log_auditoria";
drop policy if exists "log_auditoria_inserir"  on public."log_auditoria";
drop policy if exists "log_auditoria_alterar"  on public."log_auditoria";
drop policy if exists "log_auditoria_apagar"   on public."log_auditoria";
create policy "log_auditoria_ler" on public."log_auditoria" for select to authenticated using (public.eh_colaborador());
create policy "log_auditoria_inserir" on public."log_auditoria" for insert to authenticated with check (public.eh_colaborador());
-- log_auditoria: sem política de update/delete — a trilha de auditoria não se apaga.

-- motivo_tratativa
drop policy if exists "motivo_tratativa_ler"      on public."motivo_tratativa";
drop policy if exists "motivo_tratativa_inserir"  on public."motivo_tratativa";
drop policy if exists "motivo_tratativa_alterar"  on public."motivo_tratativa";
drop policy if exists "motivo_tratativa_apagar"   on public."motivo_tratativa";
create policy "motivo_tratativa_ler" on public."motivo_tratativa" for select to authenticated using (public.eh_colaborador());
-- motivo_tratativa: só gestor grava
create policy "motivo_tratativa_inserir" on public."motivo_tratativa" for insert to authenticated with check (public.eh_gestor());
create policy "motivo_tratativa_alterar" on public."motivo_tratativa" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "motivo_tratativa_apagar" on public."motivo_tratativa" for delete to authenticated using (public.eh_gestor());

-- observacao
drop policy if exists "observacao_ler"      on public."observacao";
drop policy if exists "observacao_inserir"  on public."observacao";
drop policy if exists "observacao_alterar"  on public."observacao";
drop policy if exists "observacao_apagar"   on public."observacao";
-- observacao: gestor lê e grava tudo; o agente lê só o que o cita e é visível para ele
create policy "observacao_ler" on public."observacao" for select to authenticated using (public.eh_gestor() or (visibilidade in ('agente', 'ambos') and colaboradores_ids ? public.meu_colaborador_id()));
create policy "observacao_inserir" on public."observacao" for insert to authenticated with check (public.eh_gestor());
create policy "observacao_alterar" on public."observacao" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "observacao_apagar" on public."observacao" for delete to authenticated using (public.eh_gestor());

-- oraculo_lancamento
drop policy if exists "oraculo_lancamento_ler"      on public."oraculo_lancamento";
drop policy if exists "oraculo_lancamento_inserir"  on public."oraculo_lancamento";
drop policy if exists "oraculo_lancamento_alterar"  on public."oraculo_lancamento";
drop policy if exists "oraculo_lancamento_apagar"   on public."oraculo_lancamento";
create policy "oraculo_lancamento_ler" on public."oraculo_lancamento" for select to authenticated using (public.eh_colaborador());
-- oraculo_lancamento: qualquer colaborador ativo grava
create policy "oraculo_lancamento_inserir" on public."oraculo_lancamento" for insert to authenticated with check (public.eh_colaborador());
create policy "oraculo_lancamento_alterar" on public."oraculo_lancamento" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "oraculo_lancamento_apagar" on public."oraculo_lancamento" for delete to authenticated using (public.eh_colaborador());

-- oraculo_palavra
drop policy if exists "oraculo_palavra_ler"      on public."oraculo_palavra";
drop policy if exists "oraculo_palavra_inserir"  on public."oraculo_palavra";
drop policy if exists "oraculo_palavra_alterar"  on public."oraculo_palavra";
drop policy if exists "oraculo_palavra_apagar"   on public."oraculo_palavra";
create policy "oraculo_palavra_ler" on public."oraculo_palavra" for select to authenticated using (public.eh_colaborador());
-- oraculo_palavra: qualquer colaborador ativo grava
create policy "oraculo_palavra_inserir" on public."oraculo_palavra" for insert to authenticated with check (public.eh_colaborador());
create policy "oraculo_palavra_alterar" on public."oraculo_palavra" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "oraculo_palavra_apagar" on public."oraculo_palavra" for delete to authenticated using (public.eh_colaborador());

-- pdi
drop policy if exists "pdi_ler"      on public."pdi";
drop policy if exists "pdi_inserir"  on public."pdi";
drop policy if exists "pdi_alterar"  on public."pdi";
drop policy if exists "pdi_apagar"   on public."pdi";
create policy "pdi_ler" on public."pdi" for select to authenticated using (public.eh_colaborador());
-- pdi: qualquer colaborador ativo grava
create policy "pdi_inserir" on public."pdi" for insert to authenticated with check (public.eh_colaborador());
create policy "pdi_alterar" on public."pdi" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "pdi_apagar" on public."pdi" for delete to authenticated using (public.eh_colaborador());

-- permissao_modulo
drop policy if exists "permissao_modulo_ler"      on public."permissao_modulo";
drop policy if exists "permissao_modulo_inserir"  on public."permissao_modulo";
drop policy if exists "permissao_modulo_alterar"  on public."permissao_modulo";
drop policy if exists "permissao_modulo_apagar"   on public."permissao_modulo";
create policy "permissao_modulo_ler" on public."permissao_modulo" for select to authenticated using (public.eh_colaborador());
-- permissao_modulo: só gestor grava
create policy "permissao_modulo_inserir" on public."permissao_modulo" for insert to authenticated with check (public.eh_gestor());
create policy "permissao_modulo_alterar" on public."permissao_modulo" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "permissao_modulo_apagar" on public."permissao_modulo" for delete to authenticated using (public.eh_gestor());

-- pesquisa
drop policy if exists "pesquisa_ler"      on public."pesquisa";
drop policy if exists "pesquisa_inserir"  on public."pesquisa";
drop policy if exists "pesquisa_alterar"  on public."pesquisa";
drop policy if exists "pesquisa_apagar"   on public."pesquisa";
create policy "pesquisa_ler" on public."pesquisa" for select to authenticated using (public.eh_colaborador());
-- pesquisa: qualquer colaborador ativo grava
create policy "pesquisa_inserir" on public."pesquisa" for insert to authenticated with check (public.eh_colaborador());
create policy "pesquisa_alterar" on public."pesquisa" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "pesquisa_apagar" on public."pesquisa" for delete to authenticated using (public.eh_colaborador());

-- plano_setorial
drop policy if exists "plano_setorial_ler"      on public."plano_setorial";
drop policy if exists "plano_setorial_inserir"  on public."plano_setorial";
drop policy if exists "plano_setorial_alterar"  on public."plano_setorial";
drop policy if exists "plano_setorial_apagar"   on public."plano_setorial";
create policy "plano_setorial_ler" on public."plano_setorial" for select to authenticated using (public.eh_colaborador());
-- plano_setorial: qualquer colaborador ativo grava
create policy "plano_setorial_inserir" on public."plano_setorial" for insert to authenticated with check (public.eh_colaborador());
create policy "plano_setorial_alterar" on public."plano_setorial" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "plano_setorial_apagar" on public."plano_setorial" for delete to authenticated using (public.eh_colaborador());

-- pontuacao
drop policy if exists "pontuacao_ler"      on public."pontuacao";
drop policy if exists "pontuacao_inserir"  on public."pontuacao";
drop policy if exists "pontuacao_alterar"  on public."pontuacao";
drop policy if exists "pontuacao_apagar"   on public."pontuacao";
create policy "pontuacao_ler" on public."pontuacao" for select to authenticated using (public.eh_colaborador());
-- pontuacao: só gestor grava
create policy "pontuacao_inserir" on public."pontuacao" for insert to authenticated with check (public.eh_gestor());
create policy "pontuacao_alterar" on public."pontuacao" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "pontuacao_apagar" on public."pontuacao" for delete to authenticated using (public.eh_gestor());

-- pop
drop policy if exists "pop_ler"      on public."pop";
drop policy if exists "pop_inserir"  on public."pop";
drop policy if exists "pop_alterar"  on public."pop";
drop policy if exists "pop_apagar"   on public."pop";
create policy "pop_ler" on public."pop" for select to authenticated using (public.eh_colaborador());
-- pop: qualquer colaborador ativo grava
create policy "pop_inserir" on public."pop" for insert to authenticated with check (public.eh_colaborador());
create policy "pop_alterar" on public."pop" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "pop_apagar" on public."pop" for delete to authenticated using (public.eh_colaborador());

-- resposta_pesquisa
drop policy if exists "resposta_pesquisa_ler"      on public."resposta_pesquisa";
drop policy if exists "resposta_pesquisa_inserir"  on public."resposta_pesquisa";
drop policy if exists "resposta_pesquisa_alterar"  on public."resposta_pesquisa";
drop policy if exists "resposta_pesquisa_apagar"   on public."resposta_pesquisa";
create policy "resposta_pesquisa_ler" on public."resposta_pesquisa" for select to authenticated using (public.eh_colaborador());
-- resposta_pesquisa: qualquer colaborador ativo grava
create policy "resposta_pesquisa_inserir" on public."resposta_pesquisa" for insert to authenticated with check (public.eh_colaborador());
create policy "resposta_pesquisa_alterar" on public."resposta_pesquisa" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "resposta_pesquisa_apagar" on public."resposta_pesquisa" for delete to authenticated using (public.eh_colaborador());

-- saldo_ferias
drop policy if exists "saldo_ferias_ler"      on public."saldo_ferias";
drop policy if exists "saldo_ferias_inserir"  on public."saldo_ferias";
drop policy if exists "saldo_ferias_alterar"  on public."saldo_ferias";
drop policy if exists "saldo_ferias_apagar"   on public."saldo_ferias";
create policy "saldo_ferias_ler" on public."saldo_ferias" for select to authenticated using (public.eh_colaborador());
-- saldo_ferias: qualquer colaborador ativo grava
create policy "saldo_ferias_inserir" on public."saldo_ferias" for insert to authenticated with check (public.eh_colaborador());
create policy "saldo_ferias_alterar" on public."saldo_ferias" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "saldo_ferias_apagar" on public."saldo_ferias" for delete to authenticated using (public.eh_colaborador());

-- skill_mestre
drop policy if exists "skill_mestre_ler"      on public."skill_mestre";
drop policy if exists "skill_mestre_inserir"  on public."skill_mestre";
drop policy if exists "skill_mestre_alterar"  on public."skill_mestre";
drop policy if exists "skill_mestre_apagar"   on public."skill_mestre";
create policy "skill_mestre_ler" on public."skill_mestre" for select to authenticated using (public.eh_colaborador());
-- skill_mestre: só gestor grava
create policy "skill_mestre_inserir" on public."skill_mestre" for insert to authenticated with check (public.eh_gestor());
create policy "skill_mestre_alterar" on public."skill_mestre" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "skill_mestre_apagar" on public."skill_mestre" for delete to authenticated using (public.eh_gestor());

-- solicitacao_apoio
drop policy if exists "solicitacao_apoio_ler"      on public."solicitacao_apoio";
drop policy if exists "solicitacao_apoio_inserir"  on public."solicitacao_apoio";
drop policy if exists "solicitacao_apoio_alterar"  on public."solicitacao_apoio";
drop policy if exists "solicitacao_apoio_apagar"   on public."solicitacao_apoio";
create policy "solicitacao_apoio_ler" on public."solicitacao_apoio" for select to authenticated using (public.eh_colaborador());
-- solicitacao_apoio: qualquer colaborador ativo grava
create policy "solicitacao_apoio_inserir" on public."solicitacao_apoio" for insert to authenticated with check (public.eh_colaborador());
create policy "solicitacao_apoio_alterar" on public."solicitacao_apoio" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "solicitacao_apoio_apagar" on public."solicitacao_apoio" for delete to authenticated using (public.eh_colaborador());

-- solicitacao_ferias
drop policy if exists "solicitacao_ferias_ler"      on public."solicitacao_ferias";
drop policy if exists "solicitacao_ferias_inserir"  on public."solicitacao_ferias";
drop policy if exists "solicitacao_ferias_alterar"  on public."solicitacao_ferias";
drop policy if exists "solicitacao_ferias_apagar"   on public."solicitacao_ferias";
create policy "solicitacao_ferias_ler" on public."solicitacao_ferias" for select to authenticated using (public.eh_colaborador());
-- solicitacao_ferias: qualquer colaborador ativo grava
create policy "solicitacao_ferias_inserir" on public."solicitacao_ferias" for insert to authenticated with check (public.eh_colaborador());
create policy "solicitacao_ferias_alterar" on public."solicitacao_ferias" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "solicitacao_ferias_apagar" on public."solicitacao_ferias" for delete to authenticated using (public.eh_colaborador());

-- solicitacao_home_office
drop policy if exists "solicitacao_home_office_ler"      on public."solicitacao_home_office";
drop policy if exists "solicitacao_home_office_inserir"  on public."solicitacao_home_office";
drop policy if exists "solicitacao_home_office_alterar"  on public."solicitacao_home_office";
drop policy if exists "solicitacao_home_office_apagar"   on public."solicitacao_home_office";
create policy "solicitacao_home_office_ler" on public."solicitacao_home_office" for select to authenticated using (public.eh_colaborador());
-- solicitacao_home_office: qualquer colaborador ativo grava
create policy "solicitacao_home_office_inserir" on public."solicitacao_home_office" for insert to authenticated with check (public.eh_colaborador());
create policy "solicitacao_home_office_alterar" on public."solicitacao_home_office" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "solicitacao_home_office_apagar" on public."solicitacao_home_office" for delete to authenticated using (public.eh_colaborador());

-- tipo_observacao
drop policy if exists "tipo_observacao_ler"      on public."tipo_observacao";
drop policy if exists "tipo_observacao_inserir"  on public."tipo_observacao";
drop policy if exists "tipo_observacao_alterar"  on public."tipo_observacao";
drop policy if exists "tipo_observacao_apagar"   on public."tipo_observacao";
create policy "tipo_observacao_ler" on public."tipo_observacao" for select to authenticated using (public.eh_colaborador());
-- tipo_observacao: só gestor grava
create policy "tipo_observacao_inserir" on public."tipo_observacao" for insert to authenticated with check (public.eh_gestor());
create policy "tipo_observacao_alterar" on public."tipo_observacao" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "tipo_observacao_apagar" on public."tipo_observacao" for delete to authenticated using (public.eh_gestor());

-- tipo_tratativa
drop policy if exists "tipo_tratativa_ler"      on public."tipo_tratativa";
drop policy if exists "tipo_tratativa_inserir"  on public."tipo_tratativa";
drop policy if exists "tipo_tratativa_alterar"  on public."tipo_tratativa";
drop policy if exists "tipo_tratativa_apagar"   on public."tipo_tratativa";
create policy "tipo_tratativa_ler" on public."tipo_tratativa" for select to authenticated using (public.eh_colaborador());
-- tipo_tratativa: só gestor grava
create policy "tipo_tratativa_inserir" on public."tipo_tratativa" for insert to authenticated with check (public.eh_gestor());
create policy "tipo_tratativa_alterar" on public."tipo_tratativa" for update to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy "tipo_tratativa_apagar" on public."tipo_tratativa" for delete to authenticated using (public.eh_gestor());

-- tratativa
drop policy if exists "tratativa_ler"      on public."tratativa";
drop policy if exists "tratativa_inserir"  on public."tratativa";
drop policy if exists "tratativa_alterar"  on public."tratativa";
drop policy if exists "tratativa_apagar"   on public."tratativa";
create policy "tratativa_ler" on public."tratativa" for select to authenticated using (public.eh_colaborador());
-- tratativa: qualquer colaborador ativo grava
create policy "tratativa_inserir" on public."tratativa" for insert to authenticated with check (public.eh_colaborador());
create policy "tratativa_alterar" on public."tratativa" for update to authenticated using (public.eh_colaborador()) with check (public.eh_colaborador());
create policy "tratativa_apagar" on public."tratativa" for delete to authenticated using (public.eh_colaborador());
