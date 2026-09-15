import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, FileText, ChevronRight } from 'lucide-react';

export default function ColaboradorCard({ colaborador, observacoes, pdis, onClick }) {
  const obsDoColab = observacoes.filter(o => o.colaboradores_ids?.includes(colaborador.id));
  
  const positivos = obsDoColab.filter(o => 
    ['feedback_positivo'].includes(o.tipo) || o.tipo?.toLowerCase().includes('positivo')
  ).length;
  
  const negativos = obsDoColab.filter(o => 
    ['feedback_negativo'].includes(o.tipo) || o.tipo?.toLowerCase().includes('negativo')
  ).length;

  const pdisAtivos = pdis.filter(p => 
    p.colaborador_id === colaborador.id && p.status === 'em_andamento'
  ).length;

  return (
    <Card
      className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 flex-shrink-0">
            <AvatarImage src={colaborador.foto_url} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-lg font-semibold">
              {colaborador.nome_completo?.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                {colaborador.nome_completo}
              </h3>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
            </div>
            <p className="text-xs text-slate-500 mb-3 truncate">{colaborador.cargo_atual}</p>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center font-bold text-slate-700">
                  {obsDoColab.length}
                </span>
                <span>registros</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                  <ThumbsUp className="w-3 h-3 text-green-600" />
                </span>
                <span>{positivos} positivo{positivos !== 1 ? 's' : ''}</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-5 h-5 bg-red-100 rounded flex items-center justify-center">
                  <ThumbsDown className="w-3 h-3 text-red-500" />
                </span>
                <span>{negativos} negativo{negativos !== 1 ? 's' : ''}</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-5 h-5 bg-purple-100 rounded flex items-center justify-center">
                  <FileText className="w-3 h-3 text-purple-600" />
                </span>
                <span>{pdisAtivos} PDI{pdisAtivos !== 1 ? 's' : ''} ativo{pdisAtivos !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {obsDoColab.length === 0 && (
          <p className="text-xs text-slate-400 text-center mt-3 italic">Nenhum registro ainda</p>
        )}
      </CardContent>
    </Card>
  );
}