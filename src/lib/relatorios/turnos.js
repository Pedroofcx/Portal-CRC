import { diaSP, noPeriodo } from './periodo.js';
import { turnoDoHorario, trabalhandoNaMetade } from '../escalas.js';

/**
 * PRODUTIVIDADE POR TURNO — quanto sai de manhã e quanto sai à tarde.
 *
 * O turno de uma tratativa vem do HORÁRIO em que ela foi registrada
 * (até 11:59 manhã, 12:00 em diante tarde — regra do CRC, 24/09/2026), e não
 * de quem estava escalado: assim o relatório não muda quando a escala muda
 * depois. A escala entra para dizer quantas pessoas estavam de pé em cada
 * metade do dia, que é o que permite comparar volume com gente disponível.
 */
const METADES = ['manha', 'tarde'];

const horaDaTratativa = (t) => {
  const valor = t.data_registro || t.created_date;
  if (!valor) return null;
  return new Date(valor).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });
};

const encerrada = (t) => ['encerrada', 'aguardando_confirmacao_reabertura'].includes(t.status);

export function produtividadePorTurno({ escalas = [], tratativas = [], colaboradores = [], periodo }) {
  const emailDe = new Map(colaboradores.map((c) => [c.id, (c.email || '').toLowerCase()]));
  const nomeDe = new Map(colaboradores.map((c) => [c.id, c.nome_completo]));

  const validas = tratativas.filter((t) => !t.excluida && t.status !== 'excluida' && noPeriodo(t.data_registro || t.created_date, periodo));

  /** Quantas pessoas estavam escaladas em cada metade de cada dia. */
  const escalados = new Map(); // `${data}|${metade}` -> Set de ids
  escalas.forEach((escala) => (escala.turnos || []).forEach((dia) => {
    if (dia.cancelado || !noPeriodo(dia.data, periodo)) return;
    METADES.forEach((metade) => {
      const chave = `${dia.data}|${metade}`;
      const atual = escalados.get(chave) ?? new Set();
      trabalhandoNaMetade(dia, metade).forEach((c) => atual.add(c.colaborador_id));
      escalados.set(chave, atual);
    });
  }));

  const vazio = () => ({ tratativas: 0, encerradas: 0, pessoas: new Set() });
  const totais = { manha: vazio(), tarde: vazio() };
  const porPessoa = new Map();
  const porDia = new Map();

  validas.forEach((t) => {
    const metade = turnoDoHorario(horaDaTratativa(t));
    if (!metade) return;
    const data = diaSP(t.data_registro || t.created_date);

    const dono = t.agente_responsavel_id
      || colaboradores.find((c) => (c.email || '').toLowerCase() === String(t.created_by || '').toLowerCase())?.id
      || null;

    totais[metade].tratativas += 1;
    if (encerrada(t)) totais[metade].encerradas += 1;
    if (dono) totais[metade].pessoas.add(dono);

    const doDia = porDia.get(data) ?? { data, manha: 0, tarde: 0, escalados_manha: 0, escalados_tarde: 0 };
    doDia[metade] += 1;
    porDia.set(data, doDia);

    if (dono) {
      const pessoa = porPessoa.get(dono) ?? {
        id: dono,
        nome: nomeDe.get(dono) || t.agente_responsavel_nome || emailDe.get(dono) || 'sem dono',
        manha: 0, tarde: 0, encerradas: 0, total: 0,
      };
      pessoa[metade] += 1;
      pessoa.total += 1;
      if (encerrada(t)) pessoa.encerradas += 1;
      porPessoa.set(dono, pessoa);
    }
  });

  porDia.forEach((linha, data) => {
    linha.escalados_manha = (escalados.get(`${data}|manha`) ?? new Set()).size;
    linha.escalados_tarde = (escalados.get(`${data}|tarde`) ?? new Set()).size;
  });

  const metadesEscaladas = (metade) => [...escalados.entries()]
    .filter(([chave]) => chave.endsWith(`|${metade}`))
    .reduce((soma, [, pessoas]) => soma + pessoas.size, 0);

  const resumo = (metade) => {
    const t = totais[metade];
    const escaladas = metadesEscaladas(metade);
    return {
      tratativas: t.tratativas,
      encerradas: t.encerradas,
      pessoas: t.pessoas.size,
      escalados: escaladas,
      porPessoaEscalada: escaladas > 0 ? t.tratativas / escaladas : null,
    };
  };

  const total = totais.manha.tratativas + totais.tarde.tratativas;
  return {
    manha: resumo('manha'),
    tarde: resumo('tarde'),
    total,
    parteDaManha: total > 0 ? (totais.manha.tratativas / total) * 100 : null,
    temEscala: escalados.size > 0,
    pessoas: [...porPessoa.values()].sort((a, b) => b.total - a.total),
    dias: [...porDia.values()].sort((a, b) => String(b.data).localeCompare(String(a.data))),
  };
}
