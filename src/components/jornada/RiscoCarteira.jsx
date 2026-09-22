import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, Percent } from 'lucide-react';
import { agruparImpactoPorDimensao, classificarRisco, calcularToleranciaReais } from './inteligenciaFinanceira';
import { formatBRL } from '@/components/utils/helpers';

const RISCO_CORES = {
  green: { badge: 'bg-success-soft text-success', card: 'border-success/30 bg-success-soft' },
  amber: { badge: 'bg-warning-soft text-warning', card: 'border-warning/30 bg-warning-soft' },
  orange: { badge: 'bg-critical-soft text-critical', card: 'border-critical/25 bg-critical-soft' },
  red: { badge: 'bg-destructive/10 text-destructive', card: 'border-destructive/30 bg-destructive/10' },
  slate: { badge: 'bg-muted text-foreground', card: 'border-border bg-muted' },
};

export default function RiscoCarteira({ tratativas, colaboradores, params }) {
  // Análise por plano + segmento cruzado (carteira = plano × segmento)
  const porPlano = useMemo(() =>
    agruparImpactoPorDimensao(tratativas, colaboradores, params, 'plano_cliente'),
    [tratativas, colaboradores, params]
  );

  const porSegmento = useMemo(() =>
    agruparImpactoPorDimensao(tratativas, colaboradores, params, 'segmento_cliente'),
    [tratativas, colaboradores, params]
  );

  const toleranciaReais = calcularToleranciaReais(params);
  const faturamentoRef = parseFloat(params?.faturamentoReferencia) || 320000;

  if (porPlano.length === 0 && porSegmento.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-10 text-center text-muted-foreground">
          Dados insuficientes para análise de risco por carteira.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Alerta de risco geral */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Análise de Risco por Carteira
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Identifica quais carteiras (plano × segmento) sofrem mais impacto e representa que risco para o negócio.
            Tolerância: {formatBRL(toleranciaReais)} | Faturamento de referência: {formatBRL(faturamentoRef)}.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            <div className="p-4 rounded-lg bg-muted border border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase mb-1">
                <Users className="w-3.5 h-3.5" /> Carteiras Analisadas
              </div>
              <p className="text-2xl font-bold text-foreground">{porPlano.length + porSegmento.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted border border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase mb-1">
                <DollarSign className="w-3.5 h-3.5" /> Impacto Total
              </div>
              <p className="text-2xl font-bold text-destructive">
                {formatBRL([...porPlano, ...porSegmento].reduce((a, d) => a + d.total, 0))}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted border border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase mb-1">
                <Percent className="w-3.5 h-3.5" /> Risco sobre Faturamento
              </div>
              <p className="text-2xl font-bold text-foreground">
                {faturamentoRef > 0
                  ? (([...porPlano, ...porSegmento].reduce((a, d) => a + d.total, 0) / faturamentoRef) * 100).toFixed(1)
                  : '0'}%
              </p>
            </div>
          </div>

          {/* Cards de risco por plano */}
          <p className="text-sm font-semibold text-foreground mb-3">Risco por Plano</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            {porPlano.map(d => {
              const risco = classificarRisco(d.total, toleranciaReais);
              const cores = RISCO_CORES[risco.cor];
              return (
                <div key={d.key} className={`p-4 rounded-xl border ${cores.card}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-foreground">{d.key}</span>
                    <Badge className={cores.badge}>{risco.label}</Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between"><span>Casos</span><span className="font-medium">{d.casos}</span></div>
                    <div className="flex justify-between"><span>Impacto total</span><span className="font-medium text-destructive">{formatBRL(d.total)}</span></div>
                    <div className="flex justify-between"><span>Faturamento/ano</span><span className="font-medium">{formatBRL(d.faturamento)}</span></div>
                    <div className="flex justify-between"><span>Churns</span><span className="font-medium">{d.churns}</span></div>
                    {d.faturamento > 0 && (
                      <div className="flex justify-between"><span>% sobre faturam.</span>
                        <span className="font-medium text-destructive">{((d.total / d.faturamento) * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabela por segmento */}
          <p className="text-sm font-semibold text-foreground mb-3">Risco por Segmento</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-y text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="p-3 text-left">Segmento</th>
                  <th className="p-3 text-center">Casos</th>
                  <th className="p-3 text-right">Impacto</th>
                  <th className="p-3 text-right">Faturamento/ano</th>
                  <th className="p-3 text-right">Churns</th>
                  <th className="p-3 text-center">Risco</th>
                </tr>
              </thead>
              <tbody>
                {porSegmento.map(d => {
                  const risco = classificarRisco(d.total, toleranciaReais);
                  return (
                    <tr key={d.key} className="border-b hover:bg-muted">
                      <td className="p-3 font-medium">{d.key}</td>
                      <td className="p-3 text-center">{d.casos}</td>
                      <td className="p-3 text-right font-bold text-destructive">{formatBRL(d.total)}</td>
                      <td className="p-3 text-right text-muted-foreground">{formatBRL(d.faturamento)}</td>
                      <td className="p-3 text-center">{d.churns}</td>
                      <td className="p-3 text-center">
                        <Badge className={RISCO_CORES[risco.cor].badge}>{risco.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}