/**
 * Relatórios › Pessoas — como cada pessoa está no período. Função pura,
 * testada em `npm run testar`. Usa as mesmas regras da premiação:
 * indicadores (indicadoresDoCiclo aplicado ao período), reabertura apurada
 * pelos dados e a situação das soluções replicáveis.
 */
import { noPeriodo } from './periodo.js';
import { indicadoresDoCiclo } from '../indicadoresCiclo.js';
import { reaberturaDe } from '../pontuacaoCiclo.js';
import { situacaoReplicavel } from '../../components/utils/helpers.js';

const ENCERRADA = ['encerrada', 'aguardando_confirmacao_reabertura'];
const valida = (t) => !t.excluida && t.status !== 'excluida';

/**
 * @returns [{ id, nome, encerradas, noPrazo, pctNoPrazo, abertas, reaberturas,
 *             replicaveis: { aprovadas, pendentes, contestadas }, indicadores }]
 */
export function pessoasNoPeriodo({ tratativas = [], apuracoes = [], colaboradores = [], periodo = {}, agora = new Date() }) {
  const agentes = colaboradores.filter((c) => c.papel === 'agente' && c.ativo !== false);
  return agentes.map((a) => {
    const minhas = tratativas.filter((t) => valida(t) && t.agente_responsavel_id === a.id);
    const encerradas = minhas.filter((t) => ENCERRADA.includes(t.status) && noPeriodo(t.data_encerramento, periodo));
    const noPrazo = encerradas.filter((t) => t.encerrado_no_sla === true).length;
    const rep = { aprovadas: 0, pendentes: 0, contestadas: 0 };
    for (const t of encerradas) {
      const s = situacaoReplicavel(t);
      if (s === 'aprovada') rep.aprovadas += 1;
      else if (s === 'pendente') rep.pendentes += 1;
      else if (s === 'contestada') rep.contestadas += 1;
    }
    return {
      id: a.id,
      nome: a.nome_completo,
      encerradas: encerradas.length,
      noPrazo,
      pctNoPrazo: encerradas.length ? (noPrazo / encerradas.length) * 100 : null,
      abertas: minhas.filter((t) => noPeriodo(t.data_registro || t.created_date, periodo)).length,
      reaberturas: encerradas.filter((t) => reaberturaDe(t, tratativas, agora).situacao === 'reabriu').length,
      replicaveis: rep,
      indicadores: indicadoresDoCiclo(apuracoes.filter((x) => x.colaborador_id === a.id), { data_inicio: periodo.inicio || '0000-01-01', data_fim: periodo.fim || '9999-12-31' }),
    };
  }).sort((x, y) => y.encerradas - x.encerradas || String(x.nome).localeCompare(String(y.nome)));
}
