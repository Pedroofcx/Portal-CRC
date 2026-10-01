import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import db from '@/api/db';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StatCard from '@/components/ui/StatCard';
import FluxoJornadaVisual from '@/components/jornada/FluxoJornadaVisual';
import RelatorioImpactoFinanceiro from '@/components/jornada/RelatorioImpactoFinanceiro';
import MatrizEsforcoImpacto from '@/components/jornada/MatrizEsforcoImpacto';
import SalariosColaboradoresJornada from '@/components/jornada/SalariosColaboradoresJornada';
import PerfilComercialClienteAgregado from '@/components/jornada/PerfilComercialClienteAgregado';
import FiltroPeriodoJornada from '@/components/jornada/FiltroPeriodoJornada';
import ConfigFinanceiraJornada, { getConfigValor } from '@/components/jornada/ConfigFinanceiraJornada';
import GraficoBenchmarkingJornada from '@/components/jornada/GraficoBenchmarkingJornada';
import ResumoIAEtapa from '@/components/jornada/ResumoIAEtapa';
import InteligenciaFinanceiraJornada from '@/components/jornada/InteligenciaFinanceiraJornada';
import { PARAMETROS_PADRAO } from '@/components/jornada/inteligenciaFinanceira';
import { calcularRangePeriodo, dataDentroDoRange } from '@/components/utils/periodoJornada';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FileBarChart } from 'lucide-react';
import {
  Map,
  TrendingUp,
  AlertCircle,
  Target,
  GitBranch,
  RefreshCw,
  Database,
  DollarSign,
  BarChart2,
  BarChart3,
  Brain
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePermissoes } from '@/hooks/usePermissoes';

export default function JornadaCliente() {
  const [visualizacao, setVisualizacao] = useState('fluxo');
  const [tipoPeriodo, setTipoPeriodo] = useState('mes_atual');
  const [customInicio, setCustomInicio] = useState('');
  const [customFim, setCustomFim] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const isGestor = colaboradores.find(c => c.email === user?.email)?.papel === 'gestor';
  const { temPermissao } = usePermissoes();
  const podeVerSalario = temPermissao('ver_salario');
  const podeVerCustoOperacional = temPermissao('ver_custo_operacional');

  const { data: tratativas = [], isLoading, refetch } = useQuery({
    queryKey: ['tratativas-jornada'],
    queryFn: () => db.entities.Tratativa.list('-created_date', 2000),
    staleTime: 60000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  const { data: etapas = [] } = useQuery({
    queryKey: ['etapas-jornada', "filter({ ativa: true }, 'ordem', 100)"],
    queryFn: () => db.entities.EtapaJornada.filter({ ativa: true }, 'ordem', 100),
    staleTime: 120000,
    retry: 2
  });

  const { data: motivos = [] } = useQuery({
    queryKey: ['motivos', "filter({ ativo: true }, 'motivo', 200)"],
    queryFn: () => db.entities.MotivoTratativa.filter({ ativo: true }, 'motivo', 200),
    staleTime: 120000,
    retry: 2
  });

  const { data: configuracoes = [] } = useQuery({
    queryKey: ['configuracoes-jornada'],
    queryFn: () => db.entities.Configuracao.list(),
    enabled: isGestor,
    staleTime: 60000,
  });

  const salvarConfigMutation = useMutation({
    mutationFn: async (itens) => {
      const existentes = await db.entities.Configuracao.list();
      await Promise.all(itens.map(item => {
        const atual = existentes.find(c => c.chave === item.chave);
        return atual ? db.entities.Configuracao.update(atual.id, item) : db.entities.Configuracao.create(item);
      }));
    },
    onSuccess: () => queryClient.invalidateQueries(['configuracoes-jornada']),
    onError: () => toast.error('Não consegui salvar a configuração.'),
  });

  const periodo = useMemo(() => calcularRangePeriodo(tipoPeriodo, customInicio, customFim), [tipoPeriodo, customInicio, customFim]);

  const tratativasNoPeriodo = useMemo(() =>
    tratativas.filter(t => dataDentroDoRange(t.data_encerramento || t.data_registro, periodo.inicio, periodo.fim)),
    [tratativas, periodo]
  );

  const custoHoraEquipe = getConfigValor(configuracoes, 'jornada_custo_hora_equipe', '14');
  const toleranciaTipo = getConfigValor(configuracoes, 'jornada_tolerancia_tipo', 'percentual');
  const toleranciaValor = getConfigValor(configuracoes, 'jornada_tolerancia_valor', '2');
  const faturamentoReferencia = getConfigValor(configuracoes, 'jornada_faturamento_referencia', '320000');

  // Parâmetros consolidados para a Inteligência Financeira
  const paramsInteligencia = {
    custoHora: parseFloat(custoHoraEquipe) || PARAMETROS_PADRAO.custoHora,
    toleranciaTipo,
    toleranciaValor: parseFloat(toleranciaValor) || PARAMETROS_PADRAO.toleranciaValor,
    faturamentoReferencia: parseFloat(faturamentoReferencia) || PARAMETROS_PADRAO.faturamentoReferencia,
  };

  const tratativasPorEtapaPeriodo = useMemo(() => {
    const mapa = {};
    tratativasNoPeriodo.forEach(t => {
      const etapa = t.etapa_jornada_nome || 'Não definida';
      if (!mapa[etapa]) mapa[etapa] = [];
      mapa[etapa].push(t);
    });
    return mapa;
  }, [tratativasNoPeriodo]);

  // Análises
  const analiseJornada = useMemo(() => {
    const tratativasComJornada = tratativas.filter(t => t.etapa_jornada_id);

    const porEtapa = {};
    const porMotivo = {};
    const porCausa = {};

    tratativasComJornada.forEach(t => {
      // Por etapa
      const etapa = t.etapa_jornada_nome || 'Não definida';
      if (!porEtapa[etapa]) {
        porEtapa[etapa] = {
          total: 0,
          encerradas: 0,
          motivos: {},
          causas: {}
        };
      }
      porEtapa[etapa].total++;
      if (t.status === 'encerrada') porEtapa[etapa].encerradas++;

      // Motivos por etapa
      if (t.motivo_nome) {
        porEtapa[etapa].motivos[t.motivo_nome] = (porEtapa[etapa].motivos[t.motivo_nome] || 0) + 1;
      }

      // Causas por etapa
      if (t.causa_primaria) {
        porEtapa[etapa].causas[t.causa_primaria] = (porEtapa[etapa].causas[t.causa_primaria] || 0) + 1;
      }

      // Global por motivo
      if (t.motivo_nome) {
        porMotivo[t.motivo_nome] = (porMotivo[t.motivo_nome] || 0) + 1;
      }

      // Global por causa
      if (t.causa_primaria) {
        porCausa[t.causa_primaria] = (porCausa[t.causa_primaria] || 0) + 1;
      }
    });

    return { porEtapa, porMotivo, porCausa, total: tratativasComJornada.length };
  }, [tratativas]);

  const dadosGraficoEtapas = useMemo(() => {
    return Object.entries(analiseJornada.porEtapa).map(([etapa, dados]) => ({
      etapa,
      volume: dados.total,
      encerradas: dados.encerradas
    })).sort((a, b) => b.volume - a.volume);
  }, [analiseJornada]);

  const causaPrimariaLabels = {
    processo: 'Processo',
    produto_sistema: 'Produto/Sistema',
    comunicacao: 'Comunicação',
    expectativa_cliente: 'Expectativa do Cliente',
    operacao_interna: 'Operação Interna',
    terceiro: 'Terceiro'
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-info-soft border border-info/25 rounded-xl">
          <div className="w-5 h-5 border-2 border-primary/40 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-primary">Carregando dados da jornada...</p>
            <p className="text-xs text-primary">Buscando histórico completo de tratativas</p>
          </div>
        </div>
        <LoadingSpinner text="Carregando jornada do cliente..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jornada do Cliente"
        subtitle="Mapa visual dinâmico de impacto, atrito e oportunidades"
        icon={Map}
        actions={
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-lg text-xs text-muted-foreground">
              <Database className="w-3.5 h-3.5" />
              {tratativas.length} tratativas carregadas
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button
              variant={visualizacao === 'fluxo' ? 'default' : 'outline'}
              onClick={() => setVisualizacao('fluxo')}
              size="sm"
            >
              <GitBranch className="w-4 h-4 mr-2" />
              Fluxo Visual
            </Button>
            <Button
              variant={visualizacao === 'analise' ? 'default' : 'outline'}
              onClick={() => setVisualizacao('analise')}
              size="sm"
            >
              {/* Era <BarChart> do recharts, que não é ícone: o botão ficava sem
                  símbolo. BarChart2 é o ícone equivalente do lucide-react. */}
              <BarChart2 className="w-4 h-4 mr-2" />
              Análise Detalhada
            </Button>
            {isGestor && (
              <Button
                variant={visualizacao === 'financeiro' ? 'default' : 'outline'}
                onClick={() => setVisualizacao('financeiro')}
                size="sm"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Impacto Financeiro
              </Button>
            )}
            {isGestor && (
              <Button
                variant={visualizacao === 'inteligencia' ? 'default' : 'outline'}
                onClick={() => setVisualizacao('inteligencia')}
                size="sm"
              >
                <Brain className="w-4 h-4 mr-2" />
                Inteligência Financeira
              </Button>
            )}
            {isGestor && (
              <Button
                variant={visualizacao === 'benchmarking' ? 'default' : 'outline'}
                onClick={() => setVisualizacao('benchmarking')}
                size="sm"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Benchmarking & IA
              </Button>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tratativas Mapeadas"
          value={analiseJornada.total}
          subtitle={`de ${tratativas.length} total`}
          icon={Map}
          color="blue"
        />
        <StatCard
          title="Etapas Impactadas"
          value={Object.keys(analiseJornada.porEtapa).length}
          icon={Target}
          color="purple"
        />
        <StatCard
          title="Motivos Identificados"
          value={Object.keys(analiseJornada.porMotivo).length}
          icon={AlertCircle}
          color="amber"
        />
        <StatCard
          title="Causas Primárias"
          value={Object.keys(analiseJornada.porCausa).length}
          icon={TrendingUp}
          color="green"
        />
      </div>

      {/* Perfil Comercial do Cliente — contexto comercial agregado no topo da Jornada */}
      <PerfilComercialClienteAgregado tratativas={tratativas} />

      {/* Visualização por Tabs */}
      {visualizacao === 'inteligencia' && isGestor ? (
        <InteligenciaFinanceiraJornada
          tratativas={tratativas}
          colaboradores={colaboradores}
          params={paramsInteligencia}
        />
      ) : visualizacao === 'financeiro' && isGestor ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Link to={createPageUrl('RelatorioJornadaDiretoria')}>
              <Button variant="outline" size="sm">
                <FileBarChart className="w-4 h-4 mr-2" />
                Abrir Relatório Executivo para Diretoria
              </Button>
            </Link>
          </div>
          <RelatorioImpactoFinanceiro tratativas={tratativas} colaboradores={colaboradores} isGestor={podeVerCustoOperacional} />
          <MatrizEsforcoImpacto tratativas={tratativas} motivos={motivos} />
          {podeVerSalario && <SalariosColaboradoresJornada colaboradores={colaboradores} />}
        </div>
      ) : visualizacao === 'benchmarking' && isGestor ? (
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <FiltroPeriodoJornada
                tipo={tipoPeriodo}
                onTipoChange={setTipoPeriodo}
                customInicio={customInicio}
                customFim={customFim}
                onCustomInicioChange={setCustomInicio}
                onCustomFimChange={setCustomFim}
              />
            </CardContent>
          </Card>

          <ConfigFinanceiraJornada
            configuracoes={configuracoes}
            onSalvar={(itens) => salvarConfigMutation.mutate(itens)}
            isPending={salvarConfigMutation.isPending}
          />

          <GraficoBenchmarkingJornada
            tratativas={tratativasNoPeriodo}
            etapasOrdenadas={etapas.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map(e => e.nome)}
            custoHoraEquipe={custoHoraEquipe}
            toleranciaTipo={toleranciaTipo}
            toleranciaValor={toleranciaValor}
            faturamentoReferencia={faturamentoReferencia}
          />

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Resumos &amp; Planos de Ação por Etapa (IA)</h3>
            <div className="grid lg:grid-cols-2 gap-4">
              {Object.entries(tratativasPorEtapaPeriodo).map(([etapa, lista]) => (
                <ResumoIAEtapa key={etapa} etapa={etapa} tratativas={lista} />
              ))}
              {Object.keys(tratativasPorEtapaPeriodo).length === 0 && (
                <p className="text-muted-foreground text-sm">Nenhuma tratativa no período selecionado.</p>
              )}
            </div>
          </div>
        </div>
      ) : visualizacao === 'fluxo' ? (
        <FluxoJornadaVisual
          etapas={etapas.sort((a, b) => (a.ordem || 0) - (b.ordem || 0))}
          tratativas={tratativas}
          motivos={motivos}
        />
      ) : (
        <>
          {/* Mapa da Jornada */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Mapa de Impacto por Etapa da Jornada</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dadosGraficoEtapas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="etapa" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="volume" fill="hsl(var(--chart-1))" name="Volume Total" />
                  <Bar dataKey="encerradas" fill="hsl(var(--chart-2))" name="Encerradas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detalhamento por Etapa */}
          <div className="grid lg:grid-cols-2 gap-6">
            {Object.entries(analiseJornada.porEtapa).map(([etapa, dados]) => (
              <Card key={etapa} className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{etapa}</span>
                    <Badge variant="outline">{dados.total} casos</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Motivos mais recorrentes */}
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Principais Motivos</p>
                    <div className="space-y-2">
                      {Object.entries(dados.motivos)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 3)
                        .map(([motivo, count]) => (
                          <div key={motivo} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{motivo}</span>
                            <Badge className="bg-info-soft text-primary">{count}</Badge>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Causas primárias */}
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Causas Primárias</p>
                    <div className="space-y-2">
                      {Object.entries(dados.causas)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 3)
                        .map(([causa, count]) => (
                          <div key={causa} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{causaPrimariaLabels[causa] || causa}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-muted rounded-full h-1.5">
                                <div
                                  className="bg-destructive h-1.5 rounded-full"
                                  style={{ width: `${(count / dados.total) * 100}%` }}
                                />
                              </div>
                              <Badge variant="outline">{count}</Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Taxa de conclusão */}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Taxa de Conclusão</span>
                      <span className="font-medium">
                        {dados.total > 0 ? Math.round((dados.encerradas / dados.total) * 100) : 0}%
                      </span>
                    </div>
                    <Progress value={dados.total > 0 ? (dados.encerradas / dados.total) * 100 : 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Resumo de Causas Globais */}
          <Card className="border-0 shadow-sm bg-destructive/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Causas Primárias Mais Recorrentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analiseJornada.porCausa)
                  .sort(([, a], [, b]) => b - a)
                  .map(([causa, count]) => (
                    <div key={causa} className="flex items-center justify-between p-3 bg-card rounded-lg">
                      <span className="font-medium text-foreground">
                        {causaPrimariaLabels[causa] || causa}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div
                            className="bg-destructive h-2 rounded-full"
                            style={{ width: `${(count / analiseJornada.total) * 100}%` }}
                          />
                        </div>
                        <Badge className="bg-destructive/10 text-destructive">
                          {count} casos ({Math.round((count / analiseJornada.total) * 100)}%)
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
