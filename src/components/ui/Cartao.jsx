import React from 'react';

/**
 * Cartão e linha de leitura — o padrão da visão detalhada do ciclo
 * (CicloColaborador) e da Minha Performance: superfície branca, título curto,
 * linhas rótulo/valor, sem ícone decorativo nem fundo colorido
 * (regras-ui-ux.md, seção 9).
 */
export function Cartao({ titulo, extra, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      {titulo && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">{titulo}</h2>
          {extra}
        </div>
      )}
      {children}
    </section>
  );
}

export function Linha({ rotulo, detalhe, valor, forte }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-2 text-sm ${forte ? 'font-bold' : ''}`}>
      <span className="min-w-0 text-foreground">
        {rotulo}
        {detalhe && <span className="block text-xs font-normal text-muted-foreground">{detalhe}</span>}
      </span>
      <span className="shrink-0 font-semibold tabular-nums text-foreground">{valor}</span>
    </div>
  );
}
