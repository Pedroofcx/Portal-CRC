import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, Ban, Plus, Calendar, LifeBuoy } from 'lucide-react';
import { LIMITE_MENSAL_MINUTOS, formatMinutos } from './constants';

export default function PainelSaldoApoio({ utilizadoMinutos, totalSolicitacoesMes, ultimaSolicitacao, onNovaSolicitacao }) {
  const disponivelMinutos = LIMITE_MENSAL_MINUTOS - utilizadoMinutos;
  const percentual = LIMITE_MENSAL_MINUTOS > 0 ? (utilizadoMinutos / LIMITE_MENSAL_MINUTOS) * 100 : 0;
  const hasSaldo = disponivelMinutos > 0;
  const isLow = hasSaldo && disponivelMinutos <= 60;
  const isZero = !hasSaldo;

  const barColor = isZero ? 'bg-destructive' : isLow ? 'bg-warning' : 'bg-success';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase mb-1">
              <Clock className="w-3.5 h-3.5" /> Limite Mensal
            </div>
            <p className="text-3xl font-bold text-foreground">{formatMinutos(LIMITE_MENSAL_MINUTOS)}</p>
            <p className="text-xs text-muted-foreground mt-1">Liberalidade global do CRC</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase mb-1">
              <Clock className="w-3.5 h-3.5" /> Utilizado
            </div>
            <p className="text-3xl font-bold text-warning">{formatMinutos(utilizadoMinutos)}</p>
            <p className="text-xs text-muted-foreground mt-1">{totalSolicitacoesMes} solicitação(ões) este mês</p>
          </CardContent>
        </Card>
        <Card className={isZero ? 'border-destructive/25 bg-destructive/10' : isLow ? 'border-warning/25 bg-warning-soft' : 'border-success/25 bg-success-soft'}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase mb-1">
              <LifeBuoy className="w-3.5 h-3.5" /> Disponível
            </div>
            <p className={`text-3xl font-bold ${isZero ? 'text-destructive' : isLow ? 'text-warning' : 'text-success'}`}>
              {formatMinutos(disponivelMinutos)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isZero ? 'Esgotado' : isLow ? 'Atenção: saldo baixo' : 'Saldo disponível'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Consumo mensal global</span>
            <span className="text-sm font-mono text-muted-foreground">
              {formatMinutos(utilizadoMinutos)} / {formatMinutos(LIMITE_MENSAL_MINUTOS)}
            </span>
          </div>
          <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(percentual, 100)}%` }} />
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Solicitações no mês: <strong className="text-foreground">{totalSolicitacoesMes}</strong>
            </span>
            <span>Última solicitação: <strong className="text-foreground">{ultimaSolicitacao || '—'}</strong></span>
          </div>
        </CardContent>
      </Card>

      {isZero ? (
        <div className="p-4 bg-destructive/10 border-2 border-destructive/25 rounded-xl flex items-start gap-3">
          <Ban className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-destructive">Horas disponíveis esgotadas</p>
            <p className="text-sm text-destructive mt-1">
              A liberalidade mensal de 3 horas para apoio especializado já foi totalmente utilizada neste mês.
              Novas solicitações poderão ser realizadas a partir da renovação do limite no próximo mês.
            </p>
          </div>
        </div>
      ) : isLow ? (
        <div className="p-4 bg-warning-soft border-2 border-warning/25 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-warning">Saldo baixo</p>
            <p className="text-sm text-warning mt-1">
              Restam apenas {formatMinutos(disponivelMinutos)} para apoio especializado neste mês. Utilize com planejamento.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-success-soft border-2 border-success/25 rounded-xl flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
          <p className="font-semibold text-success">Disponível: {formatMinutos(disponivelMinutos)}</p>
        </div>
      )}

      <Button onClick={onNovaSolicitacao} disabled={!hasSaldo} className="gap-2 bg-primary hover:bg-primary">
        <Plus className="w-4 h-4" /> Nova Solicitação
      </Button>
    </div>
  );
}