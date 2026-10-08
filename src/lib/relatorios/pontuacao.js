/**
 * Relatórios › Pessoas › Pontuação — de onde vem cada ponto do ciclo, pessoa
 * por pessoa e regra por regra. A conta é a MESMA do ranking
 * (src/lib/pontuacaoCiclo.js + indicadoresCiclo.js): aqui só organizamos.
 * Funções puras, testadas em `npm run testar`.
 */
import { pontosDeTratativasNoCiclo, tratativaNosCiclo, reaberturaDe } from '../pontuacaoCiclo.js';
import { indicadoresDoCiclo } from '../indicadoresCiclo.js';
import { STATUS_ENCERRADOS, somaDoBonus } from '../bonusManual.js';
import { situacaoReplicavel } from '../../components/utils/helpers.js';

/**
 * @returns { pessoas: [...], regras: [{ regra, casos, pontos }], total }
 *   pessoas: { id, nome, itens, aberturas, porRegra, indicadores, bonus,
 *              pontosEncerramento, pontosAbertura, pontosIndicadores,
 *              pontosBonus, total, aCaminho: { replicaveis, reaberturas } }
 */
export function pontuacaoDoCiclo({ tratativas = [], apuracoes = [], bonus = [], colaboradores = [], ciclo, agora = new Date() }) {
  if (!ciclo) return { pessoas: [], regras: [], total: 0 };
  const porAgente = pontosDeTratativasNoCiclo(tratativas, ciclo, {
    encerrada: (t) => STATUS_ENCERRADOS.includes(t.status),
    noCiclo: tratativaNosCiclo,
    equipe: colaboradores.filter((c) => c.papel === 'agente' && c.ativo !== false).map((c) => c.id),
  }, agora);
  const porId = new Map(tratativas.map((t) => [t.id, t]));

  const agentes = colaboradores.filter((c) => c.papel === 'agente' && (c.ativo !== false || porAgente.has(c.id)));

  const pessoas = agentes.map((a) => {
    const reg = porAgente.get(a.id) ?? { itens: [], aberturas: [], pontosEncerramento: 0, pontosAbertura: 0 };
    const porRegra = {};
    for (const item of reg.itens) {
      for (const d of item.detalhes ?? []) {
        porRegra[d.tipo] ||= { regra: d.tipo, casos: 0, pontos: 0 };
        porRegra[d.tipo].casos += 1;
        porRegra[d.tipo].pontos += Number(d.pontos) || 0;
      }
    }
    if (reg.aberturas.length) porRegra['Abertura de tratativa'] = { regra: 'Abertura de tratativa', casos: reg.aberturas.length, pontos: reg.pontosAbertura };

    const indicadores = indicadoresDoCiclo(apuracoes.filter((x) => x.colaborador_id === a.id), ciclo);
    const lancamentos = bonus.filter((b) => b.colaborador_id === a.id && b.ciclo_id === ciclo.id);
    const pontosBonus = somaDoBonus(lancamentos);

    // O que ainda pode entrar: replicáveis esperando aprovação e os 7 dias
    // de reabertura que ainda não fecharam.
    const daPessoa = reg.itens.map((i) => porId.get(i.tratativa_id)).filter(Boolean);
    const replicaveis = daPessoa.filter((t) => situacaoReplicavel(t) === 'pendente').length;
    const reaberturas = daPessoa.filter((t) => reaberturaDe(t, tratativas, agora).situacao === 'aguardando').length;

    return {
      id: a.id,
      nome: a.nome_completo,
      itens: reg.itens,
      aberturas: reg.aberturas,
      porRegra: Object.values(porRegra).sort((x, y) => y.pontos - x.pontos),
      indicadores,
      lancamentos,
      pontosEncerramento: reg.pontosEncerramento,
      pontosAbertura: reg.pontosAbertura,
      pontosIndicadores: indicadores.pontos.total,
      pontosBonus,
      total: reg.pontosEncerramento + reg.pontosAbertura + indicadores.pontos.total + pontosBonus,
      aCaminho: { replicaveis, reaberturas, pontos: replicaveis * 0.5 + reaberturas },
    };
  }).sort((x, y) => y.total - x.total);

  // A mesma soma, vista por regra, para a equipe inteira.
  const regras = {};
  for (const p of pessoas) {
    for (const r of p.porRegra) {
      regras[r.regra] ||= { regra: r.regra, casos: 0, pontos: 0 };
      regras[r.regra].casos += r.casos;
      regras[r.regra].pontos += r.pontos;
    }
    const ind = [['CSAT', p.indicadores.pontos.csat], ['Performance', p.indicadores.pontos.performance], ['Avaliação CX', p.indicadores.pontos.cx]];
    for (const [nome, pts] of ind) {
      if (!pts) continue;
      regras[nome] ||= { regra: nome, casos: 0, pontos: 0 };
      regras[nome].casos += 1;
      regras[nome].pontos += pts;
    }
    if (p.pontosBonus) {
      regras['Bônus do gestor'] ||= { regra: 'Bônus do gestor', casos: 0, pontos: 0 };
      regras['Bônus do gestor'].casos += p.lancamentos.length;
      regras['Bônus do gestor'].pontos += p.pontosBonus;
    }
  }

  return {
    pessoas,
    regras: Object.values(regras).sort((a, b) => b.pontos - a.pontos),
    total: pessoas.reduce((s, p) => s + p.total, 0),
  };
}
