/**
 * OUVIDORIA DO CHAT — classificar, ticket por ticket, quem é negativo de
 * verdade.
 *
 * Pedro (24/09/2026, corrigindo a primeira versão): o Zendesk não manda
 * nenhuma coluna de nota no arquivo — só "satisfação boa" e "satisfação
 * ruim" (1/0). Não dá para reconhecer isso na importação. A classificação é
 * manual: depois de importado, ele revisa cada ticket marcado "ruim" e diz
 * se a nota era 1, 2 (negativo de verdade) ou 3 (neutro — a empresa conta
 * como negativo, o Portal não).
 *
 * O resultado oficial (csat, csatPercentual — o que vale na premiação) NUNCA
 * muda por causa disso. O que muda são campos só informativos, recalculados
 * aqui a partir do historico_detalhado depois de cada classificação.
 */

const ehTicketRuim = (h) => h?.ruim === 1;
const classificado = (h) => h?.nota === 1 || h?.nota === 2 || h?.nota === 3;

/**
 * Recalcula os campos de ouvidoria de UMA apuração de chat a partir do
 * historico_detalhado (fonte da verdade das classificações). Devolve o que
 * precisa ser salvo: dados_por_data e canal_chat atualizados.
 */
export function recalcularOuvidoriaChat(apuracao) {
  const historico = apuracao?.historico_detalhado ?? [];

  const porDia = new Map();
  historico.forEach((h) => {
    if (!ehTicketRuim(h) || !h?.data) return;
    const atual = porDia.get(h.data) ?? { neutros: 0, temClassificacao: false };
    if (h.nota === 3) atual.neutros += 1;
    if (classificado(h)) atual.temClassificacao = true;
    porDia.set(h.data, atual);
  });

  const dados_por_data = (apuracao?.dados_por_data ?? []).map((dia) => {
    if (!dia.chat) return dia;
    const info = porDia.get(dia.data) ?? { neutros: 0, temClassificacao: false };
    const negativos_confirmados = Math.max(0, (dia.chat.total_negativos || 0) - info.neutros);
    const avaliadosSemNeutros = (dia.chat.total_avaliados || 0) - info.neutros;
    const csat_sem_neutros = avaliadosSemNeutros > 0
      ? ((dia.chat.total_positivos || 0) / avaliadosSemNeutros) * 100
      : (dia.chat.csat || 0);
    return {
      ...dia,
      chat: {
        ...dia.chat,
        total_neutros: info.neutros,
        negativos_confirmados,
        csat_sem_neutros,
        tem_nota: info.temClassificacao,
      },
    };
  });

  const somaChat = (campo) => dados_por_data.reduce((soma, d) => soma + (d.chat?.[campo] || 0), 0);
  const totalNeutros = somaChat('total_neutros');
  const totalAvaliados = apuracao?.canal_chat?.avaliados ?? somaChat('total_avaliados');
  const totalPositivos = somaChat('total_positivos');
  const totalNegativosBruto = Math.max(0, totalAvaliados - totalPositivos);
  const avaliadosSemNeutrosTotal = totalAvaliados - totalNeutros;
  const csatSemNeutros = avaliadosSemNeutrosTotal > 0
    ? (totalPositivos / avaliadosSemNeutrosTotal) * 100
    : (apuracao?.canal_chat?.csat ?? 0);

  const canal_chat = apuracao?.canal_chat
    ? {
      ...apuracao.canal_chat,
      tem_nota: historico.some((h) => ehTicketRuim(h) && classificado(h)),
      total_neutros: totalNeutros,
      negativos_confirmados: Math.max(0, totalNegativosBruto - totalNeutros),
      csat_sem_neutros: csatSemNeutros,
    }
    : apuracao?.canal_chat;

  return { dados_por_data, canal_chat };
}

/**
 * Classifica UM ticket (1, 2, 3, ou null para "desfazer") dentro de uma
 * apuração já carregada, e devolve o patch pronto para salvar
 * (historico_detalhado + dados_por_data + canal_chat).
 */
export function classificarTicket(apuracao, ticket, nota) {
  const historico_detalhado = (apuracao?.historico_detalhado ?? []).map((h) => (
    h?.ticket === ticket ? { ...h, nota } : h
  ));
  const recalculo = recalcularOuvidoriaChat({ ...apuracao, historico_detalhado });
  return { historico_detalhado, ...recalculo };
}

/**
 * A fila de tickets "ruim" para revisar, de todas as apurações de chat
 * (ou só as do filtro passado). Cada linha carrega o bastante para
 * classificar sem reabrir a apuração inteira.
 */
export function filaDeNegativos(apuracoes = [], { colaboradorId, apenasNaoClassificados = false } = {}) {
  const linhas = [];
  apuracoes
    .filter((a) => a.tipo_apuracao === 'chat')
    .filter((a) => !colaboradorId || a.colaborador_id === colaboradorId)
    .forEach((a) => {
      (a.historico_detalhado ?? []).forEach((h) => {
        if (!ehTicketRuim(h)) return;
        if (apenasNaoClassificados && classificado(h)) return;
        linhas.push({
          apuracaoId: a.id,
          colaboradorId: a.colaborador_id,
          colaboradorNome: a.colaborador_nome,
          ticket: h.ticket ?? null,
          data: h.data ?? null,
          nota: h.nota ?? null,
        });
      });
    });
  return linhas.sort((x, y) => String(y.data ?? '').localeCompare(String(x.data ?? '')));
}

/** Um resumo rápido para o topo da tela: quantos faltam, quantos já são 1/2/3. */
export function resumoDaFila(linhas = []) {
  const resumo = { total: linhas.length, naoClassificados: 0, nota1: 0, nota2: 0, nota3: 0 };
  linhas.forEach((l) => {
    if (l.nota === 1) resumo.nota1 += 1;
    else if (l.nota === 2) resumo.nota2 += 1;
    else if (l.nota === 3) resumo.nota3 += 1;
    else resumo.naoClassificados += 1;
  });
  return resumo;
}
