-- ============================================================
-- PORTAL CRC — gerado por ferramentas/gerar-sql.py
-- Não edite à mão: altere o schema ou o gerador e rode de novo.
-- ============================================================


-- Liga RLS em todas as tabelas SEM criar nenhuma política.
-- Efeito: ninguém lê nem escreve pela API até a Fase 03 definir as regras.
-- No Supabase, tabela sem RLS fica exposta na API pública — este arquivo
-- existe para que isso nunca aconteça por descuido.


alter table public."acionamento_lider_tecnico" enable row level security;
alter table public."acionamento_n2" enable row level security;
alter table public."agente_n2" enable row level security;
alter table public."anotacao_pessoal" enable row level security;
alter table public."apuracao" enable row level security;
alter table public."aviso" enable row level security;
alter table public."aviso_leitura" enable row level security;
alter table public."categoria_tratativa" enable row level security;
alter table public."ciclo_ferias" enable row level security;
alter table public."ciclo_trimestral" enable row level security;
alter table public."colaborador" enable row level security;
alter table public."config_estorno" enable row level security;
alter table public."configuracao" enable row level security;
alter table public."configuracao_home_office" enable row level security;
alter table public."curso" enable row level security;
alter table public."curso_matricula" enable row level security;
alter table public."distribuicao_tratativa" enable row level security;
alter table public."elegibilidade_premio" enable row level security;
alter table public."equipe" enable row level security;
alter table public."escala" enable row level security;
alter table public."escala_atribuicao" enable row level security;
alter table public."escala_turno" enable row level security;
alter table public."estorno_parcial" enable row level security;
alter table public."etapa_jornada" enable row level security;
alter table public."frase_motivacional" enable row level security;
alter table public."hansei_comentario" enable row level security;
alter table public."hansei_envio" enable row level security;
alter table public."lider_tecnico" enable row level security;
alter table public."log_auditoria" enable row level security;
alter table public."motivo_tratativa" enable row level security;
alter table public."observacao" enable row level security;
alter table public."oraculo_lancamento" enable row level security;
alter table public."oraculo_palavra" enable row level security;
alter table public."pdi" enable row level security;
alter table public."permissao_modulo" enable row level security;
alter table public."pesquisa" enable row level security;
alter table public."plano_setorial" enable row level security;
alter table public."pontuacao" enable row level security;
alter table public."pop" enable row level security;
alter table public."resposta_pesquisa" enable row level security;
alter table public."saldo_ferias" enable row level security;
alter table public."skill_mestre" enable row level security;
alter table public."solicitacao_apoio" enable row level security;
alter table public."solicitacao_ferias" enable row level security;
alter table public."solicitacao_home_office" enable row level security;
alter table public."tipo_observacao" enable row level security;
alter table public."tipo_tratativa" enable row level security;
alter table public."tratativa" enable row level security;
