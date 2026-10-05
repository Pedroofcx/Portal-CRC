/**
 * O sino de notificações: o que precisa da atenção de uma pessoa, agora, numa
 * lista só. Função pura (testada em `npm run testar`); quem busca os dados é o
 * hook useNotificacoes.
 *
 * NÃO é um canal novo de aviso: é um resumo do que o sistema já pede em vários
 * lugares (a central de pendências do início, a atribuição de ticket, as
 * filas da gestão), com um clique até a tela certa. As regras de "quem recebe
 * o quê" são as mesmas dessas telas:
 *   - avisos e pesquisas: src/lib/pendencias.js (só o que é PARA a pessoa,
 *     vigente e publicado depois do cadastro dela);
 *   - POPs: src/lib/pops.js (a ciência é da equipe, não do gestor);
 *   - prazo vencido: src/lib/cicloEquipe.js (o mesmo cálculo da faixa de
 *     vencidas do início).
 *
 * Duas naturezas de item:
 *   - PENDENTE: some sozinho quando a pessoa faz o que foi pedido (confirmar o
 *     aviso, responder a pesquisa). Nunca é "marcado como lido": se ainda falta
 *     fazer, continua no sino.
 *   - INFORMATIVO: só avisa (ex.: "suas férias foram aprovadas"). Dá para
 *     marcar como visto; a marca fica no navegador de quem a fez.
 */
import { filaDePendencias } from './pendencias.js';
import { popsParaCiencia } from './pops.js';
import { vencidasDaEquipe } from './cicloEquipe.js';

/** Ordem das categorias no sino (a primeira é a que mais pede ação). */
export const CATEGORIAS = [
  { chave: 'atribuicao', rotulo: 'Tickets atribuídos a você' },
  { chave: 'tratativa', rotulo: 'Tratativas' },
  { chave: 'hansei', rotulo: 'Hansei' },
  { chave: 'pesquisa', rotulo: 'Pesquisas' },
  { chave: 'aviso', rotulo: 'Avisos' },
  { chave: 'pop', rotulo: 'POPs para ler' },
  { chave: 'ferias', rotulo: 'Férias' },
  { chave: 'replicavel', rotulo: 'Soluções replicáveis' },
];

const ROTULO_CANAL = {
  reclamacao_interna: 'Reclamação Interna',
  reclame_aqui: 'Reclame Aqui',
  google_meu_negocio: 'Google Meu Negócio',
  contestacao_compra: 'Contestação de Compra',
  procon: 'PROCON',
};
const ROTULO_PRIORIDADE = { baixa: 'baixa', media: 'média', alta: 'alta', critica: 'crítica' };

const dataCurta = (v) => {
  const d = String(v ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '';
};
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/** Férias decididas contam como novidade por este tempo. */
export const DIAS_DE_NOVIDADE_FERIAS = 30;

export function montarNotificacoes({
  colaborador,
  permissoes = [],
  avisos = [], leituras = [], pesquisas = [], participacoes = [],
  hanseis = [], pops = [], leiturasPop = [],
  atribuicoes = [],
  tratativasAbertas = [],
  solicitacoesFerias = [],
  replicaveisPendentes = 0,
  vistas = new Set(),
  agora = new Date(),
} = {}) {
  if (!colaborador?.id) return [];
  const tem = (chave) => (permissoes instanceof Set ? permissoes.has(chave) : permissoes.includes(chave));
  const ehAgente = colaborador.papel === 'agente';
  const itens = [];
  const add = (item) => itens.push({ informativa: false, ...item });

  // --- tickets atribuídos (a pessoa precisa dar o "OK") ---------------------
  atribuicoes
    .filter((a) => a.agente_id === colaborador.id && a.confirmado_pelo_agente === false)
    .forEach((a) => add({
      id: `atribuicao-${a.id}`, categoria: 'atribuicao', para: '/Tratativas',
      titulo: `Ticket #${a.ticket_id}`,
      detalhe: [ROTULO_CANAL[a.tipo_tratativa] ?? a.tipo_tratativa, a.prioridade ? `prioridade ${ROTULO_PRIORIDADE[a.prioridade] ?? a.prioridade}` : null].filter(Boolean).join(' · '),
    }));

  // --- prazo vencido ---------------------------------------------------------
  const suas = ehAgente ? tratativasAbertas.filter((t) => t.agente_responsavel_id === colaborador.id) : tratativasAbertas;
  const retrato = vencidasDaEquipe(suas, agora);
  if (retrato.vencidas > 0) {
    add({
      id: 'tratativas-vencidas', categoria: 'tratativa',
      para: ehAgente ? `/Tratativas?situacao=vencidas&agente=${colaborador.id}` : '/Tratativas?situacao=vencidas',
      titulo: ehAgente
        ? `${plural(retrato.vencidas, 'tratativa sua com o prazo vencido', 'tratativas suas com o prazo vencido')}`
        : `${plural(retrato.vencidas, 'tratativa da equipe com o prazo vencido', 'tratativas da equipe com o prazo vencido')}`,
      detalhe: 'Abrir a lista das vencidas',
    });
  }
  if (retrato.venceHoje > 0) {
    add({
      id: 'tratativas-vencem-hoje', categoria: 'tratativa',
      para: ehAgente ? `/Tratativas?situacao=abertas&agente=${colaborador.id}` : '/Tratativas?situacao=abertas',
      titulo: ehAgente
        ? `${plural(retrato.venceHoje, 'tratativa sua vence hoje', 'tratativas suas vencem hoje')}`
        : `${plural(retrato.venceHoje, 'tratativa da equipe vence hoje', 'tratativas da equipe vencem hoje')}`,
      detalhe: 'Abrir a lista das abertas',
    });
  }

  // --- Hansei novo (só agente: o gestor envia) ---------------------------------
  if (ehAgente) {
    hanseis.forEach((h) => add({
      id: `hansei-${h.id}`, categoria: 'hansei', para: '/Hansei',
      titulo: 'Novo resultado de Hansei',
      detalhe: h.periodo_inicio && h.periodo_fim ? `Período ${dataCurta(h.periodo_inicio)} a ${dataCurta(h.periodo_fim)}` : 'Abra para ler e responder',
    }));
  }

  // --- avisos e pesquisas (mesma regra da central de pendências) ---------------
  filaDePendencias({ colaborador, avisos, leituras, pesquisas, participacoes, agora }).forEach(({ tipo, item }) => {
    if (tipo === 'aviso') {
      add({
        id: `aviso-${item.id}`, categoria: 'aviso', para: '/Avisos',
        titulo: item.titulo || 'Aviso',
        detalhe: item.tipo === 'urgente' ? 'Urgente · confirme a leitura' : 'Confirme a leitura',
        urgente: item.tipo === 'urgente',
      });
    } else {
      add({
        id: `pesquisa-${item.id}`, categoria: 'pesquisa', para: '/Pesquisas',
        titulo: item.titulo || 'Pesquisa',
        detalhe: item.data_fim ? `Responda até ${dataCurta(item.data_fim)}` : 'Aguardando a sua resposta',
      });
    }
  });

  // --- POPs com versão nova ----------------------------------------------------
  popsParaCiencia({ pops, leituras: leiturasPop, colaborador }).forEach((p) => add({
    id: `pop-${p.id}@${p.versao}`, categoria: 'pop', para: '/POP',
    titulo: p.titulo || p.codigo || 'POP',
    detalhe: p.versao ? `Versão ${p.versao} · confirme a leitura` : 'Confirme a leitura',
  }));

  // --- férias ------------------------------------------------------------------
  if (ehAgente || !tem('aprovar_ferias')) {
    const limite = agora.getTime() - DIAS_DE_NOVIDADE_FERIAS * 86400000;
    solicitacoesFerias
      .filter((s) => s.colaborador_id === colaborador.id && ['aprovada', 'recusada', 'sugestao_nova_data'].includes(s.status))
      .filter((s) => new Date(s.updated_date ?? s.created_date ?? 0).getTime() >= limite)
      .forEach((s) => {
        const id = `ferias-${s.id}-${s.status}`;
        if (vistas.has(id)) return;
        const periodo = `${dataCurta(s.data_inicio)} a ${dataCurta(s.data_fim)}`;
        add({
          id, categoria: 'ferias', para: '/GestaoFerias', informativa: true,
          titulo: s.status === 'aprovada' ? `Férias aprovadas (${periodo})`
            : s.status === 'recusada' ? `Pedido de férias recusado (${periodo})`
              : `Outra data sugerida para as suas férias (${periodo})`,
          detalhe: s.status === 'sugestao_nova_data' ? 'Abra para aceitar ou pedir de novo' : 'Veja os detalhes',
        });
      });
  }
  if (tem('aprovar_ferias')) {
    const emAnalise = solicitacoesFerias.filter((s) => s.status === 'em_analise' && s.colaborador_id !== colaborador.id).length;
    if (emAnalise > 0) {
      add({
        id: 'ferias-para-aprovar', categoria: 'ferias', para: '/GestaoFerias',
        titulo: plural(emAnalise, 'pedido de férias para aprovar', 'pedidos de férias para aprovar'),
        detalhe: 'Abrir os pedidos',
      });
    }
  }

  // --- soluções replicáveis esperando a gestão --------------------------------
  if (tem('aprovar_solucao_replicavel') && replicaveisPendentes > 0) {
    add({
      id: 'replicaveis-pendentes', categoria: 'replicavel', para: '/SolucoesReplicaveis',
      titulo: plural(replicaveisPendentes, 'solução replicável para aprovar', 'soluções replicáveis para aprovar'),
      detalhe: 'Abrir a fila',
    });
  }

  // Categoria na ordem do sino; dentro dela, urgente primeiro e o resto como veio.
  const posicao = (c) => CATEGORIAS.findIndex((x) => x.chave === c);
  return itens
    .map((it, i) => ({ ...it, _i: i }))
    .sort((a, b) => posicao(a.categoria) - posicao(b.categoria) || Number(Boolean(b.urgente)) - Number(Boolean(a.urgente)) || a._i - b._i)
    .map(({ _i, ...it }) => it);
}

/** Itens agrupados por categoria, na ordem do sino: [{ chave, rotulo, itens }]. */
export function agruparPorCategoria(notificacoes = []) {
  return CATEGORIAS
    .map((c) => ({ ...c, itens: notificacoes.filter((n) => n.categoria === c.chave) }))
    .filter((g) => g.itens.length > 0);
}

/** O número do selo: só o que está pendente ou novo. Mostra "9+" a partir de 10. */
export function rotuloDoSelo(total) {
  if (!total) return '';
  return total > 9 ? '9+' : String(total);
}
