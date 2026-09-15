import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, ShieldAlert, Brain, Layers, BarChart3 } from 'lucide-react';
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
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  slate: 'bg-slate-100 text-slate-700',
};

export default function InteligenciaFinanceiraJornada({ tratativas, colaboradores, params }) {
  const [subDim, setSubDim] = useState('plano');

  const p = { ...PARAMETROS_PADRAO, ...params };
  const colabMap = useMemo(() =>
    (colaboradores || []).reduce((acc, c) => { acc[c.id] = c; return acc; }, {}),
    [colaboradores]
  );

  // Impacto total consolidado
  const impactoTotal = useMemo(() => {
    let total = 0, devolvido = 0, custoOp = 0, perdaRec = 0, riscoRep = 0, retrab = 0, faturam = 0;
    tratativas.forEach(t => {
      const imp = calcularImpactoTotal(t, colabMap[t.agente_responsavel_id], p);
      total += imp.total;
      devolvido += imp.valorDevolvido;
      custoOp += imp.custoOperacional;
      perdaRec += imp.perdaReceita;
      riscoRep += imp.riscoReputacional;
      retrab += imp.custoRetrabalho;
      faturam += calcularReceitaAnualEquivalente(t);
    });
    return { total, devolvido, custoOp, perdaRec, riscoRep, retrab, faturam };
  }, [tratativas, colabMap, p]);

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
            <DollarSign className="w-5 h-5 text-red-600" />
            Impacto Financeiro Total Consolidado
          </CardTitle>
          <p className="text-xs text-slate-500">
            Fórmula: Valor Devolvido + Custo Operacional (horas × custo/hora × encargos) + Perda de Receita + Risco Reputacional + Retrabalho.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs font-semibold text-red-600 uppercase">Impacto Total</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{formatBRL(impactoTotal.total)}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase">Faturamento Envolvido</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatBRL(impactoTotal.faturam)}</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs font-semibold text-amber-600 uppercase">% sobre Faturamento Ref.</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{pctFaturamento.toFixed(1)}%</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase">Tolerância</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatBRL(toleranciaReais)}</p>
              <Badge className={`mt-1 ${RISCO_BADGE_CORES[riscoGeral.cor] || RISCO_BADGE_CORES.slate}`}>Risco {riscoGeral.label}</Badge>
            </div>
          </div>

          {/* Decomposição do impacto */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <p className="text-[11px] text-slate-500 uppercase">Valor Devolvido</p>
              <p className="text-lg font-bold text-red-600">{formatBRL(impactoTotal.devolvido)}</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <p className="text-[11px] text-slate-500 uppercase">Custo Operacional</p>
              <p className="text-lg font-bold text-orange-600">{formatBRL(impactoTotal.custoOp)}</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <p className="text-[11px] text-slate-500 uppercase">Perda de Receita</p>
              <p className="text-lg font-bold text-pink-600">{formatBRL(impactoTotal.perdaRec)}</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <p className="text-[11px] text-slate-500 uppercase">Risco Reputacional</p>
              <p className="text-lg font-bold text-purple-600">{formatBRL(impactoTotal.riscoRep)}</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <p className="text-[11px] text-slate-500 uppercase">Retrabalho</p>
              <p className="text-lg font-bold text-amber-600">{formatBRL(impactoTotal.retrab)}</p>
            </div>
          </div>

          {/* Benchmarks */}
          <div className="mt-5 pt-4 border-t">
            <p className="text-sm font-semibold text-slate-700 mb-3">Comparação com Benchmarks de Mercado</p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase">{BENCHMARKS_GLOBAIS.mckinsey.label}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{BENCHMARKS_GLOBAIS.mckinsey.min}%–{BENCHMARKS_GLOBAIS.mckinsey.max}%</p>
                <p className="text-[11px] text-slate-500 mt-1">{BENCHMARKS_GLOBAIS.mckinsey.descricao}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase">{BENCHMARKS_GLOBAIS.gartner.label}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{BENCHMARKS_GLOBAIS.gartner.valor}%</p>
                <p className="text-[11px] text-slate-500 mt-1">{BENCHMARKS_GLOBAIS.gartner.descricao}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase">{BENCHMARKS_GLOBAIS.copq.label}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{BENCHMARKS_GLOBAIS.copq.min}%–{BENCHMARKS_GLOBAIS.copq.max}%</p>
                <p className="text-[11px] text-slate-500 mt-1">{BENCHMARKS_GLOBAIS.copq.descricao}</p>
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
                  subDim === key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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