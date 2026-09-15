import db from '@/api/db';
import React, { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { formatDateSP } from '@/components/utils/helpers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';

const EtapaItem = React.memo(({ etapa, index, isChecked, onToggle }) => {
  return (
    <Card className={`transition-all ${isChecked ? 'bg-green-50 border-green-200' : ''}`}>
      <CardContent className="p-4">
        <div 
          className="flex items-start gap-3 cursor-pointer"
          onClick={() => onToggle(index)}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}}
            className="w-4 h-4 mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className={`font-medium ${isChecked ? 'line-through text-slate-500' : ''}`}>
                {etapa.titulo}
              </p>
              {isChecked && <Badge className="bg-green-600 text-xs">Concluída</Badge>}
            </div>
            {etapa.descricao && <p className="text-sm text-slate-600 mt-2">{etapa.descricao}</p>}
            {etapa.conteudo_profissional && (
              <p className="text-sm text-slate-500 mt-2 p-2 bg-slate-50 rounded">
                <strong>Conteúdo:</strong> {etapa.conteudo_profissional}
              </p>
            )}
            {etapa.prazo && (
              <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                Prazo: {formatDateSP(etapa.prazo, 'DD/MM/YYYY')}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

EtapaItem.displayName = 'EtapaItem';

export default function PDIModal({ pdi, open, onClose }) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.PDI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['pdis']);
      toast.success('Etapa atualizada');
    },
    onError: () => toast.error('Erro ao atualizar etapa'),
  });

  const handleToggleEtapa = useCallback((index) => {
    if (!pdi || !pdi.etapas || !pdi.id) return;

    const etapasAtualizadas = [...pdi.etapas];
    const etapaAtual = etapasAtualizadas[index];
    
    if (!etapaAtual) return;
    
    etapasAtualizadas[index] = {
      ...etapaAtual,
      concluida: !etapaAtual.concluida,
      data_conclusao: !etapaAtual.concluida ? new Date().toISOString() : null
    };

    const etapasConcluidas = etapasAtualizadas.filter(e => e?.concluida).length;
    const percentual = etapasAtualizadas.length > 0 
      ? Math.round((etapasConcluidas / etapasAtualizadas.length) * 100)
      : 0;

    updateMutation.mutate({
      id: pdi.id,
      data: {
        etapas: etapasAtualizadas,
        percentual_conclusao: percentual
      }
    });
  }, [pdi, updateMutation]);

  if (!open || !pdi) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pdi.titulo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <p className="text-sm text-slate-500">Objetivo</p>
            <p className="whitespace-pre-wrap mt-1">{pdi.objetivo_geral || 'Sem objetivo definido'}</p>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Progresso</span>
              <span className="font-medium">{pdi.percentual_conclusao || 0}%</span>
            </div>
            <Progress value={pdi.percentual_conclusao || 0} className="h-3" />
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-3">Etapas</p>
            <div className="space-y-3">
              {(!pdi.etapas || pdi.etapas.length === 0) ? (
                <p className="text-center text-slate-500 py-8">Nenhuma etapa definida neste PDI</p>
              ) : (
                pdi.etapas.map((etapa, index) => (
                  <EtapaItem
                    key={etapa?.id || index}
                    etapa={etapa}
                    index={index}
                    isChecked={etapa?.concluida || false}
                    onToggle={handleToggleEtapa}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}