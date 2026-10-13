/**
 * Preditivo do CSAT — para onde o mês caminha. Funções puras, testadas em
 * `npm run testar`. Pedro (13/10/2026): olhar o CSAT do mês até hoje e dar uma
 * pré-avaliação do fim do mês.
 *
 * Como a previsão é feita (e é só isso, uma estimativa):
 *   1. CSAT do mês até o último dia apurado, por canal (telefone e chat), com a
 *      mesma regra da premiação: cada canal junta todas as avaliações do período
 *      e o CSAT é a média dos dois canais.
 *   2. Quantas avaliações ainda devem chegar: o ritmo médio por dia apurado, vezes
 *      os dias úteis (seg a sex) que faltam. Feriados não são conhecidos.
 *   3. Com que nota elas chegam, em dois cenários: o ritmo do mês inteiro e o dos
 *      últimos 7 dias.
 *   4. Duas pontas que não são estimativa: o PISO (tudo que falta é negativo) e o
 *      TETO (tudo que falta é positivo), e quanto o resto do mês precisa render
 *      para chegar à próxima faixa de pontos.
 * O chat com duas fontes (Zendesk e ClickDesk) entra com o CSAT já combinado, então
 * nesse caso a projeção do chat é aproximada.
 */
import { resumoQualidade, diaADiaEquipeQualidade } from './qualidade.js';
import { pontosDaFaixa, proximaFaixa } from '../faixasIndicadores.js';

const dois = (n) => String(n).padStart(2, '0');
const paraIso = (d) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
const deIso = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };
const somaDias = (iso, n) => { const d = deIso(iso); d.setDate(d.getDate() + n); return paraIso(d); };
export const ultimoDiaDoMes = (mes) => { const [a, m] = mes.split('-').map(Number); return `${mes}-${dois(new Date(a, m, 0).getDate())}`; };

/** Dias úteis (segunda a sexta) de `de` até `ate`, os dois incluídos. */
export function diasUteis(de, ate) {
  let n = 0;
  for (let dia = de; dia <= ate; dia = somaDias(dia, 1)) {
    const semana = deIso(dia).getDay();
    if (semana !== 0 && semana !== 6) n += 1;
  }
  return n;
}

const media = (valores) => {
  const v = valores.filter((x) => x !== null && x !== undefined);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};

/** O CSAT oficial a partir do acumulado de cada canal mais o que ainda vai chegar. */
function fechamento(canais, restante) {
  const csatCanais = canais.map((c, i) => {
    const total = c.total + restante[i].avaliacoes;
    if (total <= 0) return null;
    return ((c.positivas + restante[i].avaliacoes * (restante[i].csat / 100)) / total) * 100;
  });
  return media(csatCanais);
}

/**
 * O CSAT que o resto do mês precisa ter para o fechamento chegar em `alvo`
 * (busca binária; o fechamento só cresce com o CSAT do que falta).
 */
function csatNecessario(canais, avaliacoes, alvo) {
  const com = (r) => fechamento(canais, avaliacoes.map((a) => ({ avaliacoes: a, csat: r })));
  if ((com(0) ?? 0) >= alvo) return 0;
  if ((com(100) ?? 0) < alvo) return null;
  let baixo = 0; let alto = 100;
  for (let i = 0; i < 40; i += 1) {
    const meio = (baixo + alto) / 2;
    if ((com(meio) ?? 0) >= alvo) alto = meio; else baixo = meio;
  }
  return alto;
}

/**
 * @param hoje 'AAAA-MM-DD' (o mês olhado é o de hoje; passe outro dia para outro mês)
 * @returns null sem dados no mês; senão o retrato do mês e os cenários
 */
export function projetarCsatDoMes({ apuracoes = [], colaboradores = [], fonteChat = 'combinado', hoje }) {
  const mes = hoje.slice(0, 7);
  const inicio = `${mes}-01`;
  const fimDoMes = ultimoDiaDoMes(mes);
  const periodo = { inicio, fim: fimDoMes };

  const dias = diaADiaEquipeQualidade({ apuracoes, colaboradores, periodo, fonteChat }).dias;
  if (dias.length === 0) return null;
  const ultimoDia = dias[dias.length - 1].dia;

  const ate = resumoQualidade({ apuracoes, colaboradores, periodo, fonteChat }).equipe;
  const v = ate.volumes;
  const telTotal = v.positivas + v.negativas;
  const chatTotal = v.avaliados - (v.neutros ?? 0); // base do CSAT: sem as neutras
  const canais = [
    { total: telTotal, positivas: v.positivas, csat: ate.csatTelefone },
    { total: chatTotal, positivas: ate.csatChat !== null ? (ate.csatChat / 100) * chatTotal : 0, csat: ate.csatChat },
  ];

  const diasTel = dias.filter((d) => d.csatTelefone !== null).length;
  const diasChat = dias.filter((d) => d.csatChat !== null).length;
  const restantesUteis = ultimoDia < fimDoMes ? diasUteis(somaDias(ultimoDia, 1), fimDoMes) : 0;
  const avaliacoesQueFaltam = [
    diasTel > 0 ? (telTotal / diasTel) * restantesUteis : 0,
    diasChat > 0 ? (chatTotal / diasChat) * restantesUteis : 0,
  ];

  const recente = resumoQualidade({
    apuracoes, colaboradores, fonteChat, periodo: { inicio: somaDias(ultimoDia, -6) < inicio ? inicio : somaDias(ultimoDia, -6), fim: ultimoDia },
  }).equipe;

  const cenario = (id, rotulo, csats) => {
    const final = fechamento(canais, avaliacoesQueFaltam.map((a, i) => ({ avaliacoes: a, csat: csats[i] ?? canais[i].csat ?? 0 })));
    return { id, rotulo, csat: final, pontos: pontosDaFaixa('csat', final) };
  };

  const cenarios = [
    cenario('mes', 'Mantendo o ritmo do mês', [canais[0].csat, canais[1].csat]),
    cenario('recente', 'Repetindo os últimos 7 dias', [recente.csatTelefone ?? canais[0].csat, recente.csatChat ?? canais[1].csat]),
  ];

  const piso = fechamento(canais, avaliacoesQueFaltam.map((a) => ({ avaliacoes: a, csat: 0 })));
  const teto = fechamento(canais, avaliacoesQueFaltam.map((a) => ({ avaliacoes: a, csat: 100 })));

  const proxima = proximaFaixa('csat', cenarios[0].csat);
  const preciso = proxima ? csatNecessario(canais, avaliacoesQueFaltam, proxima.limiar) : null;

  return {
    mes,
    ultimoDia,
    fimDoMes,
    atual: { csat: ate.csat, csatTelefone: ate.csatTelefone, csatChat: ate.csatChat, pontos: pontosDaFaixa('csat', ate.csat), avaliacoesTelefone: telTotal, avaliacoesChat: chatTotal },
    restantesUteis,
    avaliacoesQueFaltam: { telefone: Math.round(avaliacoesQueFaltam[0]), chat: Math.round(avaliacoesQueFaltam[1]) },
    cenarios,
    piso: { csat: piso, pontos: pontosDaFaixa('csat', piso) },
    teto: { csat: teto, pontos: pontosDaFaixa('csat', teto) },
    proximaFaixa: proxima ? { ...proxima, csatNecessario: preciso, alcancavel: preciso !== null } : null,
    mesFechado: restantesUteis === 0,
  };
}

/** Calculadora: notas 1 a 5 → satisfeitos (4 e 5), neutros (3) e insatisfeitos (1 e 2). `csat` é a conta simples; `csatPortal` tira os neutros da base. */
export function calcularCsat(notas = {}) {
  const n = (k) => Math.max(0, Math.floor(Number(notas[k]) || 0));
  const [n1, n2, n3, n4, n5] = [1, 2, 3, 4, 5].map(n);
  const total = n1 + n2 + n3 + n4 + n5;
  const satisfeitos = n4 + n5;
  const neutros = n3;
  const insatisfeitos = n1 + n2;
  const csat = total > 0 ? (satisfeitos / total) * 100 : null;
  const csatPortal = total - neutros > 0 ? (satisfeitos / (total - neutros)) * 100 : null;
  return {
    total, satisfeitos, neutros, insatisfeitos, csat,
    mediaDasNotas: total > 0 ? (n1 + 2 * n2 + 3 * n3 + 4 * n4 + 5 * n5) / total : null,
    // A regra do Portal: a nota 3 (neutra) sai da base.
    csatPortal,
    pontos: csatPortal === null ? 0 : pontosDaFaixa('csat', csatPortal),
    proxima: csatPortal === null ? null : proximaFaixa('csat', csatPortal),
  };
}

/** A zona do CSAT pelo mesmo corte das faixas de pontos do Portal. */
export function zonaDoCsat(csat) {
  if (csat === null || csat === undefined) return null;
  if (csat >= 95) return { nome: 'Excelência', pontos: 10 };
  if (csat >= 90) return { nome: 'Qualidade', pontos: 9 };
  if (csat >= 85) return { nome: 'Bom', pontos: 7 };
  return { nome: 'Abaixo da meta', pontos: 0 };
}
