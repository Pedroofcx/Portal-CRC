import React from 'react';
import { Palmtree } from 'lucide-react';

/**
 * Minhas férias, na lateral do operador. Validar os próprios períodos só é
 * possível pelo diálogo do Dashboard que este card abre — por isso ele não
 * pode sair da tela, e ganha destaque quando há período esperando.
 */
export default function CardMinhasFerias({ pendentes = 0, aoAbrir }) {
  return (
    <button
      type="button"
      onClick={aoAbrir}
      className={`w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/60 ${
        pendentes > 0 ? 'border-warning/40 bg-warning-soft' : 'border-border bg-card'}`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Palmtree className="h-4 w-4 text-success" aria-hidden="true" />
        Minhas férias
      </span>
      <span className={`mt-1 block text-xs ${pendentes > 0 ? 'font-medium text-warning' : 'text-muted-foreground'}`}>
        {pendentes > 0
          ? `${pendentes} período${pendentes > 1 ? 's' : ''} esperando a sua validação — ver e validar`
          : 'Nenhum período esperando validação'}
      </span>
    </button>
  );
}
