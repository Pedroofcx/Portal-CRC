import db from '@/api/db';
import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { formatDateSP } from '@/components/utils/helpers';
import { usePontuacaoAgente } from '@/hooks/usePontuacaoAgente';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Award,
  TrendingUp,
  Target,
  CheckCircle,
  Star,
  Trophy,
  BarChart3,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PDIModal from '@/components/performance/PDIModal';
import FeedbackModal from '@/components/performance/FeedbackModal';
import EmptyPerformanceState from '@/components/performance/EmptyPerformanceState';

export default function MinhaPerformance() {
  const [detalhamentoExpanded, setDetalhamentoExpanded] = React.useState(true);
  const [selectedPDI, setSelectedPDI] = React.useState(null);
  const [selectedFeedback, setSelectedFeedback] = React.useState(null);
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: pdis = [] } = useQuery({
    queryKey: ['pdis'],
    queryFn: () => db.entities.PDI.list('-created_date'),
  });

  const { data: apuracoes = [] } = useQuery({
    queryKey: ['apuracoes'],
    queryFn: () => db.entities.Apuracao.list('-created_date'),
  });

  const { data: observacoes = [] } = useQuery({
    queryKey: ['observacoes'],
    queryFn: () => db.entities.Observacao.list('-created_date'),
  });

  const { data: hanseiEnvios = [] } = useQuery({
    queryKey: ['hansei-envios'],
    queryFn: () => db.entities.HanseiEnvio.list('-data_envio', 5),
  });

  const colaborador = React.useMemo(() => 
    colaboradores.find(c => c.email === user?.email),
    [colaboradores, user]
  );

  const {
    totalPontos: totalPontosAgente,
    pontosCalculados,
    pontuacaoSalva: minhaPontuacao,
    detalhamentoPontos,
    tratativasEncerradas,
    trimestre,
    isLoading: loadingPontuacao,
  } = usePontuacaoAgente(colaborador?.id);

  // Cleanup ao desmontar - CRITICAL
  React.useEffect(() => {
    return () => {
      // Cleanup de estados locais se necessário
    };
  }, []);

  // Minhas observações (somente as que o agente pode ver)
  const minhasObservacoes = React.useMemo(() => {
    if (!colaborador?.id || !Array.isArray(observacoes)) return [];
    return observacoes.filter(obs => {
      if (obs.visibilidade === 'gestor') return false;
      return obs.colaboradores_ids?.includes(colaborador.id);
    }).slice(0, 5);
  }, [observacoes, colaborador]);

  const meusHansei = React.useMemo(() => {
    if (!colaborador?.id || !Array.isArray(hanseiEnvios)) return [];
    return hanseiEnvios.filter(h => h.colaborador_id === colaborador.id);
  }, [hanseiEnvios, colaborador]);

  const minhasTratativas = React.useMemo(() => {
    return tratativasEncerradas || [];
  }, [tratativasEncerradas]);

  const meusPDIs = React.useMemo(() => {
    if (!colaborador?.id || !Array.isArray(pdis)) return [];
    return pdis.filter(p => p.colaborador_id === colaborador.id);
  }, [pdis, colaborador]);

  const pdiAtivo = React.useMemo(() => {
    return meusPDIs.find(p => p.status === 'em_andamento');
  }, [meusPDIs]);

  const minhasApuracoes = React.useMemo(() => {
    if (!colaborador?.id || !Array.isArray(apuracoes)) return [];
    return apuracoes.filter(a => a.colaborador_id === colaborador.id).sort((a, b) => 
      new Date(b.periodo_inicio) - new Date(a.periodo_inicio)
    );
  }, [apuracoes, colaborador]);

  const minhaApuracao = minhasApuracoes[0] || null;

  if (!user) {
    return <LoadingSpinner text="Carregando dados do usuário..." />;
  }

  if (user && colaboradores.length > 0 && !colaborador) {
    return (
      <div className="text-center py-16">
        <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Cadastro Pendente</h2>
        <p className="text-slate-600">Seu usuário ainda não foi registrado como colaborador.</p>
      </div>
    );
  }

  // Stats
  const stats = {
    totalTratativas: tratativasEncerradas.length,
    encerradas: tratativasEncerradas.length,
    taxaEncerramento: minhasTratativas.length > 0 
      ? Math.round((tratativasEncerradas.length / minhasTratativas.length) * 100) 
      : 0,
    dentraSLA: tratativasEncerradas.filter(t => t.encerrado_no_sla).length
  };

  if (loadingPontuacao) {
    return <LoadingSpinner text="Carregando performance..." />;
  }

  // Estado vazio - agente sem dados ainda
  const temDados = minhasTratativas.length > 0 || meusPDIs.length > 0 || minhasObservacoes.length > 0 || minhaApuracao;
  if (!temDados) {
    return <EmptyPerformanceState />;
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Minha Performance"
        subtitle={`Trimestre atual: ${trimestre}`}
        icon={Award}
      />

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pontuação Total"
          value={totalPontosAgente.toFixed(1)}
          subtitle={`pts no ${trimestre}`}
          icon={Trophy}
          color="amber"
        />
        <StatCard
          title="Tratativas Encerradas"
          value={stats.encerradas}
          subtitle={`de ${stats.totalTratativas} total`}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Taxa de Conclusão"
          value={`${stats.taxaEncerramento}%`}
          icon={Target}
          color="blue"
        />
        <StatCard
          title="Dentro do SLA"
          value={stats.dentraSLA}
          subtitle="tratativas"
          icon={TrendingUp}
          color="purple"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Detalhamento de Pontos */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Detalhamento de Pontos - {trimestre}
              </CardTitle>
              <button 
                onClick={() => setDetalhamentoExpanded(!detalhamentoExpanded)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {detalhamentoExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {!detalhamentoExpanded ? (
              <div className="text-center py-4 text-slate-500">
                <p className="text-sm">Clique para expandir o detalhamento</p>
                <p className="text-2xl font-bold text-amber-600 mt-2">{pontosCalculados.toFixed(1)} pts</p>
              </div>
            ) : detalhamentoPontos.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Award className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhuma pontuação registrada neste trimestre</p>
                <p className="text-sm mt-1">Encerre tratativas para acumular pontos</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {detalhamentoPontos.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Star className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{item.tipo}</p>
                        <p className="text-xs text-slate-500">
                          Tratativa #{item.tratativa_id?.substring(0, 8)}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                      +{item.pontos} pts
                    </Badge>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-4 border-t mt-4 sticky bottom-0 bg-white">
                  <span className="font-semibold text-slate-900">Total de Pontos</span>
                  <span className="text-2xl font-bold text-amber-600">{pontosCalculados.toFixed(1)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Card de Acesso ao Hansei */}
          <Link to={createPageUrl('Hansei')}>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer hover:shadow-lg transition-all hover:scale-105">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <TrendingUp className="w-5 h-5" />
                  Acesse seu Hansei
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-blue-50">
                  Visualize seus resultados consolidados, histórico de desempenho e gráficos de evolução
                </p>
                {meusHansei.length > 0 && (
                  <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                    <p className="text-xs text-blue-100 mb-1">Últimos resultados:</p>
                    <p className="text-sm font-medium text-white">
                      {meusHansei.filter(h => !h.visualizado).length} novo(s) • {meusHansei.length} total
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium">Ver meu Hansei</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
          {/* Indicadores de Qualidade */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Indicadores de Qualidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {minhaApuracao ? (
                <>
                  {minhaApuracao.canal_telefone && (
                    <>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>CSAT Telefone</span>
                          <span className="font-medium">{minhaApuracao.canal_telefone.csat?.toFixed(1)}%</span>
                        </div>
                        <Progress value={minhaApuracao.canal_telefone.csat || 0} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>FCR</span>
                          <span className="font-medium">{minhaApuracao.canal_telefone.fcr?.toFixed(1)}%</span>
                        </div>
                        <Progress value={minhaApuracao.canal_telefone.fcr || 0} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Performance</span>
                          <span className="font-medium">{minhaApuracao.canal_telefone.performance?.toFixed(1)}%</span>
                        </div>
                        <Progress value={minhaApuracao.canal_telefone.performance || 0} className="h-2" />
                      </div>
                    </>
                  )}
                  {minhaApuracao.canal_chat && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>CSAT Chat</span>
                        <span className="font-medium">{minhaApuracao.canal_chat.csat?.toFixed(1)}%</span>
                      </div>
                      <Progress value={minhaApuracao.canal_chat.csat || 0} className="h-2" />
                    </div>
                  )}
                  {minhaApuracao.avaliacao_cx && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Avaliação CX</span>
                        <span className="font-medium">{minhaApuracao.avaliacao_cx.nota_media?.toFixed(2)}/5</span>
                      </div>
                      <Progress value={(minhaApuracao.avaliacao_cx.nota_media / 5) * 100 || 0} className="h-2" />
                    </div>
                  )}
                  {minhaApuracao.percentual_avaliados && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>% Avaliados</span>
                        <span className="font-medium">{minhaApuracao.percentual_avaliados?.toFixed(1)}%</span>
                      </div>
                      <Progress value={minhaApuracao.percentual_avaliados || 0} className="h-2" />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">Sem apurações recentes</p>
              )}
            </CardContent>
          </Card>

          {/* PDI Ativo */}
          {pdiAtivo ? (
            <Card 
              className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedPDI(pdiAtivo)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                  <Target className="w-4 h-4" />
                  PDI em Andamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-blue-900">{pdiAtivo.titulo}</p>
                <p className="text-sm text-blue-700 mt-1 line-clamp-2">{pdiAtivo.objetivo_geral}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1 text-blue-800">
                    <span>Progresso</span>
                    <span>{pdiAtivo.percentual_conclusao || 0}%</span>
                  </div>
                  <Progress value={pdiAtivo.percentual_conclusao || 0} className="h-2 bg-blue-200" />
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  {pdiAtivo.etapas?.filter(e => e.concluida).length || 0} de {pdiAtivo.etapas?.length || 0} etapas concluídas
                </p>
                <p className="text-xs text-blue-500 mt-2 text-center">Clique para ver detalhes</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-8 text-center">
                <Target className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-slate-500">Nenhum PDI ativo</p>
              </CardContent>
            </Card>
          )}

          {/* Feedbacks Recebidos */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Observações Compartilhadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {minhasObservacoes.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Nenhuma observação compartilhada</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {minhasObservacoes.map(obs => {
                    // Determinar categoria e cor
                    const categoria = obs.tipo || 'Observação';
                    const isPositivo = categoria.toLowerCase().includes('reconhecimento') || 
                                      categoria.toLowerCase().includes('elogio') ||
                                      categoria.toLowerCase().includes('destaque');
                    const isDesenvolvimento = categoria.toLowerCase().includes('desenvolvimento') || 
                                             categoria.toLowerCase().includes('melhoria') ||
                                             categoria.toLowerCase().includes('orientação');
                    const isAlerta = categoria.toLowerCase().includes('alerta') || 
                                    categoria.toLowerCase().includes('advertência') ||
                                    categoria.toLowerCase().includes('atenção');
                    
                    const bgColor = isPositivo ? 'bg-green-50 border-green-200' :
                                   isDesenvolvimento ? 'bg-blue-50 border-blue-200' :
                                   isAlerta ? 'bg-amber-50 border-amber-200' :
                                   'bg-slate-50 border-slate-200';
                    
                    const badgeColor = isPositivo ? 'bg-green-100 text-green-700' :
                                      isDesenvolvimento ? 'bg-blue-100 text-blue-700' :
                                      isAlerta ? 'bg-amber-100 text-amber-700' :
                                      'bg-slate-100 text-slate-700';
                    
                    const textColor = isPositivo ? 'text-green-900' :
                                     isDesenvolvimento ? 'text-blue-900' :
                                     isAlerta ? 'text-amber-900' :
                                     'text-slate-900';
                    
                    return (
                      <div 
                        key={obs.id} 
                        className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${bgColor}`}
                        onClick={() => setSelectedFeedback(obs)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Badge className={`${badgeColor} text-xs`}>
                            {categoria}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {formatDateSP(obs.data_registro, 'DD/MM/YYYY')}
                          </span>
                        </div>
                        <p className={`font-medium text-sm ${textColor} line-clamp-2`}>
                          {obs.titulo || obs.conteudo?.substring(0, 60)}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          Por: {obs.autor_nome}
                        </p>
                        <p className="text-xs text-blue-600 mt-2 font-medium">
                          Toque para ler completo →
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <PDIModal pdi={selectedPDI} open={!!selectedPDI} onClose={() => setSelectedPDI(null)} />
      <FeedbackModal feedback={selectedFeedback} open={!!selectedFeedback} onClose={() => setSelectedFeedback(null)} />
    </div>
  );
}