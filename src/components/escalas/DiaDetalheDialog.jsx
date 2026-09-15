import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatDateSP } from '@/components/utils/helpers';
import { Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  home_office: { label: 'Home Office', cor: 'bg-green-500', text: 'text-white' },
  presencial: { label: 'Presencial', cor: 'bg-blue-500', text: 'text-white' },
  hibrido: { label: 'Híbrido', cor: 'bg-purple-500', text: 'text-white' },
  ferias: { label: 'Férias', cor: 'bg-cyan-400', text: 'text-white' },
  day_off: { label: 'Day Off', cor: 'bg-amber-400', text: 'text-white' },
  falta: { label: 'Falta', cor: 'bg-red-500', text: 'text-white' },
  treinamento: { label: 'Treinamento', cor: 'bg-indigo-500', text: 'text-white' },
  evento_especial: { label: 'Evento', cor: 'bg-pink-500', text: 'text-white' }
};

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
        cor: equipes.find(e => e.id === equipeId)?.cor || '#3B82F6',
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            {formatDateSP(data, 'DD/MM/YYYY')} - {data.toLocaleDateString('pt-BR', { weekday: 'long' })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Resumo */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 text-blue-900">
              <Users className="w-5 h-5" />
              <span className="font-semibold">{totalPessoas} pessoas escaladas</span>
              <span className="text-blue-600">•</span>
              <span className="text-blue-700">{equipesArray.length} equipes</span>
            </div>
          </Card>

          {/* Lista por equipe */}
          {equipesArray.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
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
                        <h3 className="font-semibold text-slate-900">{equipe.nome}</h3>
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
                              <span className="text-sm font-medium text-slate-700">
                                {config.label} ({colabs.length})
                              </span>
                            </div>
                            <div className="ml-5 grid gap-2">
                              {colabs.map(colab => (
                                <div 
                                  key={colab.id}
                                  className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    {colab.foto_url ? (
                                      <img 
                                        src={colab.foto_url} 
                                        alt={colab.nome_completo}
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold text-white">
                                        {colab.nome_completo?.substring(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-sm font-medium text-slate-900">
                                        {colab.nome_completo}
                                      </p>
                                      {colab.escala_nome && (
                                        <p className="text-xs text-slate-500">
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
      </DialogContent>
    </Dialog>
  );
}