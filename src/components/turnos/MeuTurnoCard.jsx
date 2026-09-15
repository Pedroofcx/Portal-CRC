import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sun, Moon, Clock, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const DIAS_PT = {
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
};

function getTodayDiaSemana() {
  const day = new Date().getDay(); // 0=dom, 1=seg...5=sex, 6=sab
  const map = { 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta' };
  return map[day] || null;
}

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export default function MeuTurnoCard({ colaboradorId }) {
  const [agendaOpen, setAgendaOpen] = useState(false);

  const semanaAtual = getISOWeek(new Date());

  const { data: escalas = [] } = useQuery({
    queryKey: ['escalas-turno'],
    queryFn: () => db.entities.EscalaTurno.filter({ ativa: true }, '-created_date', 5),
    enabled: !!colaboradorId,
  });

  const escalaAtual = escalas.find(e => e.semana_referencia === semanaAtual) || escalas[0];
  const diaHoje = getTodayDiaSemana();

  let meuTurnoHoje = null;
  if (escalaAtual && diaHoje && colaboradorId) {
    const diaData = escalaAtual.turnos?.find(t => t.dia === diaHoje);
    if (diaData) {
      const estaNaManha = diaData.manha?.some(c => c.colaborador_id === colaboradorId);
      const estaNaTarde = diaData.tarde?.some(c => c.colaborador_id === colaboradorId);
      if (estaNaManha) meuTurnoHoje = 'manha';
      else if (estaNaTarde) meuTurnoHoje = 'tarde';
    }
  }

  const isParticipante = escalaAtual?.colaboradores_participantes?.includes(colaboradorId);

  if (!escalaAtual || !isParticipante) return null;

  return (
    <>
      <Card
        className={`border-0 shadow-sm cursor-pointer hover:shadow-md transition-all ${
          meuTurnoHoje === 'manha'
            ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white'
            : meuTurnoHoje === 'tarde'
            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
            : 'bg-gradient-to-r from-slate-100 to-slate-200'
        }`}
        onClick={() => setAgendaOpen(true)}
      >
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              {meuTurnoHoje === 'manha' ? (
                <Sun className="w-4 h-4" />
              ) : meuTurnoHoje === 'tarde' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4 text-slate-500" />
              )}
            </div>
            <div>
              <p className={`font-semibold text-sm ${!meuTurnoHoje ? 'text-slate-700' : ''}`}>
                Meu Turno Hoje
              </p>
              <p className={`text-xs ${meuTurnoHoje ? 'opacity-80' : 'text-slate-500'}`}>
                {meuTurnoHoje === 'manha'
                  ? 'Manhã'
                  : meuTurnoHoje === 'tarde'
                  ? 'Tarde'
                  : diaHoje ? 'Dia não escalado' : 'Final de semana'}
              </p>
            </div>
          </div>
          <ArrowRight className={`w-4 h-4 ${meuTurnoHoje ? 'opacity-70' : 'text-slate-400'}`} />
        </CardContent>
      </Card>

      <Dialog open={agendaOpen} onOpenChange={setAgendaOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Agenda de Turnos — Semana {escalaAtual?.semana_referencia}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {escalaAtual?.turnos?.map(turno => {
              const isMeuDia = turno.dia === diaHoje;
              return (
                <div
                  key={turno.dia}
                  className={`rounded-xl border p-3 ${isMeuDia ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}
                >
                  <p className={`font-semibold text-sm mb-2 ${isMeuDia ? 'text-blue-700' : 'text-slate-700'}`}>
                    {DIAS_PT[turno.dia]}
                    {isMeuDia && <Badge className="ml-2 bg-blue-600 text-white text-xs">Hoje</Badge>}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-700">Manhã</span>
                      </div>
                      {turno.manha?.length > 0 ? turno.manha.map(c => (
                        <div key={c.colaborador_id} className={`text-xs py-0.5 px-1.5 rounded mb-0.5 ${c.colaborador_id === colaboradorId ? 'bg-amber-200 font-semibold text-amber-900' : 'text-amber-800'}`}>
                          {c.colaborador_nome?.split(' ')[0]}
                        </div>
                      )) : <p className="text-xs text-amber-400 italic">—</p>}
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-xs font-semibold text-indigo-700">Tarde</span>
                      </div>
                      {turno.tarde?.length > 0 ? turno.tarde.map(c => (
                        <div key={c.colaborador_id} className={`text-xs py-0.5 px-1.5 rounded mb-0.5 ${c.colaborador_id === colaboradorId ? 'bg-indigo-200 font-semibold text-indigo-900' : 'text-indigo-800'}`}>
                          {c.colaborador_nome?.split(' ')[0]}
                        </div>
                      )) : <p className="text-xs text-indigo-400 italic">—</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}