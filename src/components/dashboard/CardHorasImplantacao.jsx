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

  // O saldo de horas era comunicado por gradiente. Gradiente é proibido fora
  // do card de destaque do Dashboard, e além disso não dizia nada que a cor
  // sólida não diga. Vermelho sai por ser reservado a ação destrutiva:
  // esgotar horas é um alerta operacional, não uma exclusão.
  const tom = isZero ? 'bg-critical' : isLow ? 'bg-warning' : 'bg-primary';
  const barColor = isZero ? 'bg-destructive' : isLow ? 'bg-warning' : 'bg-primary';

  return (
    <Link to={createPageUrl('FerramentasOperacionais')}>
      <Card className={`cursor-pointer border-0 shadow-none ${tom} text-white transition-colors`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/90 text-sm font-medium">Horas de Implantação</span>
            <LifeBuoy className="w-4 h-4 text-white/80" />
          </div>
          <div className="text-2xl font-bold">
            {formatMinutos(utilizadosMinutos)} / {formatMinutos(LIMITE_MENSAL_MINUTOS)}
          </div>
          <p className="text-white/80 text-xs mt-1">
            {isZero ? 'Todas as horas foram utilizadas neste mês' : `${formatMinutos(disponivelMinutos)} disponíveis`}
          </p>
          <div className="mt-2 h-1.5 w-full bg-card/20 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(percentual, 100)}%` }} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}