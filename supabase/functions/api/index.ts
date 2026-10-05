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
 *   GET  /v1/tratativas/{codigo}   uma tratativa pelo número TRT, pelo ticket
 *                                  (Zendesk ou ClickDesk) ou pelo id
 *   POST /v1/tratativas            registra uma tratativa nova
 *   PATCH /v1/tratativas/{codigo}  atualiza ticket_zendesk, ticket_clickdesk,
 *                                  dados_clickdesk e resumo_whatsapp
 *   GET  /v1/acompanhamento/{codigo}?cnpj=...  o que o CLIENTE vê no WhatsApp:
 *                                  situação e resumo (só isso), pelo número TRT
 *                                  ou pelo ticket, MEDIANTE O CNPJ do cliente
 *   DELETE /v1/tratativas/{codigo} exclui (lógica) tratativa EM ABERTO, com justificativa
 *   GET  /v1/apuracao              números diários de telefone, chat e CX (filtros: tipo,
 *                                  colaborador_id, desde, ate, pagina, limite)
 *   GET  /v1/jornada/etapas        as etapas da jornada do cliente
 *   GET  /v1/jornada/motivos       os motivos de tratativa
 *   GET  /v1/jornada/resumo        resumo por etapa (filtros: tipo, desde, ate)
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
  CAMPOS_TRATATIVA, CAMPOS_COLABORADOR, CAMPOS_CICLO, CAMPOS_APURACAO, CAMPOS_ETAPA, CAMPOS_MOTIVO,
  paginacao, filtrosDeTratativas, validarNovaTratativa, validarAtualizacaoTratativa, slaDoTipo,
  interpretarCodigo, montarAcompanhamento, cnpjValido, apenasDigitos, escolherDoCliente,
  MAXIMO_ERROS_POR_CODIGO, JANELA_ERROS_MINUTOS,
  validarExclusao, ESTADOS_QUE_NAO_EXCLUEM, filtrosDeApuracao, resumoPorEtapa,
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
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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

/**
 * Acha UMA tratativa pelo que a pessoa informou: número TRT, ticket do Zendesk
 * ou do ClickDesk (ou o id interno). Se o número casar com mais de uma
 * tratativa (há números repetidos no histórico), NÃO adivinha: devolve conflito.
 */
async function buscarVarios(sb: any, bruto: string, campos: string, limite: number) {
  const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bruto);
  let q = sb.from('tratativa_base').select(campos).or('excluida.is.null,excluida.eq.false');
  if (ehUuid) {
    q = q.eq('id', bruto);
  } else {
    const codigo = interpretarCodigo(bruto);
    if (!codigo) return { erro: erro(400, 'codigo_invalido', 'Código inválido. Use o número TRT (TRT-0123) ou o número do ticket.') };
    q = codigo.tipo === 'trt'
      ? q.eq('id_interno', codigo.valor)
      : q.or(`ticket_zendesk.eq.${codigo.valor},ticket_clickdesk.eq.${codigo.valor}`);
  }
  const { data, error } = await q.limit(limite);
  if (error) return { erro: erro(500, 'erro_interno', 'Não consegui consultar a tratativa.') };
  return { linhas: data ?? [] };
}

async function buscarPorCodigo(sb: any, bruto: string, campos: string) {
  const { linhas, erro: falha } = await buscarVarios(sb, bruto, campos, 2);
  if (falha) return { erro: falha };
  if (!linhas.length) return { erro: erro(404, 'nao_encontrada', 'Tratativa não encontrada.') };
  if (linhas.length > 1) return { erro: erro(409, 'codigo_ambiguo', 'Este código corresponde a mais de uma tratativa. Procure o atendimento.') };
  return { tratativa: linhas[0] };
}

async function umaTratativa({ sb, partes }: Contexto) {
  const { tratativa, erro: falha } = await buscarPorCodigo(sb, decodeURIComponent(partes[2] ?? ''), CAMPOS_TRATATIVA.join(','));
  return falha ?? responder({ dados: tratativa });
}

/**
 * O que o cliente vê no WhatsApp: só a situação e o resumo, nunca a tratativa.
 *
 * EXIGE O CNPJ DO CLIENTE (?cnpj=...). O número TRT e o ticket são sequenciais,
 * então só o código não prova que quem pergunta é o dono da tratativa. Quatro
 * travas, nesta ordem:
 *   1. o CNPJ é obrigatório e precisa ser um CNPJ válido (14 dígitos, dígitos
 *      verificadores certos): chute aleatório nem chega ao banco;
 *   2. o CNPJ precisa ser o cadastrado na tratativa. Código certo com CNPJ
 *      errado, código inexistente e tratativa sem CNPJ cadastrado dão a MESMA
 *      resposta (404), para não revelar o que existe;
 *   3. depois de várias tentativas erradas no mesmo código, a consulta trava
 *      por alguns minutos (429);
 *   4. o limite de chamadas por minuto da integração continua valendo.
 * Quando o mesmo número de ticket ou TRT casa com mais de uma tratativa, o CNPJ
 * é quem desempata.
 */
async function acompanhamento({ sb, integracao, params, partes }: Contexto) {
  const bruto = decodeURIComponent(partes[2] ?? '');
  const cnpjInformado = params.get('cnpj');
  if (!cnpjInformado) return erro(400, 'cnpj_obrigatorio', 'Informe o CNPJ do cliente (parâmetro cnpj).');
  if (!cnpjValido(cnpjInformado)) return erro(400, 'cnpj_invalido', 'CNPJ inválido. Confira os 14 dígitos.');

  // trava por tentativas erradas no mesmo código
  const desde = new Date(Date.now() - JANELA_ERROS_MINUTOS * 60_000).toISOString();
  const { count: erros } = await sb.from('integracao_log').select('id', { count: 'exact', head: true })
    .eq('integracao_id', integracao.id).eq('caminho', `/v1/acompanhamento/${partes[2] ?? ''}`)
    .eq('status_http', 404).gte('created_date', desde);
  if ((erros ?? 0) >= MAXIMO_ERROS_POR_CODIGO) {
    return erro(429, 'tentativas_excedidas', `Muitas tentativas com este código. Tente de novo em ${JANELA_ERROS_MINUTOS} minutos ou procure o atendimento.`,
      undefined, { 'Retry-After': String(JANELA_ERROS_MINUTOS * 60) });
  }

  const { linhas, erro: falha } = await buscarVarios(
    sb, bruto,
    'id_interno, status, cnpj_cliente, data_registro, ticket_zendesk, ticket_clickdesk, resumo_whatsapp, resumo_whatsapp_atualizado_em, updated_date',
    10,
  );
  if (falha) return falha;
  const achada = escolherDoCliente(linhas, apenasDigitos(cnpjInformado));
  if (!achada) return erro(404, 'nao_encontrada', 'Não encontramos uma tratativa com esses dados.');
  return responder({ dados: montarAcompanhamento(achada) });
}

async function atualizarTratativa({ sb, integracao, req, partes }: Contexto) {
  const tamanho = Number(req.headers.get('content-length') ?? '0');
  if (tamanho > LIMITE_CORPO_BYTES) return erro(413, 'corpo_grande', 'Corpo da requisição grande demais.');
  let corpo: unknown;
  try { corpo = await req.json(); } catch { return erro(400, 'json_invalido', 'O corpo deve ser um JSON válido.'); }

  const { erros, dados } = validarAtualizacaoTratativa(corpo);
  if (erros.length || !dados) return erro(422, 'dados_invalidos', 'Há campos inválidos.', erros);

  const { tratativa, erro: falha } = await buscarPorCodigo(sb, decodeURIComponent(partes[2] ?? ''), 'id, id_interno');
  if (falha) return falha;

  const agora = new Date().toISOString();
  const mudanca: Record<string, unknown> = { ...dados, updated_date: agora, atualizado_em: agora };
  if ('resumo_whatsapp' in dados) mudanca.resumo_whatsapp_por_nome = dados.resumo_whatsapp ? `API: ${integracao.nome}` : null;

  const { error } = await sb.from('tratativa_base').update(mudanca).eq('id', tratativa.id);
  if (error) return erro(422, 'recusada_pelo_banco', 'O banco recusou a atualização.', error.message);
  return responder({ dados: { id: tratativa.id, id_interno: tratativa.id_interno, atualizados: Object.keys(dados) } });
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
  if (dados.resumo_whatsapp) {
    registro.resumo_whatsapp_atualizado_em = agora;
    registro.resumo_whatsapp_por_nome = quem;
  }

  const { data, error } = await sb.from('tratativa_base').insert(registro).select('id, id_interno').single();
  if (error) return erro(422, 'recusada_pelo_banco', 'O banco recusou o registro.', error.message);
  return responder({ dados: data }, 201);
}

async function excluirTratativa({ sb, integracao, req, partes }: Contexto) {
  let corpo: unknown;
  try { corpo = await req.json(); } catch { return erro(400, 'json_invalido', 'Envie um JSON com a justificativa da exclusão.'); }
  const { erros, dados } = validarExclusao(corpo);
  if (erros.length || !dados) return erro(422, 'dados_invalidos', 'Há campos inválidos.', erros);

  const { tratativa, erro: falha } = await buscarPorCodigo(sb, decodeURIComponent(partes[2] ?? ''), 'id, id_interno, status, historico_estados');
  if (falha) return falha;
  // tratativa encerrada já conta nos pontos e nos ciclos: não some por API
  if (ESTADOS_QUE_NAO_EXCLUEM.includes(tratativa.status)) {
    return erro(409, 'tratativa_encerrada', 'Tratativa encerrada não pode ser excluída pela API: ela já conta na pontuação. A exclusão é feita pela tela, por quem tem a permissão.');
  }

  const agora = new Date().toISOString();
  const quem = `API: ${integracao.nome}`;
  const historico = [...(tratativa.historico_estados ?? []), {
    estado_anterior: tratativa.status,
    estado_novo: 'excluida',
    data_mudanca: agora,
    usuario: quem,
    observacao: `Excluída - Motivo: ${dados.justificativa}`,
  }];
  const { error } = await sb.from('tratativa_base').update({
    status: 'excluida',
    excluida: true,
    justificativa_exclusao: dados.justificativa,
    data_exclusao: agora,
    excluida_por_nome: quem,
    historico_estados: historico,
    updated_date: agora,
    atualizado_em: agora,
  }).eq('id', tratativa.id);
  if (error) return erro(422, 'recusada_pelo_banco', 'O banco recusou a exclusão.', error.message);
  return responder({ dados: { id: tratativa.id, id_interno: tratativa.id_interno, excluida: true } });
}

async function listarApuracao({ sb, params }: Contexto) {
  const { erros, filtros } = filtrosDeApuracao(params);
  if (erros.length) return erro(400, 'parametro_invalido', 'Parâmetro inválido.', erros);
  const pg = paginacao(params);
  let q = sb.from('apuracao').select(CAMPOS_APURACAO.join(','), { count: 'exact' });
  if (filtros.tipo) q = q.eq('tipo_apuracao', filtros.tipo);
  if (filtros.colaborador_id) q = q.eq('colaborador_id', filtros.colaborador_id);
  // a apuração cobre um período: entra se o período dela cruza o intervalo pedido
  if (filtros.desde) q = q.gte('periodo_fim', filtros.desde);
  if (filtros.ate) q = q.lte('periodo_inicio', filtros.ate);
  const { data, count, error } = await q.order('periodo_fim', { ascending: false }).range(pg.de, pg.ate);
  if (error) return erro(500, 'erro_interno', 'Não consegui consultar a apuração.');
  return responder({ dados: data, paginacao: { pagina: pg.pagina, limite: pg.limite, total: count ?? data.length } });
}

async function listarEtapas({ sb }: Contexto) {
  const { data, error } = await sb.from('etapa_jornada').select(CAMPOS_ETAPA.join(',')).order('ordem');
  if (error) return erro(500, 'erro_interno', 'Não consegui consultar as etapas.');
  return responder({ dados: data });
}

async function listarMotivos({ sb }: Contexto) {
  const { data, error } = await sb.from('motivo_tratativa').select(CAMPOS_MOTIVO.join(',')).order('ordem');
  if (error) return erro(500, 'erro_interno', 'Não consegui consultar os motivos.');
  return responder({ dados: data });
}

async function resumoDaJornada({ sb, params }: Contexto) {
  const { erros, filtros } = filtrosDeTratativas(params);
  if (erros.length) return erro(400, 'parametro_invalido', 'Parâmetro inválido.', erros);
  const colunas = 'etapa_jornada_id, etapa_jornada_nome, status, encerrado_no_sla, houve_reabertura, status_reabertura, tempo_total_minutos, valor_devolvido_cliente';
  const tratativas: any[] = [];
  // em páginas de 1000 (teto do banco), para nunca resumir só uma parte
  for (let de = 0; ; de += 1000) {
    let q = sb.from('tratativa_base').select(colunas).or('excluida.is.null,excluida.eq.false');
    if (filtros.tipo) q = q.eq('tipo_tratativa', filtros.tipo);
    if (filtros.desde) q = q.gte('data_registro', `${filtros.desde}T00:00:00-03:00`);
    if (filtros.ate) q = q.lte('data_registro', `${filtros.ate}T23:59:59.999-03:00`);
    const { data, error } = await q.order('data_registro').range(de, de + 999);
    if (error) return erro(500, 'erro_interno', 'Não consegui montar o resumo da jornada.');
    tratativas.push(...data);
    if (data.length < 1000) break;
  }
  const { data: etapas } = await sb.from('etapa_jornada').select('id, nome');
  return responder({ dados: resumoPorEtapa(tratativas, etapas ?? []), total_tratativas: tratativas.length });
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
  { metodo: 'PATCH', caminho: /^\/v1\/tratativas\/[^/]+$/, recurso: 'tratativas', acao: 'atualizar', f: atualizarTratativa },
  { metodo: 'GET', caminho: /^\/v1\/acompanhamento\/[^/]+$/, recurso: 'acompanhamento', acao: 'ler', f: acompanhamento },
  { metodo: 'DELETE', caminho: /^\/v1\/tratativas\/[^/]+$/, recurso: 'tratativas', acao: 'excluir', f: excluirTratativa },
  { metodo: 'GET', caminho: /^\/v1\/apuracao$/, recurso: 'apuracao', acao: 'ler', f: listarApuracao },
  { metodo: 'GET', caminho: /^\/v1\/jornada\/etapas$/, recurso: 'jornada', acao: 'ler', f: listarEtapas },
  { metodo: 'GET', caminho: /^\/v1\/jornada\/motivos$/, recurso: 'jornada', acao: 'ler', f: listarMotivos },
  { metodo: 'GET', caminho: /^\/v1\/jornada\/resumo$/, recurso: 'jornada', acao: 'ler', f: resumoDaJornada },
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
