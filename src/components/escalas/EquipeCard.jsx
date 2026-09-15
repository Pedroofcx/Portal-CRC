import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const corPorTipo = {
  home_office: 'bg-success',
  presencial: 'bg-primary',
  hibrido: 'bg-primary',
  ferias: 'bg-cyan-500',
  day_off: 'bg-warning',
  falta: 'bg-destructive',
  treinamento: 'bg-primary',
  evento_especial: 'bg-pink-500'
};

export default function EquipeCard({ 
  equipe, 
  colaboradores, 
  atribuicoes,
  onClick 
}) {
  const colaboradoresDaEquipe = colaboradores.filter(c => c.equipe_id === equipe.id);
  
  // Obter distribuição de tipos de evento da equipe
  const distribuicao = atribuicoes
    .filter(a => colaboradoresDaEquipe.some(c => c.id === a.colaborador_id))
    .reduce((acc, atrib) => {
      const tipo = atrib.tipo_evento || 'presencial';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});

  const tipoMaisComum = Object.entries(distribuicao).sort((a, b) => b[1] - a[1])[0];
  const corPrincipal = tipoMaisComum ? corPorTipo[tipoMaisComum[0]] : equipe.cor || 'bg-primary';

  return (
    <Card 
      className="border-0 shadow-md hover:shadow-xl transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className={cn('h-2', corPrincipal)} />
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                {equipe.nome}
              </h3>
              <p className="text-sm text-muted-foreground">{equipe.descricao || 'Sem descrição'}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex -space-x-2">
              {colaboradoresDaEquipe.slice(0, 5).map(colab => (
                <Avatar key={colab.id} className="h-8 w-8 ring-2 ring-white">
                  <AvatarImage src={colab.foto_url} />
                  <AvatarFallback className="bg-muted text-foreground text-xs">
                    {colab.nome_completo?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm text-muted-foreground font-medium">
              {colaboradoresDaEquipe.length} {colaboradoresDaEquipe.length === 1 ? 'pessoa' : 'pessoas'}
            </span>
          </div>

          {Object.keys(distribuicao).length > 0 && (
            <div className="flex gap-1.5">
              {Object.entries(distribuicao).map(([tipo, count]) => (
                <div key={tipo} className="flex items-center gap-1">
                  <div className={cn('w-2 h-2 rounded-full', corPorTipo[tipo])} />
                  <span className="text-xs text-muted-foreground font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}