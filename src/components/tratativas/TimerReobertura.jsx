import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertTriangle, Timer } from 'lucide-react';
import { formatDateSP } from '@/components/utils/helpers';

/**
 * Calcula os dias corridos desde o encerramento.
 * Retorna: { dias, expirou, dataLimite, percentual }
 */
function calcularTimer(dataEncerramento) {
  if (!dataEncerramento) return null;
  const dataEnc = new Date(dataEncerramento);
  const dataLimite = new Date(dataEnc.getTime() + 7 * 24 * 60 * 60 * 1000);
  const agora = new Date();
  const totalMs = 7 * 24 * 60 * 60 * 1000;
  const decorrido = agora - dataEnc;
  const percentual = Math.min(100, Math.round((decorrido / totalMs) * 100));
  const diffDias = Math.max(0, Math.ceil((dataLimite - agora) / (1000 * 60 * 60 * 24)));
  const diffHoras = Math.max(0, Math.ceil((dataLimite - agora) / (1000 * 60 * 60)));
  return {
    dias: diffDias,
    horas: diffHoras,
    expirou: agora >= dataLimite,
    dataLimite,
    percentual,
  };
}

export default function TimerReobertura({ tratativa, onConfirmar, isLoading }) {
  const [timer, setTimer] = useState(() => calcularTimer(tratativa?.data_encerramento));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(calcularTimer(tratativa?.data_encerramento));
    }, 60000);
    return () => clearInterval(interval);
  }, [tratativa?.data_encerramento]);

  if (!tratativa || tratativa.tipo_tratativa !== 'reclamacao_interna') return null;
  if (tratativa.status !== 'aguardando_confirmacao_reabertura') return null;
  if (!timer) return null;

  const expirou = timer.expirou;
  const urgente = !expirou && timer.dias <= 1;

  return (
    <Card className={`border-0 shadow-sm ${expirou ? 'bg-green-50 border-green-200' : urgente ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 text-base ${expirou ? 'text-green-900' : urgente ? 'text-red-900' : 'text-amber-900'}`}>
          <Timer className="w-5 h-5" />
          Timer de Reabertura — 7 dias corridos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra de progresso */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">Encerrado em {formatDateSP(tratativa.data_encerramento, 'DD/MM/YYYY HH:mm')}</span>
            <span className={`font-medium ${expirou ? 'text-green-700' : urgente ? 'text-red-700' : 'text-amber-700'}`}>
              {timer.percentual}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${expirou ? 'bg-green-500' : urgente ? 'bg-red-500' : 'bg-amber-500'}`}
              style={{ width: `${timer.percentual}%` }}
            />
          </div>
        </div>

        {/* Status do timer */}
        <div className="p-4 bg-white rounded-lg border text-center">
          {expirou ? (
            <>
              <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-800">Período de 7 dias concluído</p>
              <p className="text-xs text-slate-500 mt-1">
                Prazo encerrado em {formatDateSP(timer.dataLimite, 'DD/MM/YYYY')}. Confirme o status abaixo.
              </p>
              <Badge className="mt-2 bg-green-100 text-green-700">Pronto para confirmação</Badge>
            </>
          ) : (
            <>
              <div className={`text-5xl font-bold mb-1 ${urgente ? 'text-red-600' : 'text-amber-600'}`}>
                {timer.dias === 0 ? `${timer.horas}h` : `${timer.dias}d`}
              </div>
              <p className="text-sm text-slate-600">
                {timer.dias === 0 ? 'menos de 24h restantes' : timer.dias === 1 ? 'dia restante' : 'dias restantes'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Prazo até {formatDateSP(timer.dataLimite, 'DD/MM/YYYY HH:mm')}
              </p>
              {urgente && (
                <Badge className="mt-2 bg-red-100 text-red-700">Urgente</Badge>
              )}
            </>
          )}
        </div>

        {/* Ações */}
        <div className="space-y-2">
          <Button
            onClick={() => onConfirmar(true)}
            variant="outline"
            className="w-full border-red-200 text-red-700 hover:bg-red-50"
            disabled={isLoading}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Cliente Reabriu a Reclamação
          </Button>

          <Button
            onClick={() => onConfirmar(false)}
            className={`w-full ${expirou ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-400 hover:bg-slate-500 cursor-default'}`}
            disabled={isLoading || !expirou}
            title={!expirou ? `Disponível após ${formatDateSP(timer.dataLimite, 'DD/MM/YYYY')}` : undefined}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {expirou ? 'Confirmar: Sem Reabertura (+1 pt)' : `Aguardando prazo de 7 dias`}
          </Button>

          {!expirou && (
            <p className="text-xs text-center text-slate-400">
              O botão de confirmação será liberado automaticamente após {formatDateSP(timer.dataLimite, 'DD/MM/YYYY')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}