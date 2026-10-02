import React, { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TIPOS_CONFIG } from './distribuicaoUtils';
import ListaResumida from '@/components/ui/ListaResumida';
import { filtrarHistorico, resumoDeOverrides, ultimosMeses, rotuloDoMes, dataCurta, motivoDaJustificativa } from '@/lib/equidade';

const seletor = 'h-9 rounded-md border border-input bg-background px-3 text-sm';

/**
 * Histórico das atribuições, com filtro por pessoa, canal e mês, e as
 * atribuições fora do rodízio (overrides) resumidas por motivo e por quem foi
 * pulado — para a conversa com a equipe ter número, não impressão.
 */
export default function HistoricoDistribuicao({ distribuicoes, agentesAtivos, hoje, onRemover }) {
  const [agenteId, setAgenteId] = useState('');
  const [tipo, setTipo] = useState('');
  const [mes, setMes] = useState('');
  const [soOverride, setSoOverride] = useState(false);
  const [busca, setBusca] = useState('');

  const meses = useMemo(() => ultimosMeses(hoje, 12), [hoje]);
  const lista = useMemo(
    () => filtrarHistorico(distribuicoes, { agenteId, tipo, mes, soOverride, busca }),
    [distribuicoes, agenteId, tipo, mes, soOverride, busca],
  );
  const resumo = useMemo(() => resumoDeOverrides(lista), [lista]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Pessoa" className={seletor} value={agenteId} onChange={(e) => setAgenteId(e.target.value)}>
          <option value="">Todas as pessoas</option>
          {agentesAtivos.map((a) => <option key={a.id} value={a.id}>{a.nome_completo}</option>)}
        </select>
        <select aria-label="Canal" className={seletor} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos os canais</option>
          {Object.entries(TIPOS_CONFIG).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
        </select>
        <select aria-label="Mês" className={seletor} value={mes} onChange={(e) => setMes(e.target.value)}>
          <option value="">Todo o período</option>
          {meses.map((m) => <option key={m} value={m}>{rotuloDoMes(m)}</option>)}
        </select>
        <Input className="h-9 w-40" placeholder="Buscar ticket" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={soOverride} onChange={(e) => setSoOverride(e.target.checked)} />
          Só fora do rodízio
        </label>
      </div>

      {resumo.total > 0 && (
        <div className="rounded-lg border border-border bg-muted p-3 text-sm">
          <p className="font-medium text-foreground">
            Fora do rodízio: {resumo.total} de {lista.length} ({resumo.percentual}%)
          </p>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Por motivo</p>
              <ul>{resumo.porMotivo.map((m) => (
                <li key={m.rotulo} className="flex justify-between gap-3"><span className="text-foreground">{m.rotulo}</span><span className="tabular-nums text-muted-foreground">{m.qtd}</span></li>
              ))}</ul>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Quem era a próxima e foi pulada</p>
              <ul>{resumo.porPulado.map((m) => (
                <li key={m.rotulo} className="flex justify-between gap-3"><span className="text-foreground">{m.rotulo}</span><span className="tabular-nums text-muted-foreground">{m.qtd}</span></li>
              ))}</ul>
            </div>
          </div>
        </div>
      )}

      {lista.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma atribuição com esses filtros.</p>
      ) : (
        <ListaResumida
          className="divide-y divide-border rounded-xl border border-border bg-card"
          limite={15}
          rotulo="atribuições"
          feminino
          itens={lista}
          renderItem={(d) => (
            <div key={d.id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="text-foreground">
                  <span className="font-medium">{d.agente_nome}</span>
                  <span className="text-muted-foreground"> · {TIPOS_CONFIG[d.tipo_tratativa]?.label ?? d.tipo_tratativa} · #{d.ticket_id}</span>
                </p>
                {d.override_rodizio && (
                  <p className="text-xs text-warning">
                    Fora do rodízio (a próxima era {d.agente_sugerido_nome || '—'}):{' '}
                    {motivoDaJustificativa(d.justificativa_override).valor === 'sem' ? 'sem motivo informado' : d.justificativa_override}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                <span>{dataCurta(d.data_atribuicao)} {d.horario_atribuicao || ''}</span>
                {onRemover && (
                  <button aria-label="Remover registro" className="text-destructive" onClick={() => onRemover(d)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
