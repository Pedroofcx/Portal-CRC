import React, { useMemo } from 'react';
import { temSalarioCadastrado } from '@/components/utils/helpers';
import { AlertTriangle } from 'lucide-react';

/**
 * Avisa quando o custo operacional está incompleto por falta de salário.
 *
 * POR QUE ISTO EXISTE
 *
 * O custo operacional é calculado a partir do salário do agente responsável.
 * Antes, quando o salário não estava cadastrado, o sistema aplicava um valor
 * fixo de R$ 2.000,00 e seguia — o relatório da diretoria recebia um número
 * inventado com a mesma aparência de um número apurado.
 *
 * Agora salário ausente resulta em custo zero, que é honesto. Mas zero
 * silencioso também engana: o total do relatório fica menor que o real e
 * ninguém sabe por quê.
 *
 * Este aviso fecha a lacuna — diz quantas tratativas ficaram de fora e de
 * quem é o cadastro que precisa ser completado.
 */
export default function AvisoSalarioAusente({ tratativas = [], colaboradores = [] }) {
  const { semSalario, tratativasAfetadas } = useMemo(() => {
    const porId = Object.fromEntries(colaboradores.map((c) => [c.id, c]));
    const nomes = new Map();
    let afetadas = 0;

    for (const t of tratativas) {
      const agente = porId[t.agente_responsavel_id];
      if (!t.agente_responsavel_id) continue;
      if (temSalarioCadastrado(agente)) continue;
      afetadas++;
      const nome = agente?.nome_completo || t.agente_responsavel_nome || 'Agente sem cadastro';
      nomes.set(nome, (nomes.get(nome) || 0) + 1);
    }

    return {
      semSalario: [...nomes.entries()].sort((a, b) => b[1] - a[1]),
      tratativasAfetadas: afetadas,
    };
  }, [tratativas, colaboradores]);

  if (!semSalario.length) return null;

  return (
    <div
      role="status"
      className="flex gap-3 rounded-lg border border-warning/25 bg-warning-soft p-4"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
      <div className="min-w-0 space-y-1.5">
        <p className="text-sm font-semibold text-warning">
          Custo operacional incompleto
        </p>
        <p className="text-sm text-foreground">
          {tratativasAfetadas} tratativa{tratativasAfetadas === 1 ? '' : 's'} não
          {tratativasAfetadas === 1 ? ' entrou' : ' entraram'} no cálculo de custo porque
          {semSalario.length === 1 ? ' o agente responsável não tem' : ' os agentes responsáveis não têm'} salário
          cadastrado. Os totais abaixo estão menores que o real.
        </p>
        <ul className="text-sm text-muted-foreground">
          {semSalario.map(([nome, qtd]) => (
            <li key={nome}>
              {nome} — {qtd} tratativa{qtd === 1 ? '' : 's'}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Complete o salário em Cadastro para o cálculo ficar correto.
        </p>
      </div>
    </div>
  );
}
