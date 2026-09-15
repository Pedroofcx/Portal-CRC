import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Lock, Scale } from 'lucide-react';
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
    <Card className="border border-border shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Diagnóstico da Semana</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          {/* Slots cheios */}
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${erros.length === 0 ? 'bg-success-soft' : 'bg-destructive/10'}`}>
              <CheckCircle2 className={`w-4 h-4 ${erros.length === 0 ? 'text-success' : 'text-destructive'}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Preenchimento</p>
              <p className="text-sm font-bold text-foreground">{slotsCheios}/{totalSlots} ({pct}%)</p>
            </div>
          </div>

          {/* Alertas */}
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${alertas.length > 0 ? 'bg-warning-soft' : 'bg-muted'}`}>
              <AlertTriangle className={`w-4 h-4 ${alertas.length > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Alertas</p>
              <p className="text-sm font-bold text-foreground">{alertas.length}</p>
            </div>
          </div>

          {/* Travados */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-warning-soft">
              <Lock className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Travados</p>
              <p className="text-sm font-bold text-foreground">{travados.length}</p>
            </div>
          </div>

          {/* Equilíbrio */}
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${maxDesvio.diff <= 1 ? 'bg-success-soft' : 'bg-warning-soft'}`}>
              <Scale className={`w-4 h-4 ${maxDesvio.diff <= 1 ? 'text-success' : 'text-warning'}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Equilíbrio</p>
              <p className="text-sm font-bold text-foreground">
                {maxDesvio.diff <= 1 ? 'OK' : `${maxDesvio.nome} +${maxDesvio.diff}`}
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
              <Badge key={i} className="text-xs bg-warning-soft text-warning border border-warning/30">
                {a.dia}: {a.mensagem}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}