import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Brain,
  Heart,
  Zap,
  Target,
  Users,
  MessageSquare,
  Award,
  Activity,
  Clock,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { formatDateSP } from '@/components/utils/helpers';

export default function AnaliseProfundaColaborador({
  colaborador,
  apuracoes = [],
  observacoes = [],
  tratativas = [],
  pontuacoes = [],
  respostasPesquisas = [],
  pesquisas = [],
  oraculoLancamentos = []
}) {
  // ============================================
  // CÁLCULOS DE MÉTRICAS
  // ============================================

  // Performance temporal (últimas 5 apurações)
  const evolucaoPerformance = useMemo(() => {
    return apuracoes
      .slice(0, 5)
      .reverse()
      .map(ap => ({
        periodo: `${formatDateSP(ap.periodo_inicio, 'DD/MM')}`,
        csat: ap.canal_telefone?.csat || ap.canal_chat?.csat || 0,
        performance: ap.canal_telefone?.performance || 0,
        cx: ap.avaliacao_cx?.nota_media || 0
      }));
  }, [apuracoes]);

  // Skills médias
  const skillsData = useMemo(() => {
    let totalSoft = 0, countSoft = 0;
    let totalHard = 0, countHard = 0;

    observacoes.forEach(obs => {
      if (obs.soft_skills_avaliadas) {
        Object.values(obs.soft_skills_avaliadas).forEach(val => {
          totalSoft += val;
          countSoft++;
        });
      }
      if (obs.hard_skills_avaliadas) {
        Object.values(obs.hard_skills_avaliadas).forEach(val => {
          totalHard += val;
          countHard++;
        });
      }
    });

    const mediaSoft = countSoft > 0 ? totalSoft / countSoft : 0;
    const mediaHard = countHard > 0 ? totalHard / countHard : 0;

    return { mediaSoft, mediaHard, countSoft, countHard };
  }, [observacoes]);

  const ultimaApuracao = apuracoes[0];
  const ultimoOraculo = oraculoLancamentos[0];

  // Soft/Hard skills do Oráculo (prioridade sobre observações)
  const oraculoSoftMedia = useMemo(() => {
    if (!ultimoOraculo?.soft_skills) return 0;
    const vals = Object.values(ultimoOraculo.soft_skills);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, [ultimoOraculo]);

  const oraculoHardMedia = useMemo(() => {
    if (!ultimoOraculo?.hard_skills) return 0;
    const vals = Object.values(ultimoOraculo.hard_skills);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, [ultimoOraculo]);

  const softSkillDisplay = oraculoSoftMedia > 0 ? oraculoSoftMedia : skillsData.mediaSoft;
  const hardSkillDisplay = oraculoHardMedia > 0 ? oraculoHardMedia : skillsData.mediaHard;

  // Radar de competências
  const radarData = useMemo(() => [
    {
      skill: 'CSAT',
      value: ultimaApuracao?.canal_telefone?.csat || ultimaApuracao?.canal_chat?.csat || 0,
      fullMark: 100
    },
    {
      skill: 'Performance',
      value: ultimaApuracao?.canal_telefone?.performance || 0,
      fullMark: 100
    },
    {
      skill: 'Soft Skills',
      value: softSkillDisplay * 20, // escala 1-5 → 0-100
      fullMark: 100
    },
    {
      skill: 'Hard Skills',
      value: hardSkillDisplay * 20, // escala 1-5 → 0-100
      fullMark: 100
    },
    {
      skill: 'CX',
      value: ultimaApuracao?.avaliacao_cx?.nota_media
        ? (ultimaApuracao.avaliacao_cx.nota_media / 5) * 100
        : 0,
      fullMark: 100
    }
  ], [ultimaApuracao, softSkillDisplay, hardSkillDisplay]);

  // Análise de tratativas
  const tratativasColaborador = useMemo(() => {
    const minhas = tratativas.filter(t => t.agente_responsavel_id === colaborador.id);
    const encerradas = minhas.filter(t => t.status === 'encerrada');
    const dentraSLA = encerradas.filter(t => t.encerrado_no_sla);
    const tempoMedio = encerradas.length > 0
      ? encerradas.reduce((acc, t) => acc + (t.tempo_total_minutos || 0), 0) / encerradas.length
      : 0;

    return {
      total: minhas.length,
      encerradas: encerradas.length,
      dentraSLA: dentraSLA.length,
      taxaSLA: encerradas.length > 0 ? (dentraSLA.length / encerradas.length) * 100 : 0,
      tempoMedioHoras: Math.round(tempoMedio / 60)
    };
  }, [tratativas, colaborador.id]);

  // Análise de pesquisas de clima
  const analiseClimaOrganizacional = useMemo(() => {
    const respostasColaborador = respostasPesquisas.filter(
      r => r.colaborador_id === colaborador.id
    );

    if (respostasColaborador.length === 0) return null;

    const pesquisasClima = pesquisas.filter(
      p => p.categoria === 'clima' || p.categoria === 'engajamento' || p.categoria === 'satisfacao'
    );

    const respostasRelevantes = respostasColaborador.filter(r =>
      pesquisasClima.some(p => p.id === r.pesquisa_id)
    );

    if (respostasRelevantes.length === 0) return null;

    // Calcular média de respostas numéricas
    const respostasNumericas = respostasRelevantes
      .flatMap(r => Object.values(r.respostas || {}))
      .filter(v => typeof v === 'number' && v >= 1 && v <= 10);

    const mediaGeral =
      respostasNumericas.length > 0
        ? respostasNumericas.reduce((acc, v) => acc + v, 0) / respostasNumericas.length
        : null;

    // Identificar respostas negativas (< 5)
    const respostasNegativas = respostasNumericas.filter(v => v < 5).length;
    const percentualNegativo = respostasNumericas.length > 0
      ? (respostasNegativas / respostasNumericas.length) * 100
      : 0;

    return {
      mediaGeral,
      totalRespostas: respostasRelevantes.length,
      percentualNegativo,
      ultimaResposta: respostasRelevantes[0]?.created_date
    };
  }, [respostasPesquisas, pesquisas, colaborador.id]);

  // ============================================
  // GERAÇÃO DE ALERTAS INTELIGENTES
  // ============================================

  const alertasInteligentes = useMemo(() => {
    const alertas = [];

    // Alerta: Performance em queda
    if (evolucaoPerformance.length >= 3) {
      const ultimas3 = evolucaoPerformance.slice(-3);
      const quedaPerformance = ultimas3.every(
        (val, idx) => idx === 0 || val.csat < ultimas3[idx - 1].csat
      );

      if (quedaPerformance) {
        alertas.push({
          tipo: 'warning',
          categoria: 'Performance',
          titulo: 'CSAT em queda consistente',
          descricao: 'As últimas 3 apurações mostram declínio contínuo no CSAT',
          acao: 'Agendar 1:1 para entender dificuldades e oferecer suporte',
          prioridade: 'alta',
          icon: TrendingDown
        });
      }
    }

    // Alerta: Clima organizacional negativo
    if (analiseClimaOrganizacional && analiseClimaOrganizacional.percentualNegativo > 40) {
      alertas.push({
        tipo: 'critical',
        categoria: 'Engajamento',
        titulo: 'Sinais de insatisfação nas pesquisas',
        descricao: `${analiseClimaOrganizacional.percentualNegativo.toFixed(0)}% das respostas indicam insatisfação`,
        acao: 'Realizar conversa individual sobre bem-estar e motivação',
        prioridade: 'crítica',
        icon: AlertTriangle
      });
    }

    // Alerta: Baixo CSAT
    const csatAtual = ultimaApuracao?.canal_telefone?.csat || ultimaApuracao?.canal_chat?.csat || 0;
    if (csatAtual < 70) {
      alertas.push({
        tipo: 'warning',
        categoria: 'Qualidade',
        titulo: 'CSAT abaixo da meta (70%)',
        descricao: `CSAT atual: ${csatAtual.toFixed(1)}%`,
        acao: 'Revisar scripts, treinamento em empatia e técnicas de atendimento',
        prioridade: 'alta',
        icon: ThumbsDown
      });
    }

    // Alerta: Poucos tratamentos
    if (tratativasColaborador.total < 10 && apuracoes.length > 0) {
      alertas.push({
        tipo: 'info',
        categoria: 'Produtividade',
        titulo: 'Baixo volume de tratativas',
        descricao: `Apenas ${tratativasColaborador.total} tratativas registradas`,
        acao: 'Verificar distribuição de demanda e capacidade operacional',
        prioridade: 'média',
        icon: Activity
      });
    }

    // Alerta: SLA crítico
    if (tratativasColaborador.taxaSLA < 80 && tratativasColaborador.encerradas > 5) {
      alertas.push({
        tipo: 'warning',
        categoria: 'SLA',
        titulo: 'Taxa de SLA abaixo do esperado',
        descricao: `${tratativasColaborador.taxaSLA.toFixed(0)}% de cumprimento (meta: 80%)`,
        acao: 'Revisar processos e identificar gargalos operacionais',
        prioridade: 'alta',
        icon: Clock
      });
    }

    // Alerta: Skills técnicas baixas
    if (skillsData.mediaHard < 5 && skillsData.countHard > 0) {
      alertas.push({
        tipo: 'info',
        categoria: 'Desenvolvimento',
        titulo: 'Hard Skills abaixo da média',
        descricao: `Média de ${skillsData.mediaHard.toFixed(1)}/10 em competências técnicas`,
        acao: 'Oferecer treinamentos e capacitação técnica direcionada',
        prioridade: 'média',
        icon: Brain
      });
    }

    // Alerta positivo: Desempenho excepcional
    if (csatAtual >= 90 && tratativasColaborador.taxaSLA >= 95) {
      alertas.push({
        tipo: 'success',
        categoria: 'Destaque',
        titulo: 'Performance excepcional',
        descricao: 'CSAT e SLA acima de 90%',
        acao: 'Reconhecer publicamente e considerar como mentor',
        prioridade: 'positiva',
        icon: Award
      });
    }

    return alertas;
  }, [
    evolucaoPerformance,
    analiseClimaOrganizacional,
    ultimaApuracao,
    tratativasColaborador,
    skillsData
  ]);

  // ============================================
  // INSIGHTS ESTRATÉGICOS (IA)
  // ============================================

  const insightsEstrategicos = useMemo(() => {
    const insights = [];

    // Insight: Tendência de crescimento
    if (evolucaoPerformance.length >= 3) {
      const ultimas3 = evolucaoPerformance.slice(-3);
      const crescimento = ultimas3.every(
        (val, idx) => idx === 0 || val.csat > ultimas3[idx - 1].csat
      );

      if (crescimento) {
        insights.push({
          tipo: 'positivo',
          titulo: 'Trajetória de melhoria contínua',
          descricao:
            'O colaborador apresenta evolução consistente em CSAT nas últimas apurações, indicando comprometimento e adaptação às práticas de qualidade.',
          recomendacao: 'Considerar para projetos de mentoria ou compartilhamento de boas práticas.'
        });
      }
    }

    // Insight: Equilíbrio entre hard e soft skills
    if (skillsData.countSoft > 0 && skillsData.countHard > 0) {
      const diferenca = Math.abs(skillsData.mediaSoft - skillsData.mediaHard);
      if (diferenca > 2) {
        const predominante = skillsData.mediaSoft > skillsData.mediaHard ? 'soft' : 'hard';
        insights.push({
          tipo: 'neutro',
          titulo: `Perfil predominantemente ${predominante === 'soft' ? 'comportamental' : 'técnico'}`,
          descricao: `Há um desequilíbrio entre soft skills (${skillsData.mediaSoft.toFixed(1)}) e hard skills (${skillsData.mediaHard.toFixed(1)}).`,
          recomendacao: `Investir em desenvolvimento de ${predominante === 'soft' ? 'competências técnicas' : 'habilidades comportamentais'} para criar perfil mais completo.`
        });
      } else {
        insights.push({
          tipo: 'positivo',
          titulo: 'Perfil equilibrado e versátil',
          descricao:
            'O colaborador demonstra equilíbrio entre competências técnicas e comportamentais, um perfil valioso para liderança e resolução de problemas complexos.',
          recomendacao: 'Perfil ideal para projetos estratégicos e tomada de decisões.'
        });
      }
    }

    // Insight: Velocidade de resolução
    if (tratativasColaborador.tempoMedioHoras > 0) {
      if (tratativasColaborador.tempoMedioHoras < 12) {
        insights.push({
          tipo: 'positivo',
          titulo: 'Alta eficiência operacional',
          descricao: `Tempo médio de resolução: ${tratativasColaborador.tempoMedioHoras}h - significativamente abaixo da média.`,
          recomendacao: 'Mapear metodologia e replicar como best practice para equipe.'
        });
      } else if (tratativasColaborador.tempoMedioHoras > 24) {
        insights.push({
          tipo: 'atencao',
          titulo: 'Oportunidade de otimização de processos',
          descricao: `Tempo médio de ${tratativasColaborador.tempoMedioHoras}h sugere possíveis gargalos.`,
          recomendacao: 'Investigar etapas do processo e identificar pontos de melhoria.'
        });
      }
    }

    // Insight: Engajamento em pesquisas
    if (analiseClimaOrganizacional) {
      if (analiseClimaOrganizacional.mediaGeral >= 8) {
        insights.push({
          tipo: 'positivo',
          titulo: 'Alto nível de engajamento e satisfação',
          descricao: `Média ${analiseClimaOrganizacional.mediaGeral.toFixed(1)}/10 nas pesquisas de clima.`,
          recomendacao: 'Colaborador alinhado com cultura organizacional - potencial embaixador.'
        });
      } else if (analiseClimaOrganizacional.mediaGeral < 5) {
        insights.push({
          tipo: 'atencao',
          titulo: 'Sinais de desengajamento detectados',
          descricao: 'Respostas nas pesquisas indicam possível insatisfação ou desmotivação.',
          recomendacao: 'Ação prioritária: conversa individual para entender expectativas e dificuldades.'
        });
      }
    }

    return insights;
  }, [evolucaoPerformance, skillsData, tratativasColaborador, analiseClimaOrganizacional]);

  // ============================================
  // INDICADORES COMPORTAMENTAIS
  // ============================================

  const indicadoresComportamentais = useMemo(() => {
    const indicadores = [];

    // Análise SWOT das observações
    const swotCompleto = observacoes.find(obs => obs.analise_swot);
    if (swotCompleto?.analise_swot) {
      indicadores.push({
        tipo: 'swot',
        titulo: 'Análise SWOT',
        dados: swotCompleto.analise_swot
      });
    }

    // Frequência de feedback
    const feedbackRecente = observacoes.filter(obs => {
      const dataObs = new Date(obs.created_date);
      const dias90Atras = new Date();
      dias90Atras.setDate(dias90Atras.getDate() - 90);
      return dataObs >= dias90Atras;
    }).length;

    indicadores.push({
      tipo: 'feedback',
      titulo: 'Frequência de Feedback',
      valor: feedbackRecente,
      descricao: `${feedbackRecente} observações nos últimos 90 dias`,
      status: feedbackRecente >= 3 ? 'positivo' : feedbackRecente >= 1 ? 'neutro' : 'atencao'
    });

    // Consistência
    const desvioCSAT =
      evolucaoPerformance.length >= 3
        ? Math.max(...evolucaoPerformance.map(e => e.csat)) -
          Math.min(...evolucaoPerformance.map(e => e.csat))
        : 0;

    indicadores.push({
      tipo: 'consistencia',
      titulo: 'Consistência de Performance',
      valor: desvioCSAT,
      descricao: `Variação de ${desvioCSAT.toFixed(1)}pp em CSAT`,
      status: desvioCSAT < 10 ? 'positivo' : desvioCSAT < 20 ? 'neutro' : 'atencao'
    });

    return indicadores;
  }, [observacoes, evolucaoPerformance]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header do Colaborador */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={colaborador?.foto_url} />
              <AvatarFallback className="bg-info-soft text-primary text-xl">
                {colaborador?.nome_completo?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl">{colaborador.nome_completo}</CardTitle>
              <CardDescription className="text-base mt-1">
                {colaborador.cargo_atual} • Admissão: {formatDateSP(colaborador.data_admissao, 'DD/MM/YYYY')}
              </CardDescription>
            </div>
            {colaborador.is_facilitador_interno && (
              <Badge className="bg-primary">
                <Sparkles className="w-3 h-3 mr-1" />
                Facilitador Interno
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Alertas Inteligentes */}
      {alertasInteligentes.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning" />
              Alertas Inteligentes
            </CardTitle>
            <CardDescription>Sinais identificados automaticamente que requerem atenção</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertasInteligentes.map((alerta, idx) => (
              <Alert
                key={idx}
                className={
                  alerta.tipo === 'critical'
                    ? 'border-destructive/30 bg-destructive/10'
                    : alerta.tipo === 'warning'
                    ? 'border-warning/30 bg-warning-soft'
                    : alerta.tipo === 'success'
                    ? 'border-success/30 bg-success-soft'
                    : 'border-info/30 bg-info-soft'
                }
              >
                <div className="flex items-start gap-3">
                  <alerta.icon
                    className={`w-5 h-5 mt-0.5 ${
                      alerta.tipo === 'critical'
                        ? 'text-destructive'
                        : alerta.tipo === 'warning'
                        ? 'text-warning'
                        : alerta.tipo === 'success'
                        ? 'text-success'
                        : 'text-primary'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{alerta.titulo}</p>
                      <Badge variant="outline" className="text-xs">
                        {alerta.categoria}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{alerta.descricao}</p>
                    <p className="text-xs font-medium flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Ação sugerida: {alerta.acao}
                    </p>
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Grid Principal: Radar + Indicadores */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Radar de Competências */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Radar de Competências</CardTitle>
            <CardDescription>Visão 360° do perfil profissional</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: '#64748b', fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Radar
                  name={colaborador.nome_completo}
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>

            {/* Métricas do Radar */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 bg-info-soft rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">CSAT</p>
                <p className="text-2xl font-bold text-primary">
                  {(ultimaApuracao?.canal_telefone?.csat || ultimaApuracao?.canal_chat?.csat || 0).toFixed(1)}%
                </p>
              </div>
              {ultimaApuracao?.canal_telefone?.performance && (
                <div className="p-3 bg-info-soft rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Performance</p>
                  <p className="text-2xl font-bold text-primary">
                    {ultimaApuracao.canal_telefone.performance.toFixed(1)}%
                  </p>
                </div>
              )}
              {softSkillDisplay > 0 && (
                <div className="p-3 bg-success-soft rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Soft Skills</p>
                  <p className="text-2xl font-bold text-success">{softSkillDisplay.toFixed(1)}/5</p>
                </div>
              )}
              {hardSkillDisplay > 0 && (
                <div className="p-3 bg-warning-soft rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Hard Skills</p>
                  <p className="text-2xl font-bold text-warning">{hardSkillDisplay.toFixed(1)}/5</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Indicadores Comportamentais */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Indicadores Comportamentais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {indicadoresComportamentais.map((ind, idx) => (
              <div key={idx}>
                {ind.tipo === 'swot' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-success-soft rounded-lg border border-success/25">
                      <p className="text-xs font-semibold text-success mb-2">Forças</p>
                      <ul className="text-xs text-success space-y-1">
                        {ind.dados.forcas?.slice(0, 2).map((f, i) => (
                          <li key={i}>• {f}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/25">
                      <p className="text-xs font-semibold text-destructive mb-2">Fraquezas</p>
                      <ul className="text-xs text-destructive space-y-1">
                        {ind.dados.fraquezas?.slice(0, 2).map((f, i) => (
                          <li key={i}>• {f}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 bg-info-soft rounded-lg border border-info/25">
                      <p className="text-xs font-semibold text-primary mb-2">Oportunidades</p>
                      <ul className="text-xs text-primary space-y-1">
                        {ind.dados.oportunidades?.slice(0, 2).map((o, i) => (
                          <li key={i}>• {o}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 bg-warning-soft rounded-lg border border-warning/25">
                      <p className="text-xs font-semibold text-warning mb-2">Ameaças</p>
                      <ul className="text-xs text-warning space-y-1">
                        {ind.dados.ameacas?.slice(0, 2).map((a, i) => (
                          <li key={i}>• {a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {ind.tipo === 'feedback' && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{ind.titulo}</p>
                        <p className="text-xs text-muted-foreground">{ind.descricao}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        ind.status === 'positivo'
                          ? 'bg-success-soft text-success border-success/25'
                          : ind.status === 'atencao'
                          ? 'bg-destructive/10 text-destructive border-destructive/25'
                          : ''
                      }
                    >
                      {ind.valor}
                    </Badge>
                  </div>
                )}

                {ind.tipo === 'consistencia' && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">{ind.titulo}</p>
                      <Badge
                        variant="outline"
                        className={
                          ind.status === 'positivo'
                            ? 'bg-success-soft text-success border-success/25'
                            : ind.status === 'atencao'
                            ? 'bg-warning-soft text-warning border-warning/25'
                            : ''
                        }
                      >
                        {ind.status === 'positivo' ? 'Consistente' : 'Variável'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{ind.descricao}</p>
                    <Progress
                      value={ind.status === 'positivo' ? 90 : ind.status === 'neutro' ? 60 : 30}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Evolução Temporal */}
      {evolucaoPerformance.length >= 2 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Evolução Temporal de Performance
            </CardTitle>
            <CardDescription>Tendência das últimas {evolucaoPerformance.length} apurações</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={evolucaoPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="csat" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="CSAT" />
                <Area type="monotone" dataKey="performance" stackId="2" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="Performance" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Insights Estratégicos */}
      {insightsEstrategicos.length > 0 && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Insights Estratégicos (IA)
            </CardTitle>
            <CardDescription>Análise inteligente para tomada de decisão</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insightsEstrategicos.map((insight, idx) => (
              <div key={idx} className="p-4 bg-card rounded-lg border border-indigo-100">
                <div className="flex items-start gap-3">
                  {insight.tipo === 'positivo' && <CheckCircle className="w-5 h-5 text-success mt-0.5" />}
                  {insight.tipo === 'atencao' && <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />}
                  {insight.tipo === 'neutro' && <Activity className="w-5 h-5 text-primary mt-0.5" />}
                  <div className="flex-1">
                    <p className="font-semibold text-sm mb-1">{insight.titulo}</p>
                    <p className="text-sm text-foreground mb-2">{insight.descricao}</p>
                    <div className="p-2 bg-info-soft rounded border border-indigo-200">
                      <p className="text-xs font-medium text-primary">
                        Recomendação: {insight.recomendacao}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Oráculo CRC */}
      {ultimoOraculo && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Oráculo CRC — Avaliação Comportamental
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {formatDateSP(ultimoOraculo.data_lancamento, 'DD/MM/YYYY')} · por {ultimoOraculo.gestor_nome}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {ultimoOraculo.texto_livre && (
              <div className="p-4 bg-card rounded-lg border border-purple-100">
                <p className="text-sm text-foreground italic">"{ultimoOraculo.texto_livre}"</p>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              {ultimoOraculo.soft_skills && (
                <div>
                  <p className="text-xs font-semibold text-primary mb-2">Soft Skills</p>
                  <div className="space-y-2">
                    {Object.entries(ultimoOraculo.soft_skills).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{k}</span>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={`w-3 h-3 rounded-full ${i <= v ? 'bg-primary' : 'bg-muted'}`} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ultimoOraculo.hard_skills && (
                <div>
                  <p className="text-xs font-semibold text-primary mb-2">Hard Skills</p>
                  <div className="space-y-2">
                    {Object.entries(ultimoOraculo.hard_skills).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{k}</span>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={`w-3 h-3 rounded-full ${i <= v ? 'bg-primary' : 'bg-muted'}`} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {ultimoOraculo.contexto_performance && (
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-purple-100">
                <div className="text-center">
                  <p className="text-lg font-bold text-primary">{ultimoOraculo.contexto_performance.csat_recente?.toFixed(1) ?? '-'}%</p>
                  <p className="text-xs text-muted-foreground">CSAT</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-primary">{ultimoOraculo.contexto_performance.tratativas_periodo ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">Tratativas</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-primary">{ultimoOraculo.contexto_performance.pontos_trimestre ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">Pts Trimestre</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Métricas de Tratativas */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Métricas Operacionais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-info-soft rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Tratativas</p>
              <p className="text-3xl font-bold text-primary">{tratativasColaborador.total}</p>
            </div>
            <div className="text-center p-4 bg-success-soft rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Encerradas</p>
              <p className="text-3xl font-bold text-success">{tratativasColaborador.encerradas}</p>
            </div>
            <div className="text-center p-4 bg-info-soft rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Taxa SLA</p>
              <p className="text-3xl font-bold text-primary">{tratativasColaborador.taxaSLA.toFixed(0)}%</p>
            </div>
            <div className="text-center p-4 bg-warning-soft rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Tempo Médio</p>
              <p className="text-3xl font-bold text-warning">{tratativasColaborador.tempoMedioHoras}h</p>
            </div>
            {analiseClimaOrganizacional && (
              <div className="text-center p-4 bg-info-soft rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Clima/Engajamento</p>
                <p className="text-3xl font-bold text-primary">
                  {analiseClimaOrganizacional.mediaGeral?.toFixed(1) || '-'}/10
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}