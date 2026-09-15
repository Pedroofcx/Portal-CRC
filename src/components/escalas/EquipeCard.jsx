import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const corPorTipo = {
  home_office: 'bg-green-500',
  presencial: 'bg-blue-500',
  hibrido: 'bg-purple-500',
  ferias: 'bg-cyan-500',
  day_off: 'bg-amber-500',
  falta: 'bg-red-500',
  treinamento: 'bg-indigo-500',
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
  const corPrincipal = tipoMaisComum ? corPorTipo[tipoMaisComum[0]] : equipe.cor || 'bg-blue-500';

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
              <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                {equipe.nome}
              </h3>
              <p className="text-sm text-slate-500">{equipe.descricao || 'Sem descrição'}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex -space-x-2">
              {colaboradoresDaEquipe.slice(0, 5).map(colab => (
                <Avatar key={colab.id} className="h-8 w-8 ring-2 ring-white">
                  <AvatarImage src={colab.foto_url} />
                  <AvatarFallback className="bg-slate-200 text-slate-700 text-xs">
                    {colab.nome_completo?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm text-slate-600 font-medium">
              {colaboradoresDaEquipe.length} {colaboradoresDaEquipe.length === 1 ? 'pessoa' : 'pessoas'}
            </span>
          </div>

          {Object.keys(distribuicao).length > 0 && (
            <div className="flex gap-1.5">
              {Object.entries(distribuicao).map(([tipo, count]) => (
                <div key={tipo} className="flex items-center gap-1">
                  <div className={cn('w-2 h-2 rounded-full', corPorTipo[tipo])} />
                  <span className="text-xs text-slate-600 font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}