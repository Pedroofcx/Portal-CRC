/**
 * PORTAL CRC — API DE INTEGRAÇÕES (Edge Function "api")
 *
 * A porta de entrada para outros sistemas consultarem e gravarem no Portal.
 * Nada aqui usa o login dos colaboradores: cada sistema tem a sua CHAVE, criada
 * em Configurações > Integrações, e tudo é controlado por lá — a chave geral,
 * cada integração, cada recurso e se pode só LER, só GRAVAR ou os dois.
 *
 *
 * COMO PUBLICAR (uma vez)
 *
 * 1. Rodar a migration 43 no SQL Editor.
 * 2. Publicar esta função com o nome "api" e os DOIS arquivos desta pasta
 *    (index.ts e politica.js). Pelo painel: Edge Functions > Deploy a new
 *    function > adicione os dois arquivos. Pela linha de comando:
 *       supabase functions deploy api --no-verify-jwt
 * 3. DESLIGAR a verificação de JWT desta função ("Verify JWT" = off; é o
 *    --no-verify-jwt acima). Quem chama usa a chave de API, não o login do
 *    Portal. A função mesma confere a chave em toda chamada.
 *
 * Endereço: https://<projeto>.supabase.co/functions/v1/api/v1/...
 *
 *
 * ROTAS (v1)
 *
 *   GET  /v1/ping                  prova que a chave funciona (não exige recurso)
 *   GET  /v1/tratativas            lista (filtros: tipo, status, prioridade,
 *                                  desde, ate, pagina, limite)
 *   GET  /v1/tratativas/{numero}   uma tratativa pelo número (TRT-0123) ou id
 *   POST /v1/tratativas            registra uma tratativa nova
 *   GET  /v1/colaboradores         nome, cargo e equipe (sem salário nem e-mail)
 *   GET  /v1/ciclos                os ciclos trimestrais
 *
 * As regras (quem passa, o que é válido) estão em politica.js, testadas em
 * ferramentas/testar-validacao.mjs. Aqui só se liga isso ao banco.
 *
 *
 * O QUE NUNCA SAI
 *
 * Custo operacional, salário, e-mail de colaborador, notas do Oráculo: a lista
 * de campos que saem é fechada em politica.js (CAMPOS_*), não é "tudo menos".
 */

import {
  VERSAO, extrairChave, sha256hex, decidir,
  CAMPOS_TRATATIVA, CAMPOS_COLABORADOR, CAMPOS_CICLO,
  paginacao, filtrosDeTratativas, validarNovaTratativa, slaDoTipo,
} from './politica.js';

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!;
const CHAVE_SERVICO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Corpo de POST acima disto é recusado. */
const LIMITE_CORPO_BYTES = 100_000;

const CABECALHOS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const responder = (corpo: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CABECALHOS, ...extra } });

const erro = (status: number, codigo: string, mensagem: string, detalhes?: unknown, extra: Record<string, string> = {}) =>
  responder({ erro: { codigo, mensagem, ...(detalhes ? { detalhes } : {}) } }, status, extra);

type Contexto = { sb: any; integracao: any; params: URLSearchParams; req: Request; partes: string[] };

/* ------------------------------------------------------------------ *
 * ROTAS
 * ------------------------------------------------------------------ */

async function ping({ integracao }: Contexto) {
  return responder({
    ok: true,
    versao: VERSAO,
    integracao: integracao.nome,
    recursos: integracao.recursos,
    limite_por_minuto: integracao.limite_por_minuto,
    agora: new Date().toISOString(),
  });
}

async function listarTratativas({ sb, params }: Contexto) {
  const { erros, filtros } = filtrosDeTratativas(params);
  if (erros.length) return erro(400, 'parametro_invalido', 'Parâmetro inválido.', erros);
  const pg = paginacao(params);

  let q = sb.from('tratativa_base').select(CAMPOS_TRATATIVA.join(','), { count: 'exact' })
    .or('excluida.is.null,excluida.eq.false');
  if (filtros.tipo) q = q.eq('tipo_tratativa', filtros.tipo);
  if (filtros.status) q = q.eq('status', filtros.status);
  if (filtros.prioridade) q = q.eq('prioridade', filtros.prioridade);
  // datas no horário de Brasília (o dia inteiro, do primeiro ao último instante)
  if (filtros.desde) q = q.gte('data_registro', `${filtros.desde}T00:00:00-03:00`);
  if (filtros.ate) q = q.lte('data_registro', `${filtros.ate}T23:59:59.999-03:00`);

  const { data, count, error } = await q.order('data_registro', { ascending: false }).range(pg.de, pg.ate);
  if (error) return erro(500, 'erro_interno', 'Não consegui consultar as tratativas.');
  return responder({ dados: data, paginacao: { pagina: pg.pagina, limite: pg.limite, total: count ?? data.length } });
}

async function umaTratativa({ sb, partes }: Contexto) {
  const chave = decodeURIComponent(partes[2] ?? '');
  const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chave);
  let q = sb.from('tratativa_base').select(CAMPOS_TRATATIVA.join(',')).or('excluida.is.null,excluida.eq.false');
  q = ehUuid ? q.eq('id', chave) : q.eq('id_interno', chave.toUpperCase());
  const { data, error } = await q.order('data_registro', { ascending: true }).limit(1);
  if (error) return erro(500, 'erro_interno', 'Não consegui consultar a tratativa.');
  if (!data?.length) return erro(404, 'nao_encontrada', 'Tratativa não encontrada.');
  return responder({ dados: data[0] });
}

async function proximoNumero(sb: any): Promise<string> {
  const { data } = await sb.from('tratativa_base').select('id_interno').not('id_interno', 'is', null);
  const maior = (data ?? []).reduce((m: number, t: any) => {
    const n = parseInt(String(t.id_interno).match(/TRT-(\d+)/)?.[1] ?? '0', 10);
    return n > m ? n : m;
  }, 0);
  return `TRT-${String(maior + 1).padStart(4, '0')}`;
}

async function criarTratativa({ sb, integracao, req }: Contexto) {
  const tamanho = Number(req.headers.get('content-length') ?? '0');
  if (tamanho > LIMITE_CORPO_BYTES) return erro(413, 'corpo_grande', 'Corpo da requisição grande demais.');
  let corpo: unknown;
  try { corpo = await req.json(); } catch { return erro(400, 'json_invalido', 'O corpo deve ser um JSON válido.'); }

  const { erros, dados, observacao } = validarNovaTratativa(corpo);
  if (erros.length || !dados) return erro(422, 'dados_invalidos', 'Há campos inválidos.', erros);

  const agora = new Date().toISOString();
  const ehContestacao = dados.tipo_tratativa === 'contestacao';
  const status = ehContestacao ? 'em_andamento' : 'registrada';
  const quem = `API: ${integracao.nome}`;

  const registro: Record<string, unknown> = {
    ...dados,
    id_interno: await proximoNumero(sb),
    status,
    sla_atribuido: ehContestacao ? dados.prazo_sla_dias * 24 : slaDoTipo(dados.tipo_tratativa),
    data_registro: agora,
    created_by: `api:${integracao.nome}`,
    historico_estados: [{
      estado_anterior: null,
      estado_novo: status,
      data_mudanca: agora,
      usuario: quem,
      observacao: observacao ?? (ehContestacao ? 'Contestação registrada por integração' : 'Tratativa registrada por integração'),
    }],
  };
  if (ehContestacao) registro.data_inicio_tratativa = agora;

  const { data, error } = await sb.from('tratativa_base').insert(registro).select('id, id_interno').single();
  if (error) return erro(422, 'recusada_pelo_banco', 'O banco recusou o registro.', error.message);
  return responder({ dados: data }, 201);
}

async function listarColaboradores({ sb, params }: Contexto) {
  const pg = paginacao(params);
  let q = sb.from('colaborador_base').select(CAMPOS_COLABORADOR.join(','), { count: 'exact' });
  if (params.get('incluir_inativos') !== 'true') q = q.eq('ativo', true);
  const { data, count, error } = await q.order('nome_completo').range(pg.de, pg.ate);
  if (error) return erro(500, 'erro_interno', 'Não consegui consultar os colaboradores.');
  return responder({ dados: data, paginacao: { pagina: pg.pagina, limite: pg.limite, total: count ?? data.length } });
}

async function listarCiclos({ sb }: Contexto) {
  const { data, error } = await sb.from('ciclo_trimestral').select(CAMPOS_CICLO.join(',')).order('data_inicio', { ascending: false });
  if (error) return erro(500, 'erro_interno', 'Não consegui consultar os ciclos.');
  return responder({ dados: data });
}

const ROTAS = [
  { metodo: 'GET', caminho: /^\/v1\/ping$/, recurso: null, acao: null, f: ping },
  { metodo: 'GET', caminho: /^\/v1\/tratativas$/, recurso: 'tratativas', acao: 'ler', f: listarTratativas },
  { metodo: 'GET', caminho: /^\/v1\/tratativas\/[^/]+$/, recurso: 'tratativas', acao: 'ler', f: umaTratativa },
  { metodo: 'POST', caminho: /^\/v1\/tratativas$/, recurso: 'tratativas', acao: 'gravar', f: criarTratativa },
  { metodo: 'GET', caminho: /^\/v1\/colaboradores$/, recurso: 'colaboradores', acao: 'ler', f: listarColaboradores },
  { metodo: 'GET', caminho: /^\/v1\/ciclos$/, recurso: 'ciclos', acao: 'ler', f: listarCiclos },
];

/* ------------------------------------------------------------------ *
 * ENTRADA: chave, decisão, registro
 * ------------------------------------------------------------------ */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CABECALHOS });

  const inicio = Date.now();
  const url = new URL(req.url);
  // o Supabase entrega "/api/v1/..." (nome da função + rota)
  const caminho = (url.pathname.replace(/^\/api/, '').replace(/\/+$/, '')) || '/';
  const partes = caminho.split('/').filter(Boolean);

  const rota = ROTAS.find((r) => r.metodo === req.method && r.caminho.test(caminho));
  if (!rota) {
    const existe = ROTAS.some((r) => r.caminho.test(caminho));
    return existe
      ? erro(405, 'metodo_nao_permitido', `Método ${req.method} não existe nesta rota.`)
      : erro(404, 'rota_inexistente', `Rota não encontrada. As rotas começam em /${VERSAO}/ (veja a documentação).`);
  }

  const { createClient } = await import('jsr:@supabase/supabase-js@2');
  const sb = createClient(URL_SUPABASE, CHAVE_SERVICO, { auth: { persistSession: false } });

  // --- quem está chamando ---------------------------------------------------
  const chaveTexto = extrairChave((n: string) => req.headers.get(n));
  let chave: any = null;
  let integracao: any = null;
  if (chaveTexto) {
    const hash = await sha256hex(chaveTexto);
    const { data: segredo } = await sb.from('integracao_chave_segredo').select('chave_id').eq('hash', hash).maybeSingle();
    if (segredo) {
      const { data: c } = await sb.from('integracao_chave').select('id, ativa, expira_em, integracao_id').eq('id', segredo.chave_id).maybeSingle();
      chave = c;
      if (c) {
        const { data: i } = await sb.from('integracao').select('id, nome, ativa, recursos, limite_por_minuto').eq('id', c.integracao_id).maybeSingle();
        integracao = i;
      }
    }
  }

  const { data: geralLinha } = await sb.from('integracao_geral').select('habilitada').eq('id', 1).maybeSingle();

  let uso = 0;
  if (integracao) {
    const desde = new Date(Date.now() - 60_000).toISOString();
    const { count } = await sb.from('integracao_log').select('id', { count: 'exact', head: true })
      .eq('integracao_id', integracao.id).or('motivo.is.null,motivo.neq.limite_excedido').gte('created_date', desde);
    uso = count ?? 0;
  }

  const decisao = decidir({
    geral: geralLinha?.habilitada === true,
    chave,
    integracao,
    recurso: rota.recurso,
    acao: rota.acao,
    agora: new Date(),
    usoNoUltimoMinuto: uso,
  });

  const registrar = (status: number, resultado: 'aceita' | 'recusada', motivo: string | null) =>
    sb.from('integracao_log').insert({
      integracao_id: integracao?.id ?? null,
      integracao_nome: integracao?.nome ?? null,
      chave_id: chave?.id ?? null,
      metodo: req.method,
      caminho,
      recurso: rota.recurso,
      acao: rota.acao,
      resultado,
      status_http: status,
      motivo,
      duracao_ms: Date.now() - inicio,
    });

  if (!decisao.ok) {
    // chamada sem chave reconhecida não é registrada: seria encher o registro com ruído
    if (integracao) await registrar(decisao.status, 'recusada', decisao.codigo);
    const extra = decisao.status === 429 ? { 'Retry-After': '60' } : {};
    return erro(decisao.status, decisao.codigo, decisao.motivo, undefined, extra);
  }

  // --- executa ---------------------------------------------------------------
  let resposta: Response;
  try {
    resposta = await rota.f({ sb, integracao, params: url.searchParams, req, partes });
  } catch (e) {
    console.error('api: erro não tratado', e);
    resposta = erro(500, 'erro_interno', 'Erro inesperado no Portal.');
  }

  await registrar(resposta.status, resposta.status < 400 ? 'aceita' : 'recusada', resposta.status < 400 ? null : `http_${resposta.status}`);
  await sb.from('integracao_chave').update({ ultimo_uso: new Date().toISOString() }).eq('id', chave.id);
  return resposta;
});
