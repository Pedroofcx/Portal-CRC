import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, XCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { formatDateSP } from '@/components/utils/helpers';
import ListaResumida from '@/components/ui/ListaResumida';

/**
 * Extrato de pontos do ciclo (src/lib/extratoPontos.js): o que já conta,
 * agrupado, e o que está a caminho, com a condição para contar.
 */
const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Linha({ item }) {
  const titulo = item.tratativa_id
    ? <Link to={`${createPageUrl('TratativaDetalhe')}?id=${item.tratativa_id}`} className="hover:underline">{item.titulo}</Link>
    : item.titulo;
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground break-words">{titulo}</p>
        <p className="text-xs text-muted-foreground break-words">
          {item.quando ? `${formatDateSP(item.quando, 'DD/MM/YYYY')} · ` : ''}{item.detalhe}
        </p>
      </div>
      <span className={`shrink-0 text-sm font-semibold tabular-nums ${item.pontos > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
        {item.pontos > 0 ? `+${fmt(item.pontos)}` : '0'}
      </span>
    </div>
  );
}

export default function ExtratoPontos({ extrato }) {
  if (!extrato) return null;
  const { grupos, aCaminho, total } = extrato;

  return (
    <div className="space-y-5">
      {aCaminho.length > 0 && (
        <section aria-label="A caminho">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">A caminho</h3>
          <ListaResumida
            className="mt-1 divide-y divide-border"
            limite={4}
            rotulo="itens a caminho"
            itens={aCaminho}
            renderItem={(item, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-2">
                <div className="flex min-w-0 gap-2">
                  {item.tom === 'negado'
                    ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                    : <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground break-words">{item.titulo}</p>
                    <p className="text-xs text-muted-foreground break-words">{item.detalhe}</p>
                  </div>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {item.tom === 'negado' ? '0' : `+${fmt(item.pontos)}`}
                </span>
              </div>
            )}
          />
        </section>
      )}

      {grupos.map((g) => (
        <section key={g.chave} aria-label={g.titulo}>
          <div className="flex items-baseline justify-between border-b border-border pb-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.titulo}</h3>
            <span className="text-sm font-semibold tabular-nums text-foreground">{fmt(g.subtotal)}</span>
          </div>
          <ListaResumida
            className="divide-y divide-border"
            limite={5}
            rotulo="lançamentos"
            itens={g.itens}
            renderItem={(item, i) => <Linha key={i} item={item} />}
          />
        </section>
      ))}

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="font-semibold text-foreground">Total do ciclo</span>
        <span className="text-2xl font-bold tabular-nums text-foreground">{fmt(total)}</span>
      </div>
    </div>
  );
}
