import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { agruparImpactoPorDimensao, classificarRisco, calcularToleranciaReais } from './inteligenciaFinanceira';
import { formatBRL } from '@/components/utils/helpers';

const RISCO_CORES = {
  green: 'bg-success-soft text-success',
  amber: 'bg-warning-soft text-warning',
  orange: 'bg-critical-soft text-critical',
  red: 'bg-destructive/10 text-destructive',
  slate: 'bg-muted text-foreground',
};

export default function ImpactoPorDimensao({ tratativas, colaboradores, params, dimKey, dimLabel, labelMap }) {
  const [busca, setBusca] = useState('');

  const dados = useMemo(() =>
    agruparImpactoPorDimensao(tratativas, colaboradores, params, dimKey, labelMap),
    [tratativas, colaboradores, params, dimKey, labelMap]
  );

  const toleranciaReais = calcularToleranciaReais(params);
  const dadosFiltrados = busca
    ? dados.filter(d => d.key.toLowerCase().includes(busca.toLowerCase()))
    : dados;

  if (dados.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhum dado disponível para esta dimensão.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Impacto Financeiro por {dimLabel}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Impacto = devoluções + custo operacional oficial + perda de receita. Casos de risco reputacional contados à parte.
          Tolerância da empresa: {formatBRL(toleranciaReais)}.
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Buscar por ${dimLabel.toLowerCase()}...`}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 max-w-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted border-y">
              <tr className="text-left text-xs text-muted-foreground uppercase">
                <th className="p-3">{dimLabel}</th>
                <th className="p-3 text-center">Casos</th>
                <th className="p-3 text-right">Devolvido</th>
                <th className="p-3 text-right">Custo Operac.</th>
                <th className="p-3 text-right">Perda Receita</th>
                <th className="p-3 text-center">Casos de risco</th>
                <th className="p-3 text-right">Faturam. Ano</th>
                <th className="p-3 text-right">Impacto Total</th>
                <th className="p-3 text-center">Risco</th>
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.map((d) => {
                const risco = classificarRisco(d.total, toleranciaReais);
                return (
                  <tr key={d.key} className="border-b hover:bg-muted">
                    <td className="p-3 font-medium text-foreground">{d.key}</td>
                    <td className="p-3 text-center">{d.casos}</td>
                    <td className="p-3 text-right text-destructive">{formatBRL(d.valorDevolvido)}</td>
                    <td className="p-3 text-right text-critical">{formatBRL(d.custoOperacional)}</td>
                    <td className="p-3 text-right text-primary">{formatBRL(d.perdaReceita)}</td>
                    <td className="p-3 text-center">{d.casosDeRisco}</td>
                    <td className="p-3 text-right text-muted-foreground">{formatBRL(d.faturamento)}</td>
                    <td className="p-3 text-right font-bold text-foreground">{formatBRL(d.total)}</td>
                    <td className="p-3 text-center">
                      <Badge className={RISCO_CORES[risco.cor]}>
                        {risco.label}
                        {risco.pct !== undefined ? ` ${risco.pct.toFixed(0)}%` : ''}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted font-bold">
              <tr>
                <td className="p-3">TOTAL</td>
                <td className="p-3 text-center">{dadosFiltrados.reduce((a, d) => a + d.casos, 0)}</td>
                <td className="p-3 text-right text-destructive">{formatBRL(dadosFiltrados.reduce((a, d) => a + d.valorDevolvido, 0))}</td>
                <td className="p-3 text-right text-critical">{formatBRL(dadosFiltrados.reduce((a, d) => a + d.custoOperacional, 0))}</td>
                <td className="p-3 text-right text-primary">{formatBRL(dadosFiltrados.reduce((a, d) => a + d.perdaReceita, 0))}</td>
                <td className="p-3 text-center">{dadosFiltrados.reduce((a, d) => a + d.casosDeRisco, 0)}</td>
                <td className="p-3 text-right text-muted-foreground">{formatBRL(dadosFiltrados.reduce((a, d) => a + d.faturamento, 0))}</td>
                <td className="p-3 text-right text-foreground">{formatBRL(dadosFiltrados.reduce((a, d) => a + d.total, 0))}</td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}