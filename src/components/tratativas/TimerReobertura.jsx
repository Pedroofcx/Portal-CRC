import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle } from 'lucide-react';
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

/**
 * Acompanhamento dos 7 dias depois do encerramento de uma reclamação interna.
 * A reabertura é apurada pelos dados (reaberturaDe, src/lib/pontuacaoCiclo.js):
 * nova tratativa do mesmo cliente no prazo, com qualquer agente. O botão só
 * move a tratativa para Encerrada — o ponto não depende dele.
 */
export default function TimerReobertura({ tratativa, reabertura, onConfirmar, isLoading }) {
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
  const reabriuPor = reabertura?.situacao === 'reabriu' ? reabertura.por : null;
  // Verde só quando o prazo passou E o cliente não voltou.
  const semReabertura = expirou && reabertura?.situacao !== 'reabriu';
  const urgente = !expirou && timer.dias <= 1;

  return (
    <Card className={`border-0 shadow-sm ${semReabertura ? 'bg-success-soft border-success/25' : urgente ? 'bg-destructive/10 border-destructive/25' : 'bg-warning-soft border-warning/25'}`}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 text-base ${semReabertura ? 'text-success' : urgente ? 'text-destructive' : 'text-warning'}`}>
          Timer de Reabertura — 7 dias corridos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra de progresso */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Encerrado em {formatDateSP(tratativa.data_encerramento, 'DD/MM/YYYY HH:mm')}</span>
            <span className={`font-medium ${semReabertura ? 'text-success' : urgente ? 'text-destructive' : 'text-warning'}`}>
              {timer.percentual}%
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${semReabertura ? 'bg-success' : urgente ? 'bg-destructive' : 'bg-warning'}`}
              style={{ width: `${timer.percentual}%` }}
            />
          </div>
        </div>

        {/* Status do timer */}
        <div className="p-4 bg-card rounded-lg border text-center">
          {expirou ? (
            <>
              <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" />
              <p className="font-semibold text-success">Período de 7 dias concluído</p>
              <p className="text-xs text-muted-foreground mt-1">
                Prazo encerrado em {formatDateSP(timer.dataLimite, 'DD/MM/YYYY')}. O sistema encerra a tratativa sozinho em até 1 hora.
              </p>
            </>
          ) : (
            <>
              <div className={`text-5xl font-bold mb-1 ${urgente ? 'text-destructive' : 'text-warning'}`}>
                {timer.dias === 0 ? `${timer.horas}h` : `${timer.dias}d`}
              </div>
              <p className="text-sm text-muted-foreground">
                {timer.dias === 0 ? 'menos de 24h restantes' : timer.dias === 1 ? 'dia restante' : 'dias restantes'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Prazo até {formatDateSP(timer.dataLimite, 'DD/MM/YYYY HH:mm')} · depois dele o sistema encerra sozinho
              </p>
              {urgente && (
                <Badge className="mt-2 bg-destructive/10 text-destructive">Urgente</Badge>
              )}
            </>
          )}
        </div>

        {/* O que os dados dizem — o ponto não depende de ninguém confirmar */}
        {reabriuPor ? (
          <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
            O cliente abriu outra tratativa em {formatDateSP(reabriuPor.data_registro, 'DD/MM/YYYY HH:mm')}
            {reabriuPor.agente_responsavel_nome ? ` (com ${reabriuPor.agente_responsavel_nome})` : ''}, dentro dos 7 dias.
            O +1 de "sem reabertura" não conta.
          </div>
        ) : reabertura?.situacao === 'reabriu' ? (
          <p className="text-sm text-destructive">Registrado que o cliente voltou a reclamar. O +1 de "sem reabertura" não conta.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {expirou
              ? 'Nenhuma nova tratativa do cliente em 7 dias: o +1 já está contado.'
              : 'Nenhuma nova tratativa do cliente até agora. Se ele abrir outra até o fim do prazo, com qualquer agente, o +1 não conta.'}
          </p>
        )}

        {/* Ações */}
        <div className="space-y-2">
          {!reabriuPor && reabertura?.situacao !== 'reabriu' && (
            <Button
              onClick={() => onConfirmar(true)}
              variant="outline"
              className="w-full border-destructive/25 text-destructive hover:bg-destructive/10"
              disabled={isLoading}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Cliente voltou por outro canal
            </Button>
          )}
          {(expirou || reabriuPor) && (
            <Button
              onClick={() => onConfirmar(!!reabriuPor)}
              className="w-full"
              disabled={isLoading}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Concluir e passar para Encerrada
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}