import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Indicador numérico: rótulo, número e, se houver, uma linha de apoio.
 *
 * Desde 22/09/2026 (regras-ui-ux.md, seção 9, "Sem cara de IA") o cartão não
 * desenha mais o ícone em quadrado colorido: era decoração, e é o que fazia
 * as telas parecerem painel genérico. As props `icon`, `color` e `tom`
 * continuam aceitas para as telas que já as passam, mas não mudam nada.
 */
export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const corTendencia =
    trend === 'up' ? 'text-success' : trend === 'down' ? 'text-critical' : 'text-muted-foreground';

  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-4">
      <p className="truncate text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      {trendValue !== undefined && (
        <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${corTendencia}`}>
          <TrendIcon className="h-3 w-3" aria-hidden="true" />
          <span className="tabular-nums">{trendValue}</span>
        </div>
      )}
    </div>
  );
}
