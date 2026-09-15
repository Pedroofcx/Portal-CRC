import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, Lock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSlotConfig, DIAS_LABEL } from './SlotConfig';

/**
 * Modal para atribuir/remover múltiplos colaboradores de um slot específico
 * (ex: M-ATEND de Segunda → pode ter 1, 2, ou mais pessoas)
 */
export default function ModalAtribuicaoSlot({
  open,
  onClose,
  dia,         // 'segunda', 'terca', ...
  periodo,     // 'manha' | 'tarde'
  slot,        // 'atendimento' | 'analise'
  alocadosAtuais, // array de { colaborador_id, colaborador_nome, travado, slot }
  colaboradores,  // todos os colaboradores disponíveis (agentes ativos)
  onSalvar,    // (novosAlocados) => void
  isGestor,
}) {
  const cfg = getSlotConfig(periodo, slot);

  // IDs atualmente selecionados
  const [selecionados, setSelecionados] = useState(() =>
    alocadosAtuais.map(a => a.colaborador_id)
  );

  const travados = useMemo(() =>
    alocadosAtuais.filter(a => a.travado).map(a => a.colaborador_id),
    [alocadosAtuais]
  );

  const toggle = (id) => {
    if (travados.includes(id)) return; // não pode remover travados
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSalvar = () => {
    // Montar nova lista preservando dados dos já alocados
    const novosAlocados = selecionados.map(id => {
      const existente = alocadosAtuais.find(a => a.colaborador_id === id);
      const colab = colaboradores.find(c => c.id === id);
      return existente ?? {
        colaborador_id: id,
        colaborador_nome: colab?.nome_completo || id,
        slot,
        travado: false,
      };
    });
    onSalvar(novosAlocados);
    onClose();
  };

  const titulo = `${DIAS_LABEL[dia] || dia} · ${cfg.label}`;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={cn('px-2 py-0.5 rounded text-white text-xs font-bold', cfg.badgeBg)}>
              {cfg.label}
            </span>
            <span className="text-slate-700 font-semibold">{titulo}</span>
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-slate-500 -mt-2 mb-3">
          Selecione um ou mais colaboradores para este slot.
          {travados.length > 0 && <span className="text-amber-600"> Slots com são fixos.</span>}
        </p>

        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {colaboradores.map(c => {
            const sel = selecionados.includes(c.id);
            const trav = travados.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                disabled={!isGestor && !trav}
                className={cn(
                  'w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all',
                  sel ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50',
                  trav && 'border-amber-300 bg-amber-50',
                  (!isGestor) && 'cursor-default'
                )}
              >
                {/* Checkbox visual */}
                <div className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                  sel ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                )}>
                  {sel && <Check className="w-3 h-3 text-white" />}
                </div>

                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarImage src={c.foto_url} />
                  <AvatarFallback className="text-[10px] bg-slate-200">{c.nome_completo?.charAt(0)}</AvatarFallback>
                </Avatar>

                <span className="text-sm font-medium text-slate-800 flex-1 truncate">
                  {c.nome_completo?.split(' ').slice(0, 2).join(' ')}
                </span>

                {trav && <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                {sel && !trav && <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">Selecionado</Badge>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <span className="text-xs text-slate-500">{selecionados.length} selecionado(s)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            {isGestor && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleSalvar}>
                Confirmar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}