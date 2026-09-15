import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BanIcon, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const DIAS_PT = {
  segunda: 'Segunda-feira', terca: 'Terça-feira', quarta: 'Quarta-feira',
  quinta: 'Quinta-feira', sexta: 'Sexta-feira',
};

export default function CancelarDiaDialog({ open, onClose, turno, diaIndex, escala, onSalvar, salvando }) {
  const [motivo, setMotivo] = useState('');

  // HOOKS SEMPRE NO TOPO - nunca condicional
  useEffect(() => {
    if (open && turno) {
      setMotivo(turno.cancelado ? (turno.motivo_cancelamento || '') : '');
    }
  }, [open, turno]);

  // Guard de renderização DEPOIS dos hooks
  if (!turno) return null;

  const jaCancelado = !!turno.cancelado;

  const handleConfirmar = () => {
    if (!jaCancelado && !motivo.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }

    const novosTurnos = escala.turnos.map((t, i) => {
      if (i !== diaIndex) return t;
      return {
        ...t,
        cancelado: !jaCancelado,
        motivo_cancelamento: !jaCancelado ? motivo.trim() : '',
      };
    });

    onSalvar(novosTurnos);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {jaCancelado ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <BanIcon className="w-4 h-4 text-red-500" />
            )}
            {jaCancelado ? 'Reativar Dia' : 'Cancelar Dia'} — {DIAS_PT[turno.dia]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {jaCancelado ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-800">Este dia está cancelado</p>
              <p className="text-xs text-green-600 mt-1">Deseja reativar os turnos normalmente?</p>
              {turno.motivo_cancelamento && (
                <p className="text-xs text-green-700 mt-2 bg-green-100 rounded-lg px-2 py-1">
                  Motivo: {turno.motivo_cancelamento}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-sm text-red-800 font-medium">Atenção</p>
                <p className="text-xs text-red-600 mt-1">
                  Os turnos deste dia serão marcados como <strong>CANCELADOS</strong> e todos os colaboradores verão essa informação.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Motivo do cancelamento <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Ex: Reunião geral, Feriado, Evento especial..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onClose} disabled={salvando}>
              Fechar
            </Button>
            <Button
              size="sm"
              className={`flex-1 ${jaCancelado ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              onClick={handleConfirmar}
              disabled={salvando}
            >
              {salvando ? 'Salvando...' : jaCancelado ? '✓ Reativar Turnos' : 'Confirmar Cancelamento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}