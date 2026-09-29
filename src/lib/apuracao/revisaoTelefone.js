/**
 * REVISÃO DE NEGATIVAS DO TELEFONE (55PBX) — Pedro (30/09/2026): algumas
 * ligações ficam mudas (falha técnica, sem áudio) e mesmo assim o cliente
 * avalia como negativa — não é insatisfação real. O gestor confirma que a
 * negativa é de verdade, ou remove (com motivo obrigatório, que fica
 * registrado na própria ligação).
 *
 * Diferente da Ouvidoria do chat: aqui a remoção MUDA o CSAT oficial — uma
 * negativa contestada some do cálculo (como se a ligação nunca tivesse sido
 * avaliada), porque ela realmente prejudicava a meta por um motivo que não
 * era culpa do agente.
 */

const ehNegativa = (h) => h?.isNegativa === true;

/**
 * Recalcula dados_por_data e canal_telefone a partir do historico_detalhado
 * (fonte da verdade das revisões). Uma negativa removida sai de
 * total_negativas E total_avaliadas — não vira positiva nem neutra, some
 * do CSAT como se não tivesse acontecido.
 */
export function recalcularTelefoneComRevisoes(apuracao) {
  const historico = apuracao?.historico_detalhado ?? [];

  const removidasPorDia = new Map();
  historico.forEach((h) => {
    if (!h?.data || !ehNegativa(h) || h.revisao?.status !== 'removido') return;
    removidasPorDia.set(h.data, (removidasPorDia.get(h.data) ?? 0) + 1);
  });

  const dados_por_data = (apuracao?.dados_por_data ?? []).map((dia) => {
    if (!dia.telefone) return dia;
    const removidasAgora = removidasPorDia.get(dia.data) ?? 0;
    const removidasAntes = dia.telefone.negativas_removidas || 0;
    if (removidasAgora === removidasAntes) return dia;

    // Reconstrói a base original (antes de qualquer revisão já aplicada
    // neste registro) e reaplica as remoções atuais por cima dela — sem
    // isto, desfazer uma remoção não devolvia a negativa (o dado salvo já
    // estava sem ela, e um "removidas - 0" não recupera nada).
    const negativasBase = (dia.telefone.total_negativas || 0) + removidasAntes;
    const avaliadasBase = (dia.telefone.total_avaliadas || 0) + removidasAntes;

    const totalNegativas = Math.max(0, negativasBase - removidasAgora);
    const totalAvaliadas = Math.max(0, avaliadasBase - removidasAgora);
    const baseCsat = (dia.telefone.total_positivas || 0) + totalNegativas;
    const csat = baseCsat > 0 ? ((dia.telefone.total_positivas || 0) / baseCsat) * 100 : 0;

    return {
      ...dia,
      telefone: {
        ...dia.telefone,
        total_negativas: totalNegativas,
        total_avaliadas: totalAvaliadas,
        negativas_removidas: removidasAgora,
        csat,
      },
    };
  });

  const somaTel = (campo) => dados_por_data.reduce((s, d) => s + (d.telefone?.[campo] || 0), 0);
  const totalPositivas = somaTel('total_positivas');
  const totalNegativas = somaTel('total_negativas');
  const totalAvaliadas = somaTel('total_avaliadas');
  const baseCsatTotal = totalPositivas + totalNegativas;
  const csatTotal = baseCsatTotal > 0 ? (totalPositivas / baseCsatTotal) * 100 : (apuracao?.canal_telefone?.csat ?? 0);

  const canal_telefone = apuracao?.canal_telefone
    ? { ...apuracao.canal_telefone, csat: csatTotal, avaliados: totalAvaliadas }
    : apuracao?.canal_telefone;

  return { dados_por_data, canal_telefone };
}

/**
 * Revisa UMA ligação (pelo índice dela em historico_detalhado) e devolve o
 * patch pronto para salvar. `decisao` é 'confirmado', 'removido' (motivo
 * obrigatório) ou null (desfaz a revisão, volta a "não revisado").
 */
export function revisarLigacao(apuracao, indice, decisao, motivo, quem) {
  if (decisao === 'removido' && !motivo?.trim()) {
    throw new Error('Motivo é obrigatório para remover uma negativa.');
  }

  const historico_detalhado = (apuracao?.historico_detalhado ?? []).map((h, i) => {
    if (i !== indice || !ehNegativa(h)) return h;
    if (decisao === null) return { ...h, revisao: null };
    return {
      ...h,
      revisao: {
        status: decisao,
        motivo: decisao === 'removido' ? motivo.trim() : null,
        por_nome: quem?.nome_completo ?? null,
        por_id: quem?.id ?? null,
        em: new Date().toISOString(),
      },
    };
  });

  const recalculo = recalcularTelefoneComRevisoes({ ...apuracao, historico_detalhado });
  return { historico_detalhado, ...recalculo };
}
