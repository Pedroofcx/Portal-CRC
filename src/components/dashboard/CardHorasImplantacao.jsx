import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LifeBuoy } from 'lucide-react';
import { LIMITE_MENSAL_MINUTOS, formatMinutos } from '@/components/ferramentas/apoio/constants';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function CardHorasImplantacao({ utilizadosMinutos = 0 }) {
  const disponivelMinutos = LIMITE_MENSAL_MINUTOS - utilizadosMinutos;
  const percentual = LIMITE_MENSAL_MINUTOS > 0 ? (utilizadosMinutos / LIMITE_MENSAL_MINUTOS) * 100 : 0;
  const isZero = disponivelMinutos <= 0;
  const isLow = !isZero && disponivelMinutos <= 60;

  const gradient = isZero ? 'from-red-500 to-red-600' : isLow ? 'from-amber-500 to-amber-600' : 'from-violet-500 to-violet-600';
  const barColor = isZero ? 'bg-red-300' : isLow ? 'bg-amber-300' : 'bg-violet-300';

  return (
    <Link to={createPageUrl('FerramentasOperacionais')}>
      <Card className={`border-0 shadow-sm bg-gradient-to-br ${gradient} text-white cursor-pointer hover:shadow-md transition-shadow`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/90 text-sm font-medium">Horas de Implantação</span>
            <LifeBuoy className="w-4 h-4 text-white/80" />
          </div>
          <div className="text-2xl font-bold">
            {formatMinutos(utilizadosMinutos)} / {formatMinutos(LIMITE_MENSAL_MINUTOS)}
          </div>
          <p className="text-white/80 text-xs mt-1">
            {isZero ? '🔴 Todas as horas foram utilizadas neste mês' : `${formatMinutos(disponivelMinutos)} disponíveis`}
          </p>
          <div className="mt-2 h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(percentual, 100)}%` }} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}