/**
 * AUDITORIA DO TELEFONE (55PBX) — conferir, ligação por ligação, como a
 * fórmula classificou cada uma. Diferente da Ouvidoria do chat, aqui não há
 * nada para o gestor decidir: a nota vem no arquivo (FCR + CSAT), a regra é
 * automática. Esta tela é só para ele CONFERIR que bateu certo — Pedro
 * (29/09/2026) pediu para poder "auditar" o 55PBX do mesmo jeito que revisa
 * o chat, mesmo sendo automático.
 */

/** Rótulo e categoria de UMA linha do historico_detalhado do telefone. */
function classificarLinha(h) {
  if (h?.tipo === 'TRANSFERENCIA') return { categoria: 'transferencia', rotulo: 'Transferência de fila' };
  if (h?.isPositiva) return { categoria: 'positiva', rotulo: 'Positiva' };
  if (h?.isNegativa) return { categoria: 'negativa', rotulo: 'Negativa' };
  if (h?.isNeutra) return { categoria: 'neutra', rotulo: 'Neutra (nota 3)' };
  if (h?.isIncompleta) return { categoria: 'incompleta', rotulo: 'Incompleta (sem nota)' };
  if (!h?.isAtendida) return { categoria: 'nao_atendida', rotulo: 'Não atendida' };
  return { categoria: 'sem_avaliacao', rotulo: 'Sem avaliação (FCR ausente)' };
}

/**
 * Todas as ligações auditáveis, de todas as apurações de telefone (ou só as
 * do filtro passado). Uma linha por ligação, pronta pra tabela.
 */
export function ligacoesAuditoria(apuracoes = [], { colaboradorId, categoria } = {}) {
  const linhas = [];
  apuracoes
    .filter((a) => a.tipo_apuracao === 'telefone')
    .filter((a) => !colaboradorId || a.colaborador_id === colaboradorId)
    .forEach((a) => {
      (a.historico_detalhado ?? []).forEach((h) => {
        const c = classificarLinha(h);
        if (categoria && c.categoria !== categoria) return;
        linhas.push({
          apuracaoId: a.id,
          colaboradorId: a.colaborador_id,
          colaboradorNome: a.colaborador_nome,
          data: h.data ?? null,
          status: h.status ?? null,
          fcr: h.fcr ?? null,
          csat: h.csat ?? null,
          categoria: c.categoria,
          rotulo: c.rotulo,
        });
      });
    });
  return linhas.sort((x, y) => String(y.data ?? '').localeCompare(String(x.data ?? '')));
}

/** Contagem por categoria, para o resumo do topo. */
export function resumoAuditoria(linhas = []) {
  const resumo = {
    total: linhas.length, positiva: 0, negativa: 0, neutra: 0, incompleta: 0, transferencia: 0, nao_atendida: 0, sem_avaliacao: 0,
  };
  linhas.forEach((l) => { resumo[l.categoria] = (resumo[l.categoria] || 0) + 1; });
  return resumo;
}
