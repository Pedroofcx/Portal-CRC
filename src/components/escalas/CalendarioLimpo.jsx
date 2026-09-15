import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

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

const labelPorTipo = {
  home_office: 'Home',
  presencial: 'Presencial',
  hibrido: 'Híbrido',
  ferias: 'Férias',
  day_off: 'Day Off',
  falta: 'Falta',
  treinamento: 'Treino',
  evento_especial: 'Especial'
};

export default function CalendarioLimpo({ 
  mesAtual, 
  onMesAnterior, 
  onMesPosterior, 
  onHoje,
  atribuicoes,
  equipes
}) {
  const getDiasDoMes = (data) => {
    const ano = data.getFullYear();
    const mes = data.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const diasAnteriores = primeiroDia.getDay();
    const dias = [];
    for (let i = diasAnteriores - 1; i >= 0; i--) dias.push({ data: new Date(ano, mes, -i), mesAtual: false });
    for (let i = 1; i <= ultimoDia.getDate(); i++) dias.push({ data: new Date(ano, mes, i), mesAtual: true });
    const diasFaltantes = 42 - dias.length;
    for (let i = 1; i <= diasFaltantes; i++) dias.push({ data: new Date(ano, mes + 1, i), mesAtual: false });
    return dias;
  };

  const getAtribuicoesDoDia = (data) => {
    const dataStr = data.toISOString().split('T')[0];
    return atribuicoes.filter(atrib => {
      const inicio = new Date(atrib.data_inicio).toISOString().split('T')[0];
      const fim = atrib.data_fim ? new Date(atrib.data_fim).toISOString().split('T')[0] : '9999-12-31';
      return dataStr >= inicio && dataStr <= fim;
    });
  };

  const diasDoMes = getDiasDoMes(mesAtual);
  const hoje_data = new Date().toDateString();

  return (
    <Card className="border-0 shadow-lg">
      <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onMesAnterior}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" onClick={onHoje} className="font-medium px-4">
              Hoje
            </Button>
            <Button variant="ghost" size="icon" onClick={onMesPosterior}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {diasSemana.map((dia) => (
            <div key={dia} className="text-center font-semibold text-sm text-slate-600 py-2">
              {dia}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {diasDoMes.map((diaObj, idx) => {
            const atribsDia = getAtribuicoesDoDia(diaObj.data);
            const isHoje = diaObj.data.toDateString() === hoje_data;
            
            const tiposUnicos = [...new Set(atribsDia.map(a => a.tipo_evento))];
            
            return (
              <div
                key={idx}
                className={cn(
                  'min-h-20 p-2 rounded-lg transition-all border',
                  diaObj.mesAtual 
                    ? 'bg-white hover:bg-slate-50' 
                    : 'bg-slate-50/50 opacity-40',
                  isHoje && 'ring-2 ring-blue-500 bg-blue-50'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    'text-sm font-semibold',
                    isHoje ? 'text-blue-600' : 'text-slate-700'
                  )}>
                    {diaObj.data.getDate()}
                  </span>
                  {atribsDia.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1 h-4">
                      {atribsDia.length}
                    </Badge>
                  )}
                </div>
                
                {tiposUnicos.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tiposUnicos.map(tipo => (
                      <div
                        key={tipo}
                        className={cn(
                          'h-1.5 flex-1 rounded-full',
                          corPorTipo[tipo] || 'bg-slate-400'
                        )}
                        title={labelPorTipo[tipo]}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda Simplificada */}
      <div className="px-4 pb-4 pt-2 border-t bg-slate-50">
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(labelPorTipo).map(([tipo, label]) => (
            <div key={tipo} className="flex items-center gap-1.5">
              <div className={cn('w-3 h-3 rounded-full', corPorTipo[tipo])} />
              <span className="text-slate-600 font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}