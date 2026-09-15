import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Bloco nomeado do Dashboard.
 *
 * O Dashboard tinha dez blocos empilhados no mesmo nível visual, sem nome —
 * quem chegava precisava interpretar cada um pelo conteúdo. Agrupar por
 * categoria, com título, é o que a referência de design organiza e o que
 * torna a tela percorrível em vez de lida por inteiro.
 *
 * `verMais` aceita a rota da página que aprofunda o assunto do bloco.
 */
export default function SecaoDashboard({ titulo, descricao, verMais, verMaisLabel = 'Ver tudo', acoes, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-sm text-muted-foreground">{descricao}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {acoes}
          {verMais && (
            <Link
              to={verMais}
              className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-sm font-medium text-primary transition-colors hover:bg-info-soft"
            >
              {verMaisLabel}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}
