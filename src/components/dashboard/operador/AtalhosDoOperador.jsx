import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Award, BookOpenCheck, Target } from 'lucide-react';

/**
 * Atalhos do operador — o que as "Ações rápidas" da tela antiga faziam.
 *
 * "Nova tratativa" virou o botão principal da fila, e "Avisos" tem o próprio
 * card com "Ver todos": repetir aqui seria o mesmo destino em dois lugares.
 * Ficam os três que não têm outro caminho na tela. Botões secundários (borda,
 * sem preenchimento): a regra é um único botão principal por tela.
 */
const ATALHOS = [
  { pagina: 'MinhaPerformance', rotulo: 'Minha performance', Icone: Award },
  { pagina: 'PDI', rotulo: 'Meu PDI', Icone: Target },
  { pagina: 'Hansei', rotulo: 'Hansei', Icone: BookOpenCheck },
];

export default function AtalhosDoOperador() {
  return (
    <nav aria-label="Atalhos" className="rounded-xl border border-border bg-card p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atalhos</p>
      <div className="grid grid-cols-3 gap-2">
        {ATALHOS.map(({ pagina, rotulo, Icone }) => (
          <Button key={pagina} asChild variant="outline" className="h-auto flex-col gap-1 px-1 py-2.5">
            <Link to={createPageUrl(pagina)}>
              <Icone className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-center text-xs leading-tight">{rotulo}</span>
            </Link>
          </Button>
        ))}
      </div>
    </nav>
  );
}
