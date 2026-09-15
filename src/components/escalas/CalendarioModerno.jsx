import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import EventoCard, { eventoConfig } from './EventoCard';
import { cn } from '@/lib/utils';

const diasSemanaFull = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function CalendarioModerno({ 
  mesAtual, 
  onMesAnterior, 
  onMesPosterior, 
  onHoje,
  atribuicoes,
  colaboradores,
  escalas
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
    <Card className="border-0 shadow-xl bg-card">
      <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info-soft rounded-lg">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={onMesAnterior} className="hover:bg-info-soft">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={onHoje} className="hover:bg-info-soft font-medium">
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={onMesPosterior} className="hover:bg-info-soft">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-7 gap-2">
          {diasSemanaFull.map((dia) => (
            <div key={dia} className="p-3 text-center font-bold text-sm bg-gradient-to-b from-slate-100 to-slate-50 rounded-t-lg border-b-2 border-border">
              <div className="text-foreground">{dia}</div>
            </div>
          ))}
          {diasDoMes.map((diaObj, idx) => {
            const atribsDia = getAtribuicoesDoDia(diaObj.data);
            const isHoje = diaObj.data.toDateString() === hoje_data;
            
            // Agrupar por tipo de evento
            const atribsPorTipo = atribsDia.reduce((acc, atrib) => {
              const tipo = atrib.tipo_evento || 'presencial';
              if (!acc[tipo]) acc[tipo] = [];
              acc[tipo].push(atrib);
              return acc;
            }, {});

            return (
              <div
                key={idx}
                className={cn(
                  'min-h-32 p-3 border-2 rounded-lg transition-all',
                  diaObj.mesAtual 
                    ? 'bg-card hover:bg-muted hover:shadow-md border-border' 
                    : 'bg-muted/50 text-muted-foreground border-border',
                  isHoje && 'ring-4 ring-blue-400 border-primary/40 bg-info-soft/30'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    'text-lg font-bold',
                    isHoje ? 'text-primary' : diaObj.mesAtual ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {diaObj.data.getDate()}
                  </span>
                  {atribsDia.length > 0 && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        'text-xs px-2 py-0.5 font-bold',
                        isHoje ? 'bg-primary text-white' : 'bg-muted text-foreground'
                      )}
                    >
                      {atribsDia.length}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  {Object.entries(atribsPorTipo).slice(0, 3).map(([tipo, atribs]) => {
                    const config = eventoConfig[tipo] || eventoConfig.presencial;
                    const Icon = config.icon;
                    
                    return (
                      <div 
                        key={tipo}
                        className={cn(
                          'p-2 rounded-lg border-2 text-xs font-semibold flex items-center justify-between',
                          config.bg,
                          config.border
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className={cn('p-1 rounded', config.iconBg)}>
                            <Icon className={cn('w-3 h-3', config.iconColor)} />
                          </div>
                          <span className={config.textColor}>
                            {config.label}
                          </span>
                        </div>
                        {atribs.length > 1 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {atribs.length}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                  {Object.keys(atribsPorTipo).length > 3 && (
                    <div className="text-center text-[10px] text-muted-foreground font-medium pt-1">
                      +{Object.keys(atribsPorTipo).length - 3} tipos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}