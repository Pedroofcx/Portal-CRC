import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sun, Moon, ArrowLeftRight } from 'lucide-react';

const DIAS_PT = {
  segunda: 'Segunda-feira', terca: 'Terça-feira', quarta: 'Quarta-feira',
  quinta: 'Quinta-feira', sexta: 'Sexta-feira',
};

export default function MoverTurnoDialog({ open, onClose, turno, diaIndex, escala, onSalvar, salvando }) {
  const [localManha, setLocalManha] = useState([]);
  const [localTarde, setLocalTarde] = useState([]);
  const [alterado, setAlterado] = useState(false);

  useEffect(() => {
    if (open && turno) {
      setLocalManha([...(turno.manha || [])]);
      setLocalTarde([...(turno.tarde || [])]);
      setAlterado(false);
    }
  }, [open, turno]);

  if (!open || !turno) return null;

  const moverParaTarde = (colab) => {
    setLocalManha(prev => prev.filter(c => c.colaborador_id !== colab.colaborador_id));
    setLocalTarde(prev => [...prev, colab]);
    setAlterado(true);
  };

  const moverParaManha = (colab) => {
    setLocalTarde(prev => prev.filter(c => c.colaborador_id !== colab.colaborador_id));
    setLocalManha(prev => [...prev, colab]);
    setAlterado(true);
  };

  const handleSalvar = () => {
    const novosTurnos = escala.turnos.map((t, i) => {
      if (i !== diaIndex) return t;
      return { ...t, manha: localManha, tarde: localTarde };
    });
    onSalvar(novosTurnos);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
            Remanejar Turno — {DIAS_PT[turno.dia]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Clique em um colaborador para movê-lo para o turno oposto.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Manhã */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-3">
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-700">Manhã</span>
                <span className="ml-auto text-xs bg-amber-200 text-amber-800 rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {localManha.length}
                </span>
              </div>
              <div className="space-y-1.5 min-h-[72px]">
                {localManha.length === 0 && (
                  <p className="text-xs text-amber-400 text-center italic py-2">Vazio</p>
                )}
                {localManha.map(c => (
                  <button
                    key={c.colaborador_id}
                    onClick={() => moverParaTarde(c)}
                    title="Mover para Tarde"
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all group text-left"
                  >
                    <span className="text-xs font-medium text-slate-700 flex-1 truncate">
                      {c.colaborador_nome?.split(' ').slice(0, 2).join(' ')}
                    </span>
                    <ArrowLeftRight className="w-3 h-3 text-amber-300 group-hover:text-indigo-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Tarde */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-3">
                <Moon className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-semibold text-indigo-700">Tarde</span>
                <span className="ml-auto text-xs bg-indigo-200 text-indigo-800 rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {localTarde.length}
                </span>
              </div>
              <div className="space-y-1.5 min-h-[72px]">
                {localTarde.length === 0 && (
                  <p className="text-xs text-indigo-400 text-center italic py-2">Vazio</p>
                )}
                {localTarde.map(c => (
                  <button
                    key={c.colaborador_id}
                    onClick={() => moverParaManha(c)}
                    title="Mover para Manhã"
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg hover:bg-amber-50 hover:border-amber-300 transition-all group text-left"
                  >
                    <ArrowLeftRight className="w-3 h-3 text-indigo-300 group-hover:text-amber-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-slate-700 flex-1 truncate">
                      {c.colaborador_nome?.split(' ').slice(0, 2).join(' ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {alterado && (
            <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              Alterações pendentes — clique em "Salvar" para confirmar.
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onClose} disabled={salvando}>
              Fechar
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={handleSalvar}
              disabled={!alterado || salvando}
            >
              {salvando ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}