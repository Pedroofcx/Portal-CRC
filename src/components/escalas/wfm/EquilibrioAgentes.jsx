import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function EquilibrioAgentes({ escala, colaboradores, historicoMes = [] }) {
  const stats = useMemo(() => {
    return colaboradores.map(ag => {
      let manhas = 0, tardes = 0;
      // Histórico do mês
      historicoMes.forEach(e => e.turnos?.forEach(d => {
        if (d.manha?.some(s => s.colaborador_id === ag.id)) manhas++;
        if (d.tarde?.some(s => s.colaborador_id === ag.id)) tardes++;
      }));
      // Escala atual
      escala?.turnos?.forEach(d => {
        if (d.manha?.some(s => s.colaborador_id === ag.id)) manhas++;
        if (d.tarde?.some(s => s.colaborador_id === ag.id)) tardes++;
      });
      const total = manhas + tardes;
      const pctManha = total > 0 ? Math.round((manhas / total) * 100) : 50;
      return { ag, manhas, tardes, total, pctManha };
    }).filter(s => s.total > 0);
  }, [escala, colaboradores, historicoMes]);

  if (stats.length === 0) return null;

  return (
    <Card className="border border-border shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Equilíbrio de Turnos (Mês)</p>
        <div className="space-y-2">
          {stats.map(({ ag, manhas, tardes, pctManha }) => {
            const desequilibrado = Math.abs(manhas - tardes) > 1;
            return (
              <div key={ag.id} className="flex items-center gap-3">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarImage src={ag.foto_url} />
                  <AvatarFallback className="text-[10px] bg-muted">
                    {ag.nome_completo?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-foreground w-20 truncate flex-shrink-0">
                  {ag.nome_completo?.split(' ')[0]}
                </span>
                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success transition-all"
                    style={{ width: `${pctManha}%` }}
                  />
                </div>
                <span className={cn(
                  'text-[11px] font-semibold w-20 text-right flex-shrink-0',
                  desequilibrado ? 'text-warning' : 'text-muted-foreground'
                )}>
                  M:{manhas} T:{tardes} {desequilibrado && ''}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-3 pt-3 border-t">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-success" />
            <span className="text-[11px] text-muted-foreground">Manhã</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-muted" />
            <span className="text-[11px] text-muted-foreground">Tarde</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}