/**
 * Relatórios › Jornada do cliente — onde o cliente sofre. Funções puras,
 * testadas em `npm run testar`.
 *
 * Custo de cada caso = devolvido ao cliente + custo operacional OFICIAL
 * (servidor, dividido pela carga simultânea) + perda de receita informada —
 * a mesma conta do grupo Financeiro. Encerradas no período.
 */
import { noPeriodo } from './periodo.js';

const ENCERRADA = ['encerrada', 'aguardando_confirmacao_reabertura'];
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const valida = (t) => !t.excluida && t.status !== 'excluida';
export const custoDoCaso = (t) => (t.houve_devolucao_financeira ? num(t.valor_devolvido_cliente) : 0) + num(t.custo_operacional_reais) + num(t.valor_perda_receita);

const agrupar = (itens, chave) => {
  const m = {};
  for (const t of itens) {
    const k = chave(t) || 'Não definido';
    m[k] ||= { nome: k, casos: 0, custo: 0, itens: [] };
    m[k].casos += 1;
    m[k].custo += custoDoCaso(t);
    m[k].itens.push(t);
  }
  return Object.values(m);
};

export function resumoJornada(tratativas = [], periodo = {}) {
  const encerradas = tratativas.filter((t) => valida(t) && ENCERRADA.includes(t.status) && noPeriodo(t.data_encerramento, periodo));

  const etapas = agrupar(encerradas, (t) => t.etapa_jornada_nome)
    .map((e) => ({
      ...e,
      motivos: agrupar(e.itens, (t) => t.motivo_nome).sort((a, b) => b.casos - a.casos).slice(0, 3).map(({ nome, casos }) => ({ nome, casos })),
      canais: agrupar(e.itens, (t) => t.tipo_tratativa).sort((a, b) => b.casos - a.casos).map(({ nome, casos }) => ({ nome, casos })),
      noPrazo: e.itens.filter((t) => t.encerrado_no_sla === true).length,
    }))
    .sort((a, b) => b.custo - a.custo);

  const motivos = agrupar(encerradas, (t) => t.motivo_nome)
    .map(({ nome, casos, custo, itens }) => ({ nome, casos, custo, motivoId: itens.find((t) => t.motivo_id)?.motivo_id ?? null }))
    .sort((a, b) => b.casos - a.casos);

  // Clientes que abriram 2 ou mais tratativas no período (pelo id da base).
  const registradas = tratativas.filter((t) => valida(t) && noPeriodo(t.data_registro || t.created_date, periodo));
  const porCliente = {};
  for (const t of registradas) {
    const id = String(t.id_base_cliente ?? '').trim();
    if (!id) continue;
    porCliente[id] ||= { id, nome: t.nome_cliente, qtd: 0, tipos: new Set(), itens: [] };
    porCliente[id].qtd += 1;
    porCliente[id].tipos.add(t.tipo_tratativa);
    porCliente[id].itens.push(t);
  }
  const recorrentes = Object.values(porCliente)
    .filter((c) => c.qtd >= 2)
    .map((c) => ({ ...c, tipos: [...c.tipos] }))
    .sort((a, b) => b.qtd - a.qtd);

  const causas = agrupar(encerradas, (t) => t.causa_primaria)
    .map(({ nome, casos, custo }) => ({ nome, casos, custo }))
    .sort((a, b) => b.casos - a.casos);

  return {
    encerradas: encerradas.length,
    causas,
    custoTotal: encerradas.reduce((s, t) => s + custoDoCaso(t), 0),
    semEtapa: encerradas.filter((t) => !t.etapa_jornada_nome).length,
    etapas,
    motivos,
    recorrentes,
  };
}
