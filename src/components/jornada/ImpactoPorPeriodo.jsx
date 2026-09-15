import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { agruparImpactoPorMes, projetarProximosMeses, calcularToleranciaReais } from './inteligenciaFinanceira';
import { formatBRL } from '@/components/utils/helpers';

export default function ImpactoPorPeriodo({ tratativas, colaboradores, params }) {
  const dadosMes = useMemo(() =>
    agruparImpactoPorMes(tratativas, colaboradores, params),
    [tratativas, colaboradores, params]
  );

  const projecoes = useMemo(() => projetarProximosMeses(dadosMes, 3), [dadosMes]);
  const toleranciaReais = calcularToleranciaReais(params);

  const dadosGrafico = useMemo(() => {
    const reais = dadosMes.map(d => ({ ...d, tipo: 'Real' }));
    const proj = projecoes.map(d => ({ ...d, tipo: 'Projeção' }));
    return [...reais, ...proj];
  }, [dadosMes, projecoes]);

  const totalReal = dadosMes.reduce((a, d) => a + d.total, 0);
  const totalProj = projecoes.reduce((a, d) => a + d.total, 0);

  // Tendência (crescimento ou redução)
  let tendencia = 0;
  if (dadosMes.length >= 2) {
    const ultimo = dadosMes[dadosMes.length - 1].total;
    const penultimo = dadosMes[dadosMes.length - 2].total;
    if (penultimo > 0) tendencia = ((ultimo - penultimo) / penultimo) * 100;
  }

  if (dadosMes.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhum dado disponível para análise temporal.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
              <Calendar className="w-3.5 h-3.5" /> Impacto Real (histórico)
            </div>
            <p className="text-2xl font-bold text-foreground">{formatBRL(totalReal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{dadosMes.length} mês(es) analisado(s)</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
              <TrendingUp className="w-3.5 h-3.5" /> Projeção (3 meses)
            </div>
            <p className="text-2xl font-bold text-critical">{formatBRL(totalProj)}</p>
            <p className="text-xs text-muted-foreground mt-1">Baseado em média móvel + tendência</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
              {tendencia >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-destructive" /> : <TrendingDown className="w-3.5 h-3.5 text-success" />}
              Tendência Mensal
            </div>
            <p className={`text-2xl font-bold ${tendencia >= 0 ? 'text-destructive' : 'text-success'}`}>
              {tendencia >= 0 ? '+' : ''}{tendencia.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">{tendencia >= 0 ? 'Crescimento de perdas' : 'Redução de perdas'}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
              <Calendar className="w-3.5 h-3.5" /> Tolerância Mensal
            </div>
            <p className="text-2xl font-bold text-foreground">{formatBRL(toleranciaReais / 12)}</p>
            <p className="text-xs text-muted-foreground mt-1">1/12 da tolerância anual</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de barras + projeção */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5 text-primary" />
            Tendência de Impacto e Projeção
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Barras azuis = impacto real por mês | Linha tracejada = projeção para os próximos 3 meses | Linha vermelha = tolerância mensal.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatBRL(v)} />
              <Legend />
              <Bar dataKey="total" name="Impacto Real" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              {toleranciaReais > 0 && (
                <ReferenceLine y={toleranciaReais / 12} stroke="#dc2626" strokeDasharray="6 6"
                  label={{ value: 'Tol. mensal', position: 'insideTopRight', fill: '#dc2626', fontSize: 10 }} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela detalhada por mês */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Detalhamento Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-y text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="p-3 text-left">Mês</th>
                  <th className="p-3 text-center">Casos</th>
                  <th className="p-3 text-right">Devolvido</th>
                  <th className="p-3 text-right">Impacto Total</th>
                  <th className="p-3 text-center">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {dadosGrafico.map((d, i) => (
                  <tr key={i} className="border-b hover:bg-muted">
                    <td className="p-3 font-medium">{d.mes}</td>
                    <td className="p-3 text-center">{d.casos}</td>
                    <td className="p-3 text-right text-destructive">{formatBRL(d.valorDevolvido || 0)}</td>
                    <td className="p-3 text-right font-bold text-foreground">{formatBRL(d.total)}</td>
                    <td className="p-3 text-center">
                      <Badge variant={d.tipo === 'Projeção' ? 'outline' : 'default'}
                        className={d.tipo === 'Projeção' ? 'border-orange-300 text-critical' : ''}>
                        {d.tipo}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}