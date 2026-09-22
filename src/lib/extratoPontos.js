/**
 * Extrato de pontos do agente no ciclo: cada ponto com o motivo, e o que ainda
 * está a caminho (com a data ou a condição para contar). Função pura, testada
 * em `npm run testar`.
 *
 * Usa as MESMAS peças do ranking (src/lib/pontuacaoCiclo.js e
 * src/lib/indicadoresCiclo.js) — o total do extrato é o total do ranking.
 */
import { situacaoReplicavel, tipoTratativaLabels } from '../components/utils/helpers.js';
import { reaberturaDe, PONTOS_POR_ABERTURA } from './pontuacaoCiclo.js';

const nomeDa = (t) => [t.id_interno || (t.tratativa_id ? `#${String(t.tratativa_id).slice(0, 8)}` : null), t.nome_cliente].filter(Boolean).join(' · ');
const soma = (itens) => itens.reduce((s, i) => s + (Number(i.pontos) || 0), 0);

const INDICADORES = [
  { chave: 'csat', rotulo: 'CSAT', formato: (v) => `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` },
  { chave: 'performance', rotulo: 'Performance', formato: (v) => `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` },
  { chave: 'cx', rotulo: 'Avaliação CX', formato: (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) },
];

/**
 * @param registro   a linha do agente em pontosDeTratativasNoCiclo ({ itens, aberturas })
 * @param indicadores indicadoresDoCiclo da pessoa
 * @param lancamentos bônus manuais da pessoa no ciclo
 * @param todas      todas as tratativas (para a reabertura e a aprovação pendentes)
 * @returns { grupos: [{ chave, titulo, itens, subtotal }], aCaminho: [...], total }
 */
export function extratoDoAgente({ registro, indicadores, lancamentos = [], todas = [], agora = new Date() }) {
  const itens = registro?.itens ?? [];
  const aberturas = registro?.aberturas ?? [];
  const porId = new Map(todas.map((t) => [t.id, t]));

  const tratativas = itens
    .map((i) => ({
      quando: i.data_encerramento,
      titulo: `${tipoTratativaLabels[i.tipo_tratativa] ?? i.tipo_tratativa} · ${nomeDa(i)}`,
      detalhe: i.detalhes?.length
        ? i.detalhes.map((d) => `${d.tipo} (+${String(d.pontos).replace('.', ',')})`).join(' · ')
        : 'Nenhuma regra desta tratativa pontuou.',
      pontos: i.pontos,
      tratativa_id: i.tratativa_id,
    }))
    .sort((a, b) => String(b.quando).localeCompare(String(a.quando)));

  const abertas = aberturas
    .map((a) => ({
      quando: a.data_registro,
      titulo: `${tipoTratativaLabels[a.tipo_tratativa] ?? a.tipo_tratativa} · ${nomeDa(a)}`,
      detalhe: 'Tratativa aberta no Portal',
      pontos: PONTOS_POR_ABERTURA,
      tratativa_id: a.tratativa_id,
    }))
    .sort((a, b) => String(b.quando).localeCompare(String(a.quando)));

  const ind = INDICADORES.map(({ chave, rotulo, formato }) => {
    const dado = indicadores?.[chave];
    return {
      titulo: rotulo,
      detalhe: dado ? formato(dado.valor) : 'aguardando apuração',
      pontos: indicadores?.entraNoTotal ? (indicadores?.pontos?.[chave] ?? 0) : 0,
    };
  });

  const bonus = lancamentos.map((b) => ({
    quando: b.created_date,
    titulo: 'Bônus do gestor',
    detalhe: b.descricao || '',
    pontos: Number(b.total_pontos) || 0,
  }));

  // A caminho: o que ainda pode entrar, e a condição.
  const aCaminho = [];
  for (const i of itens) {
    const t = porId.get(i.tratativa_id);
    if (!t) continue;
    if (t.tipo_tratativa === 'reclamacao_interna') {
      const reab = reaberturaDe(t, todas, agora);
      if (reab.situacao === 'aguardando') {
        aCaminho.push({
          titulo: `Sem reabertura · ${nomeDa(i)}`,
          detalhe: `Conta a partir de ${reab.ate.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}, se o cliente não abrir outra tratativa até lá.`,
          pontos: 1,
          tom: 'espera',
          tratativa_id: i.tratativa_id,
        });
      }
    }
    const rep = situacaoReplicavel(t);
    if (rep === 'pendente') {
      aCaminho.push({ titulo: `Solução replicável · ${nomeDa(i)}`, detalhe: 'Aguardando a aprovação do gestor.', pontos: 0.5, tom: 'espera', tratativa_id: i.tratativa_id });
    } else if (rep === 'contestada') {
      aCaminho.push({
        titulo: `Solução replicável contestada · ${nomeDa(i)}`,
        detalhe: t.solucao_replicavel_parecer ? `Parecer do gestor: ${t.solucao_replicavel_parecer}` : 'O gestor contestou.',
        pontos: 0,
        tom: 'negado',
        tratativa_id: i.tratativa_id,
      });
    }
  }

  const grupos = [
    { chave: 'tratativas', titulo: 'Tratativas encerradas', itens: tratativas },
    { chave: 'aberturas', titulo: 'Tratativas abertas · 0,5 cada', itens: abertas },
    {
      chave: 'indicadores',
      titulo: indicadores?.entraNoTotal === false ? 'Indicadores (não somam neste ciclo)' : 'Indicadores',
      itens: ind,
    },
    { chave: 'bonus', titulo: 'Bônus do gestor', itens: bonus },
  ]
    .filter((g) => g.itens.length)
    .map((g) => ({ ...g, subtotal: soma(g.itens) }));

  return { grupos, aCaminho, total: grupos.reduce((s, g) => s + g.subtotal, 0) };
}
