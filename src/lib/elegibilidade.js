/**
 * Avaliação das exigências de elegibilidade da premiação, tal como o gestor
 * cadastra em Configurações > Elegibilidade.
 *
 * Até aqui as exigências só eram cadastradas: a tela inicial mostrava todas
 * com um "✓", cumpridas ou não. Isto é o que decide o ✓ de verdade.
 *
 * Três estados, e não dois: "sem_dado" existe porque "não sei" é diferente de
 * "não cumpriu". Sem apuração do ciclo, dizer que a pessoa falhou no CSAT
 * seria mentira — e dizer que cumpriu também.
 */

export const CANAIS = ['reclamacao_interna', 'reclame_aqui', 'google_meu_negocio', 'contestacao'];

/** Contestação aparece com dois nomes nos dados antigos. */
export const canalDe = (tipo) => (tipo === 'contestacao_compra' ? 'contestacao' : tipo);

/** Mínimo de registros por canal quando o gestor não cadastrou outro. */
export const VOLUME_MINIMO_PADRAO = 4;

/** O mínimo de registros por canal, como o gestor cadastrou (padrão 4). */
export function volumeMinimoDasExigencias(exigencias = []) {
  const e = exigencias.find((x) => x?.tipo_validacao === 'volume_minimo_canal');
  return Number(e?.volume_minimo_canal ?? e?.valor_minimo ?? VOLUME_MINIMO_PADRAO) || VOLUME_MINIMO_PADRAO;
}

/** Registros da pessoa por canal, no ciclo. */
export function volumePorCanal(tratativas = []) {
  const contagem = Object.fromEntries(CANAIS.map((c) => [c, 0]));
  for (const t of tratativas) {
    const canal = canalDe(t?.tipo_tratativa);
    if (canal in contagem && !t.excluida) contagem[canal] += 1;
  }
  return contagem;
}

const semDado = (detalhe) => ({ status: 'sem_dado', detalhe });
const comparar = (valor, minimo, formatar) => {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return semDado('Aguardando a apuração do ciclo');
  }
  return Number(valor) >= Number(minimo)
    ? { status: 'ok', detalhe: formatar(valor) }
    : { status: 'pendente', detalhe: `${formatar(valor)} — mínimo ${formatar(minimo)}` };
};

const pct = (v) => `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const nota = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

/**
 * @param exigencia registro de elegibilidade_premio
 * @param ctx { csat, performance, cx, volume: volumePorCanal(), totalTratativas }
 */
export function avaliarExigencia(exigencia, ctx = {}) {
  const minimo = exigencia?.valor_minimo;
  switch (exigencia?.tipo_validacao) {
    case 'csat_minimo':
      return comparar(ctx.csat, minimo, pct);
    case 'performance_minima':
      return comparar(ctx.performance, minimo, pct);
    case 'avaliacoes_cx':
      return comparar(ctx.cx, minimo, nota);
    case 'tratativas_minimas':
      return comparar(ctx.totalTratativas, minimo, (v) => `${v} tratativas`);
    case 'volume_minimo_canal': {
      // Estrutura de Trabalho, seção 6: o canal só conta para a premiação com
      // pelo menos N registros da pessoa no ciclo. É informativo por canal:
      // "pendente" quando algum canal em que ela atuou ainda não chegou lá.
      const necessario = Number(exigencia.volume_minimo_canal ?? 4);
      const volume = ctx.volume ?? {};
      const atuados = Object.entries(volume).filter(([, n]) => n > 0);
      if (!atuados.length) return semDado('Nenhum registro no ciclo ainda');
      const abaixo = atuados.filter(([, n]) => n < necessario);
      return abaixo.length
        ? { status: 'pendente', detalhe: `${abaixo.length} canal(is) abaixo de ${necessario} registros` }
        : { status: 'ok', detalhe: `Todos os canais com ${necessario}+ registros` };
    }
    default:
      // Cursos, presença e personalizadas ainda não têm de onde ler no Portal.
      return semDado('Conferida pelo gestor');
  }
}
