import React from 'react';
import { AlertCircle, CheckCircle2, MinusCircle } from 'lucide-react';

/**
 * O estado de uma exigência de elegibilidade, igual em todas as telas:
 * cumprida, pendente ou sem dado ainda (ver src/lib/elegibilidade.js).
 */
export const ESTADO_EXIGENCIA = {
  ok: { Icone: CheckCircle2, cor: 'text-success', rotulo: 'Cumprida' },
  pendente: { Icone: AlertCircle, cor: 'text-warning', rotulo: 'Pendente' },
  sem_dado: { Icone: MinusCircle, cor: 'text-muted-foreground', rotulo: 'Sem dado ainda' },
};

export default function IconeExigencia({ status, className = 'h-4 w-4', titulo }) {
  const { Icone, cor, rotulo } = ESTADO_EXIGENCIA[status] ?? ESTADO_EXIGENCIA.sem_dado;
  return (
    <Icone className={`${className} shrink-0 ${cor}`} aria-label={titulo ? `${rotulo}: ${titulo}` : rotulo}>
      <title>{titulo ? `${rotulo} — ${titulo}` : rotulo}</title>
    </Icone>
  );
}
