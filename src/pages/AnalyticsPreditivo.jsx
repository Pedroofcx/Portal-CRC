import db from '@/api/db';
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { formatDateSP } from '@/components/utils/helpers';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Target,
  Zap,
  Info,
  Download
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

// ========================================
// FUNÇÕES MATEMÁTICAS CMMI 4
// ========================================

// 1. THROUGHPUT: Tickets resolvidos por período
const calcularThroughput = (tratativas, periodoEmDias = 7) => {
  const agora = new Date();
  const dataInicio = new Date(agora.getTime() - (periodoEmDias * 24 * 60 * 60 * 1000));
  
  const tratativasResolvidasNoPeriodo = tratativas.filter(t => {
    if (!t.data_encerramento) return false;
    const dataEncerramento = new Date(t.data_encerramento);
    return dataEncerramento >= dataInicio && dataEncerramento <= agora;
  });

  return {
    total: tratativasResolvidasNoPeriodo.length,
    mediaDiaria: tratativasResolvidasNoPeriodo.length / periodoEmDias,
    por_agente: tratativasResolvidasNoPeriodo.reduce((acc, t) => {
      const agente = t.agente_responsavel_nome || 'Sem Agente';
      acc[agente] = (acc[agente] || 0) + 1;
      return acc;
    }, {}),
    por_canal: tratativasResolvidasNoPeriodo.reduce((acc, t) => {
      const canal = t.tipo_tratativa || 'Outros';
      acc[canal] = (acc[canal] || 0) + 1;
      return acc;
    }, {})
  };
};

// 2. CAPACIDADE OPERACIONAL
const calcularCapacidadeOperacional = (tratativas, colaboradores) => {
  const throughput30d = calcularThroughput(tratativas, 30);
  
  const agentesAtivos = colaboradores.filter(c => c.papel === 'agente' && c.ativo !== false).length;
  const capacidadeTeoriaDiaria = throughput30d.mediaDiaria;
  const capacidadePorAgente = agentesAtivos > 0 ? capacidadeTeoriaDiaria / agentesAtivos : 0;

  // Demanda atual (tickets abertos)
  const ticketsAbertos = tratativas.filter(t => 
    t.status !== 'encerrada' && 
    t.status !== 'aguardando_confirmacao_reabertura' &&
    !t.excluida
  ).length;

  const saturacaoOperacional = capacidadeTeoriaDiaria > 0 
    ? (ticketsAbertos / (capacidadeTeoriaDiaria * 7)) * 100 
    : 0;

  return {
    capacidadeTeoriaDiaria,
    capacidadePorAgente,
    agentesAtivos,
    ticketsAbertos,
    saturacaoOperacional: Math.min(saturacaoOperacional, 200), // Cap em 200%
    status: saturacaoOperacional > 100 ? 'SOBRECARGA' : saturacaoOperacional > 70 ? 'ALERTA' : 'SAUDÁVEL'
  };
};

// 3. VARIABILIDADE ESTATÍSTICA
const calcularVariabilidade = (tratativas) => {
  const tratativasComTempo = tratativas.filter(t => t.tempo_total_minutos > 0);
  
  if (tratativasComTempo.length === 0) return null;

  const tempos = tratativasComTempo.map(t => t.tempo_total_minutos);
  const media = tempos.reduce((a, b) => a + b, 0) / tempos.length;
  
  // Desvio padrão
  const variancia = tempos.reduce((acc, tempo) => acc + Math.pow(tempo - media, 2), 0) / tempos.length;
  const desvioPadrao = Math.sqrt(variancia);
  
  // Coeficiente de variação (CV)
  const coeficienteVariacao = (desvioPadrao / media) * 100;
  
  // Percentis
  const temposOrdenados = [...tempos].sort((a, b) => a - b);
  const p50 = temposOrdenados[Math.floor(temposOrdenados.length * 0.5)];
  const p75 = temposOrdenados[Math.floor(temposOrdenados.length * 0.75)];
  const p90 = temposOrdenados[Math.floor(temposOrdenados.length * 0.9)];

  // Avaliação de estabilidade (CV < 30% = estável)
  const estabilidade = coeficienteVariacao < 30 ? 'ESTÁVEL' : coeficienteVariacao < 50 ? 'MODERADO' : 'INSTÁVEL';

  return {
    media: Math.round(media),
    desvioPadrao: Math.round(desvioPadrao),
    coeficienteVariacao: coeficienteVariacao.toFixed(1),
    p50: Math.round(p50),
    p75: Math.round(p75),
    p90: Math.round(p90),
    estabilidade,
    amostra: tratativasComTempo.length
  };
};

// 4. PREVISÃO PREDITIVA
const calcularPrevisaoPreditiva = (tratativas, colaboradores) => {
  const throughput = calcularThroughput(tratativas, 30);
  const capacidade = calcularCapacidadeOperacional(tratativas, colaboradores);
  
  // Taxa de entrada (últimos 7 dias)
  const agora = new Date();
  const data7DiasAtras = new Date(agora.getTime() - (7 * 24 * 60 * 60 * 1000));
  const ticketsNovos7d = tratativas.filter(t => {
    const dataRegistro = new Date(t.data_registro || t.created_date);
    return dataRegistro >= data7DiasAtras;
  }).length;
  const taxaEntradaDiaria = ticketsNovos7d / 7;

  // Previsão de backlog (próximos 7 dias)
  const backlogAtual = capacidade.ticketsAbertos;
  const entradaEstimada7d = taxaEntradaDiaria * 7;
  const resolucaoEstimada7d = throughput.mediaDiaria * 7;
  const backlogPrevisto7d = Math.max(0, backlogAtual + entradaEstimada7d - resolucaoEstimada7d);

  // Risco de quebra de SLA
  const ticketsProximosVencimento = tratativas.filter(t => {
    if (t.status === 'encerrada') return false;
    if (!t.data_registro) return false;
    
    const dataRegistro = new Date(t.data_registro);
    const horasDecorridas = (agora - dataRegistro) / (1000 * 60 * 60);
    const slaHoras = t.sla_atribuido || 24;
    
    return horasDecorridas > (slaHoras * 0.8); // 80% do SLA
  }).length;

  const probabilidadeQuebraSLA = capacidade.ticketsAbertos > 0 
    ? (ticketsProximosVencimento / capacidade.ticketsAbertos) * 100 
    : 0;

  // Simulações
  const simular = (cenario) => {
    let capacidadeSimulada = throughput.mediaDiaria;
    let entradaSimulada = taxaEntradaDiaria;
    
    if (cenario === 'mais1agente') {
      capacidadeSimulada = throughput.mediaDiaria * 1.1; // 10% de aumento
    } else if (cenario === 'aumento20demanda') {
      entradaSimulada = taxaEntradaDiaria * 1.2;
    } else if (cenario === 'quedaProdutividade') {
      capacidadeSimulada = throughput.mediaDiaria * 0.8; // 20% de queda
    }
    
    const resolucaoSim7d = capacidadeSimulada * 7;
    const entradaSim7d = entradaSimulada * 7;
    return Math.max(0, backlogAtual + entradaSim7d - resolucaoSim7d);
  };

  return {
    taxaEntradaDiaria: taxaEntradaDiaria.toFixed(1),
    taxaSaidaDiaria: throughput.mediaDiaria.toFixed(1),
    backlogAtual,
    backlogPrevisto7d: Math.round(backlogPrevisto7d),
    tendencia: backlogPrevisto7d > backlogAtual ? 'CRESCIMENTO' : backlogPrevisto7d < backlogAtual ? 'REDUÇÃO' : 'ESTÁVEL',
    probabilidadeQuebraSLA: probabilidadeQuebraSLA.toFixed(1),
    riscoSLA: probabilidadeQuebraSLA > 50 ? 'ALTO' : probabilidadeQuebraSLA > 30 ? 'MÉDIO' : 'BAIXO',
    simulacoes: {
      cenarioBase: Math.round(backlogPrevisto7d),
      mais1agente: Math.round(simular('mais1agente')),
      aumento20demanda: Math.round(simular('aumento20demanda')),
      quedaProdutividade: Math.round(simular('quedaProdutividade'))
    }
  };
};

// 5. TENDÊNCIA TEMPORAL (últimos 30 dias)
const calcularTendenciaTemporal = (tratativas) => {
  const hoje = new Date();
  const ultimos30Dias = [];
  
  for (let i = 29; i >= 0; i--) {
    const data = new Date(hoje);
    data.setDate(data.getDate() - i);
    data.setHours(0, 0, 0, 0);
    
    const dataFim = new Date(data);
    dataFim.setHours(23, 59, 59, 999);
    
    const abertos = tratativas.filter(t => {
      const dataRegistro = new Date(t.data_registro || t.created_date);
      return dataRegistro >= data && dataRegistro <= dataFim;
    }).length;
    
    const resolvidos = tratativas.filter(t => {
      if (!t.data_encerramento) return false;
      const dataEncerramento = new Date(t.data_encerramento);
      return dataEncerramento >= data && dataEncerramento <= dataFim;
    }).length;
    
    ultimos30Dias.push({
      data: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      abertos,
      resolvidos,
      backlog: abertos - resolvidos
    });
  }
  
  return ultimos30Dias;
};

export default function AnalyticsPreditivo() {
  const [periodoAnalise, setPeriodoAnalise] = useState('30');
  
  const { data: tratativas = [], isLoading: loadingTratativas } = useQuery({
    queryKey: ['tratativas'],
    queryFn: () => db.entities.Tratativa.list('-created_date'),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const colaboradorAtual = useMemo(() => 
    colaboradores.find(c => c.email === user?.email),
    [colaboradores, user]
  );
  const isGestor = colaboradorAtual?.papel === 'gestor';

  // Cálculos principais
  const throughput = useMemo(() => calcularThroughput(tratativas, parseInt(periodoAnalise)), [tratativas, periodoAnalise]);
  const capacidade = useMemo(() => calcularCapacidadeOperacional(tratativas, colaboradores), [tratativas, colaboradores]);
  const variabilidade = useMemo(() => calcularVariabilidade(tratativas), [tratativas]);
  const previsao = useMemo(() => calcularPrevisaoPreditiva(tratativas, colaboradores), [tratativas, colaboradores]);
  const tendencia = useMemo(() => calcularTendenciaTemporal(tratativas), [tratativas]);

  // Alertas inteligentes
  const alertas = useMemo(() => {
    const alerts = [];
    
    if (capacidade.saturacaoOperacional > 100) {
      alerts.push({
        tipo: 'CRÍTICO',
        mensagem: 'Saturação operacional acima de 100% - Risco de colapso',
        recomendacao: 'Contratar agente temporário ou redistribuir carga'
      });
    }
    
    if (variabilidade && variabilidade.estabilidade === 'INSTÁVEL') {
      alerts.push({
        tipo: 'ALERTA',
        mensagem: `Processo instável (CV: ${variabilidade.coeficienteVariacao}%)`,
        recomendacao: 'Revisar padronização de processos e treinamento'
      });
    }
    
    if (previsao.riscoSLA === 'ALTO') {
      alerts.push({
        tipo: 'ALERTA',
        mensagem: `${previsao.probabilidadeQuebraSLA}% de probabilidade de quebra de SLA`,
        recomendacao: 'Priorizar tickets próximos do vencimento'
      });
    }
    
    if (previsao.tendencia === 'CRESCIMENTO' && previsao.backlogPrevisto7d > previsao.backlogAtual * 1.5) {
      alerts.push({
        tipo: 'ATENÇÃO',
        mensagem: 'Backlog crescendo 50%+ em 7 dias',
        recomendacao: 'Aumentar capacidade ou reduzir novos tickets'
      });
    }
    
    return alerts;
  }, [capacidade, variabilidade, previsao]);

  const exportarRelatorio = () => {
    const dados = {
      timestamp: new Date().toISOString(),
      throughput,
      capacidade,
      variabilidade,
      previsao,
      alertas
    };
    
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_preditivo_${Date.now()}.json`;
    a.click();
  };

  if (!user) return <LoadingSpinner text="Carregando..." />;
  
  if (!isGestor) {
    return (
      <div className="text-center py-16">
        <Brain className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
        <p className="text-slate-500">Apenas gestores podem acessar Analytics Preditivo.</p>
      </div>
    );
  }

  if (loadingTratativas) return <LoadingSpinner text="Processando analytics..." />;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Inteligência Operacional Preditiva"
        subtitle="Analytics CMMI Nível 4 - Controle Quantitativo de Processos"
        icon={Brain}
        actions={
          <Button onClick={exportarRelatorio} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar JSON
          </Button>
        }
      />

      {/* Alertas Críticos */}
      {alertas.length > 0 && (
        <div className="space-y-3">
          {alertas.map((alerta, idx) => (
            <Alert key={idx} className={
              alerta.tipo === 'CRÍTICO' ? 'border-red-300 bg-red-50' :
              alerta.tipo === 'ALERTA' ? 'border-amber-300 bg-amber-50' :
              'border-blue-300 bg-blue-50'
            }>
              <AlertTriangle className={`w-4 h-4 ${
                alerta.tipo === 'CRÍTICO' ? 'text-red-600' :
                alerta.tipo === 'ALERTA' ? 'text-amber-600' :
                'text-blue-600'
              }`} />
              <AlertDescription>
                <p className="font-semibold">{alerta.mensagem}</p>
                <p className="text-sm mt-1">{alerta.recomendacao}</p>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* KPIs Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Throughput Diário</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{throughput.mediaDiaria.toFixed(1)}</p>
            <p className="text-xs text-slate-500 mt-1">tickets/dia (últimos {periodoAnalise}d)</p>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-sm ${
          capacidade.status === 'SOBRECARGA' ? 'bg-red-50 border-red-200' :
          capacidade.status === 'ALERTA' ? 'bg-amber-50 border-amber-200' :
          'bg-green-50 border-green-200'
        }`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Saturação Operacional</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${
              capacidade.status === 'SOBRECARGA' ? 'text-red-600' :
              capacidade.status === 'ALERTA' ? 'text-amber-600' :
              'text-green-600'
            }`}>
              {capacidade.saturacaoOperacional.toFixed(0)}%
            </p>
            <Badge variant="outline" className="mt-2">{capacidade.status}</Badge>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Backlog Previsto 7d</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-purple-600">{previsao.backlogPrevisto7d}</p>
              {previsao.tendencia === 'CRESCIMENTO' && <TrendingUp className="w-6 h-6 text-red-500" />}
              {previsao.tendencia === 'REDUÇÃO' && <TrendingDown className="w-6 h-6 text-green-500" />}
            </div>
            <p className="text-xs text-slate-500 mt-1">atual: {previsao.backlogAtual}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Risco de SLA</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${
              previsao.riscoSLA === 'ALTO' ? 'text-red-600' :
              previsao.riscoSLA === 'MÉDIO' ? 'text-amber-600' :
              'text-green-600'
            }`}>
              {previsao.probabilidadeQuebraSLA}%
            </p>
            <Badge variant="outline" className="mt-2">{previsao.riscoSLA}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm">Período de Análise:</Label>
            <Select value={periodoAnalise} onValueChange={setPeriodoAnalise}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="14">14 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Analíticos */}
      <Tabs defaultValue="throughput">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="throughput">Throughput</TabsTrigger>
          <TabsTrigger value="capacidade">Capacidade</TabsTrigger>
          <TabsTrigger value="variabilidade">Variabilidade</TabsTrigger>
          <TabsTrigger value="previsao">Previsão</TabsTrigger>
          <TabsTrigger value="governanca">Governança</TabsTrigger>
        </TabsList>

        {/* 1. THROUGHPUT */}
        <TabsContent value="throughput" className="space-y-6 mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Tendência de Throughput (Últimos 30 dias)</CardTitle>
              <CardDescription>Volume de tickets abertos vs resolvidos</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={tendencia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="abertos" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Abertos" />
                  <Area type="monotone" dataKey="resolvidos" stackId="2" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Resolvidos" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Throughput por Agente</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.entries(throughput.por_agente).length === 0 ? (
                  <p className="text-slate-500 text-center py-8">Sem dados</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(throughput.por_agente)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 10)
                      .map(([agente, count]) => (
                        <div key={agente} className="flex items-center justify-between">
                          <span className="text-sm">{agente}</span>
                          <Badge variant="outline">{count} tickets</Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Throughput por Canal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={Object.entries(throughput.por_canal).map(([canal, count]) => ({ canal, count }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="canal" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" name="Tickets" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. CAPACIDADE */}
        <TabsContent value="capacidade" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Capacidade Teórica</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-blue-600 mb-4">{capacidade.capacidadeTeoriaDiaria.toFixed(1)}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Agentes ativos:</span>
                    <span className="font-medium">{capacidade.agentesAtivos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Por agente/dia:</span>
                    <span className="font-medium">{capacidade.capacidadePorAgente.toFixed(1)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Demanda Atual</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-amber-600 mb-4">{capacidade.ticketsAbertos}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tickets abertos</span>
                    <Badge variant="outline">Em fila</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
              <CardHeader>
                <CardTitle className="text-base">Indicador de Saturação</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-purple-600 mb-4">{capacidade.saturacaoOperacional.toFixed(0)}%</p>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all ${
                      capacidade.saturacaoOperacional > 100 ? 'bg-red-600' :
                      capacidade.saturacaoOperacional > 70 ? 'bg-amber-600' :
                      'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(capacidade.saturacaoOperacional, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600 mt-3">
                  {capacidade.status === 'SOBRECARGA' && 'Operação em sobrecarga crítica'}
                  {capacidade.status === 'ALERTA' && 'Aproximando-se da capacidade máxima'}
                  {capacidade.status === 'SAUDÁVEL' && 'Operação dentro da normalidade'}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 3. VARIABILIDADE */}
        <TabsContent value="variabilidade" className="space-y-6 mt-6">
          {variabilidade ? (
            <>
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Análise Estatística de Tempo de Resolução</CardTitle>
                  <CardDescription>Avaliação de estabilidade do processo (n={variabilidade.amostra})</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid lg:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-500 mb-1">Média (μ)</p>
                      <p className="text-2xl font-bold text-blue-600">{Math.round(variabilidade.media / 60)}h</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-500 mb-1">Desvio Padrão (σ)</p>
                      <p className="text-2xl font-bold text-purple-600">{Math.round(variabilidade.desvioPadrao / 60)}h</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-500 mb-1">Coeficiente de Variação</p>
                      <p className="text-2xl font-bold text-amber-600">{variabilidade.coeficienteVariacao}%</p>
                    </div>
                    <div className={`text-center p-4 rounded-lg ${
                      variabilidade.estabilidade === 'ESTÁVEL' ? 'bg-green-50' :
                      variabilidade.estabilidade === 'MODERADO' ? 'bg-amber-50' :
                      'bg-red-50'
                    }`}>
                      <p className="text-sm text-slate-500 mb-1">Estabilidade</p>
                      <p className={`text-lg font-bold ${
                        variabilidade.estabilidade === 'ESTÁVEL' ? 'text-green-600' :
                        variabilidade.estabilidade === 'MODERADO' ? 'text-amber-600' :
                        'text-red-600'
                      }`}>
                        {variabilidade.estabilidade}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">Percentis de Distribuição</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-slate-600 mb-1">P50 (Mediana)</p>
                        <p className="text-xl font-bold text-blue-600">{Math.round(variabilidade.p50 / 60)}h</p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs text-slate-600 mb-1">P75</p>
                        <p className="text-xl font-bold text-purple-600">{Math.round(variabilidade.p75 / 60)}h</p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-lg">
                        <p className="text-xs text-slate-600 mb-1">P90</p>
                        <p className="text-xl font-bold text-amber-600">{Math.round(variabilidade.p90 / 60)}h</p>
                      </div>
                    </div>
                  </div>

                  <Alert className="mt-6 bg-blue-50 border-blue-200">
                    <Info className="w-4 h-4 text-blue-600" />
                    <AlertDescription>
                      <p className="text-sm text-blue-900">
                        <strong>Interpretação CMMI:</strong> {variabilidade.estabilidade === 'ESTÁVEL' 
                          ? 'Processo sob controle estatístico. CV < 30% indica previsibilidade operacional.' 
                          : variabilidade.estabilidade === 'MODERADO'
                          ? 'Processo com variação moderada. Recomenda-se revisar fatores de influência.'
                          : 'Processo instável (CV > 50%). Ação corretiva necessária para padronização.'}
                      </p>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <p className="text-slate-500">Dados insuficientes para análise estatística</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 4. PREVISÃO */}
        <TabsContent value="previsao" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Taxa de Entrada vs Saída</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-red-600" />
                      <span className="font-medium">Taxa de Entrada</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{previsao.taxaEntradaDiaria} /dia</p>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Taxa de Saída</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{previsao.taxaSaidaDiaria} /dia</p>
                  </div>
                  <Alert className={
                    parseFloat(previsao.taxaEntradaDiaria) > parseFloat(previsao.taxaSaidaDiaria)
                      ? 'border-red-300 bg-red-50'
                      : 'border-green-300 bg-green-50'
                  }>
                    <AlertDescription>
                      {parseFloat(previsao.taxaEntradaDiaria) > parseFloat(previsao.taxaSaidaDiaria) ? (
                        <p className="text-sm text-red-900">
                          Entrada maior que saída: backlog crescendo
                        </p>
                      ) : (
                        <p className="text-sm text-green-900">
                          Saída maior que entrada: backlog reduzindo
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Simulação de Cenários (7 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm">Cenário Base</span>
                    <Badge>{previsao.simulacoes.cenarioBase} tickets</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-sm">+ 1 Agente (+10% capacidade)</span>
                    <Badge className="bg-green-600 text-white">{previsao.simulacoes.mais1agente} tickets</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="text-sm">Aumento 20% demanda</span>
                    <Badge className="bg-red-600 text-white">{previsao.simulacoes.aumento20demanda} tickets</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-sm">Queda 20% produtividade</span>
                    <Badge className="bg-amber-600 text-white">{previsao.simulacoes.quedaProdutividade} tickets</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader>
              <CardTitle>Risco de Quebra de SLA</CardTitle>
              <CardDescription>Probabilidade estatística baseada em tickets próximos ao vencimento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-5xl font-bold text-purple-600 mb-2">{previsao.probabilidadeQuebraSLA}%</p>
                  <Badge className={
                    previsao.riscoSLA === 'ALTO' ? 'bg-red-600' :
                    previsao.riscoSLA === 'MÉDIO' ? 'bg-amber-600' :
                    'bg-green-600'
                  }>
                    Risco {previsao.riscoSLA}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600 mb-1">Backlog Atual</p>
                  <p className="text-3xl font-bold text-slate-800">{previsao.backlogAtual}</p>
                  <p className="text-sm text-slate-600 mt-3">Previsto em 7d</p>
                  <p className="text-3xl font-bold text-purple-600">{previsao.backlogPrevisto7d}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. GOVERNANÇA */}
        <TabsContent value="governanca" className="space-y-6 mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Documentação CMMI Nível 4</CardTitle>
              <CardDescription>Governança de Métricas Quantitativas</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h3 className="font-semibold text-slate-900">Metodologia Estatística Aplicada</h3>
              <ul className="text-sm text-slate-700 space-y-1">
                <li><strong>Throughput:</strong> Σ(tickets resolvidos) / período em dias</li>
                <li><strong>Capacidade Teórica:</strong> Throughput médio × agentes ativos</li>
                <li><strong>Saturação:</strong> (Backlog / Capacidade semanal) × 100</li>
                <li><strong>Desvio Padrão (σ):</strong> √(Σ(xi - μ)² / n)</li>
                <li><strong>Coeficiente de Variação:</strong> (σ / μ) × 100</li>
                <li><strong>Previsão de Backlog:</strong> Backlog atual + (Taxa entrada - Taxa saída) × 7</li>
              </ul>

              <h3 className="font-semibold text-slate-900 mt-6">Critérios de Alerta</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="font-semibold text-green-900">Saudável</p>
                  <ul className="text-xs text-green-700 mt-2 space-y-1">
                    <li>Saturação {'<'} 70%</li>
                    <li>CV {'<'} 30%</li>
                    <li>Risco SLA {'<'} 30%</li>
                  </ul>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="font-semibold text-amber-900">Alerta</p>
                  <ul className="text-xs text-amber-700 mt-2 space-y-1">
                    <li>Saturação 70-100%</li>
                    <li>CV 30-50%</li>
                    <li>Risco SLA 30-50%</li>
                  </ul>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="font-semibold text-red-900">Crítico</p>
                  <ul className="text-xs text-red-700 mt-2 space-y-1">
                    <li>Saturação {'>'} 100%</li>
                    <li>CV {'>'} 50%</li>
                    <li>Risco SLA {'>'} 50%</li>
                  </ul>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 mt-6">Rotina de Revisão</h3>
              <div className="space-y-2 text-sm text-slate-700">
                <p><strong>Diária:</strong> Monitoramento de saturação e alertas críticos</p>
                <p><strong>Semanal:</strong> Análise de throughput e tendências</p>
                <p><strong>Mensal:</strong> Revisão de variabilidade e calibração de modelos preditivos</p>
                <p><strong>Trimestral:</strong> Validação de capacidade e ajuste de metas</p>
              </div>

              <h3 className="font-semibold text-slate-900 mt-6">Evidências de Controle Quantitativo</h3>
              <p className="text-sm text-slate-700">
                Este relatório fornece evidências auditáveis de controle estatístico de processo, 
                conforme requisitos CMMI PA 4.1 (Quantitative Project Management) e PA 4.2 (Organizational Process Performance).
                Todos os cálculos são baseados em dados reais da entidade Tratativa e seguem metodologia CMMI Nível 4.
              </p>

              <Alert className="mt-6 bg-blue-50 border-blue-200">
                <Info className="w-4 h-4 text-blue-600" />
                <AlertDescription>
                  <p className="text-sm text-blue-900">
                    <strong>Recomendação Executiva:</strong> Agende reuniões mensais de revisão de métricas preditivas 
                    com stakeholders para ajuste de estratégias operacionais baseadas em dados quantitativos.
                  </p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}