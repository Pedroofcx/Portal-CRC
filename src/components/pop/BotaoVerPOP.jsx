import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronDown } from 'lucide-react';
import db from '@/api/db';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { popsDoTipo } from '@/lib/pops';

/**
 * "Ver POP" dentro da tratativa: abre o procedimento do tipo dela. Um POP,
 * link direto; vários (Reclamação Interna: AC, SM e IP), a pessoa escolhe.
 * Sem POP ligado ao tipo, o botão não aparece.
 */
const urlDoPop = (codigo) => `${createPageUrl('POP')}?abrir=${encodeURIComponent(codigo)}`;

export default function BotaoVerPOP({ tipoTratativa }) {
  const { data: pops = [] } = useQuery({
    queryKey: ['pops', 'ativos'],
    queryFn: () => db.entities.POP.filter({ ativo: true }),
    staleTime: 300000,
  });
  const doTipo = popsDoTipo(pops, tipoTratativa);
  if (!doTipo.length) return null;

  if (doTipo.length === 1) {
    return (
      <Button asChild variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs">
        <Link to={urlDoPop(doTipo[0].codigo)} title={`${doTipo[0].codigo} — ${doTipo[0].titulo}`}>
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Ver POP
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs">
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Ver POP <ChevronDown className="h-3 w-3" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {doTipo.map((p) => (
          <DropdownMenuItem key={p.id} asChild>
            <Link to={urlDoPop(p.codigo)}>
              <span className="mr-2 font-mono text-xs text-muted-foreground">{p.codigo}</span>{p.titulo}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
