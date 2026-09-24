import { normalizarData, nomeComparavel } from './datas.js';

/**
 * IMPORTAÇÃO DA APURAÇÃO — reconhecer, conferir e só então salvar.
 *
 * São três fontes: 55PBX (telefone), Zendesk (chat) e a planilha de CX. O que
 * muda entre elas é o nome das colunas; o resto do caminho é igual:
 * reconhecer a fonte → sugerir o de-para de colunas → ler o período do
 * próprio arquivo → ligar os nomes dos agentes às pessoas do Portal →
 * mostrar o que vai entrar, o que vai ser descartado e o que já existe.
 *
 * Nada aqui grava. Gravar é decisão da tela, depois da conferência.
 */

export const FONTES = [
  { valor: '55pbx', rotulo: '55PBX (telefone)', tipo: 'telefone' },
  { valor: 'zendesk', rotulo: 'Zendesk (chat)', tipo: 'chat' },
  { valor: 'planilha_cx', rotulo: 'Planilha de avaliação CX', tipo: 'cx' },
];

/** Os campos que cada tipo precisa, e como eles costumam se chamar. */
export const CAMPOS = {
  telefone: [
    { chave: 'agente', rotulo: 'Agente', obrigatorio: true, sinonimos: ['agente', 'atendente', 'operador', 'usuario', 'usuário', 'nome do agente', 'ramal'] },
    { chave: 'data', rotulo: 'Data', obrigatorio: true, sinonimos: ['data', 'dia', 'data da ligacao', 'data da ligação', 'data hora', 'data/hora', 'inicio', 'início'] },
    { chave: 'origem', rotulo: 'Origem da ligação', obrigatorio: true, sinonimos: ['origem', 'ligacao de origem', 'ligação de origem', 'tipo de ligacao', 'fila', 'transferencia', 'transferência'] },
    { chave: 'status', rotulo: 'Status da ligação', obrigatorio: true, sinonimos: ['status', 'situacao', 'situação', 'status da ligacao', 'status da ligação', 'resultado'] },
    { chave: 'fcr', rotulo: 'FCR (1 resolveu, 2 não resolveu)', obrigatorio: true, sinonimos: ['fcr', 'resolucao', 'resolução', 'resolvido', 'primeiro contato'] },
    { chave: 'csat', rotulo: 'CSAT (1 a 5)', obrigatorio: true, sinonimos: ['csat', 'nota', 'satisfacao', 'satisfação', 'avaliacao', 'avaliação', 'pesquisa'] },
  ],
  chat: [
    { chave: 'agente', rotulo: 'Agente', obrigatorio: true, sinonimos: ['agente', 'atribuido a', 'atribuído a', 'assignee', 'atendente', 'responsavel', 'responsável'] },
    { chave: 'ticket', rotulo: 'Ticket', obrigatorio: true, sinonimos: ['ticket', 'id', 'id do ticket', 'numero', 'número', 'chamado', 'conversa'] },
    { chave: 'data', rotulo: 'Data', obrigatorio: true, sinonimos: ['data', 'criado em', 'created at', 'data de criacao', 'data de criação', 'solucionado em', 'atualizado em'] },
    { chave: 'bom', rotulo: 'Satisfação boa (0 ou 1)', obrigatorio: true, sinonimos: ['bom', 'boa', 'good', 'satisfacao boa', 'satisfação boa', 'positivo', 'positiva'] },
    { chave: 'ruim', rotulo: 'Satisfação ruim (0 ou 1)', obrigatorio: true, sinonimos: ['ruim', 'bad', 'satisfacao ruim', 'satisfação ruim', 'negativo', 'negativa'] },
    {
      chave: 'nota',
      rotulo: 'Nota do ticket (opcional)',
      obrigatorio: false,
      sinonimos: ['nota', 'nota csat', 'csat score', 'score', 'pontuacao', 'pontuação', 'avaliacao numerica', 'avaliação numérica'],
      ajuda: 'Não muda quem é positivo ou negativo — isso já vem das colunas de satisfação boa/ruim. Serve só para separar, dentro dos "ruim", quais eram nota 3 (neutro, não negativo de verdade). Continuam contando como negativo no resultado oficial; aparecem à parte, ticket por ticket, num relatório comparativo com e sem eles.',
    },
  ],
  cx: [
    { chave: 'agente', rotulo: 'Agente', obrigatorio: true, sinonimos: ['agente', 'atendente', 'colaborador', 'avaliado', 'nome'] },
    { chave: 'data', rotulo: 'Data', obrigatorio: true, sinonimos: ['data', 'dia', 'data da avaliacao', 'data da avaliação', 'periodo', 'período'] },
    { chave: 'empatia', rotulo: 'Empatia', obrigatorio: true, sinonimos: ['empatia'] },
    { chave: 'cordialidade', rotulo: 'Cordialidade', obrigatorio: true, sinonimos: ['cordialidade', 'simpatia'] },
    { chave: 'comunicacao', rotulo: 'Comunicação', obrigatorio: true, sinonimos: ['comunicacao', 'comunicação'] },
    { chave: 'escrita', rotulo: 'Escrita ou fala', obrigatorio: true, sinonimos: ['escrita', 'fala', 'escrita/fala', 'ortografia'] },
    { chave: 'profissionalismo', rotulo: 'Profissionalismo', obrigatorio: true, sinonimos: ['profissionalismo', 'postura'] },
    { chave: 'resolucao', rotulo: 'Resolução', obrigatorio: true, sinonimos: ['resolucao', 'resolução', 'solucao', 'solução'] },
    { chave: 'observacao', rotulo: 'Observação', obrigatorio: false, sinonimos: ['observacao', 'observação', 'comentario', 'comentário', 'feedback'] },
  ],
};

/** Pistas que identificam a fonte pelo cabeçalho do arquivo. */
const PISTAS = {
  '55pbx': ['fcr', 'csat', 'ligacao de origem', 'ligação de origem', 'ramal', 'fila', 'status da ligacao', 'status da ligação'],
  zendesk: ['ticket', 'assignee', 'atribuido a', 'atribuído a', 'satisfacao', 'satisfação', 'good', 'bad', 'solucionado em'],
  planilha_cx: ['empatia', 'cordialidade', 'profissionalismo', 'resolucao', 'resolução', 'escrita'],
};

const comparavel = (texto) => nomeComparavel(texto);

/**
 * De qual fonte é este arquivo? Conta quantas pistas de cada fonte aparecem
 * no cabeçalho. Sem pista nenhuma, devolve null — a tela pergunta.
 */
export function detectarFonte(colunas = []) {
  const cabecalho = colunas.map(comparavel);
  const placar = Object.entries(PISTAS).map(([fonte, pistas]) => ({
    fonte,
    pontos: pistas.filter((pista) => cabecalho.some((c) => c.includes(comparavel(pista)))).length,
  })).sort((a, b) => b.pontos - a.pontos);

  const melhor = placar[0];
  if (!melhor || melhor.pontos < 2) return null;
  if (placar[1] && placar[1].pontos === melhor.pontos) return null; // empate: não chuta
  return melhor.fonte;
}

/**
 * Sugere a coluna de cada campo. O que já foi corrigido antes (`lembrado`)
 * ganha da adivinhação — é o de-para que o gestor arrumou na semana passada.
 */
export function sugerirMapeamento(colunas = [], tipo, lembrado = {}) {
  const campos = CAMPOS[tipo] ?? [];
  const disponiveis = colunas.map((c) => ({ original: c, comparavel: comparavel(c) }));
  const mapeamento = {};

  campos.forEach(({ chave, sinonimos }) => {
    if (lembrado[chave] && colunas.includes(lembrado[chave])) {
      mapeamento[chave] = lembrado[chave];
      return;
    }
    const alvos = sinonimos.map(comparavel);
    const exata = disponiveis.find((c) => alvos.includes(c.comparavel));
    const parcial = exata ?? disponiveis.find((c) => alvos.some((alvo) => c.comparavel.includes(alvo)));
    if (parcial) mapeamento[chave] = parcial.original;
  });

  return mapeamento;
}

/** Faltou mapear algum campo obrigatório? */
export const camposFaltando = (tipo, mapeamento = {}) => (CAMPOS[tipo] ?? [])
  .filter((campo) => campo.obrigatorio && !mapeamento[campo.chave])
  .map((campo) => campo.rotulo);

/** O período do arquivo: a menor e a maior data que ele traz. */
export function periodoDoArquivo(linhas = [], colunaData) {
  const datas = linhas
    .map((l) => normalizarData(l[colunaData]))
    .filter(Boolean)
    .sort();
  if (datas.length === 0) return null;
  return { inicio: datas[0], fim: datas[datas.length - 1], dias: [...new Set(datas)] };
}

/**
 * Liga cada nome do arquivo a uma pessoa do Portal. Primeiro o que já foi
 * ligado antes; depois nome igual; depois primeiro e último nome iguais.
 */
export function vincularAgentes(nomes = [], colaboradores = [], lembrados = {}) {
  const ativos = colaboradores.filter((c) => c.ativo !== false);
  const porNome = new Map(ativos.map((c) => [comparavel(c.nome_completo), c]));
  const porPontas = new Map(ativos.map((c) => {
    const partes = comparavel(c.nome_completo).split(' ');
    return [`${partes[0]} ${partes[partes.length - 1]}`, c];
  }));

  return nomes.map((nome) => {
    const chave = comparavel(nome);
    const partes = chave.split(' ');
    const pontas = partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1]}` : chave;

    const lembrado = lembrados[nome] && ativos.find((c) => c.id === lembrados[nome]);
    const achado = lembrado || porNome.get(chave) || porPontas.get(pontas) || null;

    return {
      nome,
      colaborador_id: achado?.id ?? null,
      colaborador_nome: achado?.nome_completo ?? null,
      origem: lembrado ? 'lembrado' : achado ? 'automatico' : 'sem_vinculo',
    };
  });
}

const MOTIVOS = {
  sem_agente: 'sem o nome do agente',
  sem_data: 'sem data ou com data que não dá para entender',
};

/**
 * A conferência que a tela mostra antes de salvar: o que entra, o que sai e
 * por quê, quais dias já tinham sido importados e quem ficou sem vínculo.
 */
export function conferirImportacao({
  tipo, linhas = [], mapeamento = {}, colaboradores = [], vinculos = {}, apuracoesExistentes = [],
}) {
  const faltando = camposFaltando(tipo, mapeamento);
  if (faltando.length > 0) {
    return { pronta: false, faltando, linhasLidas: linhas.length, linhasValidas: 0, descartadas: [], agentes: [], periodo: null, diasJaImportados: [], avisos: [] };
  }

  const descartes = new Map();
  const porAgente = new Map();
  const validas = [];

  linhas.forEach((linha) => {
    const agente = String(linha[mapeamento.agente] ?? '').trim();
    const data = normalizarData(linha[mapeamento.data]);
    if (!agente) { descartes.set('sem_agente', (descartes.get('sem_agente') ?? 0) + 1); return; }
    if (!data) { descartes.set('sem_data', (descartes.get('sem_data') ?? 0) + 1); return; }
    validas.push({ agente, data });
    const atual = porAgente.get(agente) ?? { nome: agente, linhas: 0, dias: new Set() };
    atual.linhas += 1;
    atual.dias.add(data);
    porAgente.set(agente, atual);
  });

  const periodo = validas.length
    ? {
      inicio: validas.reduce((min, v) => (v.data < min ? v.data : min), validas[0].data),
      fim: validas.reduce((max, v) => (v.data > max ? v.data : max), validas[0].data),
      dias: [...new Set(validas.map((v) => v.data))].sort(),
    }
    : null;

  const vinculados = vincularAgentes([...porAgente.keys()], colaboradores, vinculos);
  const agentes = vinculados.map((v) => ({
    ...v,
    linhas: porAgente.get(v.nome)?.linhas ?? 0,
    dias: porAgente.get(v.nome)?.dias.size ?? 0,
  })).sort((a, b) => b.linhas - a.linhas);

  // Dias que já têm apuração do mesmo tipo: salvar de novo substitui.
  const diasGravados = new Map();
  apuracoesExistentes
    .filter((a) => a.tipo_apuracao === tipo)
    .forEach((a) => (a.dados_por_data ?? []).forEach((d) => {
      if (!d?.data) return;
      const atual = diasGravados.get(d.data) ?? new Set();
      atual.add(a.colaborador_id);
      diasGravados.set(d.data, atual);
    }));

  const diasJaImportados = (periodo?.dias ?? []).filter((dia) => diasGravados.has(dia));

  const avisos = [];
  const semVinculo = agentes.filter((a) => !a.colaborador_id);
  if (semVinculo.length > 0) {
    avisos.push(`${semVinculo.length} nome(s) do arquivo ainda sem pessoa do Portal: ${semVinculo.map((a) => a.nome).join(', ')}.`);
  }
  if (diasJaImportados.length > 0) {
    avisos.push(`${diasJaImportados.length} dia(s) já tinham sido importados (${diasJaImportados[0].split('-').reverse().join('/')} em diante). Salvar de novo substitui aqueles números.`);
  }
  if (validas.length === 0) avisos.push('Nenhuma linha utilizável neste arquivo — confira o de-para das colunas.');

  return {
    pronta: validas.length > 0 && semVinculo.length === 0,
    faltando: [],
    linhasLidas: linhas.length,
    linhasValidas: validas.length,
    descartadas: [...descartes.entries()].map(([motivo, quantidade]) => ({ motivo: MOTIVOS[motivo] ?? motivo, quantidade })),
    agentes,
    periodo,
    diasJaImportados,
    avisos,
  };
}

/** Agrupa as apurações gravadas por importação, para o histórico e o desfazer. */
export function lotesDeImportacao(apuracoes = []) {
  const lotes = new Map();
  apuracoes.forEach((a) => {
    // As apurações antigas não têm importacao_id. Como o assistente anterior
    // gravava todo mundo de uma vez só, juntar por tipo + momento da apuração
    // reconstrói aquele lote — senão o histórico vira uma linha por pessoa.
    const momento = String(a.data_apuracao || a.created_date || '').slice(0, 16);
    const chave = a.importacao_id || `antiga-${a.tipo_apuracao}-${momento}-${a.periodo_inicio}`;
    const atual = lotes.get(chave) ?? {
      importacao_id: a.importacao_id ?? null,
      avulsa: !a.importacao_id,
      tipo: a.tipo_apuracao,
      fonte: a.fonte ?? null,
      arquivo: a.arquivo_nome ?? null,
      quando: a.data_apuracao || a.created_date,
      por: a.apurado_por_nome ?? null,
      pessoas: 0,
      dias: new Set(),
      inicio: a.periodo_inicio,
      fim: a.periodo_fim,
      ids: [],
      linhasLidas: a.linhas_lidas ?? null,
    };
    atual.pessoas += 1;
    atual.ids.push(a.id);
    (a.dados_por_data ?? []).forEach((d) => d?.data && atual.dias.add(d.data));
    if (a.periodo_inicio && (!atual.inicio || a.periodo_inicio < atual.inicio)) atual.inicio = a.periodo_inicio;
    if (a.periodo_fim && (!atual.fim || a.periodo_fim > atual.fim)) atual.fim = a.periodo_fim;
    lotes.set(chave, atual);
  });

  return [...lotes.values()]
    .map((l) => ({ ...l, dias: l.dias.size }))
    .sort((a, b) => String(b.quando ?? '').localeCompare(String(a.quando ?? '')));
}
