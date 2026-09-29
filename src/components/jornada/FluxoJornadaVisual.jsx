import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle,
  CheckCircle,
  Eye,
  Zap
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import PainelLateral from '@/components/ui/PainelLateral';

export default function FluxoJornadaVisual({ etapas = [], tratativas = [], _motivos = [] }) {
  const [etapaSelecionada, setEtapaSelecionada] = useState(null);
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);

  // Calcular métricas por etapa
  const metricasPorEtapa = useMemo(() => {
    const metricas = {};
    
    etapas.forEach(etapa => {
      const tratativasDaEtapa = tratativas.filter(t => t.etapa_jornada_id === etapa.id);
      
      metricas[etapa.id] = {
        etapa,
        total: tratativasDaEtapa.length,
        encerradas: tratativasDaEtapa.filter(t => t.status === 'encerrada').length,
        criticas: tratativasDaEtapa.filter(t => t.prioridade === 'critica').length,
        motivosTop: {},
        causasTop: {},
        tempoMedioResolucao: 0,
        taxaSLA: 0
      };

      // Agrupar motivos
      tratativasDaEtapa.forEach(t => {
        if (t.motivo_nome) {
          metricas[etapa.id].motivosTop[t.motivo_nome] = 
            (metricas[etapa.id].motivosTop[t.motivo_nome] || 0) + 1;
        }
        if (t.causa_primaria) {
          metricas[etapa.id].causasTop[t.causa_primaria] = 
            (metricas[etapa.id].causasTop[t.causa_primaria] || 0) + 1;
        }
      });

      // Calcular tempo médio e taxa SLA
      const encerradas = tratativasDaEtapa.filter(t => t.status === 'encerrada' && t.tempo_total_minutos);
      if (encerradas.length > 0) {
        const tempoTotal = encerradas.reduce((sum, t) => sum + (t.tempo_total_minutos || 0), 0);
        metricas[etapa.id].tempoMedioResolucao = Math.round(tempoTotal / encerradas.length);
        
        const dentroSLA = encerradas.filter(t => t.encerrado_no_sla).length;
        metricas[etapa.id].taxaSLA = Math.round((dentroSLA / encerradas.length) * 100);
      }
    });

    return metricas;
  }, [etapas, tratativas]);

  // Calcular intensidade (cor do indicador de atrito)
  const calcularIntensidade = (total, maxTotal) => {
    if (maxTotal === 0) return 0;
    return Math.round((total / maxTotal) * 100);
  };

  const maxTotal = Math.max(...Object.values(metricasPorEtapa).map(m => m.total), 1);

  // Identificar etapa com mais atrito
  const etapaCritica = useMemo(() => {
    return Object.values(metricasPorEtapa).sort((a, b) => b.total - a.total)[0];
  }, [metricasPorEtapa]);

  const causaPrimariaLabels = {
    processo: 'Processo',
    produto_sistema: 'Produto/Sistema',
    comunicacao: 'Comunicação',
    expectativa_cliente: 'Expectativa do Cliente',
    operacao_interna: 'Operação Interna',
    terceiro: 'Terceiro'
  };

  const handleEtapaClick = (etapaId) => {
    const metricas = metricasPorEtapa[etapaId];
    setEtapaSelecionada(metricas);
    setMostrarDetalhes(true);
  };

  return (
    <div className="space-y-8">
      {/* Fluxo Visual — grade responsiva: nada de linha/seta com posição
          absoluta presa a "tudo numa linha só". Isso quebrava o layout
          sempre que os cards não cabiam lado a lado e quebravam pra uma
          segunda linha (a linha e as setas ficavam soltas, sem acompanhar). */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        <AnimatePresence>
          {etapas
            .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
            .map((etapa, index) => {
              const metricas = metricasPorEtapa[etapa.id] || {};
              const intensidade = calcularIntensidade(metricas.total, maxTotal);
              const isCritica = etapaCritica?.etapa?.id === etapa.id;

              return (
                  <motion.div
                    key={etapa.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="col-span-2 sm:col-span-1"
                  >
                    <Card 
                      className={`relative border-2 transition-all cursor-pointer hover:shadow-sm ${
                        isCritica 
                          ? 'border-destructive/30 bg-destructive/10/50' 
                          : intensidade > 60 
                            ? 'border-critical/25 bg-critical-soft/30'
                            : 'border-border hover:border-info/30'
                      }`}
                      onClick={() => handleEtapaClick(etapa.id)}
                    >
                      {isCritica && (
                        <div className="absolute -top-2 -right-2">
                          <Badge className="bg-destructive text-white animate-pulse">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Crítico
                          </Badge>
                        </div>
                      )}

                      {/* Círculo indicador */}
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <div 
                          className="w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: etapa.cor || 'hsl(var(--chart-1))' }}
                        >
                          {index + 1}
                        </div>
                      </div>

                      <CardContent className="pt-8 pb-4">
                        <div className="text-center space-y-3">
                          <h3 className="font-semibold text-foreground">{etapa.nome}</h3>
                          
                          {/* Volume */}
                          <div className="space-y-1">
                            <div className="text-3xl font-bold" style={{ color: etapa.cor || 'hsl(var(--chart-1))' }}>
                              {metricas.total || 0}
                            </div>
                            <p className="text-xs text-muted-foreground">tratativas</p>
                          </div>

                          {/* Indicador de intensidade */}
                          <div className="space-y-1">
                            <div className="w-full bg-muted rounded-full h-2">
                              <motion.div 
                                className={`h-2 rounded-full ${
                                  intensidade > 80 ? 'bg-destructive' :
                                  intensidade > 60 ? 'bg-critical' :
                                  intensidade > 40 ? 'bg-warning' :
                                  'bg-success'
                                }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${intensidade}%` }}
                                transition={{ duration: 0.8, delay: index * 0.1 }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {intensidade}% do volume total
                            </p>
                          </div>

                          {/* Quick Stats */}
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <div className="text-center p-2 bg-muted rounded">
                              <div className="text-sm font-semibold text-foreground">
                                {metricas.criticas || 0}
                              </div>
                              <p className="text-xs text-muted-foreground">críticas</p>
                            </div>
                            <div className="text-center p-2 bg-muted rounded">
                              <div className="text-sm font-semibold text-foreground">
                                {metricas.taxaSLA || 0}%
                              </div>
                              <p className="text-xs text-muted-foreground">SLA</p>
                            </div>
                          </div>

                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEtapaClick(etapa.id);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      {/* Insights e Oportunidades */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="border shadow-none">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Ponto de Maior Atrito</p>
                <p className="text-lg font-bold text-destructive mt-1">
                  {etapaCritica?.etapa?.nome || 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {etapaCritica?.total || 0} casos registrados
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-none">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Taxa Média de SLA</p>
                <p className="text-lg font-bold text-primary mt-1">
                  {Object.values(metricasPorEtapa).length > 0
                    ? Math.round(
                        Object.values(metricasPorEtapa).reduce((sum, m) => sum + (m.taxaSLA || 0), 0) /
                        Object.values(metricasPorEtapa).length
                      )
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Performance geral da jornada
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-none">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Oportunidade de Melhoria</p>
                <p className="text-sm font-semibold text-success mt-1">
                  Automatizar etapa crítica
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pode reduzir até 30% dos casos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalhes da Etapa */}
      <PainelLateral
        open={mostrarDetalhes} onOpenChange={setMostrarDetalhes}
        largura="xl"
        titulo={<><div className="w-6 h-6 rounded-full" style={{ backgroundColor: etapaSelecionada?.etapa?.cor || 'hsl(var(--chart-1))' }} /> {etapaSelecionada?.etapa?.nome}</>}
      >
          {etapaSelecionada && (
            <div className="space-y-6 mt-4">
              {/* Overview */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {etapaSelecionada.total}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Total de Casos</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-success">
                      {etapaSelecionada.encerradas}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Resolvidos</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-destructive">
                      {etapaSelecionada.criticas}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Críticos</p>
                  </CardContent>
                </Card>
              </div>

              {/* Performance */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Taxa de Resolução</span>
                      <span className="font-semibold">
                        {etapaSelecionada.total > 0 
                          ? Math.round((etapaSelecionada.encerradas / etapaSelecionada.total) * 100) 
                          : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={etapaSelecionada.total > 0 
                        ? (etapaSelecionada.encerradas / etapaSelecionada.total) * 100 
                        : 0} 
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Taxa de SLA</span>
                      <span className="font-semibold">{etapaSelecionada.taxaSLA}%</span>
                    </div>
                    <Progress value={etapaSelecionada.taxaSLA} />
                  </div>

                  {etapaSelecionada.tempoMedioResolucao > 0 && (
                    <div className="flex justify-between items-center p-3 bg-info-soft rounded-lg">
                      <span className="text-sm text-muted-foreground">Tempo Médio de Resolução</span>
                      <span className="font-semibold text-primary">
                        {Math.floor(etapaSelecionada.tempoMedioResolucao / 60)}h {etapaSelecionada.tempoMedioResolucao % 60}min
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Motivos */}
              {Object.keys(etapaSelecionada.motivosTop).length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-critical" />
                      Principais Motivos
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(etapaSelecionada.motivosTop)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([motivo, count]) => (
                          <div key={motivo} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm text-foreground">{motivo}</span>
                            <Badge variant="outline">{count} casos</Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Causas Primárias */}
              {Object.keys(etapaSelecionada.causasTop).length > 0 && (
                <Card className="border-0 shadow-sm bg-destructive/10/30">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      Causas Primárias Identificadas
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(etapaSelecionada.causasTop)
                        .sort(([, a], [, b]) => b - a)
                        .map(([causa, count]) => (
                          <div key={causa} className="flex items-center justify-between p-2 bg-card rounded">
                            <span className="text-sm text-foreground">
                              {causaPrimariaLabels[causa] || causa}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-muted rounded-full h-1.5">
                                <div 
                                  className="bg-destructive h-1.5 rounded-full" 
                                  style={{ width: `${(count / etapaSelecionada.total) * 100}%` }}
                                />
                              </div>
                              <Badge className="bg-destructive/10 text-destructive">{count}</Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recomendações */}
              <Card className="border shadow-none">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Recomendações de Melhoria
                  </h4>
                  <ul className="space-y-2 text-sm text-foreground">
                    {etapaSelecionada.total > 10 && (
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Alto volume de casos nesta etapa sugere necessidade de revisão de processo</span>
                      </li>
                    )}
                    {etapaSelecionada.taxaSLA < 80 && (
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Taxa de SLA abaixo do ideal - considere aumentar recursos ou otimizar fluxo</span>
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Identifique padrões nos motivos recorrentes para ações preventivas</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </PainelLateral>
    </div>
  );
}