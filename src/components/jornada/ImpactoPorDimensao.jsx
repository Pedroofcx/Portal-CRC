import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Search } from 'lucide-react';
import { agruparImpactoPorDimensao, classificarRisco, calcularToleranciaReais } from './inteligenciaFinanceira';
import { formatBRL } from '@/components/utils/helpers';

const RISCO_CORES = {
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  slate: 'bg-slate-100 text-slate-700',
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
        <CardContent className="py-10 text-center text-slate-500">
          Nenhum dado disponível para esta dimensão.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Impacto Financeiro por {dimLabel}
        </CardTitle>
        <p className="text-xs text-slate-500">
          Cruza devoluções + custo operacional + perda de receita + risco reputacional + retrabalho.
          Tolerância da empresa: {formatBRL(toleranciaReais)}.
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={`Buscar por ${dimLabel.toLowerCase()}...`}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 max-w-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-y">
              <tr className="text-left text-xs text-slate-500 uppercase">
                <th className="p-3">{dimLabel}</th>
                <th className="p-3 text-center">Casos</th>
                <th className="p-3 text-right">Devolvido</th>
                <th className="p-3 text-right">Custo Operac.</th>
                <th className="p-3 text-right">Perda Receita</th>
                <th className="p-3 text-right">Risco Reput.</th>
                <th className="p-3 text-right">Retrabalho</th>
                <th className="p-3 text-right">Faturam. Ano</th>
                <th className="p-3 text-right">Impacto Total</th>
                <th className="p-3 text-center">Risco</th>
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.map((d) => {
                const risco = classificarRisco(d.total, toleranciaReais);
                return (
                  <tr key={d.key} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-900">{d.key}</td>
                    <td className="p-3 text-center">{d.casos}</td>
                    <td className="p-3 text-right text-red-600">{formatBRL(d.valorDevolvido)}</td>
                    <td className="p-3 text-right text-orange-600">{formatBRL(d.custoOperacional)}</td>
                    <td className="p-3 text-right text-pink-600">{formatBRL(d.perdaReceita)}</td>
                    <td className="p-3 text-right text-purple-600">{formatBRL(d.riscoReputacional)}</td>
                    <td className="p-3 text-right text-amber-600">{formatBRL(d.custoRetrabalho)}</td>
                    <td className="p-3 text-right text-slate-600">{formatBRL(d.faturamento)}</td>
                    <td className="p-3 text-right font-bold text-slate-900">{formatBRL(d.total)}</td>
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
            <tfoot className="bg-slate-100 font-bold">
              <tr>
                <td className="p-3">TOTAL</td>
                <td className="p-3 text-center">{dadosFiltrados.reduce((a, d) => a + d.casos, 0)}</td>
                <td className="p-3 text-right text-red-600">{formatBRL(dadosFiltrados.reduce((a, d) => a + d.valorDevolvido, 0))}</td>
                <td className="p-3 text-right text-orange-600">{formatBRL(dadosFiltrados.reduce((a, d) => a + d.custoOperacional, 0))}</td>
                <td className="p-3 text-right text-pink-600">{formatBRL(dadosFiltrados.reduce((a, d) => a + d.perdaReceita, 0))}</td>
                <td className="p-3 text-right text-purple-600">{formatBRL(dadosFiltrados.reduce((a, d) => a + d.riscoReputacional, 0))}</td>
                <td className="p-3 text-right text-amber-600">{formatBRL(dadosFiltrados.reduce((a, d) => a + d.custoRetrabalho, 0))}</td>
                <td className="p-3 text-right text-slate-600">{formatBRL(dadosFiltrados.reduce((a, d) => a + d.faturamento, 0))}</td>
                <td className="p-3 text-right text-slate-900">{formatBRL(dadosFiltrados.reduce((a, d) => a + d.total, 0))}</td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}