/**
 * PESQUISAS — situação, participação e leitura dos resultados.
 *
 * Regra combinada com Pedro (23/09/2026): o sistema guarda quem respondeu,
 * a não ser que a pesquisa seja anônima. Mesmo anônima, ele guarda QUE a
 * pessoa respondeu (em PesquisaParticipacao) — só não guarda O QUE ela
 * respondeu junto do nome. Sem isso, o lembrete ficaria pedindo resposta
 * para sempre a quem já respondeu.
 */

const soData = (valor) => String(valor ?? '').slice(0, 10);
const hojeSP = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

export const SITUACOES = {
  agendada: 'Agendada',
  no_ar: 'No ar',
  encerrada: 'Encerrada',
  arquivada: 'Arquivada',
};

/** Em que pé está a pesquisa hoje. */
export function situacaoDaPesquisa(pesquisa, hoje = hojeSP()) {
  if (!pesquisa) return null;
  if (pesquisa.ativa === false) return 'arquivada';
  const inicio = soData(pesquisa.data_inicio);
  const fim = soData(pesquisa.data_fim);
  if (inicio && hoje < inicio) return 'agendada';
  if (fim && hoje > fim) return 'encerrada';
  return 'no_ar';
}

/**
 * Quem respondeu e quem falta. A participação é a fonte — ela existe nas
 * duas formas de pesquisa, anônima ou não.
 */
export function quemRespondeu({ pesquisa, participacoes = [], pessoas = [] }) {
  const doIdDaPesquisa = new Map();
  participacoes
    .filter((p) => p.pesquisa_id === pesquisa?.id)
    .forEach((p) => doIdDaPesquisa.set(p.colaborador_id, p));

  const responderam = [];
  const faltam = [];
  pessoas.forEach((pessoa) => {
    const participacao = doIdDaPesquisa.get(pessoa.id);
    if (participacao) responderam.push({ ...pessoa, respondida_em: participacao.respondida_em || participacao.created_date });
    else faltam.push(pessoa);
  });

  // Quem respondeu mas não está mais na lista de pessoas (saiu da equipe).
  const conhecidos = new Set(pessoas.map((p) => p.id));
  const deDesligados = [...doIdDaPesquisa.values()].filter((p) => !conhecidos.has(p.colaborador_id));

  const total = pessoas.length;
  return {
    responderam,
    faltam,
    deDesligados,
    total,
    taxa: total > 0 ? (responderam.length / total) * 100 : null,
  };
}

const valoresDaPergunta = (pergunta, respostas) => respostas
  .flatMap((r) => (r.respostas || []).filter((x) => x.pergunta_id === pergunta.id))
  .map((x) => x.resposta)
  .filter((v) => v !== undefined && v !== null && String(v).trim() !== '');

/** Tipos de pergunta, do jeito que o CampoPergunta grava a resposta. */
export const ESCALAS = { escala_1_5: 5, escala_0_10: 10 };
export const ESCOLHAS = new Set(['sim_nao', 'multipla_escolha', 'multipla_escolha_multipla']);
const ROTULO_SIM_NAO = { sim: 'Sim', nao: 'Não' };

/**
 * O resultado de cada pergunta: média e distribuição nas escalas, contagem
 * por opção nas escolhas e a lista de textos nas abertas. Nada de média em
 * pergunta de texto — ia inventar número onde não há.
 */
export function resultadoDasPerguntas(pesquisa, respostas = []) {
  const minhas = respostas.filter((r) => r.pesquisa_id === pesquisa?.id);
  return (pesquisa?.perguntas ?? []).map((pergunta) => {
    const valores = valoresDaPergunta(pergunta, minhas);
    const ehEscala = ESCALAS[pergunta.tipo_resposta] !== undefined;
    const numeros = ehEscala
      ? valores.map((v) => parseFloat(String(v).replace(',', '.'))).filter((n) => !Number.isNaN(n))
      : [];

    const contagem = new Map();
    if (ehEscala || ESCOLHAS.has(pergunta.tipo_resposta)) {
      valores.forEach((v) => String(v).split(',').map((x) => x.trim()).filter(Boolean).forEach((opcao) => {
        contagem.set(opcao, (contagem.get(opcao) || 0) + 1);
      }));
    }

    const opcoes = [...contagem.entries()]
      .map(([opcao, vezes]) => ({
        opcao: ROTULO_SIM_NAO[opcao] ?? opcao,
        vezes,
        parte: valores.length ? (vezes / valores.length) * 100 : 0,
      }));
    // Escala sai em ordem de nota; escolha sai da mais votada para a menos.
    opcoes.sort((a, b) => (ehEscala ? Number(a.opcao) - Number(b.opcao) : b.vezes - a.vezes));

    return {
      id: pergunta.id,
      texto: pergunta.texto,
      tipo: pergunta.tipo_resposta,
      respondidas: valores.length,
      media: numeros.length ? numeros.reduce((a, b) => a + b, 0) / numeros.length : null,
      maximo: ESCALAS[pergunta.tipo_resposta] ?? null,
      opcoes,
      textos: pergunta.tipo_resposta === 'texto' ? valores.map(String) : [],
    };
  });
}

/** Média geral e sentimento das respostas de uma pesquisa de nota. */
export function resumoDaPesquisa(pesquisa, respostas = []) {
  const minhas = respostas.filter((r) => r.pesquisa_id === pesquisa?.id);
  const notas = minhas.map((r) => r.nota_calculada).filter((n) => typeof n === 'number' && !Number.isNaN(n));
  const sentimentos = { positivo: 0, neutro: 0, negativo: 0 };
  minhas.forEach((r) => { if (sentimentos[r.sentimento] !== undefined) sentimentos[r.sentimento] += 1; });
  return {
    respostas: minhas.length,
    media: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null,
    sentimentos,
  };
}

/** A linha de participação a gravar — vale para pesquisa anônima ou não. */
export function montarParticipacao(pesquisa, colaborador, agora = new Date()) {
  return {
    pesquisa_id: pesquisa.id,
    colaborador_id: colaborador.id,
    colaborador_nome: colaborador.nome_completo ?? null,
    respondida_em: agora.toISOString(),
  };
}
