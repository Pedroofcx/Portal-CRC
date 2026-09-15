import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingDown, HeartCrack } from 'lucide-react';
import { calcularImpactoFinanceiroDireto, formatBRL } from '@/components/utils/helpers';

const isEncerradaEfetiva = (t) => !t.excluida && (t.status === 'encerrada' || t.status === 'aguardando_confirmacao_reabertura');

const BENCHMARKS = {
  mckinsey: { min: 20, max: 30, label: 'McKinsey (Desperdício Operacional)' },
  gartner: { valor: 40, label: 'Gartner (Tempo em Falhas Evitáveis)' },
  copq: { min: 5, max: 20, label: 'COPQ Global (Custo de Falhas)' },
};

export default function GraficoBenchmarkingJornada({ tratativas, etapasOrdenadas, custoHoraEquipe, toleranciaTipo, toleranciaValor, faturamentoReferencia }) {
  const dadosPorEtapa = useMemo(() => {
    const mapa = {};
    tratativas.filter(isEncerradaEfetiva).forEach(t => {
      const etapa = t.etapa_jornada_nome || 'Não definida';
      const impacto = calcularImpactoFinanceiroDireto(t, custoHoraEquipe);
      mapa[etapa] = (mapa[etapa] || 0) + impacto;
    });

    const ordem = etapasOrdenadas.length > 0 ? etapasOrdenadas : Object.keys(mapa);
    let acumulado = 0;
    return ordem.filter(e => mapa[e] !== undefined).map(etapa => {
      acumulado += mapa[etapa] || 0;
      return { etapa, impacto: mapa[etapa] || 0, acumulado };
    });
  }, [tratativas, etapasOrdenadas, custoHoraEquipe]);

  const totalImpacto = dadosPorEtapa.length > 0 ? dadosPorEtapa[dadosPorEtapa.length - 1].acumulado : 0;

  const toleranciaEmReais = toleranciaTipo === 'percentual'
    ? (parseFloat(faturamentoReferencia) || 0) * (parseFloat(toleranciaValor) || 0) / 100
    : parseFloat(toleranciaValor) || 0;

  const percentualSobreFaturamento = faturamentoReferencia > 0
    ? (totalImpacto / parseFloat(faturamentoReferencia)) * 100
    : null;

  const tratativasComChurn = tratativas.filter(t => t.teve_churn);
  const perdaReceitaChurn = tratativasComChurn.reduce((acc, t) => acc + (parseFloat(t.valor_perda_receita) || 0), 0);

  if (dadosPorEtapa.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhum dado financeiro disponível para o período selecionado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="w-5 h-5 text-destructive" />
            Impacto Financeiro Acumulado x Tolerância da Empresa
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Curva de impacto real (devolução + custo de horas) por etapa da jornada, comparada ao limite de tolerância definido.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={dadosPorEtapa}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="etapa" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(1)}k`} />
              <Tooltip formatter={(v) => formatBRL(v)} />
              <Legend />
              <Line type="monotone" dataKey="acumulado" stroke="hsl(var(--chart-1))" strokeWidth={3} name="Impacto Real Acumulado" dot={{ r: 4 }} />
              {toleranciaEmReais > 0 && (
                <ReferenceLine
                  y={toleranciaEmReais}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="6 6"
                  label={{ value: `Tolerância (${formatBRL(toleranciaEmReais)})`, position: 'insideTopRight', fill: 'hsl(var(--destructive))', fontSize: 11 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Comparação com Benchmarks Globais de Mercado</CardTitle>
          <p className="text-xs text-muted-foreground">
            Referências fixas de mercado comparadas ao nosso impacto total do período ({formatBRL(totalImpacto)}
            {percentualSobreFaturamento !== null ? ` — ${percentualSobreFaturamento.toFixed(1)}% do faturamento de referência` : ''}).
          </p>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase">{BENCHMARKS.mckinsey.label}</p>
            <p className="text-lg font-bold text-foreground mt-1">{BENCHMARKS.mckinsey.min}%–{BENCHMARKS.mckinsey.max}%</p>
            <p className="text-[11px] text-muted-foreground mt-1">Média de perda por processos ineficientes e retrabalho.</p>
          </div>
          <div className="p-4 rounded-lg bg-muted border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase">{BENCHMARKS.gartner.label}</p>
            <p className="text-lg font-bold text-foreground mt-1">{BENCHMARKS.gartner.valor}%</p>
            <p className="text-[11px] text-muted-foreground mt-1">Limite de tempo das equipes gasto resolvendo falhas evitáveis.</p>
          </div>
          <div className="p-4 rounded-lg bg-muted border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase">{BENCHMARKS.copq.label}</p>
            <p className="text-lg font-bold text-foreground mt-1">{BENCHMARKS.copq.min}%–{BENCHMARKS.copq.max}%</p>
            <p className="text-[11px] text-muted-foreground mt-1">Custo total de falhas/devoluções sobre a faturação de mercado.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartCrack className="w-5 h-5 text-primary" />
            Taxa de Churn (Cancelamento)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tratativasComChurn.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Badge variant="outline" className="mb-2">Estrutura pronta</Badge>
              <p className="text-sm">Aguardando integração de dados de Churn.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Benchmark de referência (Bain & Company / CustomerGauge): churn saudável entre 4,6% e 10% ao ano.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tratativas com churn no período</span>
                <Badge className="bg-info-soft text-primary">{tratativasComChurn.length}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Receita perdida estimada</span>
                <span className="font-semibold text-foreground">{formatBRL(perdaReceitaChurn)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-2 border-t">
                Benchmark de mercado (Bain & Company / CustomerGauge): churn saudável entre 4,6% e 10% ao ano. Cálculo de taxa percentual dependerá da integração com a base total de clientes ativos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}