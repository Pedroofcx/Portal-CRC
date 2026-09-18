/**
 * Indicadores (CSAT, performance, avaliação CX) de uma pessoa no ciclo, a
 * partir das apurações mensais.
 *
 * A Estrutura de Trabalho diz que os indicadores são "apurados mensalmente e
 * consolidados no fechamento trimestral", sem dizer COMO consolidar. Até essa
 * regra existir, a tela mostra uma PRÉVIA: o último mês apurado dentro do
 * ciclo, e diz qual mês é. Uma média inventada aqui viraria número oficial na
 * cabeça de quem lê.
 *
 * CSAT: o do telefone quando houver; senão o do chat. A tela mostra de qual
 * canal veio.
 */
const dentroDoCiclo = (a, ciclo) => ciclo
  && a.periodo_inicio && a.periodo_fim
  && a.periodo_fim >= ciclo.data_inicio
  && a.periodo_inicio <= ciclo.data_fim;

const numero = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mesDe = (data) => MESES[Number(String(data).slice(5, 7)) - 1] ?? null;

export function indicadoresDoCiclo(apuracoes = [], ciclo) {
  const doCiclo = apuracoes
    .filter((a) => dentroDoCiclo(a, ciclo))
    .sort((a, b) => String(b.periodo_fim).localeCompare(String(a.periodo_fim)));

  const ultima = (tipo) => doCiclo.find((a) => a.tipo_apuracao === tipo) ?? null;
  const tel = ultima('telefone');
  const chat = ultima('chat');
  const cx = ultima('cx');

  const csatTel = numero(tel?.canal_telefone?.csat);
  const csatChat = numero(chat?.canal_chat?.csat);

  return {
    csat: csatTel !== null
      ? { valor: csatTel, canal: 'telefone', mes: mesDe(tel.periodo_fim) }
      : csatChat !== null
        ? { valor: csatChat, canal: 'chat', mes: mesDe(chat.periodo_fim) }
        : null,
    performance: numero(tel?.canal_telefone?.performance) !== null
      ? { valor: numero(tel.canal_telefone.performance), mes: mesDe(tel.periodo_fim) }
      : null,
    cx: numero(cx?.avaliacao_cx?.nota_media) !== null
      ? { valor: numero(cx.avaliacao_cx.nota_media), mes: mesDe(cx.periodo_fim) }
      : null,
  };
}
