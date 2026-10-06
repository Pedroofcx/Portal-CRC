/**
 * PORTAL CRC — FÉRIAS DO GESTÃO CLICK: O PLANO DA SINCRONIZAÇÃO (puro, sem rede nem banco)
 *
 * Recebe o que o Gestão Click devolveu e o que o Portal tem e decide, sem
 * executar nada, o que criar, atualizar e cancelar. A Edge Function
 * (index.ts) só busca os dados e aplica este plano. Como é função pura, há
 * teste para cada regra (ferramentas/testar-validacao.mjs).
 *
 * AS REGRAS (decisão de Pedro, 05/10/2026)
 *   1. O Gestão Click é OFICIAL para saldo, períodos aquisitivos e gozo. O que
 *      vem de lá sobrescreve o que o Portal tinha naquele período.
 *   2. Nada do que só existe no Portal é apagado (ciclos antigos ficam).
 *   3. As parcelas que ainda não terminaram (planejadas ou em curso) viram
 *      férias APROVADAS no Portal (origem "gestaoclick"): é isso que trava a
 *      Escala e o rodízio. Parcela que sumiu de lá é cancelada aqui.
 *   4. A pessoa é ligada pelo E-MAIL. Sem e-mail igual, ou com mais de um
 *      colaborador com o mesmo e-mail, é pulada e vai para os avisos.
 *   5. Salário nunca é lido nem guardado.
 *   6. Pedido aprovado no Portal que o Gestão Click não conhece vira AVISO
 *      ("lance lá"), porque o Portal não escreve no Gestão Click.
 *   7. Toda parcela de férias (passada, em curso ou futura) é lançada também na
 *      ESCALA DE TRABALHO como "Férias" (um registro por parcela, chave
 *      gc-ferias:<período>:<ordem>). Parcela que sumiu de lá tem o registro
 *      desativado, não apagado. Um registro manual de depois prevalece (a escala
 *      vale a marcação mais recente do dia).
 */

const so = (v) => String(v ?? '').slice(0, 10);
const emDias = (data) => {
  const [a, m, d] = so(data).split('-').map(Number);
  return Date.UTC(a, m - 1, d) / 86400000;
};
const diasCorridos = (inicio, fim) => (!inicio || !fim ? 0 : Math.max(0, Math.round(emDias(fim) - emDias(inicio)) + 1));
const dataBr = (d) => so(d).split('-').reverse().slice(0, 2).join('/');

/** Prefixo do escala_id dos registros de férias que a sincronização cria na Escala de Trabalho. */
export const PREFIXO_ESCALA = 'gc-ferias:';

export const normalizarEmail = (e) => String(e ?? '').trim().toLowerCase();

/** Mesma regra de src/lib/ferias.js (situacaoDoCiclo): há teste que compara as duas. */
export function statusDoCiclo(ciclo, hoje) {
  const direito = ciclo.dias_direito ?? 30;
  const abono = ciclo.abono_dias ?? 0;
  const usados = ciclo.dias_utilizados ?? 0;
  const restantes = Math.max(0, direito - abono - usados);
  if (so(ciclo.aquisitivo_fim) && so(hoje) <= so(ciclo.aquisitivo_fim)) return 'em_aquisicao';
  if (restantes === 0) return 'utilizado';
  const venceEm = so(ciclo.concessivo_fim);
  const dias = venceEm ? Math.round(emDias(venceEm) - emDias(hoje)) : null;
  if (dias !== null && dias < 0) return 'vencido';
  if (dias !== null && dias <= 90) return 'vencendo';
  if (usados > 0) return 'parcialmente_utilizado';
  return 'disponivel';
}

/** As parcelas do Gestão Click no formato de fragmento do Portal. */
export function fragmentosDasParcelas(periodoId, parcelas = []) {
  return [...parcelas]
    .sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0))
    .map((p) => ({
      id: `gc-${periodoId}-${p.ordem}`,
      data_inicio: so(p.inicio),
      data_fim: so(p.fim),
      dias: Number(p.dias) || diasCorridos(p.inicio, p.fim),
      abono_dias: 0,
      status: 'agendado',
      observacao: p.status === 'planejada' ? 'Gestão Click (planejada)' : 'Gestão Click',
      origem: 'gestaoclick',
    }));
}

/**
 * JSON com as chaves em ordem fixa. O banco (jsonb) devolve as chaves de um
 * objeto em outra ordem da que foi gravada: comparar o texto direto dava
 * "mudou" a cada execução, só por causa da ordem.
 */
const canonico = (v) => {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonico(v[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
};
const iguais = (a, b) => canonico(a ?? null) === canonico(b ?? null);

const CAMPOS_COMPARADOS = [
  'colaborador_id', 'colaborador_nome', 'colaborador_setor', 'aquisitivo_inicio', 'aquisitivo_fim', 'concessivo_fim',
  'dias_direito', 'abono_dias', 'dias_utilizados', 'status', 'fragmentos', 'gestaoclick_id', 'origem',
];

const normalizaCampo = (campo, valor) => {
  if (['aquisitivo_inicio', 'aquisitivo_fim', 'concessivo_fim'].includes(campo)) return so(valor);
  if (['dias_direito', 'abono_dias', 'dias_utilizados'].includes(campo)) return Number(valor ?? 0);
  return valor ?? null;
};

/**
 * @param {object} entrada
 * @param {Array} entrada.empresaColaboradores  GET /colaboradores
 * @param {Array} entrada.empresaFerias         GET /ferias
 * @param {Array} entrada.portalColaboradores   colaborador_base: id, nome_completo, email, data_admissao, cargo_atual
 * @param {Array} entrada.portalCiclos          ciclo_ferias
 * @param {Array} entrada.portalSolicitacoes    solicitacao_ferias
 * @param {string} entrada.hoje                 AAAA-MM-DD (Brasília)
 * @param {string} entrada.agoraIso
 */
export function planejarSincronizacao({
  empresaColaboradores = [], empresaFerias = [], portalColaboradores = [],
  portalCiclos = [], portalSolicitacoes = [], portalEscala = [], hoje, agoraIso,
}) {
  const avisos = [];
  const aviso = (tipo, mensagem) => avisos.push({ tipo, mensagem });
  const plano = {
    ciclosCriar: [], ciclosAtualizar: [],
    solicitacoesCriar: [], solicitacoesAtualizar: [], solicitacoesCancelar: [],
    escalaCriar: [], escalaAtualizar: [], escalaDesativar: [],
    avisos,
  };
  const resumo = {
    colaboradores_na_empresa: empresaColaboradores.length,
    colaboradores_ligados: 0,
    colaboradores_sem_correspondente: 0,
    periodos_recebidos: empresaFerias.length,
    periodos_ignorados: 0,
    ciclos_criados: 0, ciclos_atualizados: 0, ciclos_sem_mudanca: 0,
    ferias_criadas: 0, ferias_atualizadas: 0, ferias_canceladas: 0,
    escala_criadas: 0, escala_atualizadas: 0, escala_desativadas: 0,
  };

  // --- 1. quem é quem: pelo e-mail ----------------------------------------
  const porEmail = new Map();
  portalColaboradores.forEach((c) => {
    const e = normalizarEmail(c.email);
    if (!e) return;
    porEmail.set(e, [...(porEmail.get(e) ?? []), c]);
  });
  const pessoaDaEmpresa = new Map(); // id na empresa -> colaborador do Portal
  for (const ec of empresaColaboradores) {
    const e = normalizarEmail(ec.email);
    const candidatos = porEmail.get(e) ?? [];
    if (!e || candidatos.length === 0) {
      resumo.colaboradores_sem_correspondente += 1;
      aviso('sem_correspondente', `${ec.nome ?? 'Colaborador'} (${e || 'sem e-mail'}) está no Gestão Click mas não tem colaborador com este e-mail no Portal.`);
      continue;
    }
    if (candidatos.length > 1) {
      resumo.colaboradores_sem_correspondente += 1;
      aviso('email_repetido', `${ec.nome ?? 'Colaborador'}: o e-mail ${e} existe em mais de um colaborador do Portal. Corrija o cadastro.`);
      continue;
    }
    pessoaDaEmpresa.set(ec.id, { portal: candidatos[0], empresa: ec });
    resumo.colaboradores_ligados += 1;
  }

  // --- 2. períodos aquisitivos -> ciclos ---------------------------------------
  const chavesDeParcelasVivas = new Set();   // parcelas que ainda valem (terminam hoje ou depois)
  const ciclosPorGc = new Map(portalCiclos.filter((c) => c.gestaoclick_id).map((c) => [c.gestaoclick_id, c]));
  const adotados = new Set();
  const escalaDesejada = new Map(); // escala_id -> registro da Escala de Trabalho

  for (const f of empresaFerias) {
    const ligacao = pessoaDaEmpresa.get(f.colaborador?.id);
    if (!ligacao) { resumo.periodos_ignorados += 1; continue; }
    const { portal: pessoa, empresa } = ligacao;
    const inicio = so(f.aquisitivo?.inicio);
    const fim = so(f.aquisitivo?.fim);
    if (!inicio || !fim) { resumo.periodos_ignorados += 1; aviso('periodo_incompleto', `Período sem datas do aquisitivo para ${pessoa.nome_completo}: ignorado.`); continue; }

    const existente = ciclosPorGc.get(f.id)
      ?? portalCiclos.find((c) => !c.gestaoclick_id && !adotados.has(c.id) && c.colaborador_id === pessoa.id && so(c.aquisitivo_inicio) === inicio)
      ?? null;
    if (existente) adotados.add(existente.id);

    const parcelas = f.parcelas ?? [];
    const fragmentos = fragmentosDasParcelas(f.id, parcelas);
    const somaParcelas = fragmentos.reduce((s, x) => s + x.dias, 0);
    let abono = f.abono ? Number(f.abono_dias) || 0 : 0;
    if (![0, 10].includes(abono)) { aviso('abono_invalido', `${pessoa.nome_completo}, período ${dataBr(inicio)}: abono de ${abono} dias fora do permitido (0 ou 10). Gravado como 0.`); abono = 0; }
    const gozados = Number(f.dias_gozados) || 0;
    if (somaParcelas !== gozados) aviso('parcelas_divergentes', `${pessoa.nome_completo}, período ${dataBr(inicio)}: ${gozados} dia(s) gozados no Gestão Click, mas as parcelas somam ${somaParcelas}.`);

    const dados = {
      colaborador_id: pessoa.id,
      colaborador_nome: pessoa.nome_completo,
      colaborador_setor: f.colaborador?.departamento ?? empresa.departamento ?? existente?.colaborador_setor ?? null,
      aquisitivo_inicio: inicio,
      aquisitivo_fim: fim,
      concessivo_fim: so(f.vencimento) || so(existente?.concessivo_fim) || null,
      dias_direito: Number(f.dias_direito) || 30,
      abono_dias: abono,
      dias_utilizados: gozados,
      fragmentos,
      gestaoclick_id: f.id,
      origem: 'gestaoclick',
    };
    dados.status = statusDoCiclo(dados, hoje);

    if (!existente) {
      plano.ciclosCriar.push({ ...dados, data_admissao: pessoa.data_admissao ?? empresa.data_admissao ?? null, sincronizado_em: agoraIso });
      resumo.ciclos_criados += 1;
    } else {
      const mudou = CAMPOS_COMPARADOS.some((c) => !iguais(normalizaCampo(c, dados[c]), normalizaCampo(c, existente[c])));
      if (mudou) {
        plano.ciclosAtualizar.push({ id: existente.id, dados: { ...dados, sincronizado_em: agoraIso } });
        resumo.ciclos_atualizados += 1;
      } else {
        resumo.ciclos_sem_mudanca += 1;
      }
    }

    // --- 3. parcelas que ainda não terminaram -> férias aprovadas ---------------
    for (const p of parcelas) {
      if (so(p.inicio) && so(p.fim)) {
        escalaDesejada.set(`${PREFIXO_ESCALA}${f.id}:${p.ordem}`, {
          escala_id: `${PREFIXO_ESCALA}${f.id}:${p.ordem}`, escala_nome: 'Férias (Gestão Click)',
          colaborador_id: pessoa.id, colaborador_nome: pessoa.nome_completo,
          data_inicio: so(p.inicio), data_fim: so(p.fim), tipo_evento: 'ferias', ativa: true,
        });
      }
      if (so(p.fim) < hoje) continue;
      const chave = `${f.id}:${p.ordem}`;
      chavesDeParcelasVivas.add(chave);
      const base = {
        data_inicio: so(p.inicio), data_fim: so(p.fim),
        dias_corridos: Number(p.dias) || diasCorridos(p.inicio, p.fim),
        periodo_aquisitivo_inicio: inicio, periodo_aquisitivo_fim: fim, periodo_concessivo_fim: so(f.vencimento) || null,
        status: 'aprovada',
      };
      const jaImportada = portalSolicitacoes.find((s) => s.gestaoclick_id === chave);
      // um pedido do Portal com as MESMAS datas é adotado, não duplicado
      const doPortal = jaImportada ? null : portalSolicitacoes.find((s) => !s.gestaoclick_id && s.origem !== 'gestaoclick'
        && s.colaborador_id === pessoa.id && so(s.data_inicio) === so(p.inicio) && so(s.data_fim) === so(p.fim)
        && ['aprovada', 'em_analise', 'sugestao_nova_data'].includes(s.status));
      const alvo = jaImportada ?? doPortal;
      if (alvo) {
        const mudou = so(alvo.data_inicio) !== base.data_inicio || so(alvo.data_fim) !== base.data_fim || alvo.status !== 'aprovada' || alvo.gestaoclick_id !== chave;
        if (mudou) {
          plano.solicitacoesAtualizar.push({ id: alvo.id, dados: { ...base, gestaoclick_id: chave } });
          resumo.ferias_atualizadas += 1;
        }
      } else {
        plano.solicitacoesCriar.push({
          colaborador_id: pessoa.id, colaborador_nome: pessoa.nome_completo, colaborador_funcao: empresa.cargo ?? pessoa.cargo_atual ?? null,
          ...base, venda_dias: 0,
          aprovador_nome: 'Gestão Click', data_aprovacao: agoraIso, data_solicitacao: agoraIso,
          observacoes_gestor: 'Importado do Gestão Click', origem: 'gestaoclick', gestaoclick_id: chave,
          historico: [{ data: agoraIso, acao: 'importada', por: 'Gestão Click' }],
        });
        resumo.ferias_criadas += 1;
      }
    }
  }

  // --- 3b. Escala de Trabalho: um registro de "Férias" por parcela --------------
  const escalaExistente = new Map(portalEscala.filter((e) => String(e.escala_id ?? '').startsWith(PREFIXO_ESCALA)).map((e) => [e.escala_id, e]));
  for (const [id, desejado] of escalaDesejada) {
    const atual = escalaExistente.get(id);
    if (!atual) { plano.escalaCriar.push(desejado); resumo.escala_criadas += 1; continue; }
    const mudou = so(atual.data_inicio) !== desejado.data_inicio || so(atual.data_fim) !== desejado.data_fim
      || atual.ativa !== true || atual.colaborador_id !== desejado.colaborador_id || atual.tipo_evento !== 'ferias';
    if (mudou) { plano.escalaAtualizar.push({ id: atual.id, dados: desejado }); resumo.escala_atualizadas += 1; }
  }
  for (const [id, atual] of escalaExistente) {
    if (escalaDesejada.has(id) || atual.ativa === false) continue;
    plano.escalaDesativar.push({ id: atual.id, dados: { ativa: false } });
    resumo.escala_desativadas += 1;
  }

  // --- 4. férias importadas que sumiram de lá: deixam de travar -----------------
  for (const s of portalSolicitacoes) {
    if (s.origem !== 'gestaoclick' || !s.gestaoclick_id) continue;
    if (!['aprovada', 'em_analise', 'sugestao_nova_data'].includes(s.status)) continue;
    if (so(s.data_fim) < hoje) continue;
    if (chavesDeParcelasVivas.has(s.gestaoclick_id)) continue;
    plano.solicitacoesCancelar.push({ id: s.id, dados: { status: 'cancelada', observacoes_gestor: 'Removida no Gestão Click' } });
    resumo.ferias_canceladas += 1;
  }

  // --- 5. aprovado no Portal e desconhecido lá: avisa para lançar --------------
  const periodosDaEmpresa = new Map(); // pessoa do Portal -> [{inicio, fim}]
  for (const f of empresaFerias) {
    const lig = pessoaDaEmpresa.get(f.colaborador?.id);
    if (!lig) continue;
    periodosDaEmpresa.set(lig.portal.id, [...(periodosDaEmpresa.get(lig.portal.id) ?? []), ...(f.parcelas ?? []).map((p) => ({ inicio: so(p.inicio), fim: so(p.fim) }))]);
  }
  const ligadosNoPortal = new Set([...pessoaDaEmpresa.values()].map((l) => l.portal.id));
  for (const s of portalSolicitacoes) {
    if (s.origem === 'gestaoclick' || s.gestaoclick_id) continue;
    if (s.status !== 'aprovada' || so(s.data_fim) < hoje || !ligadosNoPortal.has(s.colaborador_id)) continue;
    const conhecida = (periodosDaEmpresa.get(s.colaborador_id) ?? []).some((p) => p.inicio <= so(s.data_fim) && p.fim >= so(s.data_inicio));
    if (!conhecida) {
      aviso('lancar_no_gestaoclick', `${s.colaborador_nome ?? 'Colaborador'}: férias aprovadas no Portal de ${dataBr(s.data_inicio)} a ${dataBr(s.data_fim)} não existem no Gestão Click. Lance lá: o Portal não escreve no Gestão Click e o saldo oficial é o de lá.`);
    }
  }

  resumo.avisos = avisos.length;
  return { plano, resumo };
}
