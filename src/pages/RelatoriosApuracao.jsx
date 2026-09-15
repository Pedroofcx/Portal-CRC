import db from '@/api/db';
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { formatDateSP } from '@/components/utils/helpers';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Phone, MessageSquare, TrendingUp, Calendar, Users } from 'lucide-react';
import { agruparDadosPorSemana } from '@/components/apuracao/calculosApuracao';

export default function RelatoriosApuracao() {
  const [filtroCanal, setFiltroCanal] = useState('telefone');
  const [filtroPeriodo, setFiltroPeriodo] = useState('mensal');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroColaborador, setFiltroColaborador] = useState('todos');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: apuracoes = [], isLoading } = useQuery({
    queryKey: ['apuracoes-completas'],
    queryFn: () => db.entities.Apuracao.list('-created_date', 200),
  });

  const colaborador = colaboradores.find(c => c.email === user?.email);

  // CONSOLIDAÇÃO POR SEMANA (seg→sex) — para aba "Resultados Consolidados"
  const consolidadoSemanal = useMemo(() => {
    if (!apuracoes.length) return [];
    // Agrupar todas as apurações do filtro de colaborador
    const filtered = apuracoes.filter(ap => {
      if (filtroColaborador !== 'todos' && ap.colaborador_id !== filtroColaborador) return false;
      return true;
    });
    const todasAsDatas = [];
    filtered.forEach(ap => {
      (ap.dados_por_data || []).forEach(dia => {
        const dataN = dia.data?.split('T')[0];
        if (!dataN) return;
        if (filtroDataInicio && dataN < filtroDataInicio) return;
        if (filtroDataFim && dataN > filtroDataFim) return;
        todasAsDatas.push(dia);
      });
    });
    return agruparDadosPorSemana(todasAsDatas);
  }, [apuracoes, filtroColaborador, filtroDataInicio, filtroDataFim]);

  // FILTRAR E PROCESSAR DADOS
  const dadosFiltrados = useMemo(() => {
    if (!apuracoes.length) return [];

    return apuracoes.filter(ap => {
      // Filtro por canal
      if (filtroCanal === 'telefone' && ap.tipo_apuracao !== 'telefone') return false;
      if (filtroCanal === 'chat' && ap.tipo_apuracao !== 'chat') return false;
      
      // Filtro por colaborador
      if (filtroColaborador !== 'todos' && ap.colaborador_id !== filtroColaborador) return false;
      
      // Verificar se tem dados no período (quando filtro de data ativo)
      if ((filtroDataInicio || filtroDataFim) && ap.dados_por_data && ap.dados_por_data.length > 0) {
        const temDadosNoPeriodo = ap.dados_por_data.some(dia => {
          const dataNormalizada = dia.data.includes('T') ? dia.data.split('T')[0] : dia.data;
          const dentroInicio = !filtroDataInicio || dataNormalizada >= filtroDataInicio;
          const dentroFim = !filtroDataFim || dataNormalizada <= filtroDataFim;
          return dentroInicio && dentroFim;
        });
        if (!temDadosNoPeriodo) return false;
      }
      
      return true;
    });
  }, [apuracoes, filtroCanal, filtroColaborador, filtroDataInicio, filtroDataFim]);

  // AGREGAR DADOS POR DATA DINAMICAMENTE
  const dadosAgregados = useMemo(() => {
    if (!dadosFiltrados.length) return [];

    const agregacao = {};

    dadosFiltrados.forEach(ap => {
      if (!ap.dados_por_data || ap.dados_por_data.length === 0) return;

      const colaboradorNome = ap.colaborador_nome;
      
      ap.dados_por_data.forEach(dia => {
        const data = dia.data;
        
        // Aplicar filtro de data (normalizar para YYYY-MM-DD)
        const dataNormalizada = data.includes('T') ? data.split('T')[0] : data;
        if (filtroDataInicio && dataNormalizada < filtroDataInicio) return;
        if (filtroDataFim && dataNormalizada > filtroDataFim) return;

        // Agrupar por período
        let chave;
        if (filtroPeriodo === 'diario') {
          chave = data;
        } else if (filtroPeriodo === 'semanal') {
          // Semana operacional: seg→sex
          const partes = dataNormalizada.split('-');
          const dataObj = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
          const diaSemana = dataObj.getDay();
          const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
          dataObj.setDate(dataObj.getDate() + diff);
          const y = dataObj.getFullYear();
          const m = String(dataObj.getMonth() + 1).padStart(2, '0');
          const d = String(dataObj.getDate()).padStart(2, '0');
          chave = `${y}-${m}-${d}`;
        } else if (filtroPeriodo === 'mensal') {
          chave = data.substring(0, 7); // YYYY-MM
        }

        const agenteChave = `${colaboradorNome}_${chave}`;

        if (!agregacao[agenteChave]) {
          agregacao[agenteChave] = {
            agente: colaboradorNome,
            periodo: chave,
            telefone: {
              total_ligacoes: 0,
              total_atendidas: 0,
              total_avaliadas: 0,
              total_positivas: 0,
              nota4: 0,
              nota5: 0,
              transferencias: 0
            },
            chat: {
              total_chats: 0,
              total_avaliados: 0,
              total_positivos: 0
            }
          };
        }

        const agg = agregacao[agenteChave];

        // Agregar telefone
        if (dia.telefone) {
          agg.telefone.total_ligacoes += dia.telefone.total_ligacoes || 0;
          agg.telefone.total_atendidas += dia.telefone.total_atendidas || 0;
          agg.telefone.total_avaliadas += dia.telefone.total_avaliadas || 0;
          agg.telefone.total_positivas += dia.telefone.total_positivas || 0;
          agg.telefone.nota4 += dia.telefone.nota4 || 0;
          agg.telefone.nota5 += dia.telefone.nota5 || 0;
          agg.telefone.transferencias += dia.telefone.transferencias || 0;
        }

        // Agregar chat
        if (dia.chat) {
          agg.chat.total_chats += dia.chat.total_chats || 0;
          agg.chat.total_avaliados += dia.chat.total_avaliados || 0;
          agg.chat.total_positivos += dia.chat.total_positivos || 0;
        }
      });
    });

    // Calcular métricas finais
    return Object.values(agregacao).map(agg => {
      // Telefone
      agg.telefone.performance = agg.telefone.total_ligacoes > 0
        ? (agg.telefone.total_atendidas / agg.telefone.total_ligacoes) * 100
        : 0;
      
      agg.telefone.csat = agg.telefone.total_avaliadas > 0
        ? (agg.telefone.total_positivas / agg.telefone.total_avaliadas) * 100
        : 0;
      
      agg.telefone.percentual_avaliados = agg.telefone.total_atendidas > 0
        ? (agg.telefone.total_avaliadas / agg.telefone.total_atendidas) * 100
        : 0;

      // Chat
      agg.chat.csat = agg.chat.total_avaliados > 0
        ? (agg.chat.total_positivos / agg.chat.total_avaliados) * 100
        : 0;
      
      agg.chat.percentual_avaliados = agg.chat.total_chats > 0
        ? (agg.chat.total_avaliados / agg.chat.total_chats) * 100
        : 0;

      return agg;
    }).sort((a, b) => a.periodo.localeCompare(b.periodo));
  }, [dadosFiltrados, filtroPeriodo, filtroDataInicio, filtroDataFim]);

  // CONSOLIDAÇÃO ESTRATÉGICA
  const consolidacao = useMemo(() => {
    if (!dadosAgregados.length) return null;

    let totalPerformance = 0;
    let countPerformance = 0;
    let totalCSATTelefone = 0;
    let countCSATTelefone = 0;
    let totalCSATChat = 0;
    let countCSATChat = 0;
    let totalAvaliadosTelefone = 0;
    let countAvaliadosTelefone = 0;
    let totalAvaliadosChat = 0;
    let countAvaliadosChat = 0;

    dadosAgregados.forEach(agg => {
      if (agg.telefone.total_ligacoes > 0) {
        totalPerformance += agg.telefone.performance;
        countPerformance++;
      }
      
      if (agg.telefone.total_avaliadas > 0) {
        totalCSATTelefone += agg.telefone.csat;
        countCSATTelefone++;
      }
      
      if (agg.telefone.total_atendidas > 0) {
        totalAvaliadosTelefone += agg.telefone.percentual_avaliados;
        countAvaliadosTelefone++;
      }

      if (agg.chat.total_avaliados > 0) {
        totalCSATChat += agg.chat.csat;
        countCSATChat++;
      }
      
      if (agg.chat.total_chats > 0) {
        totalAvaliadosChat += agg.chat.percentual_avaliados;
        countAvaliadosChat++;
      }
    });

    const performanceMedia = countPerformance > 0 ? totalPerformance / countPerformance : 0;
    const csatTelefoneMedia = countCSATTelefone > 0 ? totalCSATTelefone / countCSATTelefone : 0;
    const csatChatMedia = countCSATChat > 0 ? totalCSATChat / countCSATChat : 0;
    const avaliadosTelefoneMedia = countAvaliadosTelefone > 0 ? totalAvaliadosTelefone / countAvaliadosTelefone : 0;
    const avaliadosChatMedia = countAvaliadosChat > 0 ? totalAvaliadosChat / countAvaliadosChat : 0;

    // Satisfação média (todos os canais)
    let satisfacaoMedia = 0;
    let countCanais = 0;
    if (countCSATTelefone > 0) {
      satisfacaoMedia += csatTelefoneMedia;
      countCanais++;
    }
    if (countCSATChat > 0) {
      satisfacaoMedia += csatChatMedia;
      countCanais++;
    }
    satisfacaoMedia = countCanais > 0 ? satisfacaoMedia / countCanais : 0;

    // Percentual médio de avaliados
    let avaliadosMedia = 0;
    let countAvaliados = 0;
    if (countAvaliadosTelefone > 0) {
      avaliadosMedia += avaliadosTelefoneMedia;
      countAvaliados++;
    }
    if (countAvaliadosChat > 0) {
      avaliadosMedia += avaliadosChatMedia;
      countAvaliados++;
    }
    avaliadosMedia = countAvaliados > 0 ? avaliadosMedia / countAvaliados : 0;

    return {
      performanceMedia,
      satisfacaoMedia,
      avaliadosMedia,
      csatTelefoneMedia,
      csatChatMedia
    };
  }, [dadosAgregados]);

  if (!user || !colaborador) {
    return <LoadingSpinner text="Carregando dados..." />;
  }

  if (isLoading) {
    return <LoadingSpinner text="Carregando apurações..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Relatórios de Apuração"
        subtitle="Análise dinâmica por data e período"
        icon={BarChart3}
      />

      {/* Filtros */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Filtros de Análise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Canal</Label>
              <Select value={filtroCanal} onValueChange={setFiltroCanal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="ambos">Ambos os Canais</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Período</Label>
              <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Diário</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Agente</Label>
              <Select value={filtroColaborador} onValueChange={setFiltroColaborador}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Agentes</SelectItem>
                  {colaboradores.filter(c => c.papel === 'agente' && c.ativo).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Intervalo Personalizado</Label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                  className="border rounded px-2 py-1 text-sm flex-1"
                />
                <input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                  className="border rounded px-2 py-1 text-sm flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="telefone" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="telefone">
            <Phone className="w-4 h-4 mr-2" />
            Ligações
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="resultado">
            <TrendingUp className="w-4 h-4 mr-2" />
            Resultados Consolidados
          </TabsTrigger>
        </TabsList>

        {/* ABA TELEFONE */}
        <TabsContent value="telefone">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Tabela de Ligações por Agente</CardTitle>
            </CardHeader>
            <CardContent>
              {dadosAgregados.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum dado disponível para os filtros selecionados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium">Agente</th>
                        <th className="text-left p-3 font-medium">Período</th>
                        <th className="text-center p-3 font-medium">Total Lig.</th>
                        <th className="text-center p-3 font-medium">Atendidas</th>
                        <th className="text-center p-3 font-medium">Avaliadas</th>
                        <th className="text-center p-3 font-medium">Nota 4</th>
                        <th className="text-center p-3 font-medium">Nota 5</th>
                        <th className="text-center p-3 font-medium">Positivas (4+5)</th>
                        <th className="text-center p-3 font-medium">Transf.</th>
                        <th className="text-center p-3 font-medium">Perf. %</th>
                        <th className="text-center p-3 font-medium">% Aval.</th>
                        <th className="text-center p-3 font-medium">CSAT %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosAgregados.map((agg, idx) => (
                        <tr key={idx} className="border-t hover:bg-muted">
                          <td className="p-3 font-medium whitespace-nowrap">{agg.agente}</td>
                          <td className="p-3 whitespace-nowrap">{agg.periodo}</td>
                          <td className="text-center p-3">{agg.telefone.total_ligacoes}</td>
                          <td className="text-center p-3">{agg.telefone.total_atendidas}</td>
                          <td className="text-center p-3">{agg.telefone.total_avaliadas}</td>
                          <td className="text-center p-3">{agg.telefone.nota4 || 0}</td>
                          <td className="text-center p-3">{agg.telefone.nota5 || 0}</td>
                          <td className="text-center p-3 font-medium">{agg.telefone.total_positivas}</td>
                          <td className="text-center p-3">
                            <Badge variant="outline" className="bg-warning-soft text-warning border-warning/30">
                              {agg.telefone.transferencias}
                            </Badge>
                          </td>
                          <td className="text-center p-3">
                            <Badge variant="outline" className="bg-success-soft text-success">{agg.telefone.performance.toFixed(1)}%</Badge>
                          </td>
                          <td className="text-center p-3">
                            <Badge variant="outline" className="bg-warning-soft text-warning">{agg.telefone.percentual_avaliados.toFixed(1)}%</Badge>
                          </td>
                          <td className="text-center p-3">
                            <Badge variant="outline" className="bg-info-soft text-primary">{agg.telefone.csat.toFixed(1)}%</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {dadosAgregados.length > 0 && (
                <div className="mt-4 p-3 bg-warning-soft border border-warning/25 rounded-lg text-sm">
                  <span className="font-medium">Transferências totais (excluídas dos cálculos de avaliação): </span>
                  <span className="font-bold text-warning">{dadosAgregados.reduce((acc, agg) => acc + (agg.telefone.transferencias || 0), 0)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA CHAT */}
        <TabsContent value="chat">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Tabela de Chat por Agente</CardTitle>
            </CardHeader>
            <CardContent>
              {dadosAgregados.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium">Agente</th>
                        <th className="text-left p-3 font-medium">Período</th>
                        <th className="text-center p-3 font-medium">Total Chats</th>
                        <th className="text-center p-3 font-medium">Avaliados</th>
                        <th className="text-center p-3 font-medium">Positivos</th>
                        <th className="text-center p-3 font-medium">% Avaliados</th>
                        <th className="text-center p-3 font-medium">CSAT (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosAgregados.map((agg, idx) => (
                        <tr key={idx} className="border-t hover:bg-muted">
                          <td className="p-3 font-medium">{agg.agente}</td>
                          <td className="p-3">{agg.periodo}</td>
                          <td className="text-center p-3">{agg.chat.total_chats}</td>
                          <td className="text-center p-3">{agg.chat.total_avaliados}</td>
                          <td className="text-center p-3">{agg.chat.total_positivos}</td>
                          <td className="text-center p-3">
                            <Badge variant="outline">{agg.chat.percentual_avaliados.toFixed(1)}%</Badge>
                          </td>
                          <td className="text-center p-3">
                            <Badge variant="outline">{agg.chat.csat.toFixed(1)}%</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA CONSOLIDAÇÃO */}
        <TabsContent value="resultado">
          <div className="space-y-6">
            {/* KPIs resumo */}
            {consolidacao && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="bg-info-soft border-info/25">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Performance Telefone</p>
                    <p className="text-3xl font-bold text-primary">{consolidacao.performanceMedia.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Média do período</p>
                  </CardContent>
                </Card>
                <Card className="bg-success-soft border-success/25">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Satisfação Média (Ambos Canais)</p>
                    <p className="text-3xl font-bold text-success">{consolidacao.satisfacaoMedia.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">(CSAT Tel + CSAT Chat) / 2</p>
                  </CardContent>
                </Card>
                <Card className="bg-info-soft border-info/25">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">% Avaliados Consolidado</p>
                    <p className="text-3xl font-bold text-primary">{consolidacao.avaliadosMedia.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">(% Aval. Tel + % Aval. Chat) / 2</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted border-border">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">CSAT Telefone</p>
                    <p className="text-3xl font-bold text-foreground">{consolidacao.csatTelefoneMedia.toFixed(1)}%</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted border-border">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">CSAT Chat</p>
                    <p className="text-3xl font-bold text-foreground">{consolidacao.csatChatMedia.toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabela semanal consolidada */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Resultados Consolidados por Semana (seg→sex)</CardTitle>
              </CardHeader>
              <CardContent>
                {consolidadoSemanal.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">Período</th>
                          <th className="text-center p-3 font-medium bg-info-soft">Tel: Ligações</th>
                          <th className="text-center p-3 font-medium bg-info-soft">Tel: Atendidas</th>
                          <th className="text-center p-3 font-medium bg-info-soft">Tel: Avaliadas</th>
                          <th className="text-center p-3 font-medium bg-info-soft">Tel: Positivas</th>
                          <th className="text-center p-3 font-medium bg-info-soft">Tel: CSAT %</th>
                          <th className="text-center p-3 font-medium bg-info-soft">Tel: % Aval.</th>
                          <th className="text-center p-3 font-medium bg-info-soft">Tel: Perf. %</th>
                          <th className="text-center p-3 font-medium bg-info-soft">Chat: Total</th>
                          <th className="text-center p-3 font-medium bg-info-soft">Chat: Aval.</th>
                          <th className="text-center p-3 font-medium bg-info-soft">Chat: Positivos</th>
                          <th className="text-center p-3 font-medium bg-info-soft">Chat: CSAT %</th>
                          <th className="text-center p-3 font-medium bg-info-soft">Chat: % Aval.</th>
                          <th className="text-center p-3 font-medium bg-success-soft">Satisf. Média</th>
                          <th className="text-center p-3 font-medium bg-success-soft">% Aval. Comb.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consolidadoSemanal.map((s, idx) => (
                          <tr key={idx} className="border-t hover:bg-muted">
                            <td className="p-3 text-xs font-medium whitespace-nowrap">{s.rotulo}</td>
                            <td className="text-center p-3">{s.telefone.total_ligacoes}</td>
                            <td className="text-center p-3">{s.telefone.total_atendidas}</td>
                            <td className="text-center p-3">{s.telefone.total_avaliadas}</td>
                            <td className="text-center p-3">{s.telefone.total_positivas}</td>
                            <td className="text-center p-3 font-semibold text-primary">{s.telefone.csat.toFixed(1)}%</td>
                            <td className="text-center p-3 font-semibold text-warning">{s.telefone.percentual_avaliados.toFixed(1)}%</td>
                            <td className="text-center p-3 font-semibold text-success">{s.telefone.performance.toFixed(1)}%</td>
                            <td className="text-center p-3">{s.chat.total_chats}</td>
                            <td className="text-center p-3">{s.chat.total_avaliados}</td>
                            <td className="text-center p-3">{s.chat.total_positivos}</td>
                            <td className="text-center p-3 font-semibold text-primary">{s.chat.csat.toFixed(1)}%</td>
                            <td className="text-center p-3 font-semibold text-primary">{s.chat.percentual_avaliados.toFixed(1)}%</td>
                            <td className="text-center p-3 font-bold text-success">{s.satisfacao_media.toFixed(1)}%</td>
                            <td className="text-center p-3 font-bold text-success">{s.percentual_avaliados_medio.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}