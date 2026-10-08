/**
 * AVD — Avaliação de Desempenho Setorial. Funções puras (testadas em
 * `npm run testar`); quem lê e grava é a tela / o importador.
 *
 * É uma pesquisa (tipo "avd") feita todo mês com as MESMAS perguntas que o
 * Google Forms tinha, na mesma redação, para o histórico continuar comparável.
 * Cada pergunta tem um `id` estável (a chave abaixo), então dá para comparar
 * mês a mês. As respostas ficam em resposta_pesquisa, no formato de sempre:
 * [{ pergunta_id, pergunta_texto, resposta }].
 *
 * Regras combinadas com Pedro (06/10/2026):
 *  - só o gestor vê as respostas, identificadas (quem é quem);
 *  - não entra na pontuação nem na premiação;
 *  - nota acima de 10 vale 10;
 *  - o mês de referência (competência) é o do trabalho avaliado, não o do
 *    carimbo: a AVD é respondida no fim do mês, ou na volta de férias.
 */

/** Os blocos, na ordem em que aparecem. */
export const BLOCOS = [
  { chave: 'dono', rotulo: 'Dono do resultado' },
  { chave: 'impacto', rotulo: 'Impacto no cliente' },
  { chave: 'tecnico', rotulo: 'Desenvolvimento técnico' },
  { chave: 'maturidade', rotulo: 'Maturidade' },
  { chave: 'clima', rotulo: 'Clima do setor' },
  { chave: 'lideranca', rotulo: 'Liderança' },
  { chave: 'bem_estar', rotulo: 'Como se sentiu' },
  { chave: 'reflexao', rotulo: 'Reflexão' },
];

/** Perguntas de nota, com o nome curto que aparece nos gráficos. */
export const NOTAS = [
  { chave: 'dono_nota', rotulo: 'Dono do resultado', bloco: 'dono' },
  { chave: 'impacto_nota', rotulo: 'Impacto no cliente', bloco: 'impacto' },
  { chave: 'tecnico_nota', rotulo: 'Desenvolvimento técnico', bloco: 'tecnico' },
  { chave: 'maturidade_nota', rotulo: 'Maturidade profissional', bloco: 'maturidade' },
  { chave: 'inovacao_nota', rotulo: 'Visão de melhorias e inovação', bloco: 'maturidade' },
  { chave: 'emocional_nota', rotulo: 'Inteligência emocional', bloco: 'maturidade' },
  { chave: 'clima_satisfacao', rotulo: 'Satisfação com o clima', bloco: 'clima' },
  { chave: 'clima_respeito', rotulo: 'Respeito e colaboração', bloco: 'clima' },
  { chave: 'clima_seguranca', rotulo: 'Segurança para opinar', bloco: 'clima' },
  { chave: 'clima_alta_performance', rotulo: 'Ambiente de alta performance', bloco: 'clima' },
  { chave: 'clima_clareza', rotulo: 'Clareza da gestão', bloco: 'clima' },
  { chave: 'lideranca_nota', rotulo: 'Contribuição da liderança', bloco: 'lideranca' },
  { chave: 'bem_estar_nota', rotulo: 'Como se sentiu', bloco: 'bem_estar' },
];

/** Indicadores do gráfico: um por bloco com nota (média das notas do bloco). */
export const INDICADORES = BLOCOS
  .filter((b) => NOTAS.some((n) => n.bloco === b.chave))
  .map((b) => ({ chave: b.chave, rotulo: b.rotulo }));

/** As perguntas, na ordem do formulário e com o texto original. */
export const PERGUNTAS_AVD = [
  { id: "dono_texto", bloco: "dono", tipo_resposta: "texto", obrigatoria: true, opcoes: [], texto: "Você resolveu problemas ou apenas executou tarefas?\nVocê antecipou riscos antes que virassem crise?\n Se ninguém cobrasse, você ainda entregaria no mesmo nível?" },
  { id: "dono_nota", bloco: "dono", tipo_resposta: "escala_0_10", obrigatoria: true, opcoes: [], texto: "De 0 a 10, quanto você agiu como dono do resultado este mês?" },
  { id: "impacto_texto", bloco: "impacto", tipo_resposta: "texto", obrigatoria: true, opcoes: [], texto: "Sua atuação reduziu o esforço do cliente ou só manteve o padrão?\nVocê resolveu a causa raiz ou apenas o sintoma?\nQuantos atendimentos você transformou em experiência memorável?" },
  { id: "impacto_nota", bloco: "impacto", tipo_resposta: "escala_0_10", obrigatoria: true, opcoes: [], texto: "De 0 a 10, seu impacto no cliente foi estratégico ou operacional?" },
  { id: "tecnico_texto", bloco: "tecnico", tipo_resposta: "texto", obrigatoria: true, opcoes: [], texto: "Você dominou melhor as ferramentas ou apenas repetiu o que já sabia?\nQual habilidade técnica você evoluiu deliberadamente este mês?\nVocê se tornou referência em algum tema específico?  Seja pequeno ou grande tema?\nVocê ensinou algo relevante para alguém do time?" },
  { id: "tecnico_nota", bloco: "tecnico", tipo_resposta: "escala_0_10", obrigatoria: true, opcoes: [], texto: "De 0 a 10, quanto você avalia o seu desenvolvimento técnico e nas habilidades necessárias para o trabalho no setor, como comunicação, rapport e outras?" },
  { id: "maturidade_texto", bloco: "maturidade", tipo_resposta: "texto", obrigatoria: true, opcoes: [], texto: "Sob pressão, você elevou o nível da conversa ou baixou?\nConseguiu transformar conflito em construção?\nQual processo você melhorou este mês?\nVocê eliminou desperdício?" },
  { id: "maturidade_nota", bloco: "maturidade", tipo_resposta: "escala_0_10", obrigatoria: true, opcoes: [], texto: "De 0 a 10, como você avalia a sua maturidade profissional?" },
  { id: "inovacao_nota", bloco: "maturidade", tipo_resposta: "escala_0_10", obrigatoria: true, opcoes: [], texto: "De 0 a 10, como você avalia sua visão sobre melhorias internas e inovação?" },
  { id: "emocional_nota", bloco: "maturidade", tipo_resposta: "escala_0_10", obrigatoria: true, opcoes: [], texto: "De 0 a 10, como você avalia a sua inteligência emocional?" },
  { id: "clima_satisfacao", bloco: "clima", tipo_resposta: "escala_0_10", obrigatoria: true, opcoes: [], texto: "De 1 a 10, quão satisfeito você está com o clima do setor neste mês?" },
  { id: "clima_respeito", bloco: "clima", tipo_resposta: "escala_0_10", obrigatoria: true, opcoes: [], texto: "De 1 a 10, você sente que existe respeito e colaboração real entre os membros do time?" },
  { id: "clima_seguranca", bloco: "clima", tipo_resposta: "escala_0_10", obrigatoria: true, opcoes: [], texto: "De 1 a 10, você se sente seguro para expor ideias e discordar sem sofrer julgamento?" },
  { id: "clima_alta_performance", bloco: "clima", tipo_resposta: "escala_0_10", obrigatoria: true, opcoes: [], texto: "De 1 a 10, você acredita que o ambiente atual favorece alta performance sustentável?" },
  { id: "clima_clareza", bloco: "clima", tipo_resposta: "escala_0_10", obrigatoria: true, opcoes: [], texto: "De 1 a 10, você sente clareza nas direções e prioridades que a gestão direta (supervisor e gerente) comunica?" },
  { id: "lideranca_nota", bloco: "lideranca", tipo_resposta: "escala_0_10", obrigatoria: true, opcoes: [], texto: "De 1 a 10, o quanto minha liderança contribuiu para sua performance neste mês?" },
  { id: "bem_estar_nota", bloco: "bem_estar", tipo_resposta: "escala_0_10", obrigatoria: true, opcoes: [], texto: "De 1 a 10, como você se sentiu esse mês, tanto profissionalmente quanto pessoalmente?" },
  { id: "reflexao_avancos", bloco: "reflexao", tipo_resposta: "texto", obrigatoria: true, opcoes: [], texto: "Olhando para este mês, quais foram suas principais entregas, aprendizados e evoluções concretas? Onde você percebe que realmente avançou?" },
  { id: "reflexao_prioridades", bloco: "reflexao", tipo_resposta: "texto", obrigatoria: true, opcoes: [], texto: "Considerando seus objetivos e o nível de performance que deseja alcançar, quais são suas prioridades de desenvolvimento para o próximo mês? O que você pretende fazer diferente para evoluir?" },
  { id: "reflexao_gestao", bloco: "reflexao", tipo_resposta: "texto", obrigatoria: true, opcoes: [], texto: "Como você avalia minha gestão até o momento e quais ajustes ou ações você acredita que poderiam fortalecer ainda mais sua performance e o ambiente do setor?" },
  { id: "reflexao_lugar_do_lider", bloco: "reflexao", tipo_resposta: "texto", obrigatoria: true, opcoes: [], texto: "Se você estivesse no meu lugar como líder do setor, quais decisões manteria, quais ajustaria e o que faria diferente para elevar ainda mais a performance do time e o clima organizacional?" },
  { id: "reflexao_mensagem", bloco: "reflexao", tipo_resposta: "texto", obrigatoria: true, opcoes: [], texto: "Se pudesse deixar uma mensagem para fortalecer nosso time e nosso ambiente de trabalho, qual seria?" },
];

/** Nota acima de 10 vale 10; abaixo de 0 vale 0; o que não é número fica de fora (null). */
export function limitarNota(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === '') return null;
  const n = Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return Math.min(10, Math.max(0, n));
}

/**
 * Mês de referência ('AAAA-MM') de uma resposta enviada em `enviadaEm`
 * ('AAAA-MM-DD'): até o dia 15 conta o mês anterior (a AVD do mês que passou,
 * respondida na virada ou na volta de férias); do dia 16 em diante, o próprio mês.
 */
export function competenciaDoEnvio(enviadaEm) {
  const [a, m, d] = String(enviadaEm).slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return null;
  const mes = d <= 15 ? m - 1 : m;
  const ano = mes === 0 ? a - 1 : a;
  return `${ano}-${String(mes === 0 ? 12 : mes).padStart(2, '0')}`;
}

const MESES_EXTENSO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const rotuloDaCompetencia = (comp) => `${MESES_CURTO[Number(comp.slice(5, 7)) - 1]}/${comp.slice(2, 4)}`;
export const tituloDaAvd = (comp) => `AVD de ${MESES_EXTENSO[Number(comp.slice(5, 7)) - 1]}/${comp.slice(0, 4)}`;

/**
 * Carimbo do Google Forms -> { dia: 'AAAA-MM-DD', hora: 'HH:MM:SS' }. O Forms
 * exporta M/D/AAAA, mas a planilha de agosto saiu em D/M/AAAA. Quando os dois
 * jeitos são datas válidas, vale o mais perto de `referencia` ('AAAA-MM-DD').
 */
export function lerCarimbo(texto, referencia) {
  const m = String(texto).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [x, y, ano, hh, mm, ss] = m.slice(1).map(Number);
  const candidatos = [];
  if (x >= 1 && x <= 12 && y >= 1 && y <= 31) candidatos.push([x, y]); // M/D
  if (y >= 1 && y <= 12 && x >= 1 && x <= 31 && x !== y) candidatos.push([y, x]); // D/M
  const iso = ([mes, dia]) => `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  const valido = candidatos.filter((c) => { const d = new Date(`${iso(c)}T00:00:00Z`); return d.getUTCMonth() + 1 === c[0] && d.getUTCDate() === c[1]; });
  if (!valido.length) return null;
  const alvo = referencia ? new Date(`${referencia}T00:00:00Z`).getTime() : 0;
  valido.sort((a, b) => Math.abs(new Date(`${iso(a)}T00:00:00Z`) - alvo) - Math.abs(new Date(`${iso(b)}T00:00:00Z`) - alvo));
  return { dia: iso(valido[0]), hora: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` };
}

/** Colunas de uma linha do CSV do Forms (da 3ª em diante, na ordem de PERGUNTAS_AVD) -> respostas no formato do sistema. */
export function respostasDaLinha(colunas) {
  const ajustes = [];
  const respostas = PERGUNTAS_AVD.map((p, i) => {
    const bruto = String(colunas[i] ?? '').trim();
    let resposta = bruto;
    if (p.tipo_resposta === 'escala_0_10') {
      const nota = limitarNota(bruto);
      if (nota !== null && Number(bruto.replace(',', '.')) !== nota) ajustes.push({ pergunta: p.id, de: bruto, para: nota });
      resposta = nota === null ? '' : String(nota);
    }
    return { pergunta_id: p.id, pergunta_texto: p.texto, resposta };
  });
  return { respostas, ajustes };
}

const numeroDe = (respostas, chave) => limitarNota((respostas ?? []).find((r) => r.pergunta_id === chave)?.resposta);
const media = (v) => { const l = v.filter((x) => x !== null); return l.length ? l.reduce((s, x) => s + x, 0) / l.length : null; };

/** Notas de UMA resposta: cada pergunta de nota e a média de cada bloco. */
export function notasDaResposta(respostas) {
  const porPergunta = Object.fromEntries(NOTAS.map((n) => [n.chave, numeroDe(respostas, n.chave)]));
  const porBloco = Object.fromEntries(INDICADORES.map((i) => [i.chave, media(NOTAS.filter((n) => n.bloco === i.chave).map((n) => porPergunta[n.chave]))]));
  return { porPergunta, porBloco, geral: media(Object.values(porPergunta)) };
}

/**
 * Série mês a mês de uma lista { competencia, respostas }:
 * [{ competencia, rotulo, geral, <bloco>: média, <pergunta de nota>: nota }], em ordem.
 * Se houver mais de uma resposta no mesmo mês, a média delas.
 */
export function serieMensalAvd(itens = []) {
  const meses = new Map();
  for (const it of itens) {
    if (!it.competencia) continue;
    if (!meses.has(it.competencia)) meses.set(it.competencia, []);
    meses.get(it.competencia).push(notasDaResposta(it.respostas));
  }
  return [...meses.keys()].sort().map((competencia) => {
    const lista = meses.get(competencia);
    const linha = { competencia, rotulo: rotuloDaCompetencia(competencia), geral: media(lista.map((l) => l.geral)) };
    for (const i of INDICADORES) linha[i.chave] = media(lista.map((l) => l.porBloco[i.chave]));
    for (const n of NOTAS) linha[n.chave] = media(lista.map((l) => l.porPergunta[n.chave]));
    return linha;
  });
}

/** O que foi escrito numa resposta, por bloco (só os textos preenchidos). */
export function textosDaResposta(respostas) {
  return BLOCOS.map((b) => ({
    bloco: b.chave,
    rotulo: b.rotulo,
    itens: PERGUNTAS_AVD
      .filter((p) => p.bloco === b.chave && p.tipo_resposta === 'texto')
      .map((p) => ({ id: p.id, pergunta: p.texto, resposta: String((respostas ?? []).find((r) => r.pergunta_id === p.id)?.resposta ?? '').trim() }))
      .filter((t) => t.resposta),
  })).filter((b) => b.itens.length > 0);
}

/** Até quantas horas à frente o agente pode agendar a AVD (prazo de 48 horas). */
export const HORAS_MAX_AGENDAMENTO = 48;

/**
 * O horário escolhido vale? Daqui a pelo menos 1 minuto e até 48 horas.
 * @returns mensagem do problema, ou null quando está certo.
 */
export function problemaDoAgendamento(quando, agora = new Date()) {
  const t = quando instanceof Date ? quando.getTime() : new Date(quando).getTime();
  if (Number.isNaN(t)) return 'Escolha o dia e a hora.';
  if (t < agora.getTime() + 60 * 1000) return 'Escolha um horário daqui a pelo menos 1 minuto.';
  if (t > agora.getTime() + HORAS_MAX_AGENDAMENTO * 3600000) return `O horário pode ser de até ${HORAS_MAX_AGENDAMENTO} horas à frente.`;
  return null;
}

/** O agendamento desta pessoa para esta AVD, se houver (qualquer horário). */
export const agendamentoDa = (agendamentos = [], pesquisaId, colaboradorId) => (
  agendamentos.find((a) => a.pesquisa_id === pesquisaId && a.colaborador_id === colaboradorId) ?? null
);

/** Ainda falta chegar a hora do agendamento? (a AVD fica escondida até lá) */
export const agendamentoFuturo = (agendamento, agora = new Date()) => (
  Boolean(agendamento) && new Date(agendamento.agendada_para).getTime() > agora.getTime()
);

/** "dd/mm às HH:MM", no horário de Brasília. */
export function quandoPorExtenso(iso) {
  const d = new Date(iso);
  const dia = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
  const hora = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  return `${dia} às ${hora}`;
}
