/**
 * PORTAL CRC — SINCRONIZAR FÉRIAS COM O GESTÃO CLICK (Edge Function)
 *
 * Busca no Gestão Click (só leitura) o saldo, os períodos aquisitivos e as
 * parcelas de férias e espelha no Portal. O Gestão Click é a fonte OFICIAL
 * (decisão de 05/10/2026). As regras estão em plano.js (puras e testadas);
 * aqui só se busca e se grava.
 *
 *
 * COMO PUBLICAR (uma vez)
 *
 * 1. Rodar a migration 46 no SQL Editor.
 * 2. Guardar o token como SEGREDO da função (nunca no código nem no Git):
 *      GESTAOCLICK_TOKEN   o token de leitura do Gestão Click
 *      GESTAOCLICK_URL     opcional; padrão https://gengestaoclick.vercel.app/api/v1
 *    Painel: Edge Functions > Secrets. Linha de comando:
 *      supabase secrets set GESTAOCLICK_TOKEN=... --project-ref <ref>
 * 3. Publicar esta função (index.ts e plano.js) com o JWT LIGADO (o padrão):
 *      supabase functions deploy sincronizar-gestaoclick --use-api
 * 4. Em Configurações > Integrações, ligar o conector "Gestão Click — férias".
 *
 *
 * QUEM PODE CHAMAR
 *
 * Quem está logado E tem a permissão gerenciar_integracoes ou aprovar_ferias
 * (gestão, por padrão). A tela chama pelo botão "Sincronizar agora" e, sozinha,
 * quando os dados têm mais de 6 horas e alguém da gestão abre o Portal.
 *
 * O QUE ELA NUNCA FAZ
 *
 * Não escreve no Gestão Click (o token é de leitura), não lê nem guarda salário
 * e não apaga ciclo de férias que só existe no Portal. Além dos ciclos e das
 * férias aprovadas, lança cada parcela como "Férias" na Escala de Trabalho.
 */

import { planejarSincronizacao } from './plano.js';

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!;
const CHAVE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const CHAVE_SERVICO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TOKEN_EMPRESA = Deno.env.get('GESTAOCLICK_TOKEN');
const URL_EMPRESA = (Deno.env.get('GESTAOCLICK_URL') ?? 'https://gengestaoclick.vercel.app/api/v1').replace(/\/+$/, '');

const CONECTOR = 'gestaoclick_ferias';
const MINUTOS_DE_TRAVA = 5;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const responder = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });

/** Todas as páginas de uma lista do Gestão Click. */
async function buscarTudo(caminho: string): Promise<any[]> {
  const linhas: any[] = [];
  for (let pagina = 1; pagina <= 50; pagina++) {
    const sep = caminho.includes('?') ? '&' : '?';
    const r = await fetch(`${URL_EMPRESA}${caminho}${sep}page=${pagina}&page_size=200`, {
      headers: { Authorization: `Bearer ${TOKEN_EMPRESA}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (r.status === 401 || r.status === 403) throw new Error('O Gestão Click recusou o token (acesso negado). Confira o segredo GESTAOCLICK_TOKEN.');
    if (!r.ok) throw new Error(`O Gestão Click respondeu ${r.status} em ${caminho.split('?')[0]}.`);
    const corpo = await r.json();
    linhas.push(...(corpo.data ?? []));
    if (!corpo.data?.length || linhas.length >= (corpo.total ?? 0)) break;
  }
  return linhas;
}

const hojeEmBrasilia = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return responder({ erro: 'Use POST.' }, 405);

  // --- quem está chamando ---------------------------------------------------
  const autorizacao = req.headers.get('Authorization') ?? '';
  if (!autorizacao.startsWith('Bearer ')) return responder({ erro: 'Sem credencial. Entre no Portal novamente.' }, 401);

  const { createClient } = await import('jsr:@supabase/supabase-js@2');
  const comoUsuario = createClient(URL_SUPABASE, CHAVE_ANON, { global: { headers: { Authorization: autorizacao } }, auth: { persistSession: false } });
  const { data: { user }, error: erroUsuario } = await comoUsuario.auth.getUser();
  if (erroUsuario || !user) return responder({ erro: 'Sessão inválida ou expirada.' }, 401);

  const { data: permissoes } = await comoUsuario.rpc('minhas_permissoes');
  const chaves = (permissoes ?? []).map((l: any) => (typeof l === 'string' ? l : l.minhas_permissoes));
  if (!chaves.includes('gerenciar_integracoes') && !chaves.includes('aprovar_ferias')) {
    return responder({ erro: 'Sem permissão para sincronizar as férias.' }, 403);
  }

  const sb = createClient(URL_SUPABASE, CHAVE_SERVICO, { auth: { persistSession: false } });

  // --- o conector precisa estar ligado ---------------------------------------
  const { data: conector } = await sb.from('conector').select('*').eq('chave', CONECTOR).maybeSingle();
  if (!conector) return responder({ erro: 'Conector não encontrado. Rode a migration 46.' }, 500);
  if (!conector.ativo) return responder({ erro: 'O conector está desligado. Ligue em Configurações > Integrações.', codigo: 'conector_desligado' }, 409);

  // --- uma execução por vez ---------------------------------------------------
  const limite = new Date(Date.now() - MINUTOS_DE_TRAVA * 60_000).toISOString();
  const { data: emCurso } = await sb.from('conector_execucao').select('id').eq('conector_chave', CONECTOR).eq('resultado', 'rodando').gte('iniciada_em', limite).limit(1);
  if (emCurso?.length) return responder({ erro: 'Já há uma sincronização em andamento.', codigo: 'ja_em_execucao' }, 409);

  const { data: execucao } = await sb.from('conector_execucao').insert({ conector_chave: CONECTOR, disparada_por: user.email ?? user.id }).select('id').single();
  const agoraIso = new Date().toISOString();
  await sb.from('conector').update({ ultima_execucao_em: agoraIso, ultimo_resultado: 'rodando', atualizado_em: agoraIso, updated_date: agoraIso }).eq('chave', CONECTOR);

  const terminar = async (resultado: 'ok' | 'erro', resumo: unknown, avisos: unknown, erro: string | null) => {
    const fim = new Date().toISOString();
    await sb.from('conector_execucao').update({ resultado, concluida_em: fim, resumo, avisos, erro, atualizado_em: fim, updated_date: fim }).eq('id', execucao?.id);
    await sb.from('conector').update({
      ultimo_resultado: resultado, ultimo_resumo: resumo, ultimo_erro: erro,
      ...(resultado === 'ok' ? { ultimo_sucesso_em: fim } : {}), atualizado_em: fim, updated_date: fim,
    }).eq('chave', CONECTOR);
  };

  try {
    if (!TOKEN_EMPRESA) throw new Error('O token do Gestão Click não está configurado. Defina o segredo GESTAOCLICK_TOKEN na função.');

    const [empresaColaboradores, empresaFerias] = await Promise.all([
      buscarTudo('/colaboradores?status=ativo'),
      buscarTudo('/ferias?updated_since=2000-01-01T00:00:00Z'),
    ]);

    const [{ data: portalColaboradores }, { data: portalCiclos }, { data: portalSolicitacoes }, { data: portalEscala }] = await Promise.all([
      sb.from('colaborador_base').select('id, nome_completo, email, data_admissao, cargo_atual'),
      sb.from('ciclo_ferias').select('*'),
      sb.from('solicitacao_ferias').select('*'),
      sb.from('escala_atribuicao').select('*').like('escala_id', 'gc-ferias:%'),
    ]);

    const { plano, resumo } = planejarSincronizacao({
      empresaColaboradores, empresaFerias,
      portalColaboradores: portalColaboradores ?? [], portalCiclos: portalCiclos ?? [], portalSolicitacoes: portalSolicitacoes ?? [],
      portalEscala: portalEscala ?? [],
      hoje: hojeEmBrasilia(), agoraIso,
    });

    const falhas: string[] = [];
    const checar = (rotulo: string, error: any) => { if (error) falhas.push(`${rotulo}: ${error.message}`); };
    const carimbo = { atualizado_em: agoraIso, updated_date: agoraIso };

    // ciclos
    if (plano.ciclosCriar.length) checar('criar ciclos', (await sb.from('ciclo_ferias').insert(plano.ciclosCriar)).error);
    for (const c of plano.ciclosAtualizar) checar(`atualizar ciclo ${c.id}`, (await sb.from('ciclo_ferias').update({ ...c.dados, ...carimbo }).eq('id', c.id)).error);

    // férias (as que ainda travam a escala e o rodízio)
    if (plano.solicitacoesCriar.length) checar('criar férias', (await sb.from('solicitacao_ferias').insert(plano.solicitacoesCriar)).error);
    for (const s of plano.solicitacoesAtualizar) checar(`atualizar férias ${s.id}`, (await sb.from('solicitacao_ferias').update({ ...s.dados, ...carimbo }).eq('id', s.id)).error);
    for (const s of plano.solicitacoesCancelar) checar(`cancelar férias ${s.id}`, (await sb.from('solicitacao_ferias').update({ ...s.dados, ...carimbo }).eq('id', s.id)).error);

    // Escala de Trabalho: as férias aparecem como "Férias" no grid, sem lançamento manual
    if (plano.escalaCriar.length) checar('lançar férias na escala', (await sb.from('escala_atribuicao').insert(plano.escalaCriar)).error);
    for (const e of plano.escalaAtualizar) checar(`atualizar escala ${e.id}`, (await sb.from('escala_atribuicao').update({ ...e.dados, ...carimbo }).eq('id', e.id)).error);
    for (const e of plano.escalaDesativar) checar(`desativar escala ${e.id}`, (await sb.from('escala_atribuicao').update({ ...e.dados, ...carimbo }).eq('id', e.id)).error);

    if (falhas.length) {
      await terminar('erro', resumo, plano.avisos, falhas.slice(0, 5).join(' | '));
      return responder({ ok: false, erro: 'A sincronização terminou com falhas.', detalhes: falhas.slice(0, 5), resumo, avisos: plano.avisos }, 500);
    }
    await terminar('ok', resumo, plano.avisos, null);
    return responder({ ok: true, resumo, avisos: plano.avisos });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e);
    await terminar('erro', null, null, mensagem);
    return responder({ ok: false, erro: mensagem }, 502);
  }
});
