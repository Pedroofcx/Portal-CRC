import db from '@/api/db';
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { formatDateSP, getCurrentTrimester, tipoTratativaLabels, statusLabels, calcularTempoContratoMeses, calcularReceitaMensalEquivalente, calcularReceitaAnualEquivalente, PLANOS_CLIENTE, formatBRL } from '@/components/utils/helpers';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StatCard from '@/components/ui/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  Download,
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Brain,
  Handshake
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AnaliseProfundaColaborador from '@/components/relatorios/AnaliseProfundaColaborador';
import RelatoriosApuracao from './RelatoriosApuracao';

export default function Relatorios() {
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('all');
  // Filtros comerciais
  const [planoFiltro, setPlanoFiltro] = useState('all');
  const [segmentoFiltro, setSegmentoFiltro] = useState('all');
  const [tempoContratoFiltro, setTempoContratoFiltro] = useState('all');
  const [faixaReceitaMensalFiltro, setFaixaReceitaMensalFiltro] = useState('all');
  const [faixaReceitaAnualFiltro, setFaixaReceitaAnualFiltro] = useState('all');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: tratativas = [], isLoading: loadingTratativas } = useQuery({
    queryKey: ['tratativas-relatorios-geral'],
    queryFn: () => db.entities.Tratativa.list('-created_date', 2000),
    staleTime: 60000,
    retry: 2,
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => db.entities.Colaborador.list(),
    staleTime: 120000,
  });

  const { data: pontuacoes = [] } = useQuery({
    queryKey: ['pontuacoes'],
    queryFn: () => db.entities.Pontuacao.list('-created_date', 500),
    staleTime: 120000,
  });

  const { data: apuracoes = [] } = useQuery({
    queryKey: ['apuracoes'],
    queryFn: () => db.entities.Apuracao.list('-created_date', 500),
    staleTime: 120000,
  });

  const { data: observacoes = [] } = useQuery({
    queryKey: ['observacoes'],
    queryFn: () => db.entities.Observacao.list('-created_date', 2000),
    staleTime: 120000,
  });

  const { data: pesquisas = [] } = useQuery({
    queryKey: ['pesquisas'],
    queryFn: () => db.entities.Pesquisa.list('-created_date', 200),
    staleTime: 120000,
  });

  const { data: respostasPesquisas = [] } = useQuery({
    queryKey: ['respostas-pesquisas'],
    queryFn: () => db.entities.RespostaPesquisa.list('-created_date', 2000),
    staleTime: 120000,
  });

  const { data: oraculoLancamentos = [] } = useQuery({
    queryKey: ['oraculo-lancamentos'],
    queryFn: () => db.entities.OraculoLancamento.list('-created_date', 500),
    staleTime: 120000,
  });

  const colaboradorAtual = useMemo(() => 
    colaboradores.find(c => c.email === currentUser?.email),
    [colaboradores, currentUser]
  );
  const isGestor = colaboradorAtual?.papel === 'gestor';

  const isGestorCheck = useMemo(() => colaboradorAtual?.papel === 'gestor', [colaboradorAtual]);

  if (!currentUser) return <LoadingSpinner text="Carregando..." />;

  if (currentUser && colaboradores.length > 0 && !colaboradorAtual) {
    return <LoadingSpinner text="Verificando acesso..." />;
  }

  if (!isGestorCheck) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">Apenas gestores podem acessar relatórios.</p>
      </div>
    );
  }

  // Filtrar tratativas por período (excluir excluídas por padrão)
  let tratativasFiltradas = tratativas.filter(t => t.status !== 'excluida');
  if (periodoInicio) {
    tratativasFiltradas = tratativasFiltradas.filter(t => {
      const dataRegistro = new Date(t.data_registro || t.created_date);
      return dataRegistro >= new Date(periodoInicio);
    });
  }
  if (periodoFim) {
    tratativasFiltradas = tratativasFiltradas.filter(t => {
      const dataRegistro = new Date(t.data_registro || t.created_date);
      const fimDia = new Date(periodoFim);
      fimDia.setHours(23, 59, 59, 999);
      return dataRegistro <= fimDia;
    });
  }
  if (categoriaFiltro !== 'all') {
    tratativasFiltradas = tratativasFiltradas.filter(t => t.tipo_tratativa === categoriaFiltro);
  }

  // Filtros comerciais
  if (planoFiltro !== 'all') {
    tratativasFiltradas = tratativasFiltradas.filter(t => t.plano_cliente === planoFiltro);
  }
  if (segmentoFiltro !== 'all') {
    tratativasFiltradas = tratativasFiltradas.filter(t => t.segmento_cliente === segmentoFiltro);
  }
  if (tempoContratoFiltro !== 'all') {
    tratativasFiltradas = tratativasFiltradas.filter(t => {
      const meses = calcularTempoContratoMeses(t.data_primeira_contratacao);
      if (meses === null) return false;
      if (tempoContratoFiltro === '<6') return meses < 6;
      if (tempoContratoFiltro === '6-12') return meses >= 6 && meses <= 12;
      if (tempoContratoFiltro === '1-3anos') return meses > 12 && meses <= 36;
      if (tempoContratoFiltro === '3+anos') return meses > 36;
      return true;
    });
  }
  if (faixaReceitaMensalFiltro !== 'all') {
    tratativasFiltradas = tratativasFiltradas.filter(t => {
      if (!t.modalidade_plano || !t.valor_contratacao_plano_atual) return false;
      const v = calcularReceitaMensalEquivalente(t);
      if (faixaReceitaMensalFiltro === '<1000') return v > 0 && v < 1000;
      if (faixaReceitaMensalFiltro === '1000-5000') return v >= 1000 && v < 5000;
      if (faixaReceitaMensalFiltro === '5000-10000') return v >= 5000 && v < 10000;
      if (faixaReceitaMensalFiltro === '10000+') return v >= 10000;
      return true;
    });
  }
  if (faixaReceitaAnualFiltro !== 'all') {
    tratativasFiltradas = tratativasFiltradas.filter(t => {
      if (!t.modalidade_plano || !t.valor_contratacao_plano_atual) return false;
      const v = calcularReceitaAnualEquivalente(t);
      if (faixaReceitaAnualFiltro === '<12000') return v > 0 && v < 12000;
      if (faixaReceitaAnualFiltro === '12000-60000') return v >= 12000 && v < 60000;
      if (faixaReceitaAnualFiltro === '60000-120000') return v >= 60000 && v < 120000;
      if (faixaReceitaAnualFiltro === '120000+') return v >= 120000;
      return true;
    });
  }

  // Estatísticas gerais
  const stats = {
    totalTratativas: tratativasFiltradas.length,
    encerradas: tratativasFiltradas.filter(t => t.status === 'encerrada' || t.status === 'aguardando_confirmacao_reabertura').length,
    dentraSLA: tratativasFiltradas.filter(t => t.encerrado_no_sla).length,
    criticas: tratativasFiltradas.filter(t => t.prioridade === 'critica').length,
  };

  // Volume por tipo
  const volumePorTipo = {};
  tratativasFiltradas.forEach(t => {
    volumePorTipo[t.tipo_tratativa] = (volumePorTipo[t.tipo_tratativa] || 0) + 1;
  });

  // Volume por categoria
  const volumePorCategoria = {};
  tratativasFiltradas.forEach(t => {
    if (t.categoria) {
      volumePorCategoria[t.categoria] = (volumePorCategoria[t.categoria] || 0) + 1;
    }
  });

  // SLA Médio
  const tratativasComTempo = tratativasFiltradas.filter(t => t.tempo_total_minutos && !isNaN(t.tempo_total_minutos));
  const slaMedio = tratativasComTempo.length > 0
    ? tratativasComTempo.reduce((acc, t) => acc + Number(t.tempo_total_minutos), 0) / tratativasComTempo.length
    : 0;

  // Top Agentes
  const volumePorAgente = {};
  tratativasFiltradas.forEach(t => {
    if (t.agente_responsavel_id) {
      volumePorAgente[t.agente_responsavel_id] = (volumePorAgente[t.agente_responsavel_id] || 0) + 1;
    }
  });
  const topAgentes = Object.entries(volumePorAgente)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => {
      const agente = colaboradores.find(c => c.id === id);
      return { id, nome: agente?.nome_completo || 'Desconhecido', count };
    });

  // Ranking por Pontuação
  const trimestre = getCurrentTrimester();
  const rankingPontuacao = pontuacoes
    .filter(p => p.periodo_trimestre === trimestre)
    .sort((a, b) => (b.total_pontos || 0) - (a.total_pontos || 0))
    .slice(0, 10);

  // Tipos disponíveis para filtro
  const categorias = [...new Set(tratativas.filter(t => t.tipo_tratativa).map(t => t.tipo_tratativa))];
  // Planos e segmentos disponíveis para filtro comercial
  const planosDisponiveis = PLANOS_CLIENTE;
  const segmentosDisponiveis = [...new Set(tratativas.filter(t => t.segmento_cliente).map(t => t.segmento_cliente))].sort();

  // Acordos de Contestação — para o relatório de contestação (apenas encerradas com resolução "acordo")
  const acordosContestacao = tratativasFiltradas
    .filter(t => t.tipo_tratativa === 'contestacao' && t.status_resolucao_contestacao === 'acordo' && !t.excluida)
    .map(t => {
      const valorOriginal = parseFloat(t.valor_contestado_inicial) || 0;
      const valorNegociado = parseFloat(t.valor_contestado_final) || 0;
      const percentualReducao = valorOriginal > 0
        ? ((valorOriginal - valorNegociado) / valorOriginal) * 100
        : 0;
      return {
        id: t.id,
        id_interno: t.id_interno,
        agente: t.agente_responsavel_nome || '-',
        data_encerramento: t.data_encerramento,
        valor_original: valorOriginal,
        valor_negociado: valorNegociado,
        percentual_reducao: percentualReducao,
        motivo_reducao: t.motivo_reducao_acordo || '-',
        pontuacao: 2.5
      };
    });

  const exportarCSV = () => {
    const headers = ['Data', 'Tipo', 'Categoria', 'Prioridade', 'Status', 'Agente', 'SLA Cumprido'];
    const rows = tratativasFiltradas.map(t => [
      formatDateSP(t.data_registro || t.created_date, 'DD/MM/YYYY'),
      tipoTratativaLabels[t.tipo_tratativa] || t.tipo_tratativa,
      t.categoria || '-',
      t.prioridade,
      statusLabels[t.status] || t.status,
      t.agente_responsavel_nome || '-',
      t.encerrado_no_sla ? 'Sim' : 'Não'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_tratativas_${Date.now()}.csv`;
    a.click();
  };

  if (loadingTratativas) {
    return <LoadingSpinner text="Carregando relatórios..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Relatórios & Insights"
        subtitle="Análise e visão gerencial"
        icon={BarChart3}
        actions={
          <Button onClick={exportarCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        }
      />

      {/* Filtros */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Data Início</Label>
              <Input
                type="date"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Data Fim</Label>
              <Input
                type="date"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {categorias.map(cat => (
                    <SelectItem key={cat} value={cat}>{tipoTratativaLabels[cat] || cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setPeriodoInicio('');
                  setPeriodoFim('');
                  setCategoriaFiltro('all');
                  setPlanoFiltro('all');
                  setSegmentoFiltro('all');
                  setTempoContratoFiltro('all');
                  setFaixaReceitaMensalFiltro('all');
                  setFaixaReceitaAnualFiltro('all');
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>

          {/* Filtros Comerciais */}
          <div className="pt-3 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Filtros Comerciais</p>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <Label className="text-xs">Plano</Label>
                <Select value={planoFiltro} onValueChange={setPlanoFiltro}>
                  <SelectTrigger><SelectValue placeholder="Todos os planos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os planos</SelectItem>
                    {planosDisponiveis.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Segmento</Label>
                <Select value={segmentoFiltro} onValueChange={setSegmentoFiltro}>
                  <SelectTrigger><SelectValue placeholder="Todos os segmentos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os segmentos</SelectItem>
                    {segmentosDisponiveis.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tempo de Relacionamento</Label>
                <Select value={tempoContratoFiltro} onValueChange={setTempoContratoFiltro}>
                  <SelectTrigger><SelectValue placeholder="Todo tempo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo tempo</SelectItem>
                    <SelectItem value="<6">Menos de 6 meses</SelectItem>
                    <SelectItem value="6-12">6 a 12 meses</SelectItem>
                    <SelectItem value="1-3anos">1 a 3 anos</SelectItem>
                    <SelectItem value="3+anos">Mais de 3 anos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Faixa Receita Mensal Equivalente</Label>
                <Select value={faixaReceitaMensalFiltro} onValueChange={setFaixaReceitaMensalFiltro}>
                  <SelectTrigger><SelectValue placeholder="Toda faixa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toda faixa</SelectItem>
                    <SelectItem value="<1000">Até R$ 1.000</SelectItem>
                    <SelectItem value="1000-5000">R$ 1.000 a R$ 5.000</SelectItem>
                    <SelectItem value="5000-10000">R$ 5.000 a R$ 10.000</SelectItem>
                    <SelectItem value="10000+">Acima de R$ 10.000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Faixa Receita Anual Equivalente</Label>
                <Select value={faixaReceitaAnualFiltro} onValueChange={setFaixaReceitaAnualFiltro}>
                  <SelectTrigger><SelectValue placeholder="Toda faixa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toda faixa</SelectItem>
                    <SelectItem value="<12000">Até R$ 12.000</SelectItem>
                    <SelectItem value="12000-60000">R$ 12.000 a R$ 60.000</SelectItem>
                    <SelectItem value="60000-120000">R$ 60.000 a R$ 120.000</SelectItem>
                    <SelectItem value="120000+">Acima de R$ 120.000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tratativas"
          value={stats.totalTratativas}
          icon={BarChart3}
          color="blue"
        />
        <StatCard
          title="Encerradas"
          value={stats.encerradas}
          subtitle={`${stats.totalTratativas > 0 ? Math.round((stats.encerradas / stats.totalTratativas) * 100) : 0}% do total`}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Dentro do SLA"
          value={stats.dentraSLA}
          subtitle={`${stats.encerradas > 0 ? Math.round((stats.dentraSLA / stats.encerradas) * 100) : 0}% das encerradas`}
          icon={Clock}
          color="purple"
        />
        <StatCard
          title="Críticas"
          value={stats.criticas}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Tabs de Análises */}
      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="tratativas">Análise por Tipo</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="apuracoes">Relatórios Apuração</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="colaboradores">Análise por Colaborador</TabsTrigger>
          <TabsTrigger value="preditivo">Analytics Preditivo</TabsTrigger>
        </TabsList>

        <TabsContent value="tratativas" className="mt-6">
          <Card className="border-0 shadow-sm bg-info-soft p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-primary mb-2">
                  Análise Detalhada por Tipo de Tratativa
                </h3>
                <p className="text-sm text-primary">
                  Acesse relatórios completos com insights estratégicos, métricas de qualidade e impacto financeiro
                </p>
              </div>
              <Link to={createPageUrl('RelatoriosTratativas')}>
                <Button className="bg-primary hover:bg-primary/90">
                  Ver Relatórios Detalhados
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="preditivo" className="mt-6">
          <Card className="border-0 shadow-sm bg-info-soft p-6 border-2 border-info/25">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary rounded-lg">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-primary">
                    Inteligência Operacional Preditiva
                  </h3>
                  <Badge className="bg-primary text-white">CMMI Nível 4</Badge>
                </div>
                <p className="text-sm text-primary mb-4">
                  Controle quantitativo de processos com métricas preditivas: throughput, capacidade operacional, 
                  variabilidade estatística, previsão de backlog, simulação de cenários e alertas inteligentes.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-card/50">Throughput</Badge>
                  <Badge variant="outline" className="bg-card/50">Saturação</Badge>
                  <Badge variant="outline" className="bg-card/50">Previsão</Badge>
                  <Badge variant="outline" className="bg-card/50">Simulações</Badge>
                  <Badge variant="outline" className="bg-card/50">Alertas</Badge>
                </div>
              </div>
              <Link to={createPageUrl('AnalyticsPreditivo')}>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Acessar Analytics
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="geral" className="mt-6 space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Volume por Tipo */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Volume por Tipo de Tratativa</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.entries(volumePorTipo).length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Sem dados</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(volumePorTipo).map(([tipo, count]) => (
                      <div key={tipo} className="flex items-center justify-between">
                        <span className="text-sm">{tipoTratativaLabels[tipo] || tipo}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${(count / stats.totalTratativas) * 100}%` }}
                            />
                          </div>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Volume por Categoria */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Volume por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.entries(volumePorCategoria).length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Sem dados</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(volumePorCategoria)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 8)
                      .map(([categoria, count]) => (
                        <div key={categoria} className="flex items-center justify-between">
                          <span className="text-sm">{categoria}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-muted rounded-full h-2">
                              <div 
                                className="bg-success h-2 rounded-full" 
                                style={{ width: `${(count / stats.totalTratativas) * 100}%` }}
                              />
                            </div>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SLA */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Análise de SLA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{Math.round(slaMedio / 60)}h</p>
                  <p className="text-sm text-muted-foreground mt-1">Tempo Médio de Resolução</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-success">
                    {stats.encerradas > 0 ? Math.round((stats.dentraSLA / stats.encerradas) * 100) : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Taxa de Cumprimento</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-warning">{stats.encerradas - stats.dentraSLA}</p>
                  <p className="text-sm text-muted-foreground mt-1">Fora do SLA</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acordos de Contestação */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Handshake className="w-5 h-5 text-primary" />
                Acordos de Contestação
                <Badge variant="outline" className="ml-1">{acordosContestacao.length} acordo(s)</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {acordosContestacao.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum acordo de contestação no período selecionado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="text-left p-2">Tratativa</th>
                        <th className="text-left p-2">Agente</th>
                        <th className="text-right p-2">Valor Original</th>
                        <th className="text-right p-2">Valor Negociado</th>
                        <th className="text-right p-2">% Redução</th>
                        <th className="text-left p-2">Motivo da Redução</th>
                        <th className="text-right p-2">Pontuação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acordosContestacao.map(a => (
                        <tr key={a.id} className="border-t hover:bg-muted">
                          <td className="p-2 font-mono text-xs">{a.id_interno || '-'}</td>
                          <td className="p-2">{a.agente}</td>
                          <td className="p-2 text-right">{formatBRL(a.valor_original)}</td>
                          <td className="p-2 text-right">{formatBRL(a.valor_negociado)}</td>
                          <td className="p-2 text-right">
                            <Badge variant="outline" className={a.percentual_reducao > 0 ? 'text-success' : 'text-muted-foreground'}>
                              {a.percentual_reducao.toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="p-2 text-xs text-foreground">{a.motivo_reducao}</td>
                          <td className="p-2 text-right font-semibold text-primary">{a.pontuacao.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted font-semibold">
                      <tr>
                        <td className="p-2" colSpan={2}>Total ({acordosContestacao.length} acordo(s))</td>
                        <td className="p-2 text-right">{formatBRL(acordosContestacao.reduce((s, a) => s + a.valor_original, 0))}</td>
                        <td className="p-2 text-right">{formatBRL(acordosContestacao.reduce((s, a) => s + a.valor_negociado, 0))}</td>
                        <td className="p-2 text-right">—</td>
                        <td className="p-2">—</td>
                        <td className="p-2 text-right text-primary">{acordosContestacao.reduce((s, a) => s + a.pontuacao, 0).toFixed(1)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apuracoes" className="mt-6">
          <RelatoriosApuracao />
        </TabsContent>

        <TabsContent value="performance" className="mt-6 space-y-6">
          {/* Top Agentes */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Top 5 Agentes por Volume</CardTitle>
            </CardHeader>
            <CardContent>
              {topAgentes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Sem dados</p>
              ) : (
                <div className="space-y-3">
                  {topAgentes.map((agente, index) => (
                    <div key={agente.id} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-warning-soft text-warning' :
                        index === 1 ? 'bg-muted text-foreground' :
                        index === 2 ? 'bg-critical-soft text-critical' :
                        'bg-info-soft text-primary'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{agente.nome}</p>
                      </div>
                      <Badge variant="outline">{agente.count} tratativas</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance CSAT */}
          {apuracoes.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Últimas Apurações CSAT</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {apuracoes.slice(0, 5).map(ap => (
                    <div key={ap.id} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{ap.colaborador_nome}</p>
                        <Badge className="bg-info-soft text-primary">
                          {ap.satisfacao_media?.toFixed(1)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Período: {formatDateSP(ap.periodo_inicio, 'DD/MM')} - {formatDateSP(ap.periodo_fim, 'DD/MM')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ranking" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                Ranking de Pontuação - {trimestre}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rankingPontuacao.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Sem dados de pontuação neste trimestre</p>
              ) : (
                <div className="space-y-3">
                  {rankingPontuacao.map((pontuacao, index) => (
                    <div key={pontuacao.id} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        index === 0 ? 'bg-warning text-white shadow-sm' :
                        index === 1 ? 'bg-muted text-white shadow-sm' :
                        index === 2 ? 'bg-critical text-white shadow-sm' :
                        'bg-info-soft text-primary'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{pontuacao.colaborador_nome}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {pontuacao.pontos_reclamacoes_internas > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Rec. Int: {pontuacao.pontos_reclamacoes_internas}
                            </Badge>
                          )}
                          {pontuacao.pontos_reclame_aqui > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Reclame: {pontuacao.pontos_reclame_aqui}
                            </Badge>
                          )}
                          {pontuacao.pontos_csat > 0 && (
                            <Badge variant="outline" className="text-xs">
                              CSAT: {pontuacao.pontos_csat}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {pontuacao.total_pontos?.toFixed(1) || '0.0'}
                        </p>
                        <p className="text-xs text-muted-foreground">pontos</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colaboradores" className="mt-6 space-y-6">
          {colaboradores.filter(c => c.papel === 'agente' && c.ativo !== false).map(colab => {
            const apuracoesColab = apuracoes.filter(ap => ap.colaborador_id === colab.id).sort((a, b) => 
              new Date(b.periodo_inicio) - new Date(a.periodo_inicio)
            );
            const obsColab = observacoes.filter(obs => obs.colaboradores_ids?.includes(colab.id));
            const oraculoColab = oraculoLancamentos.filter(o => o.colaborador_id === colab.id).sort((a, b) =>
              new Date(b.data_lancamento) - new Date(a.data_lancamento)
            );

            return (
              <AnaliseProfundaColaborador
                key={colab.id}
                colaborador={colab}
                apuracoes={apuracoesColab}
                observacoes={obsColab}
                tratativas={tratativasFiltradas}
                pontuacoes={pontuacoes.filter(p => p.colaborador_id === colab.id)}
                respostasPesquisas={respostasPesquisas}
                pesquisas={pesquisas}
                oraculoLancamentos={oraculoColab}
              />
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}