/**
 * COMPETÊNCIAS DA LEITURA DE PESSOAS
 *
 * A lista é fixa de propósito. Se cada gestor escrevesse a competência que
 * quisesse, nada poderia ser comparado entre pessoas nem ao longo do tempo —
 * e o radar do Oráculo perderia o sentido. São seis humanas e seis técnicas,
 * todas avaliadas de 1 a 5, sempre pelo gestor, dentro de Observações.
 *
 * Leituras antigas (migration 22) não têm disciplina nem negociação: não
 * existiam no Oráculo do Base44. Ficam vazias, e vazio não entra na média.
 */

export const ESCALA = [
  { valor: 1, rotulo: 'Muito abaixo' },
  { valor: 2, rotulo: 'Abaixo' },
  { valor: 3, rotulo: 'No esperado' },
  { valor: 4, rotulo: 'Acima' },
  { valor: 5, rotulo: 'Referência' },
];

export const COMPETENCIAS_HUMANAS = [
  { chave: 'comunicacao', rotulo: 'Comunicação', ajuda: 'Explica com clareza, no tom certo, e confirma que foi entendido.' },
  { chave: 'empatia', rotulo: 'Empatia', ajuda: 'Entende o lado do cliente e do colega antes de responder.' },
  { chave: 'colaboracao', rotulo: 'Colaboração', ajuda: 'Ajuda o time, divide o que aprendeu, não deixa a fila do outro cair.' },
  { chave: 'disciplina', rotulo: 'Disciplina', ajuda: 'Cumpre horário, escala e combinados sem precisar de cobrança.' },
  { chave: 'adaptabilidade', rotulo: 'Adaptabilidade', ajuda: 'Lida bem com mudança de regra, de sistema e com pressão.' },
  { chave: 'iniciativa', rotulo: 'Iniciativa', ajuda: 'Age antes de ser mandado, propõe melhoria, não espera o problema crescer.' },
];

export const COMPETENCIAS_TECNICAS = [
  { chave: 'dominio_produto', rotulo: 'Domínio do produto', ajuda: 'Conhece o serviço, o contrato e o sistema do cliente.' },
  { chave: 'uso_dos_pops', rotulo: 'Uso dos POPs', ajuda: 'Segue o procedimento vigente e sabe onde consultar.' },
  { chave: 'investigacao', rotulo: 'Investigação do problema', ajuda: 'Chega à causa real em vez de tratar o sintoma.' },
  { chave: 'registro_clareza', rotulo: 'Registro e clareza escrita', ajuda: 'A tratativa fica compreensível para quem pegar depois.' },
  { chave: 'gestao_de_prazo', rotulo: 'Gestão de prazo', ajuda: 'Organiza a fila, não deixa vencer e avisa antes de estourar.' },
  { chave: 'negociacao', rotulo: 'Negociação', ajuda: 'Constrói acordo sustentável, sem prometer o que a empresa não cumpre.' },
];

export const GRUPOS_COMPETENCIA = [
  { chave: 'humanas', rotulo: 'Visão humana', itens: COMPETENCIAS_HUMANAS },
  { chave: 'tecnicas', rotulo: 'Visão de processo', itens: COMPETENCIAS_TECNICAS },
];

export const TIPO_LEITURA = 'leitura';

const media = (valores) => {
  const nums = valores.filter((v) => typeof v === 'number' && !Number.isNaN(v));
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
};

/** As leituras de uma pessoa, da mais nova para a mais antiga. */
export function leiturasDoColaborador(observacoes = [], colaboradorId) {
  return observacoes
    .filter((o) => o.tipo === TIPO_LEITURA && (o.colaboradores_ids || []).includes(colaboradorId))
    .sort((a, b) => String(b.data_registro || b.created_date).localeCompare(String(a.data_registro || a.created_date)));
}

/** Média de cada competência num conjunto de leituras. Competência nunca avaliada vale null. */
export function mediaDasCompetencias(leituras = []) {
  const resultado = { humanas: {}, tecnicas: {} };
  GRUPOS_COMPETENCIA.forEach(({ chave: grupo, itens }) => {
    itens.forEach(({ chave }) => {
      resultado[grupo][chave] = media(leituras.map((l) => l.competencias?.[grupo]?.[chave]));
    });
  });
  resultado.humanas_geral = media(Object.values(resultado.humanas));
  resultado.tecnicas_geral = media(Object.values(resultado.tecnicas));
  resultado.geral = media([resultado.humanas_geral, resultado.tecnicas_geral]);
  return resultado;
}

/**
 * Os pontos do radar de um grupo: a nota da pessoa ao lado da média da
 * equipe, para o gestor ver onde ela está acima ou abaixo do time.
 */
export function pontosDoRadar(grupo, mediasPessoa, mediasEquipe) {
  const itens = GRUPOS_COMPETENCIA.find((g) => g.chave === grupo)?.itens ?? [];
  return itens.map(({ chave, rotulo }) => ({
    competencia: rotulo,
    chave,
    pessoa: mediasPessoa?.[grupo]?.[chave] ?? null,
    equipe: mediasEquipe?.[grupo]?.[chave] ?? null,
  }));
}

/** Evolução leitura a leitura, da mais antiga para a mais nova. */
export function evolucaoDasLeituras(leituras = []) {
  return [...leituras].reverse().map((l) => {
    const m = mediaDasCompetencias([l]);
    return {
      id: l.id,
      data: l.data_registro || l.created_date,
      humanas: m.humanas_geral,
      tecnicas: m.tecnicas_geral,
    };
  });
}

/** Palavras-chave mais repetidas nas leituras, da mais frequente para a menos. */
export function palavrasRecorrentes(leituras = [], limite = 12) {
  const contagem = new Map();
  leituras.forEach((l) => (l.palavras_chave || []).forEach((p) => {
    const palavra = typeof p === 'string' ? p : p?.palavra;
    if (!palavra) return;
    const atual = contagem.get(palavra) || { palavra, vezes: 0, categoria: typeof p === 'object' ? p.categoria : null };
    atual.vezes += 1;
    contagem.set(palavra, atual);
  }));
  return [...contagem.values()].sort((a, b) => b.vezes - a.vezes).slice(0, limite);
}

/** Uma leitura em branco, com tudo no esperado (3) — o gestor ajusta o que destoa. */
export function leituraEmBranco() {
  const vazio = (itens) => Object.fromEntries(itens.map(({ chave }) => [chave, 3]));
  return { humanas: vazio(COMPETENCIAS_HUMANAS), tecnicas: vazio(COMPETENCIAS_TECNICAS) };
}
