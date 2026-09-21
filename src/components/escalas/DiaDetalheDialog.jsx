import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatDateSP } from '@/components/utils/helpers';
import { Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { configDoStatus, classesSolidasDoStatus } from '@/components/ui/StatusBadge';
import PainelLateral from '@/components/ui/PainelLateral';

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

export default function DiaDetalheDialog({ open, onClose, data, atribuicoes, colaboradores, equipes }) {
  if (!data) return null;

  const dataStr = data.toISOString().split('T')[0];
  
  // Filtrar atribuições do dia
  const atribsDia = atribuicoes.filter(atrib => {
    const inicio = new Date(atrib.data_inicio).toISOString().split('T')[0];
    const fim = atrib.data_fim ? new Date(atrib.data_fim).toISOString().split('T')[0] : '9999-12-31';
    return dataStr >= inicio && dataStr <= fim;
  });

  // Agrupar por equipe
  const porEquipe = {};
  atribsDia.forEach(atrib => {
    const colab = colaboradores.find(c => c.id === atrib.colaborador_id);
    const equipeId = colab?.equipe_id || 'sem_equipe';
    const equipeNome = colab?.equipe_nome || 'Sem Equipe';
    const status = atrib.tipo_evento || 'presencial';
    
    if (!porEquipe[equipeId]) {
      porEquipe[equipeId] = { 
        id: equipeId,
        nome: equipeNome, 
        cor: equipes.find(e => e.id === equipeId)?.cor || 'hsl(var(--chart-1))',
        colaboradores: [] 
      };
    }
    porEquipe[equipeId].colaboradores.push({
      ...colab,
      status,
      escala_nome: atrib.escala_nome
    });
  });

  const equipesArray = Object.values(porEquipe);
  const totalPessoas = atribsDia.length;

  return (
    <PainelLateral
      open={open} onOpenChange={onClose}
      largura="xl"
      titulo={<><Calendar className="w-5 h-5 text-primary" /> {formatDateSP(data, 'DD/MM/YYYY')} - {data.toLocaleDateString('pt-BR', { weekday: 'long' })}</>}
    >
        <div className="space-y-4 mt-4">
          {/* Resumo */}
          <Card className="p-4 bg-info-soft border-info/25">
            <div className="flex items-center gap-2 text-primary">
              <Users className="w-5 h-5" />
              <span className="font-semibold">{totalPessoas} pessoas escaladas</span>
              <span className="text-primary">•</span>
              <span className="text-primary">{equipesArray.length} equipes</span>
            </div>
          </Card>

          {/* Lista por equipe */}
          {equipesArray.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Nenhuma escala para este dia</p>
            </div>
          ) : (
            <div className="space-y-4">
              {equipesArray.map(equipe => {
                // Agrupar colaboradores por status
                const porStatus = {};
                equipe.colaboradores.forEach(colab => {
                  if (!porStatus[colab.status]) {
                    porStatus[colab.status] = [];
                  }
                  porStatus[colab.status].push(colab);
                });

                return (
                  <Card key={equipe.id} className="border-0 shadow-sm">
                    <div 
                      className="p-3 border-b flex items-center justify-between"
                      style={{ borderLeftWidth: '4px', borderLeftColor: equipe.cor }}
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{equipe.nome}</h3>
                        <Badge variant="secondary">
                          {equipe.colaboradores.length} pessoas
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {Object.entries(porStatus).map(([status, colabs]) => {
                        const config = statusConfig[status];
                        return (
                          <div key={status}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className={cn('w-3 h-3 rounded', config.cor)} />
                              <span className="text-sm font-medium text-foreground">
                                {config.label} ({colabs.length})
                              </span>
                            </div>
                            <div className="ml-5 grid gap-2">
                              {colabs.map(colab => (
                                <div 
                                  key={colab.id}
                                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    {colab.foto_url ? (
                                      <img 
                                        src={colab.foto_url} 
                                        alt={colab.nome_completo}
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                                        {colab.nome_completo?.substring(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-sm font-medium text-foreground">
                                        {colab.nome_completo}
                                      </p>
                                      {colab.escala_nome && (
                                        <p className="text-xs text-muted-foreground">
                                          Escala: {colab.escala_nome}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <Badge 
                                    className={cn(
                                      'text-xs',
                                      config.cor,
                                      config.text
                                    )}
                                  >
                                    {config.label}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </PainelLateral>
  );
}