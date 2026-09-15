import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { configDoStatus, classesSolidasDoStatus } from '@/components/ui/StatusBadge';

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Os rótulos e cores vêm do StatusBadge, que é a fonte única do sistema.
 * Este arquivo mantinha uma cópia própria do mapa — a mesma, palavra por
 * palavra, que existia em CalendarioEquipes e DiaDetalheDialog. Três cópias
 * do mesmo mapa significam que mudar a cor de "Férias" exigia lembrar de
 * três lugares.
 *
 * `cor` e `text` continuam existindo para o JSX abaixo não precisar mudar.
 */
const statusConfig = new Proxy({}, {
  get(_, chave) {
    if (typeof chave !== 'string') return undefined;
    const { label } = configDoStatus(chave);
    return { label, cor: classesSolidasDoStatus(chave), text: '' };
  },
});

export default function CalendarioEquipes({ 
  mesAtual, 
  onMesAnterior, 
  onMesPosterior, 
  onHoje,
  atribuicoes,
  colaboradores,
  _equipes,
  onDiaClick
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
    return dias;
  };

  const getEquipesDoDia = (data) => {
    const dataStr = data.toISOString().split('T')[0];
    const atribsDia = atribuicoes.filter(atrib => {
      const inicio = new Date(atrib.data_inicio).toISOString().split('T')[0];
      const fim = atrib.data_fim ? new Date(atrib.data_fim).toISOString().split('T')[0] : '9999-12-31';
      return dataStr >= inicio && dataStr <= fim;
    });

    // Agrupar por equipe e status
    const porEquipe = {};
    atribsDia.forEach(atrib => {
      const colab = colaboradores.find(c => c.id === atrib.colaborador_id);
      const equipeId = colab?.equipe_id || 'sem_equipe';
      const equipeNome = colab?.equipe_nome || 'Sem Equipe';
      const status = atrib.tipo_evento || 'presencial';
      
      if (!porEquipe[equipeId]) {
        porEquipe[equipeId] = { nome: equipeNome, status: {} };
      }
      if (!porEquipe[equipeId].status[status]) {
        porEquipe[equipeId].status[status] = 0;
      }
      porEquipe[equipeId].status[status]++;
    });

    return Object.values(porEquipe);
  };

  const diasDoMes = getDiasDoMes(mesAtual);
  const hoje = new Date().toDateString();

  return (
    <Card className="border-0 shadow-sm">
      <div className="p-4 border-b bg-muted">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
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
            <div key={dia} className="text-center font-semibold text-sm text-muted-foreground py-2">
              {dia}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {diasDoMes.map((diaObj, idx) => {
            const equipesNoDia = getEquipesDoDia(diaObj.data);
            const isHoje = diaObj.data.toDateString() === hoje;
            
            return (
              <div
                key={idx}
                onClick={() => diaObj.mesAtual && onDiaClick && onDiaClick(diaObj.data)}
                className={cn(
                  'min-h-32 p-2 rounded-lg transition-all border-2',
                  diaObj.mesAtual 
                    ? 'bg-card hover:shadow-sm cursor-pointer' 
                    : 'bg-muted/50 opacity-40 border-border',
                  isHoje && 'ring-2 ring-ring bg-info-soft border-primary/40'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    'text-base font-bold',
                    isHoje ? 'text-primary' : 'text-foreground'
                  )}>
                    {diaObj.data.getDate()}
                  </span>
                  {equipesNoDia.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
                      {equipesNoDia.length}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1">
                  {equipesNoDia.slice(0, 3).map((equipe, eIdx) => {
                    const statusPrincipal = Object.entries(equipe.status).sort((a, b) => b[1] - a[1])[0];
                    const config = statusConfig[statusPrincipal[0]];
                    
                    return (
                      <div
                        key={eIdx}
                        className={cn(
                          'px-2 py-1 rounded text-[10px] font-semibold truncate',
                          config.cor,
                          config.text
                        )}
                        title={`${equipe.nome}: ${statusPrincipal[1]} pessoas`}
                      >
                        {equipe.nome}
                      </div>
                    );
                  })}
                  {equipesNoDia.length > 3 && (
                    <div className="text-center text-[9px] text-muted-foreground font-medium">
                      +{equipesNoDia.length - 3}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-4 border-t bg-muted">
        <div className="flex flex-wrap gap-3 text-xs pt-3">
          {Object.entries(statusConfig).map(([tipo, config]) => (
            <div key={tipo} className="flex items-center gap-1.5">
              <div className={cn('w-3 h-3 rounded', config.cor)} />
              <span className="text-muted-foreground font-medium">{config.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}