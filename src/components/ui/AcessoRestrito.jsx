import React from 'react';

/** A mensagem padrão de "esta área é da gestão" — repetida à mão em toda
 * página gestorOnly. Uso: `if (!isGestor) return <AcessoRestrito />;` */
export default function AcessoRestrito({ mensagem = 'Esta área é da gestão.' }) {
  return (
    <div className="py-16 text-center">
      <h2 className="mb-2 text-xl font-semibold">Acesso restrito</h2>
      <p className="text-muted-foreground">{mensagem}</p>
    </div>
  );
}
