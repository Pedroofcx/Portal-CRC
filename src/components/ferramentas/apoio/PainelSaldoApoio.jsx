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

  const barColor = isZero ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase mb-1">
              <Clock className="w-3.5 h-3.5" /> Limite Mensal
            </div>
            <p className="text-3xl font-bold text-slate-800">{formatMinutos(LIMITE_MENSAL_MINUTOS)}</p>
            <p className="text-xs text-slate-400 mt-1">Liberalidade global do CRC</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase mb-1">
              <Clock className="w-3.5 h-3.5" /> Utilizado
            </div>
            <p className="text-3xl font-bold text-amber-600">{formatMinutos(utilizadoMinutos)}</p>
            <p className="text-xs text-slate-400 mt-1">{totalSolicitacoesMes} solicitação(ões) este mês</p>
          </CardContent>
        </Card>
        <Card className={isZero ? 'border-red-200 bg-red-50' : isLow ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase mb-1">
              <LifeBuoy className="w-3.5 h-3.5" /> Disponível
            </div>
            <p className={`text-3xl font-bold ${isZero ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-600'}`}>
              {formatMinutos(disponivelMinutos)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isZero ? 'Esgotado' : isLow ? 'Atenção: saldo baixo' : 'Saldo disponível'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">Consumo mensal global</span>
            <span className="text-sm font-mono text-slate-500">
              {formatMinutos(utilizadoMinutos)} / {formatMinutos(LIMITE_MENSAL_MINUTOS)}
            </span>
          </div>
          <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(percentual, 100)}%` }} />
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Solicitações no mês: <strong className="text-slate-700">{totalSolicitacoesMes}</strong>
            </span>
            <span>Última solicitação: <strong className="text-slate-700">{ultimaSolicitacao || '—'}</strong></span>
          </div>
        </CardContent>
      </Card>

      {isZero ? (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
          <Ban className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-red-700">Horas disponíveis esgotadas</p>
            <p className="text-sm text-red-600 mt-1">
              A liberalidade mensal de 3 horas para apoio especializado já foi totalmente utilizada neste mês.
              Novas solicitações poderão ser realizadas a partir da renovação do limite no próximo mês.
            </p>
          </div>
        </div>
      ) : isLow ? (
        <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-amber-700">Saldo baixo</p>
            <p className="text-sm text-amber-600 mt-1">
              Restam apenas {formatMinutos(disponivelMinutos)} para apoio especializado neste mês. Utilize com planejamento.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="font-semibold text-emerald-700">Disponível: {formatMinutos(disponivelMinutos)}</p>
        </div>
      )}

      <Button onClick={onNovaSolicitacao} disabled={!hasSaldo} className="gap-2 bg-violet-600 hover:bg-violet-700">
        <Plus className="w-4 h-4" /> Nova Solicitação
      </Button>
    </div>
  );
}