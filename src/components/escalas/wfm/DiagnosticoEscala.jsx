import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Lock, Scale, RotateCcw } from 'lucide-react';
import { validarEscala } from './gerarEscala';

export default function DiagnosticoEscala({ escala, agentes, historicoMes = [] }) {
  if (!escala) return null;

  const erros = validarEscala(escala);
  const alertas = escala.alertas || [];
  const travados = escala.turnos?.flatMap(d => [
    ...(d.manha?.filter(s => s.travado) || []),
    ...(d.tarde?.filter(s => s.travado) || [])
  ]) || [];

  // Calcular desvio de equilíbrio
  const saldoAgentes = agentes.map(ag => {
    let manhas = 0, tardes = 0;
    // Contar no histórico
    historicoMes.forEach(e => e.turnos?.forEach(d => {
      if (d.manha?.some(s => s.colaborador_id === ag.id)) manhas++;
      if (d.tarde?.some(s => s.colaborador_id === ag.id)) tardes++;
    }));
    // Contar na escala atual
    escala.turnos?.forEach(d => {
      if (d.manha?.some(s => s.colaborador_id === ag.id)) manhas++;
      if (d.tarde?.some(s => s.colaborador_id === ag.id)) tardes++;
    });
    return { nome: ag.nome_completo?.split(' ')[0], manhas, tardes, diff: Math.abs(manhas - tardes) };
  });
  const maxDesvio = saldoAgentes.reduce((max, a) => a.diff > max.diff ? a : max, { diff: 0, nome: '-' });

  const totalSlots = (escala.turnos?.length || 0) * 4;
  // Um slot (atendimento/analise) é "cheio" se tem ao menos 1 pessoa
  const slotsCheios = escala.turnos?.reduce((acc, d) => {
    const temMAtend = d.manha?.some(s => s.slot === 'atendimento') ? 1 : 0;
    const temMAnal  = d.manha?.some(s => s.slot === 'analise') ? 1 : 0;
    const temTAtend = d.tarde?.some(s => s.slot === 'atendimento') ? 1 : 0;
    const temTAnal  = d.tarde?.some(s => s.slot === 'analise') ? 1 : 0;
    return acc + temMAtend + temMAnal + temTAtend + temTAnal;
  }, 0) || 0;

  const pct = totalSlots > 0 ? Math.round((slotsCheios / totalSlots) * 100) : 0;

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Diagnóstico da Semana</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          {/* Slots cheios */}
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${erros.length === 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <CheckCircle2 className={`w-4 h-4 ${erros.length === 0 ? 'text-green-600' : 'text-red-500'}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Preenchimento</p>
              <p className="text-sm font-bold text-slate-800">{slotsCheios}/{totalSlots} ({pct}%)</p>
            </div>
          </div>

          {/* Alertas */}
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${alertas.length > 0 ? 'bg-amber-100' : 'bg-slate-100'}`}>
              <AlertTriangle className={`w-4 h-4 ${alertas.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Alertas</p>
              <p className="text-sm font-bold text-slate-800">{alertas.length}</p>
            </div>
          </div>

          {/* Travados */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100">
              <Lock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Travados</p>
              <p className="text-sm font-bold text-slate-800">{travados.length}</p>
            </div>
          </div>

          {/* Equilíbrio */}
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${maxDesvio.diff <= 1 ? 'bg-green-100' : 'bg-amber-100'}`}>
              <Scale className={`w-4 h-4 ${maxDesvio.diff <= 1 ? 'text-green-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Equilíbrio</p>
              <p className="text-sm font-bold text-slate-800">
                {maxDesvio.diff <= 1 ? '✅ OK' : `⚠️ ${maxDesvio.nome} +${maxDesvio.diff}`}
              </p>
            </div>
          </div>
        </div>

        {/* Erros HARD */}
        {erros.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {erros.map((e, i) => (
              <Badge key={i} variant="destructive" className="text-xs">{e}</Badge>
            ))}
          </div>
        )}

        {/* Alertas SOFT */}
        {alertas.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {alertas.map((a, i) => (
              <Badge key={i} className="text-xs bg-amber-100 text-amber-800 border border-amber-300">
                {a.dia}: {a.mensagem}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}