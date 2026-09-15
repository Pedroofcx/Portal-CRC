import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import SlotCard from './SlotCard';
import ModalAtribuicaoSlot from './ModalAtribuicaoSlot';
import { DIAS_LABEL, getSlotConfig } from './SlotConfig';

const PERIODOS = ['manha', 'tarde'];
const SLOTS = ['atendimento', 'analise'];
const DIAS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

export default function GradeSemanasWFM({
  escala,
  colaboradores,
  onEscalaChange,
  isGestor,
  alertas = []
}) {
  const [modalAberto, setModalAberto] = useState(null); // { dia, periodo, slot }

  const colabMap = useMemo(() => {
    const m = {};
    colaboradores.forEach(c => { m[c.id] = c; });
    return m;
  }, [colaboradores]);

  const getAlocados = (dia, periodo, slot) => {
    const diaObj = escala.turnos?.find(t => t.dia === dia);
    const arr = periodo === 'manha' ? diaObj?.manha : diaObj?.tarde;
    return arr?.filter(s => s.slot === slot) ?? [];
  };

  const temAlerta = (dia, periodo, slot) =>
    alertas.some(a => a.dia === dia && a.slot?.includes(periodo) && a.slot?.includes(slot));

  const handleSalvarSlot = (dia, periodo, slot, novosAlocados) => {
    const novosTurnos = escala.turnos.map(diaObj => {
      if (diaObj.dia !== dia) return diaObj;
      const campo = periodo === 'manha' ? 'manha' : 'tarde';
      // Manter alocados de outros slots + substituir os deste slot
      const outrosSlots = (diaObj[campo] || []).filter(s => s.slot !== slot);
      return { ...diaObj, [campo]: [...outrosSlots, ...novosAlocados] };
    });
    onEscalaChange({ ...escala, turnos: novosTurnos });
  };

  if (!escala?.turnos) return null;

  const modalInfo = modalAberto
    ? {
        alocados: getAlocados(modalAberto.dia, modalAberto.periodo, modalAberto.slot),
      }
    : null;

  return (
    <>
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Header dias */}
          <div className="grid grid-cols-6 gap-2 mb-3">
            <div />
            {DIAS.map(dia => {
              const diaObj = escala.turnos.find(t => t.dia === dia);
              const dataFmt = diaObj?.data
                ? new Date(diaObj.data + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                : '';
              return (
                <div key={dia} className="text-center">
                  <p className="text-sm font-bold text-slate-800">{DIAS_LABEL[dia]}</p>
                  <p className="text-xs text-slate-400">{dataFmt}</p>
                </div>
              );
            })}
          </div>

          {/* Separador manhã/tarde */}
          {PERIODOS.map(periodo => (
            <div key={periodo}>
              {/* Label do período */}
              <div className="grid grid-cols-6 gap-2 mb-1.5">
                <div className={cn(
                  'flex items-center px-2 py-1 rounded text-xs font-bold text-white',
                  periodo === 'manha' ? 'bg-amber-500' : 'bg-indigo-500'
                )}>
                  {periodo === 'manha' ? '☀️ Manhã' : '🌙 Tarde'}
                </div>
                {DIAS.map(dia => <div key={dia} />)}
              </div>

              {/* Linhas de slots */}
              {SLOTS.map(slot => {
                const cfg = getSlotConfig(periodo, slot);
                return (
                  <div key={slot} className="grid grid-cols-6 gap-2 mb-1.5">
                    {/* Label slot */}
                    <div className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-lg',
                      cfg.badgeBg
                    )}>
                      <span className="text-white text-xs font-bold whitespace-nowrap">{cfg.label}</span>
                    </div>

                    {/* Célula por dia */}
                    {DIAS.map(dia => {
                      const alocados = getAlocados(dia, periodo, slot);
                      return (
                        <SlotCard
                          key={dia}
                          alocados={alocados}
                          periodo={periodo}
                          slot={slot}
                          colabMap={colabMap}
                          isGestor={isGestor}
                          temAlerta={temAlerta(dia, periodo, slot)}
                          onClick={() => setModalAberto({ dia, periodo, slot })}
                        />
                      );
                    })}
                  </div>
                );
              })}

              {/* Espaço entre manhã e tarde */}
              {periodo === 'manha' && <div className="mb-3" />}
            </div>
          ))}
        </div>
      </div>

      {/* Modal de atribuição */}
      {modalAberto && (
        <ModalAtribuicaoSlot
          open={true}
          onClose={() => setModalAberto(null)}
          dia={modalAberto.dia}
          periodo={modalAberto.periodo}
          slot={modalAberto.slot}
          alocadosAtuais={modalInfo.alocados}
          colaboradores={colaboradores}
          onSalvar={(novos) => handleSalvarSlot(modalAberto.dia, modalAberto.periodo, modalAberto.slot, novos)}
          isGestor={isGestor}
        />
      )}
    </>
  );
}