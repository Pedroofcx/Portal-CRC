/**
 * Avisos e pesquisas pendentes de uma pessoa — as regras da central de
 * pendências da tela inicial (e das listas de avisos e pesquisas do agente).
 *
 * Funções puras, testadas em `npm run testar`.
 *
 * AS REGRAS
 *   1. Só o que é PARA a pessoa: aviso com destinatário "todos", ou o papel
 *      dela ("agentes" / "gestores").
 *   2. Só o que está VIGENTE: aviso ativo, já publicado e não expirado;
 *      pesquisa ativa e dentro do período (data_inicio .. data_fim).
 *   3. Só o que foi publicado DEPOIS DO CADASTRO da pessoa (decisão de
 *      21/09/2026): quem chega agora não recebe — nem vê — aviso ou
 *      pesquisa do passado. O gestor continua vendo tudo nas listas.
 *   4. Aviso some quando a pessoa confirma a leitura; pesquisa, quando ela
 *      responde. O que foi tratado NESTA sessão some na hora, sem esperar a
 *      releitura do banco — antes, nesse intervalo, a mesma pesquisa podia
 *      voltar a aparecer.
 */

const SO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Início do dia local de uma data "YYYY-MM-DD", ou a data-hora como veio. */
const instante = (valor, fimDoDia = false) => {
  if (!valor) return null;
  if (typeof valor === 'string' && SO_DATA.test(valor)) {
    const [a, m, d] = valor.split('-').map(Number);
    return fimDoDia ? new Date(a, m - 1, d, 23, 59, 59, 999) : new Date(a, m - 1, d);
  }
  const t = new Date(valor);
  return Number.isNaN(t.getTime()) ? null : t;
};

/** Quando o aviso/pesquisa passou a valer — a referência da regra 3. */
export function dataDePublicacao(item) {
  return instante(item?.data_publicacao) ?? instante(item?.data_inicio) ?? instante(item?.created_date);
}

/** Regra 3: publicado depois do cadastro da pessoa. Sem data de cadastro, não bloqueia. */
export function publicadoDepoisDoCadastro(item, colaborador) {
  const cadastro = instante(colaborador?.created_date);
  const publicado = dataDePublicacao(item);
  if (!cadastro || !publicado) return true;
  return publicado >= cadastro;
}

/** Regra 1 (avisos). */
export function avisoEhPara(aviso, papel) {
  const d = aviso?.destinatarios ?? 'todos';
  return d === 'todos' || (d === 'agentes' && papel === 'agente') || (d === 'gestores' && papel === 'gestor');
}

/** Regra 2 (avisos). */
export function avisoVigente(aviso, agora = new Date()) {
  if (!aviso || aviso.ativo === false) return false;
  const publicacao = instante(aviso.data_publicacao);
  if (publicacao && publicacao > agora) return false;
  const expira = instante(aviso.data_expiracao, true);
  return !(expira && expira < agora);
}

/** Regra 2 (pesquisas). */
export function pesquisaVigente(pesquisa, agora = new Date()) {
  if (!pesquisa || pesquisa.ativa === false) return false;
  const inicio = instante(pesquisa.data_inicio);
  if (inicio && inicio > agora) return false;
  const fim = instante(pesquisa.data_fim, true);
  return !(fim && fim < agora);
}

/** Avisos que a pessoa pode ver numa lista (gestor: todos). */
export function avisosVisiveis(avisos = [], colaborador, agora = new Date()) {
  if (colaborador?.papel === 'gestor') return avisos;
  return avisos.filter((a) => avisoEhPara(a, colaborador?.papel)
    && avisoVigente(a, agora)
    && publicadoDepoisDoCadastro(a, colaborador));
}

/** Pesquisas que a pessoa pode ver numa lista (gestor: todas). */
export function pesquisasVisiveis(pesquisas = [], colaborador) {
  if (colaborador?.papel === 'gestor') return pesquisas;
  return pesquisas.filter((p) => publicadoDepoisDoCadastro(p, colaborador));
}

const PESO_TIPO = { urgente: 0, alerta: 1, comunicado: 2, informativo: 3 };

/**
 * A fila da central de pendências: avisos a confirmar (urgentes primeiro,
 * depois do mais antigo ao mais novo) e depois pesquisas a responder.
 * @returns [{ tipo: 'aviso'|'pesquisa', item }]
 */
export function filaDePendencias({
  colaborador, avisos = [], leituras = [], pesquisas = [], respostas = [],
  tratados = new Set(), agora = new Date(),
}) {
  if (!colaborador?.id) return [];
  const confirmados = new Set(leituras
    .filter((l) => l.colaborador_id === colaborador.id && l.confirmou === true)
    .map((l) => l.aviso_id));
  const respondidas = new Set(respostas
    .filter((r) => r.colaborador_id === colaborador.id)
    .map((r) => r.pesquisa_id));

  const avisosPendentes = avisos
    .filter((a) => !confirmados.has(a.id) && !tratados.has(a.id))
    .filter((a) => avisoEhPara(a, colaborador.papel) && avisoVigente(a, agora) && publicadoDepoisDoCadastro(a, colaborador))
    .sort((a, b) => (PESO_TIPO[a.tipo] ?? 9) - (PESO_TIPO[b.tipo] ?? 9)
      || (dataDePublicacao(a)?.getTime() ?? 0) - (dataDePublicacao(b)?.getTime() ?? 0));

  const pesquisasPendentes = pesquisas
    .filter((p) => !respondidas.has(p.id) && !tratados.has(p.id))
    .filter((p) => pesquisaVigente(p, agora) && publicadoDepoisDoCadastro(p, colaborador))
    .sort((a, b) => (dataDePublicacao(a)?.getTime() ?? 0) - (dataDePublicacao(b)?.getTime() ?? 0));

  return [
    ...avisosPendentes.map((item) => ({ tipo: 'aviso', item })),
    ...pesquisasPendentes.map((item) => ({ tipo: 'pesquisa', item })),
  ];
}

/**
 * Perguntas obrigatórias sem resposta (ids). Resposta de múltipla escolha
 * múltipla é "a,b"; vazia conta como não respondida.
 */
export function obrigatoriasSemResposta(pesquisa, respostas = {}) {
  return (pesquisa?.perguntas ?? [])
    .filter((p) => p.obrigatoria && !String(respostas[p.id] ?? '').trim())
    .map((p) => p.id);
}

/**
 * O registro de resposta a gravar — com a nota e o sentimento que a
 * pesquisa de clima e os relatórios usam (CSAT: 1 a 5; NPS: 0 a 10, pela
 * primeira pergunta).
 */
export function montarResposta(pesquisa, respostas, colaborador, agora = new Date()) {
  let nota = null;
  let sentimento = 'neutro';
  if (pesquisa.tipo === 'csat' || pesquisa.tipo === 'nps') {
    const primeira = respostas[pesquisa.perguntas?.[0]?.id];
    if (primeira !== undefined && primeira !== '' && !Number.isNaN(parseFloat(primeira))) {
      nota = parseFloat(primeira);
      if (pesquisa.tipo === 'csat') sentimento = nota >= 4 ? 'positivo' : nota >= 3 ? 'neutro' : 'negativo';
      else sentimento = nota >= 9 ? 'positivo' : nota >= 7 ? 'neutro' : 'negativo';
    }
  }
  const iso = agora.toISOString();
  return {
    pesquisa_id: pesquisa.id,
    pesquisa_titulo: pesquisa.titulo,
    pesquisa_tipo: pesquisa.tipo,
    colaborador_id: colaborador.id,
    colaborador_nome: colaborador.nome_completo,
    respostas: (pesquisa.perguntas ?? []).map((p) => ({ pergunta_id: p.id, resposta: respostas[p.id] ?? '' })),
    confirmou_leitura: true,
    data_leitura: iso,
    data_resposta: iso,
    nota_calculada: nota,
    sentimento,
  };
}
