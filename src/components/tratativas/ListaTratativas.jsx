import React, { useEffect, useRef } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDateSP } from '@/components/utils/helpers';
import { AlertTriangle } from 'lucide-react';

/**
 * Lista compacta de tratativas — o painel esquerdo do master-detail.
 *
 * A tabela completa tem doze colunas e não cabe num painel estreito. Aqui
 * cada tratativa ocupa três linhas de texto com o que identifica um caso na
 * conversa da operação: o número interno, o cliente e o estado.
 *
 * Teclado: setas percorrem, Enter e Espaço abrem. A regra pede que o sistema
 * seja operável só pelo teclado, e navegar uma fila de casos é exatamente o
 * tipo de tarefa em que tirar a mão do teclado custa tempo.
 */
export default function ListaTratativas({ tratativas, selecionadaId, onSelecionar }) {
  const listaRef = useRef(null);

  // Mantém o item selecionado visível quando a escolha vem de fora da lista
  // (busca global, link direto, seta do teclado que passou da dobra).
  useEffect(() => {
    if (!selecionadaId || !listaRef.current) return;
    const alvo = listaRef.current.querySelector(`[data-id="${selecionadaId}"]`);
    alvo?.scrollIntoView({ block: 'nearest' });
  }, [selecionadaId]);

  const aoTeclar = (e, indice) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const passo = e.key === 'ArrowDown' ? 1 : -1;
      const proxima = tratativas[indice + passo];
      if (proxima) onSelecionar(proxima.id);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelecionar(tratativas[indice].id);
    }
  };

  if (!tratativas.length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        Nenhuma tratativa corresponde aos filtros.
      </p>
    );
  }

  return (
    <ul ref={listaRef} role="listbox" aria-label="Tratativas" className="divide-y divide-border">
      {tratativas.map((t, i) => {
        const selecionada = t.id === selecionadaId;
        const foraDoSla = t.encerrado_no_sla === false;

        return (
          <li key={t.id}>
            <button
              type="button"
              role="option"
              data-id={t.id}
              aria-selected={selecionada}
              tabIndex={selecionada || (!selecionadaId && i === 0) ? 0 : -1}
              onClick={() => onSelecionar(t.id)}
              onKeyDown={(e) => aoTeclar(e, i)}
              className={`flex w-full flex-col gap-1 border-l-2 px-3 py-2.5 text-left transition-colors ${
                selecionada
                  ? 'border-primary bg-accent'
                  : 'border-transparent hover:bg-accent/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  {t.id_interno || '—'}
                </span>
                {foraDoSla && (
                  <AlertTriangle
                    className="h-3.5 w-3.5 shrink-0 text-critical"
                    aria-label="Encerrada fora do SLA"
                  />
                )}
                <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                  {t.data_registro ? formatDateSP(t.data_registro, 'DD/MM') : ''}
                </span>
              </span>

              <span className="truncate text-sm font-medium text-foreground">
                {t.nome_cliente || 'Sem cliente'}
              </span>

              <span className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={t.status} className="text-[11px]" />
                {t.prioridade && t.prioridade !== 'baixa' && (
                  <StatusBadge status={t.prioridade} className="text-[11px]" />
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
