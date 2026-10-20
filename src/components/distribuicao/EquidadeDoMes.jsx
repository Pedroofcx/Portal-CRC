import React, { useMemo, useState } from 'react';
import { TIPOS_CONFIG } from './distribuicaoUtils';
import { gradeDoMes, ultimosMeses, rotuloDoMes } from '@/lib/equidade';

const CANAIS = Object.keys(TIPOS_CONFIG);
const NOME_CURTO = {
  reclamacao_interna: 'Reclamação interna',
  reclame_aqui: 'Reclame Aqui',
  google_meu_negocio: 'GMN',
  contestacao_compra: 'Contestação',
  lojas_virtuais: 'Lojas Virtuais',
  procon: 'PROCON',
};

/**
 * Pessoa × canal no mês. A regra do CRC é uma tratativa por canal a cada mês
 * para pontuar nele: o zero aparece em destaque e, embaixo, a lista de quem
 * ainda precisa de qual canal.
 */
export default function EquidadeDoMes({ agentesAtivos, distribuicoes, hoje, indisponiveis }) {
  const meses = useMemo(() => ultimosMeses(hoje, 6), [hoje]);
  const [mes, setMes] = useState(meses[0]);
  const grade = useMemo(() => gradeDoMes(mes, agentesAtivos, distribuicoes, CANAIS), [mes, agentesAtivos, distribuicoes]);
  const pendentes = grade.filter((g) => g.zerados.length > 0);
  const totalPorCanal = CANAIS.map((c) => grade.reduce((s, g) => s + g.porCanal[c], 0));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="mes-equidade" className="text-sm text-muted-foreground">Mês</label>
        <select
          id="mes-equidade"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {meses.map((m) => <option key={m} value={m}>{rotuloDoMes(m)}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-3 py-2 font-medium">Pessoa</th>
              {CANAIS.map((c) => <th key={c} className="px-3 py-2 text-right font-medium">{NOME_CURTO[c]}</th>)}
              <th className="px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {grade.map((g) => (
              <tr key={g.agente.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 text-foreground">
                  {g.agente.nome_completo}
                  {indisponiveis?.has(g.agente.id) && (
                    <span className="ml-2 text-xs text-muted-foreground">({indisponiveis.get(g.agente.id).motivo.toLowerCase()})</span>
                  )}
                </td>
                {CANAIS.map((c) => (
                  <td key={c} className={`px-3 py-2 text-right tabular-nums ${g.porCanal[c] === 0 ? 'font-semibold text-warning' : 'text-foreground'}`}>
                    {g.porCanal[c]}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-foreground">{g.total}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-xs text-muted-foreground">
            <tr className="border-t border-border">
              <td className="px-3 py-2">Total do canal</td>
              {totalPorCanal.map((t, i) => <td key={CANAIS[i]} className="px-3 py-2 text-right tabular-nums">{t}</td>)}
              <td className="px-3 py-2 text-right tabular-nums">{totalPorCanal.reduce((s, t) => s + t, 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground">
          {pendentes.length === 0 ? 'Todos já receberam todos os canais neste mês.' : 'Ainda sem receber no mês'}
        </p>
        {pendentes.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {pendentes.map((g) => (
              <li key={g.agente.id} className="flex flex-wrap gap-x-2">
                <span className="font-medium text-foreground">{g.agente.nome_completo}</span>
                <span className="text-muted-foreground">{g.zerados.map((c) => NOME_CURTO[c]).join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
