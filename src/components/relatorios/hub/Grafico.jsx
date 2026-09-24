import React from 'react';
import { ResponsiveContainer } from 'recharts';

/**
 * Moldura dos gráficos dos relatórios. Regra combinada com Pedro em
 * 22/09/2026: gráfico nunca vem sozinho — ele mostra a tendência e a tabela
 * ao lado dá o número exato. Altura fixa e sem rolagem lateral.
 */
export default function Grafico({ altura = 240, children, vazio = 'Nada no período.', temDados = true }) {
  if (!temDados) return <p className="text-sm text-muted-foreground">{vazio}</p>;
  return (
    <ResponsiveContainer width="100%" height={altura}>
      {children}
    </ResponsiveContainer>
  );
}
