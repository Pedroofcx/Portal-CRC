import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { primeiroNome } from '@/lib/nomes';

/**
 * A faixa fina no topo da tela do gestor: as tratativas com o SLA vencido
 * AGORA. É o único número urgente do dia, então é o único com cor forte
 * (efeito Von Restorff) — o resto da tela é o ciclo.
 *
 * Substitui o antigo "Fora do SLA", que contava tudo o que já tinha fechado
 * fora do prazo desde sempre, e não dizia nada sobre hoje.
 */
export default function FaixaVencidas({ retrato, isLoading }) {
  if (isLoading) {
    return <div className="h-12 animate-pulse rounded-xl border border-border bg-card" aria-hidden="true" />;
  }

  const { abertas, vencidas, venceHoje, porAgente } = retrato;
  const quem = porAgente.filter((p) => p.vencidas > 0);

  if (vencidas === 0) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <span className="font-medium text-foreground">Nenhuma tratativa com o SLA vencido</span>
        <span className="text-muted-foreground">
          {abertas} aberta{abertas === 1 ? '' : 's'}
          {venceHoje > 0 && ` · ${venceHoje} vence${venceHoje === 1 ? '' : 'm'} hoje`}
        </span>
      </div>
    );
  }

  return (
    <Link
      to={`${createPageUrl('Tratativas')}?situacao=vencidas`}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-r-xl border border-l-4 border-border border-l-critical bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/50"
    >
      <span className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold tabular-nums text-critical">{vencidas}</span>
        <span className="font-medium text-foreground">
          tratativa{vencidas === 1 ? '' : 's'} com o SLA vencido
        </span>
      </span>
      {venceHoje > 0 && (
        <span className="text-muted-foreground">
          · <span className="font-semibold text-foreground">{venceHoje}</span> vence{venceHoje === 1 ? '' : 'm'} hoje
        </span>
      )}
      {quem.length > 0 && (
        <span className="text-xs text-muted-foreground">
          {quem.map((p) => `${primeiroNome(p.nome)} ${p.vencidas}`).join(' · ')}
        </span>
      )}
      <span className="ml-auto inline-flex items-center gap-1 font-medium text-primary">
        Ver as vencidas <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  );
}
