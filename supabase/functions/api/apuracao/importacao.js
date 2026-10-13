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
  { valor: 'clickdesk', rotulo: 'ClickDesk (chat)', tipo: 'chat' },
  { valor: 'planilha_cx', rotulo: 'Planilha de avaliação CX', tipo: 'cx' },
];

/** Os campos que cada tipo precisa, e como eles costumam se chamar. */
export const CAMPOS = {
  telefone: [
    { chave: 'agente', rotulo: 'Agente', obrigatorio: true, sinonimos: ['agente', 'atendente', 'operador', 'usuario', 'usuário', 'nome do agente', 'ramal'] },
    { chave: 'data', rotulo: 'Data', obrigatorio: true, sinonimos: ['data', 'dia', 'data da ligacao', 'data da ligação', 'data hora', 'data/hora', 'inicio', 'início'] },
    // "fila" saiu dos sinônimos de origem: no relatório real do 55PBX existe
    // uma coluna "Fila" (id da fila de atendimento) que não tem nada a ver
    // com transferência — ela colidia com "Id ligação de origem", que é onde
    // o transbordo realmente aparece ("<id> - transferência fila").
    { chave: 'origem', rotulo: 'Origem da ligação (id da ligação de origem)', obrigatorio: true, sinonimos: ['id ligacao de origem', 'id ligação de origem', 'ligacao de origem', 'ligação de origem', 'origem', 'tipo de ligacao', 'transferencia', 'transferência'] },
    { chave: 'status', rotulo: 'Status da ligação', obrigatorio: true, sinonimos: ['chamada', 'status', 'situacao', 'situação', 'status da ligacao', 'status da ligação', 'resultado'] },
    { chave: 'fcr', rotulo: 'FCR (1 resolveu, 2 não resolveu)', obrigatorio: true, sinonimos: ['pergunta3 1 sim o nao', 'pergunta3 1', 'pergunta 3 1', 'fcr', 'resolucao', 'resolução', 'resolvido', 'primeiro contato'] },
    { chave: 'csat', rotulo: 'CSAT (1 a 5)', obrigatorio: true, sinonimos: ['pergunta3 2 nota 1 a 5', 'pergunta3 2', 'pergunta 3 2', 'csat', 'nota', 'satisfacao', 'satisfação', 'avaliacao', 'avaliação', 'pesquisa'] },
  ],
  chat: [
    { chave: 'agente', rotulo: 'Agente', obrigatorio: true, sinonimos: ['agente', 'atribuido', 'atribuído', 'atribuido a', 'atribuído a', 'nome do atribuido', 'assignee', 'atendente', 'responsavel', 'responsável'] },
    { chave: 'ticket', rotulo: 'Ticket', obrigatorio: true, sinonimos: ['ticket', 'id', 'id do ticket', 'numero', 'número', 'chamado', 'conversa'] },
    { chave: 'data', rotulo: 'Data', obrigatorio: true, sinonimos: ['data', 'criado em', 'created at', 'data de criacao', 'data de criação', 'solucionado em', 'atualizado em'] },
    { chave: 'bom', rotulo: 'Satisfação boa (0 ou 1)', obrigatorio: true, sinonimos: ['bom', 'boa', 'good', 'satisfacao boa', 'satisfação boa', 'positivo', 'positiva'] },
    { chave: 'ruim', rotulo: 'Satisfação ruim (0 ou 1)', obrigatorio: true, sinonimos: ['ruim', 'bad', 'satisfacao ruim', 'satisfação ruim', 'negativo', 'negativa'] },
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

/**
 * ClickDesk (chat), o sistema de avaliação que está entrando no lugar do
 * Zendesk (Pedro, 13/10/2026). O arquivo traz uma linha por avaliação, com nota
 * de 1 a 5, e várias equipes: só a Ouvidoria entra na apuração. As demais
 * colunas (Aberto em, Nível, Sentimento, Canal, Assunto, Marca, Comentário...)
 * não são usadas.
 */
export const CAMPOS_CLICKDESK = [
  { chave: 'ticket', rotulo: 'Chamado', obrigatorio: true, sinonimos: ['chamado', 'ticket', 'id'] },
  { chave: 'data', rotulo: 'Avaliado em', obrigatorio: true, sinonimos: ['avaliado em', 'data da avaliacao', 'data da avaliação', 'data'] },
  { chave: 'nota', rotulo: 'Nota (1 a 5, é o CSAT)', obrigatorio: true, sinonimos: ['nota', 'csat'] },
  { chave: 'agente', rotulo: 'Responsável', obrigatorio: true, sinonimos: ['responsavel', 'responsável', 'agente', 'atendente'] },
  { chave: 'equipe', rotulo: 'Equipe (só a Ouvidoria entra)', obrigatorio: true, sinonimos: ['equipe', 'time', 'fila'] },
  { chave: 'canal', rotulo: 'Canal (só WhatsApp e chat no site entram)', obrigatorio: true, sinonimos: ['canal', 'origem'] },
];

/** A equipe do ClickDesk que entra na apuração. */
export const EQUIPE_DA_APURACAO = 'ouvidoria';
export const ehDaOuvidoria = (equipe) => nomeComparavel(equipe).includes(EQUIPE_DA_APURACAO);

/**
 * Só WhatsApp e chat no site são atendimento por chat (Pedro, 13/10/2026).
 * Telefone já vem do 55PBX (importar aqui duplicaria a meta) e e-mail não é
 * atendimento em si, então não são validados.
 */
export const ehCanalDeChat = (canal) => { const c = nomeComparavel(canal); return c.includes('whatsapp') || c.includes('chat'); };

/** Os campos de cada fonte: o ClickDesk tem os seus; as outras seguem o tipo. */
export const camposDaFonte = (fonte, tipo) => (fonte === 'clickdesk' ? CAMPOS_CLICKDESK : (CAMPOS[tipo] ?? []));

/** Nota do ClickDesk: 1 a 5, inteira. Qualquer outra coisa é null. */
export function notaDoClickDesk(valor) {
  const n = Number(String(valor ?? '').trim().replace(',', '.'));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/** Pistas que identificam a fonte pelo cabeçalho do arquivo. */
const PISTAS = {
  '55pbx': [
    'fcr', 'csat', 'ligacao de origem', 'ligação de origem', 'ramal', 'status da ligacao', 'status da ligação',
    // Sinais do relatório real do 55PBX (24/09/2026) — específicos o
    // bastante para nunca colidir com Zendesk ou a planilha de CX.
    'tempo na ura', 'tempo de espera', 'quantidade de transbordos', 'motivo de desconexao', 'caminho u r a', 'pergunta3',
  ],
  zendesk: ['ticket', 'assignee', 'atribuido a', 'atribuído a', 'satisfacao', 'satisfação', 'good', 'bad', 'solucionado em'],
  clickdesk: ['chamado', 'avaliado em', 'quem avaliou', 'sentimento', 'aberto em', 'marca', 'motivo'],
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
export function sugerirMapeamento(colunas = [], tipo, lembrado = {}, fonte = null) {
  const campos = camposDaFonte(fonte, tipo);
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
export const camposFaltando = (tipo, mapeamento = {}, fonte = null) => camposDaFonte(fonte, tipo)
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
 * ligado antes; depois nome igual; depois primeiro e último nome iguais; por fim,
 * quando TODAS as palavras do nome do arquivo aparecem no nome da pessoa e só uma
 * pessoa serve ("Ana Guelber" é a Ana Flávia Guelber Amarante).
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
    // Todas as palavras do nome do arquivo (2 ou mais) dentro do nome da pessoa.
    const contidos = partes.length >= 2
      ? ativos.filter((c) => { const alvo = new Set(comparavel(c.nome_completo).split(' ')); return partes.every((p) => alvo.has(p)); })
      : [];
    const achado = lembrado || porNome.get(chave) || porPontas.get(pontas) || (contidos.length === 1 ? contidos[0] : null) || null;

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
  outra_equipe: 'de outras equipes (só a Ouvidoria entra)',
  sem_nota: 'sem nota de 1 a 5',
  outro_canal: 'de outros canais (só WhatsApp e chat no site entram; telefone vem do 55PBX e e-mail não é atendimento)',
};

/**
 * A conferência que a tela mostra antes de salvar: o que entra, o que sai e
 * por quê, quais dias já tinham sido importados e quem ficou sem vínculo.
 */
export function conferirImportacao({
  tipo, fonte = null, linhas = [], mapeamento = {}, colaboradores = [], vinculos = {}, apuracoesExistentes = [],
}) {
  const faltando = camposFaltando(tipo, mapeamento, fonte);
  if (faltando.length > 0) {
    return { pronta: false, faltando, linhasLidas: linhas.length, linhasValidas: 0, descartadas: [], agentes: [], periodo: null, diasJaImportados: [], avisos: [] };
  }

  const descartes = new Map();
  const porAgente = new Map();
  const validas = [];

  const clickdesk = fonte === 'clickdesk';
  const porCanal = {};
  let soIA = 0;
  linhas.forEach((linha) => {
    // ClickDesk: o arquivo traz todas as equipes; só a Ouvidoria é apuração.
    if (clickdesk && !ehDaOuvidoria(linha[mapeamento.equipe])) { descartes.set('outra_equipe', (descartes.get('outra_equipe') ?? 0) + 1); return; }
    if (clickdesk && !ehCanalDeChat(linha[mapeamento.canal])) { descartes.set('outro_canal', (descartes.get('outro_canal') ?? 0) + 1); return; }
    const agente = String(linha[mapeamento.agente] ?? '').trim();
    const data = normalizarData(linha[mapeamento.data]);
    if (!agente) { descartes.set('sem_agente', (descartes.get('sem_agente') ?? 0) + 1); return; }
    if (!data) { descartes.set('sem_data', (descartes.get('sem_data') ?? 0) + 1); return; }
    if (clickdesk && notaDoClickDesk(linha[mapeamento.nota]) === null) { descartes.set('sem_nota', (descartes.get('sem_nota') ?? 0) + 1); return; }
    if (clickdesk) {
      const canal = String(linha[mapeamento.canal] ?? '').trim() || 'sem canal';
      porCanal[canal] = (porCanal[canal] ?? 0) + 1;
      if (nomeComparavel(linha.Atendimento ?? linha.atendimento).includes('so ia')) soIA += 1;
    }
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
    .filter((a) => a.tipo_apuracao === tipo && (fonte ? (a.fonte ?? 'zendesk') === fonte : true))
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
  if (clickdesk && validas.length > 0) {
    const canais = Object.entries(porCanal).map(([c, n]) => `${c}: ${n}`).join(' · ');
    avisos.push(`ClickDesk: ${validas.length} avaliação(ões) da Ouvidoria entram (${canais}).${soIA ? ` ${soIA} foi atendida só pela IA.` : ''}`);
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
    ...(clickdesk ? { porCanal, soIA } : {}),
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
