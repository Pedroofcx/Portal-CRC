import React from 'react';
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * Indicador numérico.
 *
 * Reescrito conforme documentacao/regras-ui-ux.md. O que saiu e por quê:
 *
 *   - gradiente no ícone e `shadow-lg`: as regras proíbem sombra excessiva e
 *     gradiente. Eram decoração; não diziam nada sobre o número.
 *   - `rounded-xl`: canto exagerado. Agora segue o --radius do sistema.
 *   - a prop `color` aceitava blue/green/amber/red/purple/slate — seis cores
 *     sem significado combinado, escolhidas tela a tela. Agora aceita o
 *     SIGNIFICADO do dado, e a cor decorre dele.
 *
 * A prop antiga continua funcionando: os nomes de cor são traduzidos para o
 * significado equivalente, para as 6 telas que já usam o componente não
 * quebrarem. Ver MAPA_LEGADO abaixo.
 */

const TONS = {
  info:     'bg-info-soft text-info',
  success:  'bg-success-soft text-success',
  warning:  'bg-warning-soft text-warning',
  critical: 'bg-critical-soft text-critical',
  neutral:  'bg-neutral-soft text-neutral',
};

/** Compatibilidade com as chamadas que já existem no código. */
const MAPA_LEGADO = {
  blue: 'info',
  green: 'success',
  amber: 'warning',
  red: 'critical',
  purple: 'info',
  slate: 'neutral',
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  tom,
  color = 'info',
}) {
  const chave = tom || MAPA_LEGADO[color] || color;
  const tonalidade = TONS[chave] || TONS.info;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const corTendencia =
    trend === 'up' ? 'text-success' : trend === 'down' ? 'text-critical' : 'text-muted-foreground';

  return (
    <Card className="border bg-card p-4 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
          {trendValue !== undefined && (
            <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${corTendencia}`}>
              <TrendIcon className="h-3 w-3" aria-hidden="true" />
              <span className="tabular-nums">{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`shrink-0 rounded p-2 ${tonalidade}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </div>
    </Card>
  );
}
