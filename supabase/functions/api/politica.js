/**
 * PORTAL CRC — API DE INTEGRAÇÕES: AS REGRAS (sem acesso a banco nem rede)
 *
 * Tudo que decide "esta chamada pode passar?" e "este corpo é válido?" mora
 * aqui, em funções puras. A Edge Function (index.ts) só liga isto ao banco, e a
 * tela de Integrações usa as mesmas listas (RECURSOS) para mostrar o que dá
 * para liberar. Como é função pura, ferramentas/testar-validacao.mjs a testa
 * sem precisar de servidor.
 *
 * ORDEM DAS TRAVAS (cada uma recusa com o seu código):
 *   1. chave geral desligada            503  integracoes_desligadas
 *   2. chave inexistente                401  chave_invalida
 *   3. chave desativada ou vencida      401  chave_desativada / chave_expirada
 *   4. integração desligada             403  integracao_desligada
 *   5. recurso/ação não liberados       403  sem_permissao
 *   6. limite de chamadas por minuto    429  limite_excedido
 */

export const VERSAO = 'v1';

/**
 * O que uma integração pode acessar. Cada recurso tem suas ações: "ler" e
 * "gravar" são liberadas SEPARADAMENTE na tela (uma integração pode só ler,
 * só gravar ou os dois).
 */
export const RECURSOS = {
  tratativas: {
    rotulo: 'Tratativas',
    acoes: {
      ler: 'Consultar tratativas (sem o custo operacional)',
      gravar: 'Registrar tratativas novas',
      atualizar: 'Atualizar tickets, resumo do WhatsApp e dados do ClickDesk de tratativas existentes',
      excluir: 'Excluir tratativas em aberto (exclusão lógica, com justificativa; a tratativa some dos números, mas fica registrada)',
    },
  },
  acompanhamento: {
    rotulo: 'Acompanhamento para o cliente (WhatsApp)',
    acoes: { ler: 'Consultar só a situação e o resumo que o cliente pode ver, pelo número TRT ou pelo ticket, mediante o CNPJ do cliente' },
  },
  apuracao: {
    rotulo: 'Apuração (CSAT, performance e CX)',
    acoes: { ler: 'Consultar os números diários de telefone, chat e CX por colaborador (sem o detalhe de cada ligação)' },
  },
  jornada: {
    rotulo: 'Jornada do cliente',
    acoes: { ler: 'Consultar as etapas, os motivos e o resumo por etapa (volume, prazo, devolução; sem custo operacional)' },
  },
  colaboradores: {
    rotulo: 'Colaboradores',
    acoes: { ler: 'Consultar nome, cargo e equipe (sem salário nem e-mail)' },
  },
  ciclos: {
    rotulo: 'Ciclos de premiação',
    acoes: { ler: 'Consultar os ciclos trimestrais' },
  },
};

/** A integração tem esta ação liberada neste recurso? */
export function permitido(recursos, recurso, acao) {
  return recursos?.[recurso]?.[acao] === true;
}

/* ------------------------------------------------------------------ *
 * CHAVE
 * ------------------------------------------------------------------ */

const FORMATO_CHAVE = /^crc_[0-9a-f]{48}$/;

/** Lê a chave de "Authorization: Bearer ..." ou de "x-api-key". */
export function extrairChave(cabecalho) {
  const auth = cabecalho('authorization') ?? '';
  const bearer = /^Bearer\s+(\S+)$/i.exec(auth)?.[1];
  const candidata = bearer ?? cabecalho('x-api-key') ?? '';
  return FORMATO_CHAVE.test(candidata) ? candidata : null;
}

export async function sha256hex(texto) {
  const bytes = new TextEncoder().encode(texto);
  const resumo = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(resumo)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ------------------------------------------------------------------ *
 * A DECISÃO
 * ------------------------------------------------------------------ */

const recusa = (status, codigo, motivo) => ({ ok: false, status, codigo, motivo });

/**
 * @param {object} p
 * @param {boolean} p.geral               a chave geral está ligada?
 * @param {object|null} p.chave           { ativa, expira_em } ou null se não existe
 * @param {object|null} p.integracao      { ativa, recursos, limite_por_minuto }
 * @param {string|null} p.recurso         null no "ping" (só prova que a chave serve)
 * @param {string|null} p.acao            'ler' | 'gravar'
 * @param {Date} p.agora
 * @param {number} p.usoNoUltimoMinuto    chamadas desta integração no último minuto (as recusadas por limite não contam)
 */
export function decidir({ geral, chave, integracao, recurso, acao, agora, usoNoUltimoMinuto = 0 }) {
  if (!geral) return recusa(503, 'integracoes_desligadas', 'As integrações do Portal estão desligadas no momento.');
  if (!chave || !integracao) return recusa(401, 'chave_invalida', 'Chave de API inválida.');
  if (!chave.ativa) return recusa(401, 'chave_desativada', 'Esta chave foi desativada.');
  if (chave.expira_em && new Date(chave.expira_em) <= agora) return recusa(401, 'chave_expirada', 'Esta chave expirou.');
  if (!integracao.ativa) return recusa(403, 'integracao_desligada', 'Esta integração está desligada.');
  if (recurso && !permitido(integracao.recursos, recurso, acao)) {
    return recusa(403, 'sem_permissao', `Esta integração não tem permissão para "${acao}" em "${recurso}".`);
  }
  if (usoNoUltimoMinuto >= (integracao.limite_por_minuto ?? 60)) {
    return recusa(429, 'limite_excedido', `Limite de ${integracao.limite_por_minuto} chamadas por minuto atingido. Tente de novo em instantes.`);
  }
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * LEITURA: O QUE SAI
 * ------------------------------------------------------------------ */

/** Só estes campos de tratativa saem. O custo operacional nunca. */
export const CAMPOS_TRATATIVA = [
  'id', 'id_interno', 'tipo_tratativa', 'prioridade', 'status',
  'nome_cliente', 'id_base_cliente', 'cnpj_cliente', 'cliente_sem_cnpj', 'link_zendesk', 'link_intranet',
  'motivo_nome', 'plano_cliente', 'modalidade_plano', 'segmento_cliente',
  'agente_responsavel_id', 'agente_responsavel_nome',
  'data_registro', 'data_inicio_tratativa', 'data_encerramento',
  'tempo_total_minutos', 'sla_atribuido', 'encerrado_no_sla',
  'houve_reabertura', 'status_reabertura',
  'houve_devolucao_financeira', 'valor_devolvido_cliente',
  'nota_reclame_aqui', 'numero_case_contestacao',
  'status_resolucao_contestacao', 'status_final_contestacao',
  'ticket_zendesk', 'ticket_clickdesk', 'dados_clickdesk',
  'resumo_whatsapp', 'resumo_whatsapp_atualizado_em',
  'created_date', 'updated_date',
];

export const CAMPOS_COLABORADOR = ['id', 'nome_completo', 'cargo_atual', 'equipe_nome', 'ativo'];
/** Apuração sem o historico_detalhado (cada ligação e cada ticket individual). */
export const CAMPOS_APURACAO = [
  'id', 'colaborador_id', 'colaborador_nome', 'tipo_apuracao', 'fonte',
  'periodo_inicio', 'periodo_fim', 'intervalo', 'modo',
  'dados_por_data', 'canal_telefone', 'canal_chat', 'avaliacao_cx',
  'satisfacao_media', 'percentual_avaliados', 'data_apuracao',
];
export const CAMPOS_ETAPA = ['id', 'nome', 'descricao', 'ordem', 'ativa'];
export const CAMPOS_MOTIVO = ['id', 'motivo', 'descricao', 'submotivos', 'ordem', 'ativo'];

export const CAMPOS_CICLO = ['id', 'nome', 'data_inicio', 'data_fim', 'ativo'];

export const TIPOS = ['reclamacao_interna', 'reclame_aqui', 'google_meu_negocio', 'contestacao', 'administrativas', 'procon'];
export const PRIORIDADES = ['baixa', 'media', 'alta', 'critica'];
export const STATUS = [
  'registrada', 'tratativa_iniciada', 'em_andamento', 'dependencia_externa',
  'aguardando_financeiro', 'encerrada', 'aguardando_confirmacao_reabertura', 'excluida',
];
const PLANOS = ['Bronze', 'Prata', 'Ouro', 'Platina', 'ClickNotas', 'Outros', 'Essencial'];
const MODALIDADES = ['Mensal', 'Trimestral', 'Semestral', 'Anual'];

const ehData = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** Paginação: limite de 1 a 200 (padrão 50) e página a partir de 1. */
export function paginacao(params) {
  const limite = Math.min(200, Math.max(1, parseInt(params.get('limite') ?? '50', 10) || 50));
  const pagina = Math.max(1, parseInt(params.get('pagina') ?? '1', 10) || 1);
  return { limite, pagina, de: (pagina - 1) * limite, ate: (pagina - 1) * limite + limite - 1 };
}

/** Filtros aceitos em GET /v1/tratativas. Valor fora da lista vira erro, não filtro mudo. */
export function filtrosDeTratativas(params) {
  const erros = [];
  const filtros = {};
  const tipo = params.get('tipo');
  const status = params.get('status');
  const prioridade = params.get('prioridade');
  const desde = params.get('desde');
  const ate = params.get('ate');
  if (tipo) { if (TIPOS.includes(tipo)) filtros.tipo = tipo; else erros.push(`tipo inválido (use: ${TIPOS.join(', ')})`); }
  if (status) { if (STATUS.includes(status)) filtros.status = status; else erros.push(`status inválido (use: ${STATUS.join(', ')})`); }
  if (prioridade) { if (PRIORIDADES.includes(prioridade)) filtros.prioridade = prioridade; else erros.push(`prioridade inválida (use: ${PRIORIDADES.join(', ')})`); }
  if (desde) { if (ehData(desde)) filtros.desde = desde; else erros.push('desde deve ser uma data AAAA-MM-DD'); }
  if (ate) { if (ehData(ate)) filtros.ate = ate; else erros.push('ate deve ser uma data AAAA-MM-DD'); }
  return { erros, filtros };
}

/* ------------------------------------------------------------------ *
 * GRAVAÇÃO: O QUE ENTRA
 * ------------------------------------------------------------------ */

/**
 * Mesmo prazo de resposta (em horas) da tela. Há um teste que confere esta
 * tabela com a de src/components/utils/helpers.js, para as duas não divergirem.
 */
export function slaDoTipo(tipo) {
  const mapa = { reclamacao_interna: 24, reclame_aqui: 48, google_meu_negocio: 72, contestacao: 72 };
  return mapa[tipo] || 24;
}

const CAMPOS_ACEITOS = [
  'nome_cliente', 'tipo_tratativa', 'prioridade', 'link_zendesk', 'link_intranet',
  'id_base_cliente', 'cnpj_cliente', 'plano_cliente', 'modalidade_plano',
  'valor_contratacao_plano_atual', 'data_primeira_contratacao', 'data_contratacao_plano_atual',
  'segmento_cliente', 'numero_case_contestacao', 'motivo_contestacao',
  'valor_contestado_inicial', 'prazo_sla_dias', 'observacao',
  'ticket_zendesk', 'ticket_clickdesk', 'dados_clickdesk', 'resumo_whatsapp', 'cliente_sem_cnpj',
];

/** Resumo para o cliente: o mesmo teto da coluna no banco. */
export const LIMITE_RESUMO = 600;

/** Tamanho máximo do JSON que a integração guarda em dados_clickdesk. */
const LIMITE_JSON_BYTES = 20_000;

/** Número de ticket ou de tratativa: letras, números, ponto, hífen e sublinhado. */
const CODIGO_VALIDO = /^[A-Za-z0-9._-]{1,100}$/;

function jsonLimitado(valor, campo, erros) {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  if (typeof valor !== 'object' || Array.isArray(valor)) { erros.push(`${campo} deve ser um objeto JSON`); return undefined; }
  if (JSON.stringify(valor).length > LIMITE_JSON_BYTES) { erros.push(`${campo} passa de ${LIMITE_JSON_BYTES} caracteres`); return undefined; }
  return valor;
}

/**
 * Confere o corpo de POST /v1/tratativas. Devolve { erros, dados }.
 * Só entram campos conhecidos; qualquer outro é recusado (para quem integra
 * descobrir o erro de digitação na hora, e não semanas depois).
 * Campos que o servidor calcula (status, prazo, número, custo, pontos...) não
 * podem ser enviados.
 */
export function validarNovaTratativa(corpo) {
  const erros = [];
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
    return { erros: ['o corpo deve ser um objeto JSON'], dados: null };
  }
  const desconhecidos = Object.keys(corpo).filter((k) => !CAMPOS_ACEITOS.includes(k));
  if (desconhecidos.length) erros.push(`campos não aceitos: ${desconhecidos.join(', ')}`);

  const texto = (campo, max = 500) => {
    const v = corpo[campo];
    if (v === undefined || v === null || v === '') return undefined;
    if (typeof v !== 'string') { erros.push(`${campo} deve ser texto`); return undefined; }
    if (v.length > max) { erros.push(`${campo} deve ter no máximo ${max} caracteres`); return undefined; }
    return v.trim();
  };
  const lista = (campo, opcoes, obrigatorio = false) => {
    const v = corpo[campo];
    if (v === undefined || v === null || v === '') { if (obrigatorio) erros.push(`${campo} é obrigatório`); return undefined; }
    if (!opcoes.includes(v)) { erros.push(`${campo}: valor inválido (use: ${opcoes.join(', ')})`); return undefined; }
    return v;
  };
  const numero = (campo, { minimo = 0, inteiro = false, maximo } = {}) => {
    const v = corpo[campo];
    if (v === undefined || v === null || v === '') return undefined;
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n) || n < minimo || (maximo !== undefined && n > maximo) || (inteiro && !Number.isInteger(n))) {
      erros.push(`${campo} deve ser um número${inteiro ? ' inteiro' : ''} entre ${minimo}${maximo !== undefined ? ` e ${maximo}` : ' ou mais'}`);
      return undefined;
    }
    return n;
  };
  const data = (campo) => {
    const v = corpo[campo];
    if (v === undefined || v === null || v === '') return undefined;
    if (typeof v !== 'string' || !ehData(v)) { erros.push(`${campo} deve ser uma data AAAA-MM-DD`); return undefined; }
    return v;
  };

  const nome = texto('nome_cliente', 200);
  if (!nome) erros.push('nome_cliente é obrigatório');
  const tipo = lista('tipo_tratativa', TIPOS, true);
  const prioridade = lista('prioridade', PRIORIDADES, true);

  // O CNPJ é obrigatório em tratativa nova: é a senha da consulta do cliente no WhatsApp.
  // Cliente sem CNPJ marca cliente_sem_cnpj: true (e então não envia o CNPJ). Esse
  // cliente não consegue consultar pelo WhatsApp.
  const semCnpj = corpo.cliente_sem_cnpj;
  if (semCnpj !== undefined && typeof semCnpj !== 'boolean') erros.push('cliente_sem_cnpj deve ser true ou false');
  const cnpj = texto('cnpj_cliente', 30);
  const cnpjNumeros = cnpj ? cnpj.replace(/\D/g, '') : undefined;
  if (semCnpj === true) {
    if (cnpj) erros.push('envie o CNPJ ou marque cliente_sem_cnpj, não os dois');
  } else if (!cnpj) {
    erros.push('cnpj_cliente é obrigatório (ou envie cliente_sem_cnpj: true quando o cliente não tem CNPJ)');
  } else if (!cnpjValido(cnpj)) {
    erros.push('cnpj_cliente inválido: use 14 dígitos com os dígitos verificadores corretos');
  }

  const link = (campo) => {
    const v = texto(campo, 500);
    if (v && !/^https?:\/\//i.test(v)) { erros.push(`${campo} deve começar com http:// ou https://`); return undefined; }
    return v;
  };

  const dados = {
    nome_cliente: nome,
    tipo_tratativa: tipo,
    prioridade,
    link_zendesk: link('link_zendesk'),
    link_intranet: link('link_intranet'),
    id_base_cliente: texto('id_base_cliente', 100),
    cnpj_cliente: semCnpj === true ? undefined : cnpjNumeros,
    cliente_sem_cnpj: semCnpj === true ? true : undefined,
    plano_cliente: lista('plano_cliente', PLANOS),
    modalidade_plano: lista('modalidade_plano', MODALIDADES),
    valor_contratacao_plano_atual: numero('valor_contratacao_plano_atual'),
    data_primeira_contratacao: data('data_primeira_contratacao'),
    data_contratacao_plano_atual: data('data_contratacao_plano_atual'),
    segmento_cliente: texto('segmento_cliente', 100),
    ticket_zendesk: texto('ticket_zendesk', 100),
    ticket_clickdesk: texto('ticket_clickdesk', 100),
    resumo_whatsapp: texto('resumo_whatsapp', LIMITE_RESUMO),
  };
  for (const campo of ['ticket_zendesk', 'ticket_clickdesk']) {
    if (dados[campo] && !CODIGO_VALIDO.test(dados[campo])) erros.push(`${campo} só pode ter letras, números, ponto, hífen e sublinhado`);
  }
  const clickdesk = jsonLimitado(corpo.dados_clickdesk, 'dados_clickdesk', erros);
  if (clickdesk !== undefined) dados.dados_clickdesk = clickdesk;

  if (tipo === 'contestacao') {
    dados.numero_case_contestacao = texto('numero_case_contestacao', 100);
    if (!dados.numero_case_contestacao) erros.push('numero_case_contestacao é obrigatório para contestação');
    dados.motivo_contestacao = texto('motivo_contestacao', 150);
    if (!dados.motivo_contestacao) erros.push('motivo_contestacao é obrigatório para contestação (até 150 caracteres)');
    dados.valor_contestado_inicial = numero('valor_contestado_inicial', { minimo: 0.01 });
    if (dados.valor_contestado_inicial === undefined) erros.push('valor_contestado_inicial é obrigatório para contestação (maior que zero)');
    dados.prazo_sla_dias = numero('prazo_sla_dias', { minimo: 1, maximo: 365, inteiro: true });
    if (dados.prazo_sla_dias === undefined) erros.push('prazo_sla_dias é obrigatório para contestação (1 a 365)');
  } else {
    for (const c of ['numero_case_contestacao', 'motivo_contestacao', 'valor_contestado_inicial', 'prazo_sla_dias']) {
      if (corpo[c] !== undefined && corpo[c] !== null && corpo[c] !== '') erros.push(`${c} só vale para contestação`);
    }
  }

  // sem chave sem valor: o banco usa o padrão dele
  for (const k of Object.keys(dados)) if (dados[k] === undefined) delete dados[k];
  return { erros, dados: erros.length ? null : dados, observacao: texto('observacao', 1000) };
}

/* ------------------------------------------------------------------ *
 * ATUALIZAR (PATCH)
 * ------------------------------------------------------------------ */

const CAMPOS_ATUALIZAVEIS = ['ticket_zendesk', 'ticket_clickdesk', 'dados_clickdesk', 'resumo_whatsapp'];

/**
 * Confere o corpo de PATCH /v1/tratativas/{codigo}. Só os quatro campos de
 * atendimento ao cliente podem ser alterados por aqui (estado, prazo, pontos e
 * demais continuam só pela tela). Valor null limpa o campo.
 */
export function validarAtualizacaoTratativa(corpo) {
  const erros = [];
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
    return { erros: ['o corpo deve ser um objeto JSON'], dados: null };
  }
  const desconhecidos = Object.keys(corpo).filter((k) => !CAMPOS_ATUALIZAVEIS.includes(k));
  if (desconhecidos.length) erros.push(`campos não aceitos: ${desconhecidos.join(', ')} (aceitos: ${CAMPOS_ATUALIZAVEIS.join(', ')})`);
  if (!Object.keys(corpo).some((k) => CAMPOS_ATUALIZAVEIS.includes(k))) erros.push('envie ao menos um campo para atualizar');

  const dados = {};
  for (const campo of ['ticket_zendesk', 'ticket_clickdesk']) {
    if (!(campo in corpo)) continue;
    const v = corpo[campo];
    if (v === null || v === '') dados[campo] = null;
    else if (typeof v !== 'string' || !CODIGO_VALIDO.test(v.trim())) erros.push(`${campo} só pode ter letras, números, ponto, hífen e sublinhado`);
    else dados[campo] = v.trim();
  }
  if ('resumo_whatsapp' in corpo) {
    const v = corpo.resumo_whatsapp;
    if (v === null || v === '') dados.resumo_whatsapp = null;
    else if (typeof v !== 'string') erros.push('resumo_whatsapp deve ser texto');
    else if (v.trim().length > LIMITE_RESUMO) erros.push(`resumo_whatsapp deve ter no máximo ${LIMITE_RESUMO} caracteres`);
    else dados.resumo_whatsapp = v.trim();
  }
  if ('dados_clickdesk' in corpo) {
    const j = jsonLimitado(corpo.dados_clickdesk, 'dados_clickdesk', erros);
    if (j !== undefined) dados.dados_clickdesk = j;
  }
  return { erros, dados: erros.length ? null : dados };
}

/* ------------------------------------------------------------------ *
 * ACOMPANHAMENTO PARA O CLIENTE (WhatsApp)
 * ------------------------------------------------------------------ */

/**
 * O que o cliente pode ver, em linguagem de cliente, conforme o estado. Quando o
 * agente não escreveu um resumo próprio, a API devolve esta mensagem padrão.
 * Nada interno (prazo, custo, nome de agente, motivo) entra aqui.
 */
export function situacaoParaCliente(status) {
  switch (status) {
    case 'registrada':
      return { situacao: 'Recebida', mensagem: 'Recebemos a sua solicitação e ela está na fila para atendimento.' };
    case 'tratativa_iniciada':
    case 'em_andamento':
      return { situacao: 'Em atendimento', mensagem: 'A sua solicitação está em atendimento pela nossa equipe.' };
    case 'dependencia_externa':
      return { situacao: 'Aguardando retorno', mensagem: 'Estamos aguardando o retorno de outra área para seguir com a sua solicitação.' };
    case 'aguardando_financeiro':
      return { situacao: 'Em análise financeira', mensagem: 'A sua solicitação está em análise pelo setor financeiro.' };
    case 'encerrada':
    case 'aguardando_confirmacao_reabertura':
      return { situacao: 'Concluída', mensagem: 'A sua solicitação foi concluída. Se precisar de algo mais, fale com o nosso atendimento.' };
    default:
      return { situacao: 'Em andamento', mensagem: 'A sua solicitação está em andamento.' };
  }
}

/** Só estes campos saem no acompanhamento. */
export function montarAcompanhamento(t) {
  const padrao = situacaoParaCliente(t.status);
  const proprio = typeof t.resumo_whatsapp === 'string' ? t.resumo_whatsapp.trim() : '';
  return {
    codigo: t.id_interno,
    ticket_zendesk: t.ticket_zendesk ?? null,
    ticket_clickdesk: t.ticket_clickdesk ?? null,
    situacao: padrao.situacao,
    resumo: proprio || padrao.mensagem,
    resumo_do_atendente: proprio.length > 0,
    atualizado_em: t.resumo_whatsapp_atualizado_em ?? t.updated_date ?? null,
  };
}

/** Só os dígitos de um texto (o CNPJ pode vir como 12.345.678/0001-90, com espaço ou tab). */
export const apenasDigitos = (v) => String(v ?? '').replace(/\D/g, '');

/**
 * O CNPJ tem 14 dígitos e os dois últimos conferem (mesma conta de
 * src/lib/validacao.js; há teste que compara as duas). Barrar CNPJ inválido ANTES
 * de consultar o banco tira da frente quem só está chutando números.
 */
export function cnpjValido(bruto) {
  const d = apenasDigitos(bruto);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const digito = (ate) => {
    let peso = ate - 7;
    let soma = 0;
    for (let i = 0; i < ate; i++) {
      soma += Number(d[i]) * peso--;
      if (peso < 2) peso = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return digito(12) === Number(d[12]) && digito(13) === Number(d[13]);
}

/** Dos candidatos achados pelo código, fica o que tem o CNPJ informado (o mais recente, se houver mais de um do mesmo cliente). */
export function escolherDoCliente(linhas, cnpjInformado) {
  const alvo = apenasDigitos(cnpjInformado);
  if (alvo.length !== 14) return null;
  const doCliente = (linhas ?? []).filter((l) => apenasDigitos(l.cnpj_cliente) === alvo);
  if (!doCliente.length) return null;
  return [...doCliente].sort((a, b) => String(b.data_registro ?? '').localeCompare(String(a.data_registro ?? '')))[0];
}

/** Tentativas erradas seguidas do mesmo código antes de travar a consulta por um tempo. */
export const MAXIMO_ERROS_POR_CODIGO = 5;
export const JANELA_ERROS_MINUTOS = 15;

/**
 * O que a pessoa digitou: número TRT (TRT-0123) ou número de ticket. Devolve
 * { tipo: 'trt' | 'ticket', valor } ou null se o formato não serve.
 */
export function interpretarCodigo(bruto) {
  const texto = String(bruto ?? '').trim().replace(/^#/, '');
  if (!CODIGO_VALIDO.test(texto)) return null;
  const trt = /^TRT-(\d+)$/i.exec(texto);
  // o número é gravado com 4 dígitos (TRT-0012): "TRT-12" e "trt-0012" são a mesma tratativa
  if (trt) return { tipo: 'trt', valor: `TRT-${trt[1].padStart(4, '0')}` };
  return { tipo: 'ticket', valor: texto };
}

/* ------------------------------------------------------------------ *
 * EXCLUIR (DELETE)
 * ------------------------------------------------------------------ */

/** Estados em que a API NÃO exclui: tratativa encerrada já conta nos pontos e nos ciclos. */
export const ESTADOS_QUE_NAO_EXCLUEM = ['encerrada', 'aguardando_confirmacao_reabertura', 'excluida'];

/** Corpo de DELETE /v1/tratativas/{codigo}: a justificativa é obrigatória (mínimo 10 caracteres, como na tela). */
export function validarExclusao(corpo) {
  const erros = [];
  const justificativa = typeof corpo?.justificativa === 'string' ? corpo.justificativa.trim() : '';
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) return { erros: ['o corpo deve ser um objeto JSON com a justificativa'], dados: null };
  const desconhecidos = Object.keys(corpo).filter((k) => k !== 'justificativa');
  if (desconhecidos.length) erros.push(`campos não aceitos: ${desconhecidos.join(', ')}`);
  if (justificativa.length < 10) erros.push('justificativa é obrigatória (mínimo de 10 caracteres)');
  if (justificativa.length > 500) erros.push('justificativa deve ter no máximo 500 caracteres');
  return { erros, dados: erros.length ? null : { justificativa } };
}

/* ------------------------------------------------------------------ *
 * APURAÇÃO (leitura)
 * ------------------------------------------------------------------ */

export const TIPOS_APURACAO = ['telefone', 'chat', 'cx'];

/** Filtros de GET /v1/apuracao: tipo, colaborador_id, desde e ate (o período da apuração cruza o intervalo). */
export function filtrosDeApuracao(params) {
  const erros = [];
  const filtros = {};
  const tipo = params.get('tipo');
  const colaborador = params.get('colaborador_id');
  const desde = params.get('desde');
  const ate = params.get('ate');
  if (tipo) { if (TIPOS_APURACAO.includes(tipo)) filtros.tipo = tipo; else erros.push(`tipo inválido (use: ${TIPOS_APURACAO.join(', ')})`); }
  if (colaborador) { if (CODIGO_VALIDO.test(colaborador)) filtros.colaborador_id = colaborador; else erros.push('colaborador_id inválido'); }
  if (desde) { if (ehData(desde)) filtros.desde = desde; else erros.push('desde deve ser uma data AAAA-MM-DD'); }
  if (ate) { if (ehData(ate)) filtros.ate = ate; else erros.push('ate deve ser uma data AAAA-MM-DD'); }
  return { erros, filtros };
}

/* ------------------------------------------------------------------ *
 * JORNADA DO CLIENTE (leitura)
 * ------------------------------------------------------------------ */

const ENCERRADAS = ['encerrada', 'aguardando_confirmacao_reabertura'];

/**
 * O resumo por etapa da jornada: quantas tratativas, quantas encerradas, quantas
 * no prazo, quantas reabertas, tempo médio das encerradas e o valor devolvido ao
 * cliente. Só o que não é sensível: NADA de custo operacional (que depende de
 * salário). Tratativa sem etapa vai para "sem_etapa".
 */
export function resumoPorEtapa(tratativas = [], etapas = []) {
  const nomes = new Map(etapas.map((e) => [e.id, e.nome]));
  const grupos = new Map();
  for (const t of tratativas) {
    const chave = t.etapa_jornada_id || 'sem_etapa';
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(t);
  }
  const linhas = [...grupos.entries()].map(([id, lista]) => {
    const encerradas = lista.filter((t) => ENCERRADAS.includes(t.status));
    const comTempo = encerradas.filter((t) => Number(t.tempo_total_minutos) > 0);
    const noPrazo = encerradas.filter((t) => t.encerrado_no_sla === true).length;
    const devolvido = lista.reduce((soma, t) => soma + (Number(t.valor_devolvido_cliente) || 0), 0);
    return {
      etapa_id: id === 'sem_etapa' ? null : id,
      etapa: id === 'sem_etapa' ? 'Sem etapa definida' : (nomes.get(id) ?? lista[0].etapa_jornada_nome ?? 'Etapa removida'),
      total: lista.length,
      encerradas: encerradas.length,
      em_aberto: lista.length - encerradas.length,
      no_prazo: noPrazo,
      percentual_no_prazo: encerradas.length ? Math.round((noPrazo / encerradas.length) * 1000) / 10 : null,
      reabertas: lista.filter((t) => t.houve_reabertura === true || t.status_reabertura === 'cliente_reabriu').length,
      tempo_medio_minutos: comTempo.length ? Math.round(comTempo.reduce((s, t) => s + Number(t.tempo_total_minutos), 0) / comTempo.length) : null,
      valor_devolvido: Math.round(devolvido * 100) / 100,
    };
  });
  return linhas.sort((a, b) => b.total - a.total);
}
