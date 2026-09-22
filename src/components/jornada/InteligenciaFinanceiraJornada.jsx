import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, ShieldAlert, Brain, Layers } from 'lucide-react';
import ImpactoPorDimensao from './ImpactoPorDimensao';
import ImpactoPorPeriodo from './ImpactoPorPeriodo';
import PerguntasEstrategicas from './PerguntasEstrategicas';
import RiscoCarteira from './RiscoCarteira';
import {
  calcularImpactoTotal,
  calcularToleranciaReais,
  classificarRisco,
  BENCHMARKS_GLOBAIS,
  PARAMETROS_PADRAO,
} from './inteligenciaFinanceira';
import { formatBRL, calcularReceitaAnualEquivalente } from '@/components/utils/helpers';

const tipoTratativaLabels = {
  reclamacao_interna: 'Reclamação Interna',
  reclame_aqui: 'Reclame Aqui',
  google_meu_negocio: 'Google Meu Negócio',
  contestacao: 'Contestação',
};

const RISCO_BADGE_CORES = {
  green: 'bg-success-soft text-success',
  amber: 'bg-warning-soft text-warning',
  orange: 'bg-critical-soft text-critical',
  red: 'bg-destructive/10 text-destructive',
  slate: 'bg-muted text-foreground',
};

export default function InteligenciaFinanceiraJornada({ tratativas, colaboradores, params }) {
  const [subDim, setSubDim] = useState('plano');

  const p = { ...PARAMETROS_PADRAO, ...params };

  // Impacto total consolidado
  const impactoTotal = useMemo(() => {
    let total = 0, devolvido = 0, custoOp = 0, perdaRec = 0, casosRisco = 0, faturam = 0;
    tratativas.forEach(t => {
      const imp = calcularImpactoTotal(t);
      total += imp.total;
      devolvido += imp.valorDevolvido;
      custoOp += imp.custoOperacional;
      perdaRec += imp.perdaReceita;
      casosRisco += imp.casoDeRisco;
      faturam += calcularReceitaAnualEquivalente(t);
    });
    return { total, devolvido, custoOp, perdaRec, casosRisco, faturam };
  }, [tratativas]);

  const toleranciaReais = calcularToleranciaReais(p);
  const riscoGeral = classificarRisco(impactoTotal.total, toleranciaReais);
  const pctFaturamento = p.faturamentoReferencia > 0
    ? (impactoTotal.total / parseFloat(p.faturamentoReferencia)) * 100
    : 0;

  // Configuração das sub-dimensões
  const dimConfig = {
    plano: { dimKey: 'plano_cliente', label: 'Plano' },
    agente: { dimKey: 'agente_responsavel_nome', label: 'Agente' },
    segmento: { dimKey: 'segmento_cliente', label: 'Segmento' },
    produto: { dimKey: 'motivo_nome', label: 'Produto/Motivo' },
    tipo: { dimKey: 'tipo_tratativa', label: 'Tipo de Tratativa', labelMap: tipoTratativaLabels },
  };
  const dimAtual = dimConfig[subDim];

  return (
    <div className="space-y-5">
      {/* ── Painel de Impacto Total ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Impacto Financeiro Total Consolidado
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Impacto = valor devolvido ao cliente + custo operacional (o oficial, dividido pela carga simultânea) + perda de receita informada. Casos de risco reputacional são contados à parte, sem valor em R$.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/25">
              <p className="text-xs font-semibold text-destructive uppercase">Impacto Total</p>
              <p className="text-2xl font-bold text-destructive mt-1">{formatBRL(impactoTotal.total)}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Faturamento Envolvido</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatBRL(impactoTotal.faturam)}</p>
            </div>
            <div className="p-4 rounded-lg bg-warning-soft border border-warning/25">
              <p className="text-xs font-semibold text-warning uppercase">% sobre Faturamento Ref.</p>
              <p className="text-2xl font-bold text-warning mt-1">{pctFaturamento.toFixed(1)}%</p>
            </div>
            <div className="p-4 rounded-lg bg-muted border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Tolerância</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatBRL(toleranciaReais)}</p>
              <Badge className={`mt-1 ${RISCO_BADGE_CORES[riscoGeral.cor] || RISCO_BADGE_CORES.slate}`}>Risco {riscoGeral.label}</Badge>
            </div>
          </div>

          {/* Decomposição do impacto */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-[11px] text-muted-foreground uppercase">Valor Devolvido</p>
              <p className="text-lg font-bold text-destructive">{formatBRL(impactoTotal.devolvido)}</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-[11px] text-muted-foreground uppercase">Custo Operacional</p>
              <p className="text-lg font-bold text-critical">{formatBRL(impactoTotal.custoOp)}</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-[11px] text-muted-foreground uppercase">Perda de Receita</p>
              <p className="text-lg font-bold text-primary">{formatBRL(impactoTotal.perdaRec)}</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-[11px] text-muted-foreground uppercase">Casos de risco reputacional</p>
              <p className="text-lg font-bold text-foreground">{impactoTotal.casosRisco}</p>
            </div>
          </div>

          {/* Benchmarks */}
          <div className="mt-5 pt-4 border-t">
            <p className="text-sm font-semibold text-foreground mb-3">Comparação com Benchmarks de Mercado</p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted border border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase">{BENCHMARKS_GLOBAIS.mckinsey.label}</p>
                <p className="text-lg font-bold text-foreground mt-1">{BENCHMARKS_GLOBAIS.mckinsey.min}%–{BENCHMARKS_GLOBAIS.mckinsey.max}%</p>
                <p className="text-[11px] text-muted-foreground mt-1">{BENCHMARKS_GLOBAIS.mckinsey.descricao}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted border border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase">{BENCHMARKS_GLOBAIS.gartner.label}</p>
                <p className="text-lg font-bold text-foreground mt-1">{BENCHMARKS_GLOBAIS.gartner.valor}%</p>
                <p className="text-[11px] text-muted-foreground mt-1">{BENCHMARKS_GLOBAIS.gartner.descricao}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted border border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase">{BENCHMARKS_GLOBAIS.copq.label}</p>
                <p className="text-lg font-bold text-foreground mt-1">{BENCHMARKS_GLOBAIS.copq.min}%–{BENCHMARKS_GLOBAIS.copq.max}%</p>
                <p className="text-[11px] text-muted-foreground mt-1">{BENCHMARKS_GLOBAIS.copq.descricao}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs de análise ── */}
      <Tabs defaultValue="dimensao" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="dimensao" className="text-xs sm:text-sm">
            <Layers className="w-4 h-4 mr-1.5" /> Por Dimensão
          </TabsTrigger>
          <TabsTrigger value="tendencia" className="text-xs sm:text-sm">
            <TrendingUp className="w-4 h-4 mr-1.5" /> Tendência
          </TabsTrigger>
          <TabsTrigger value="risco" className="text-xs sm:text-sm">
            <ShieldAlert className="w-4 h-4 mr-1.5" /> Risco por Carteira
          </TabsTrigger>
          <TabsTrigger value="estrategico" className="text-xs sm:text-sm">
            <Brain className="w-4 h-4 mr-1.5" /> Perguntas Estratégicas
          </TabsTrigger>
        </TabsList>

        {/* Por Dimensão */}
        <TabsContent value="dimensao" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(dimConfig).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setSubDim(key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  subDim === key ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
          <ImpactoPorDimensao
            tratativas={tratativas}
            colaboradores={colaboradores}
            params={p}
            dimKey={dimAtual.dimKey}
            dimLabel={dimAtual.label}
            labelMap={dimAtual.labelMap}
          />
        </TabsContent>

        {/* Tendência */}
        <TabsContent value="tendencia">
          <ImpactoPorPeriodo tratativas={tratativas} colaboradores={colaboradores} params={p} />
        </TabsContent>

        {/* Risco por Carteira */}
        <TabsContent value="risco">
          <RiscoCarteira tratativas={tratativas} colaboradores={colaboradores} params={p} />
        </TabsContent>

        {/* Perguntas Estratégicas */}
        <TabsContent value="estrategico">
          <PerguntasEstrategicas tratativas={tratativas} colaboradores={colaboradores} params={p} />
        </TabsContent>
      </Tabs>
    </div>
  );
}