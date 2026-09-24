/**
 * Indicadores do ciclo (CSAT, performance, avaliação CX) de UMA pessoa, a
 * partir das apurações, e os pontos de cada um (faixas em faixasIndicadores).
 *
 * Regras decididas por Pedro em 22/09/2026 (documentacao/decisoes-de-regra.md):
 *
 * - CSAT = (CSAT do telefone + CSAT do chat) ÷ 2, cada canal calculado no
 *   ciclo inteiro. Canal sem nenhuma avaliação no ciclo fica de fora da
 *   média — dividir por 2 com um canal vazio puniria quem não atendeu por
 *   ele. Chat: positivos ÷ avaliados. Telefone: positivas ÷ (positivas +
 *   negativas) — NÃO positivas ÷ avaliadas, porque "avaliadas" inclui as
 *   neutras (FCR 1 + nota 3, regra de Pedro em 24/09/2026) e as incompletas
 *   (FCR 1 sem nota válida), que não são nem positivas nem negativas.
 * - Performance = ligações atendidas (não abandonadas) ÷ ligações recebidas,
 *   no ciclo inteiro.
 * - Avaliação CX = média de todas as avaliações do ciclo.
 * - Os pontos entram no total do Ciclo 2 em diante (ciclos que começam em
 *   16/06/2026 ou depois). No Ciclo 1 os valores aparecem, mas não somam.
 *
 * DE ONDE SAI CADA NÚMERO. Telefone e chat são guardados DIA A DIA
 * (dados_por_data), então o ciclo soma exatamente os dias dele (16/06 a 16/09,
 * por exemplo). A mesma apuração pode ter sido importada duas vezes para o
 * mesmo dia (modo incremental com semanas que se sobrepõem): vale a
 * importação mais recente daquele dia, para nada contar em dobro.
 *
 * A avaliação CX é por mês de apuração, e o mês entra no ciclo em que ele
 * TERMINA (junho, julho e agosto no Ciclo 2; setembro no Ciclo 3). Avaliação
 * repetida do mesmo ticket vale uma vez, a da importação mais recente.
 */
import { pontosDaFaixa } from './faixasIndicadores.js';

const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? 0 : Number(v));
const quando = (a) => String(a.data_apuracao || a.created_date || '');
const maisRecentePrimeiro = (lista) => [...lista].sort((a, b) => quando(b).localeCompare(quando(a)));
const dentro = (dia, ciclo) => dia >= ciclo.data_inicio && dia <= ciclo.data_fim;

/**
 * Os dias apurados do canal dentro do período, cada dia uma vez só (vale a
 * importação mais recente): [{ dia: 'AAAA-MM-DD', dados }].
 */
export function diasApurados(apuracoes, tipo, periodo) {
  const dias = new Map();
  for (const a of maisRecentePrimeiro(apuracoes.filter((x) => x.tipo_apuracao === tipo))) {
    for (const d of a.dados_por_data ?? []) {
      const dia = String(d?.data ?? '').slice(0, 10);
      const dados = d?.[tipo];
      if (!dados || !dia || dias.has(dia) || !dentro(dia, periodo)) continue;
      dias.set(dia, dados);
    }
  }
  return [...dias.entries()].map(([dia, dados]) => ({ dia, dados }));
}

const diasDoCanal = (apuracoes, tipo, ciclo) => diasApurados(apuracoes, tipo, ciclo).map((d) => d.dados);

const pct = (parte, total) => (total > 0 ? (parte / total) * 100 : null);

function avaliacoesCx(apuracoes, ciclo) {
  const vistas = new Map();
  const doCiclo = apuracoes.filter((a) => a.tipo_apuracao === 'cx' && a.periodo_fim && dentro(a.periodo_fim, ciclo));
  for (const a of maisRecentePrimeiro(doCiclo)) {
    const hist = (a.historico_detalhado ?? []).filter((h) => Number.isFinite(Number(h?.media)));
    if (hist.length) {
      hist.forEach((h, i) => {
        const chave = h.observacao ? `${h.observacao}|${h.data}` : `${a.id}|${i}`;
        if (!vistas.has(chave)) vistas.set(chave, { nota: Number(h.media), peso: 1 });
      });
    } else if (a.avaliacao_cx?.nota_media != null) {
      // Registro sem o detalhe: entra a média dele, com o peso do total.
      vistas.set(`${a.id}|resumo`, { nota: num(a.avaliacao_cx.nota_media), peso: Math.max(1, num(a.avaliacao_cx.total_avaliacoes)) });
    }
  }
  const lista = [...vistas.values()];
  const peso = lista.reduce((s, v) => s + v.peso, 0);
  return peso ? { valor: lista.reduce((s, v) => s + v.nota * v.peso, 0) / peso, avaliacoes: peso } : null;
}

/**
 * @param apuracoes as apurações da pessoa (qualquer período)
 * @returns { csat, performance, cx, pontos: { csat, performance, cx, total } }
 *   cada indicador é null quando não há dado no ciclo.
 */
export const cicloSomaIndicadores = (ciclo) => !!ciclo?.data_inicio && ciclo.data_inicio >= '2026-06-16';

export function indicadoresDoCiclo(apuracoes = [], ciclo) {
  const vazio = { csat: null, performance: null, cx: null, pontos: { csat: 0, performance: 0, cx: 0, total: 0 } };
  if (!ciclo?.data_inicio || !ciclo?.data_fim) return vazio;

  const tel = diasDoCanal(apuracoes, 'telefone', ciclo);
  const chat = diasDoCanal(apuracoes, 'chat', ciclo);

  const somaTel = (campo) => tel.reduce((s, d) => s + num(d[campo]), 0);
  const somaChat = (campo) => chat.reduce((s, d) => s + num(d[campo]), 0);

  // CSAT do telefone = positivas / (positivas + negativas). NÃO é
  // total_avaliadas: avaliadas inclui as neutras (FCR 1 + nota 3) e as
  // incompletas (FCR 1 sem nota) — regra de Pedro, 24/09/2026. Usar
  // avaliadas aqui inflaria o denominador e sub-avaliaria o CSAT de quem
  // tivesse atendimentos nota 3.
  const csatTel = pct(somaTel('total_positivas'), somaTel('total_positivas') + somaTel('total_negativas'));
  const csatChat = pct(somaChat('total_positivos'), somaChat('total_avaliados'));
  const canais = [csatTel, csatChat].filter((v) => v !== null);
  const csat = canais.length
    ? {
      valor: canais.reduce((s, v) => s + v, 0) / canais.length,
      telefone: csatTel,
      chat: csatChat,
      canal: canais.length === 2 ? 'telefone e chat' : csatTel !== null ? 'só telefone' : 'só chat',
    }
    : null;

  const ligacoes = somaTel('total_ligacoes');
  const performance = ligacoes > 0
    ? { valor: pct(somaTel('total_atendidas'), ligacoes), atendidas: somaTel('total_atendidas'), ligacoes }
    : null;

  const cx = avaliacoesCx(apuracoes, ciclo);

  const pontos = {
    csat: pontosDaFaixa('csat', csat?.valor),
    performance: pontosDaFaixa('performance', performance?.valor),
    cx: pontosDaFaixa('cx', cx?.valor),
  };
  const entraNoTotal = cicloSomaIndicadores(ciclo);
  pontos.total = entraNoTotal ? pontos.csat + pontos.performance + pontos.cx : 0;
  // Volumes do período (dias sem duplicar), para o Hansei e os relatórios.
  const volumes = { ligacoesAtendidas: somaTel('total_atendidas'), chats: somaChat('total_chats') };
  return { csat, performance, cx, pontos, entraNoTotal, volumes };
}

const pctCurto = (v) => `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/** "telefone 92% + chat 88% ÷ 2" — de onde saiu o CSAT, para a tela. */
export function detalheCsat(csat) {
  if (!csat) return null;
  const partes = [csat.telefone != null && `telefone ${pctCurto(csat.telefone)}`, csat.chat != null && `chat ${pctCurto(csat.chat)}`].filter(Boolean);
  return partes.length === 2 ? `(${partes.join(' + ')}) ÷ 2` : `${partes[0]} (sem avaliações no outro canal)`;
}
