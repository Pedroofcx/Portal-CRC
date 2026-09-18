/**
 * Resumo do dia para a tela de boas-vindas: quantas tratativas estão abertas,
 * quantas vencem o SLA hoje e quantas já passaram do prazo.
 *
 * O prazo é data_registro + sla_atribuido (em horas), em tempo corrido — a
 * mesma régua do servidor (migration 09, documentacao/decisoes-de-regra.md).
 *
 * "Hoje" é o dia civil de quem está olhando: vence hoje quem tem prazo entre
 * agora e 23:59:59. O que venceu antes de agora conta como vencido, não como
 * "hoje" — senão uma tratativa atrasada há uma hora sumiria das duas contas.
 */
import { prazoDaTratativa } from './prazoSla.js';

const FECHADAS = new Set(['encerrada', 'excluida']);

export function resumoDoDia(tratativas = [], agora = new Date()) {
  const fimDoDia = new Date(agora);
  fimDoDia.setHours(23, 59, 59, 999);

  let abertas = 0;
  let vencemHoje = 0;
  let vencidas = 0;

  for (const t of tratativas) {
    if (!t || FECHADAS.has(t.status) || t.excluida) continue;
    abertas += 1;

    const prazo = prazoDaTratativa(t);
    if (!prazo) continue;
    if (prazo < agora) vencidas += 1;
    else if (prazo <= fimDoDia) vencemHoje += 1;
  }

  return { abertas, vencemHoje, vencidas };
}
