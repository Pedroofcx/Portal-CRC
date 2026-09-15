import React from 'react';
import { cn } from '@/lib/utils';
import { Lock, LockOpen, AlertTriangle, Phone, Search, Plus, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getSlotConfig } from './SlotConfig';

/**
 * Card de célula de slot — suporta múltiplos colaboradores
 * Clique abre o ModalAtribuicaoSlot (gerenciado pelo pai)
 */
export default function SlotCard({
  alocados,     // array de { colaborador_id, colaborador_nome, slot, travado }
  periodo,
  slot,
  colabMap,     // id → objeto Colaborador
  isGestor,
  temAlerta,
  onClick,      // () => void — abre modal de edição
}) {
  const cfg = getSlotConfig(periodo, slot);
  const Icon = slot === 'atendimento' ? Phone : Search;
  const temTravado = alocados.some(a => a.travado);

  if (alocados.length === 0) {
    return (
      <button
        onClick={isGestor ? onClick : undefined}
        className={cn(
          'w-full flex items-center gap-2 p-2 rounded-lg border-2 border-dashed transition-all',
          temAlerta ? 'border-red-400 bg-red-50' : `${cfg.border} bg-white/60`,
          isGestor && 'hover:bg-blue-50 hover:border-blue-400 cursor-pointer',
          !isGestor && 'cursor-default'
        )}
      >
        {temAlerta
          ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          : <div className={cn('w-6 h-6 rounded flex items-center justify-center flex-shrink-0 opacity-30', cfg.badgeBg)}>
              <Icon className="w-3 h-3 text-white" />
            </div>
        }
        <span className={cn('text-xs font-medium flex-1 text-left', temAlerta ? 'text-red-500' : 'text-slate-400')}>
          {temAlerta ? 'Vazio ' : 'Sem alocação'}
        </span>
        {isGestor && <Plus className="w-3.5 h-3.5 text-slate-300" />}
      </button>
    );
  }

  return (
    <button
      onClick={isGestor ? onClick : undefined}
      className={cn(
        'w-full rounded-lg border-2 p-1.5 text-left transition-all space-y-1',
        cfg.bg, cfg.border,
        isGestor && 'hover:ring-2 hover:ring-blue-400 cursor-pointer',
        !isGestor && 'cursor-default',
        temTravado && 'ring-2 ring-amber-400'
      )}
    >
      {/* Linha de cada colaborador */}
      {alocados.map((alocado, i) => {
        const colab = colabMap[alocado.colaborador_id];
        const nome = colab?.nome_completo?.split(' ').slice(0, 2).join(' ') || alocado.colaborador_nome?.split(' ')[0] || '?';
        return (
          <div key={alocado.colaborador_id + i} className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5 flex-shrink-0">
              <AvatarImage src={colab?.foto_url} />
              <AvatarFallback className="text-[9px] bg-slate-200">{nome.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className={cn('text-[11px] font-semibold truncate flex-1', cfg.text)}>{nome}</span>
            {alocado.travado && <Lock className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />}
          </div>
        );
      })}

      {/* Rodapé: contagem + ícone de editar */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-1">
          <div className={cn('w-4 h-4 rounded flex items-center justify-center', cfg.badgeBg)}>
            <Icon className="w-2.5 h-2.5 text-white" />
          </div>
          <span className={cn('text-[10px] font-bold', cfg.text)}>
            {alocados.length > 1 ? `${alocados.length}×` : ''}
          </span>
        </div>
        {isGestor && (
          <span className={cn('text-[10px] font-medium opacity-60', cfg.text)}>editar</span>
        )}
      </div>
    </button>
  );
}