import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, AlertTriangle, TrendingUp, Target, Wrench, ShieldAlert, Wallet } from 'lucide-react';
import { gerarPerguntasEstrategicas } from './inteligenciaFinanceira';

const ICONES = [
  AlertTriangle, TrendingUp, Target, TrendingUp, Wrench, Wallet, ShieldAlert
];

const PRIORIDADE_CORES = {
  alta: 'bg-destructive/10 text-destructive',
  media: 'bg-warning-soft text-warning',
  baixa: 'bg-success-soft text-success',
};

export default function PerguntasEstrategicas({ tratativas, colaboradores, params }) {
  const respostas = useMemo(() =>
    gerarPerguntasEstrategicas(tratativas, colaboradores, params),
    [tratativas, colaboradores, params]
  );

  if (respostas.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-10 text-center text-muted-foreground">
          Dados insuficientes para gerar respostas estratégicas.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="w-5 h-5 text-primary" />
          Perguntas Estratégicas — Respostas Automáticas
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          O sistema cruza automaticamente todos os dados e responde às perguntas mais importantes para a tomada de decisão.
        </p>
      </CardHeader>
      <CardContent className="grid lg:grid-cols-2 gap-4">
        {respostas.map((r, i) => {
          const Icon = ICONES[i % ICONES.length];
          return (
            <div key={i} className="p-4 rounded-xl border bg-muted border-border">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={PRIORIDADE_CORES[r.prioridade]}>{r.prioridade}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">{r.pergunta}</p>
                  <p className="text-sm text-foreground">{r.resposta}</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{r.detalhe}</p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}