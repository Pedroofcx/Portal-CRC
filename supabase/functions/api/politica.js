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
    },
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
  'nome_cliente', 'id_base_cliente', 'cnpj_cliente', 'link_zendesk', 'link_intranet',
  'motivo_nome', 'plano_cliente', 'modalidade_plano', 'segmento_cliente',
  'agente_responsavel_id', 'agente_responsavel_nome',
  'data_registro', 'data_inicio_tratativa', 'data_encerramento',
  'tempo_total_minutos', 'sla_atribuido', 'encerrado_no_sla',
  'houve_reabertura', 'status_reabertura',
  'houve_devolucao_financeira', 'valor_devolvido_cliente',
  'nota_reclame_aqui', 'numero_case_contestacao',
  'status_resolucao_contestacao', 'status_final_contestacao',
  'created_date', 'updated_date',
];

export const CAMPOS_COLABORADOR = ['id', 'nome_completo', 'cargo_atual', 'equipe_nome', 'ativo'];
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
];

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

  const cnpj = texto('cnpj_cliente', 30);
  const cnpjNumeros = cnpj ? cnpj.replace(/\D/g, '') : undefined;
  if (cnpj && cnpjNumeros.length !== 14) erros.push('cnpj_cliente deve ter 14 dígitos');

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
    cnpj_cliente: cnpjNumeros,
    plano_cliente: lista('plano_cliente', PLANOS),
    modalidade_plano: lista('modalidade_plano', MODALIDADES),
    valor_contratacao_plano_atual: numero('valor_contratacao_plano_atual'),
    data_primeira_contratacao: data('data_primeira_contratacao'),
    data_contratacao_plano_atual: data('data_contratacao_plano_atual'),
    segmento_cliente: texto('segmento_cliente', 100),
  };

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
