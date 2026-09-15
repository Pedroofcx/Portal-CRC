import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Users, DollarSign, Percent } from 'lucide-react';
import { agruparImpactoPorDimensao, classificarRisco, calcularToleranciaReais } from './inteligenciaFinanceira';
import { formatBRL } from '@/components/utils/helpers';

const RISCO_CORES = {
  green: { badge: 'bg-green-100 text-green-700', card: 'border-green-300 bg-green-50' },
  amber: { badge: 'bg-amber-100 text-amber-700', card: 'border-amber-300 bg-amber-50' },
  orange: { badge: 'bg-orange-100 text-orange-700', card: 'border-orange-300 bg-orange-50' },
  red: { badge: 'bg-red-100 text-red-700', card: 'border-red-300 bg-red-50' },
  slate: { badge: 'bg-slate-100 text-slate-700', card: 'border-slate-200 bg-slate-50' },
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
        <CardContent className="py-10 text-center text-slate-500">
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
            <ShieldAlert className="w-5 h-5 text-red-600" />
            Análise de Risco por Carteira
          </CardTitle>
          <p className="text-xs text-slate-500">
            Identifica quais carteiras (plano × segmento) sofrem mais impacto e representa que risco para o negócio.
            Tolerância: {formatBRL(toleranciaReais)} | Faturamento de referência: {formatBRL(faturamentoRef)}.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-500 uppercase mb-1">
                <Users className="w-3.5 h-3.5" /> Carteiras Analisadas
              </div>
              <p className="text-2xl font-bold text-slate-900">{porPlano.length + porSegmento.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-500 uppercase mb-1">
                <DollarSign className="w-3.5 h-3.5" /> Impacto Total
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatBRL([...porPlano, ...porSegmento].reduce((a, d) => a + d.total, 0))}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-500 uppercase mb-1">
                <Percent className="w-3.5 h-3.5" /> Risco sobre Faturamento
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {faturamentoRef > 0
                  ? (([...porPlano, ...porSegmento].reduce((a, d) => a + d.total, 0) / faturamentoRef) * 100).toFixed(1)
                  : '0'}%
              </p>
            </div>
          </div>

          {/* Cards de risco por plano */}
          <p className="text-sm font-semibold text-slate-700 mb-3">Risco por Plano</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            {porPlano.map(d => {
              const risco = classificarRisco(d.total, toleranciaReais);
              const cores = RISCO_CORES[risco.cor];
              return (
                <div key={d.key} className={`p-4 rounded-xl border ${cores.card}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900">{d.key}</span>
                    <Badge className={cores.badge}>{risco.label}</Badge>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between"><span>Casos</span><span className="font-medium">{d.casos}</span></div>
                    <div className="flex justify-between"><span>Impacto total</span><span className="font-medium text-red-600">{formatBRL(d.total)}</span></div>
                    <div className="flex justify-between"><span>Faturamento/ano</span><span className="font-medium">{formatBRL(d.faturamento)}</span></div>
                    <div className="flex justify-between"><span>Churns</span><span className="font-medium">{d.churns}</span></div>
                    {d.faturamento > 0 && (
                      <div className="flex justify-between"><span>% sobre faturam.</span>
                        <span className="font-medium text-red-600">{((d.total / d.faturamento) * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabela por segmento */}
          <p className="text-sm font-semibold text-slate-700 mb-3">Risco por Segmento</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-y text-xs text-slate-500 uppercase">
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
                    <tr key={d.key} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-medium">{d.key}</td>
                      <td className="p-3 text-center">{d.casos}</td>
                      <td className="p-3 text-right font-bold text-red-600">{formatBRL(d.total)}</td>
                      <td className="p-3 text-right text-slate-600">{formatBRL(d.faturamento)}</td>
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