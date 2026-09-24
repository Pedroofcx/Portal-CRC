import db from '@/api/db';
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TabelaResumida from '@/components/ui/TabelaResumida';
import { Input } from '@/components/ui/input';
import { BarChart3, Phone, MessageSquare, TrendingUp } from 'lucide-react';
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
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: apuracoes = [], isLoading } = useQuery({
    queryKey: ['apuracoes-equipe'],
    queryFn: () => db.entities.Apuracao.list('-periodo_fim'),
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
    const vistos = new Set(); // cada dia conta uma vez (a importação mais recente)
    [...filtered].sort((a, b) => String(b.data_apuracao || b.created_date || '').localeCompare(String(a.data_apuracao || a.created_date || ''))).forEach(ap => {
      (ap.dados_por_data || []).forEach(dia => {
        const dataN = dia.data?.split('T')[0];
        if (!dataN) return;
        const chaveDia = `${ap.colaborador_id}|${ap.tipo_apuracao}|${dataN}`;
        if (vistos.has(chaveDia)) return;
        vistos.add(chaveDia);
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

    // Cada dia de cada pessoa em cada canal conta UMA vez: se o mesmo dia foi
    // importado duas vezes, vale a importação mais recente.
    const vistos = new Set();
    const maisRecentes = [...dadosFiltrados].sort((a, b) => String(b.data_apuracao || b.created_date || '').localeCompare(String(a.data_apuracao || a.created_date || '')));

    maisRecentes.forEach(ap => {
      if (!ap.dados_por_data || ap.dados_por_data.length === 0) return;

      const colaboradorNome = ap.colaborador_nome;

      ap.dados_por_data.forEach(dia => {
        const data = dia.data;
        const chaveDia = `${ap.colaborador_id}|${ap.tipo_apuracao}|${String(data).slice(0, 10)}`;
        if (vistos.has(chaveDia)) return;
        vistos.add(chaveDia);

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
              total_negativas: 0,
              nota4: 0,
              nota5: 0,
              transferencias: 0
            },
            chat: {
              total_chats: 0,
              total_avaliados: 0,
              total_positivos: 0,
              total_neutros: 0,
              tem_nota: false
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
          agg.telefone.total_negativas += dia.telefone.total_negativas || 0;
          agg.telefone.nota4 += dia.telefone.nota4 || 0;
          agg.telefone.nota5 += dia.telefone.nota5 || 0;
          agg.telefone.transferencias += dia.telefone.transferencias || 0;
        }

        // Agregar chat. total_neutros e ouvidoria (24/09/2026): "ruim=1" com
        // nota 3, que na verdade e neutro -- nunca entra no CSAT oficial
        // acima, so no comparativo informativo da aba Chat.
        if (dia.chat) {
          agg.chat.total_chats += dia.chat.total_chats || 0;
          agg.chat.total_avaliados += dia.chat.total_avaliados || 0;
          agg.chat.total_positivos += dia.chat.total_positivos || 0;
          agg.chat.total_neutros += dia.chat.total_neutros || 0;
          if (dia.chat.tem_nota) agg.chat.tem_nota = true;
        }
      });
    });

    // Calcular métricas finais
    return Object.values(agregacao).map(agg => {
      // Telefone
      agg.telefone.performance = agg.telefone.total_ligacoes > 0
        ? (agg.telefone.total_atendidas / agg.telefone.total_ligacoes) * 100
        : 0;
      
      // CSAT = positivas / (positivas + negativas) -- avaliadas inclui as
      // neutras (FCR 1 + nota 3) e incompletas, que nao entram no CSAT.
      const baseCsatTel = agg.telefone.total_positivas + agg.telefone.total_negativas;
      agg.telefone.csat = baseCsatTel > 0
        ? (agg.telefone.total_positivas / baseCsatTel) * 100
        : 0;

      agg.telefone.percentual_avaliados = agg.telefone.total_atendidas > 0
        ? (agg.telefone.total_avaliadas / agg.telefone.total_atendidas) * 100
        : 0;

      // Chat -- CSAT oficial (premiação) segue igual: positivos / avaliados.
      agg.chat.csat = agg.chat.total_avaliados > 0
        ? (agg.chat.total_positivos / agg.chat.total_avaliados) * 100
        : 0;

      agg.chat.percentual_avaliados = agg.chat.total_chats > 0
        ? (agg.chat.total_avaliados / agg.chat.total_chats) * 100
        : 0;

      // Ouvidoria: mesmo CSAT, tirando do negativo e do avaliado os "ruim=1"
      // que eram nota 3 (neutro). Só informativo -- não afeta premiação.
      agg.chat.negativos_confirmados = agg.chat.total_avaliados - agg.chat.total_positivos - agg.chat.total_neutros;
      const avaliadosSemNeutros = agg.chat.total_avaliados - agg.chat.total_neutros;
      agg.chat.csat_sem_neutros = avaliadosSemNeutros > 0
        ? (agg.chat.total_positivos / avaliadosSemNeutros) * 100
        : agg.chat.csat;

      return agg;
    }).sort((a, b) => a.periodo.localeCompare(b.periodo));
  }, [dadosFiltrados, filtroPeriodo, filtroDataInicio, filtroDataFim]);

  // CONSOLIDAÇÃO ESTRATÉGICA
  // Consolidado do filtro: soma os volumes e só então divide — quem atendeu
  // mais pesa mais (antes era a média das médias de cada linha).
  const consolidacao = useMemo(() => {
    if (!dadosAgregados.length) return null;
    const t = { lig: 0, at: 0, av: 0, pos: 0, neg: 0 };
    const c = { chats: 0, av: 0, pos: 0, neutros: 0, temNota: false };
    dadosAgregados.forEach(agg => {
      t.lig += agg.telefone.total_ligacoes; t.at += agg.telefone.total_atendidas;
      t.av += agg.telefone.total_avaliadas; t.pos += agg.telefone.total_positivas;
      t.neg += agg.telefone.total_negativas || 0;
      c.chats += agg.chat.total_chats; c.av += agg.chat.total_avaliados; c.pos += agg.chat.total_positivos;
      c.neutros += agg.chat.total_neutros || 0;
      if (agg.chat.tem_nota) c.temNota = true;
    });
    const pct = (parte, total) => (total > 0 ? (parte / total) * 100 : 0);
    // Telefone: positivas / (positivas + negativas) -- ver nota acima.
    const csatTelefoneMedia = pct(t.pos, t.pos + t.neg);
    const csatChatMedia = pct(c.pos, c.av);
    const csatChatSemNeutros = (c.av - c.neutros) > 0 ? pct(c.pos, c.av - c.neutros) : csatChatMedia;
    const canais = [t.av > 0 ? csatTelefoneMedia : null, c.av > 0 ? csatChatMedia : null].filter((v) => v !== null);
    const avaliados = [t.at > 0 ? pct(t.av, t.at) : null, c.chats > 0 ? pct(c.av, c.chats) : null].filter((v) => v !== null);
    return {
      performanceMedia: pct(t.at, t.lig),
      satisfacaoMedia: canais.length ? canais.reduce((s2, v) => s2 + v, 0) / canais.length : 0,
      avaliadosMedia: avaliados.length ? avaliados.reduce((s2, v) => s2 + v, 0) / avaliados.length : 0,
      csatTelefoneMedia,
      csatChatMedia,
      // Ouvidoria (chat): só aparece quando alguma apuração trouxe a coluna
      // de nota. Nunca substitui csatChatMedia — a premiação usa esse.
      chatTemNota: c.temNota,
      chatNeutros: c.neutros,
      csatChatSemNeutros,
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
              <p className="text-sm font-medium leading-none">Intervalo personalizado</p>
              {/* min-w-0: o campo de data tem largura mínima própria e, sem
                  isto, os dois lado a lado empurravam a página para o lado. */}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="min-w-0 space-y-1">
                  <Label htmlFor="rel-apuracao-de" className="text-xs text-muted-foreground">De</Label>
                  <Input
                    id="rel-apuracao-de"
                    type="date"
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                    className="min-w-0"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <Label htmlFor="rel-apuracao-ate" className="text-xs text-muted-foreground">Até</Label>
                  <Input
                    id="rel-apuracao-ate"
                    type="date"
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                    className="min-w-0"
                  />
                </div>
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
                <TabelaResumida
                  linhas={dadosAgregados}
                  chaveDaLinha={(agg, i) => `${agg.agente}-${agg.periodo}-${i}`}
                  colunas={[
                    { chave: 'agente', rotulo: 'Agente', alinhar: 'esquerda', principal: true, valor: (agg) => <span className="font-medium">{agg.agente}</span> },
                    { chave: 'periodo', rotulo: 'Período', alinhar: 'esquerda', principal: true, valor: (agg) => <span className="whitespace-nowrap">{agg.periodo}</span> },
                    { chave: 'atendidas', rotulo: 'Atendidas', principal: true, valor: (agg) => agg.telefone.total_atendidas },
                    { chave: 'perf', rotulo: 'Perf. %', principal: true, valor: (agg) => `${agg.telefone.performance.toFixed(1)}%` },
                    { chave: 'aval', rotulo: '% Aval.', principal: true, valor: (agg) => `${agg.telefone.percentual_avaliados.toFixed(1)}%` },
                    { chave: 'csat', rotulo: 'CSAT %', principal: true, valor: (agg) => <span className="font-semibold text-primary">{agg.telefone.csat.toFixed(1)}%</span> },
                    { chave: 'total', rotulo: 'Total de ligações', valor: (agg) => agg.telefone.total_ligacoes },
                    { chave: 'avaliadas', rotulo: 'Avaliadas', valor: (agg) => agg.telefone.total_avaliadas },
                    { chave: 'nota4', rotulo: 'Nota 4', valor: (agg) => agg.telefone.nota4 || 0 },
                    { chave: 'nota5', rotulo: 'Nota 5', valor: (agg) => agg.telefone.nota5 || 0 },
                    { chave: 'positivas', rotulo: 'Positivas (4+5)', valor: (agg) => agg.telefone.total_positivas },
                    { chave: 'transf', rotulo: 'Transferências', valor: (agg) => agg.telefone.transferencias },
                  ]}
                />
              )}
              {dadosAgregados.length > 0 && (
                <div className="mt-4 p-3 bg-warning-soft border border-warning/25 rounded-lg text-sm">
                  <span className="font-medium">Transferências totais (excluídas dos cálculos de avaliação):</span>
                  <span className="font-bold text-warning">{dadosAgregados.reduce((acc, agg) => acc + (agg.telefone.transferencias || 0), 0)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA CHAT */}
        <TabsContent value="chat">
          <div className="space-y-6">
            {consolidacao?.chatTemNota && (
              <Card className="border-0 shadow-sm bg-info-soft">
                <CardHeader>
                  <CardTitle className="text-base">Ouvidoria — tickets "ruim" que eram neutros</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Entre os tickets marcados "satisfação ruim", os classificados como nota 3 na aba Ouvidoria são
                    neutros, não negativos — o CSAT oficial abaixo (usado na premiação) conta todos como negativos;
                    este quadro mostra o número desconsiderando os neutros já classificados, só para conferência.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{consolidacao.chatNeutros}</p>
                      <p className="text-xs text-muted-foreground mt-1">tickets "ruim" que eram nota 3</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{consolidacao.csatChatMedia.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">CSAT oficial (usado na premiação)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-success">{consolidacao.csatChatSemNeutros.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">CSAT desconsiderando os neutros</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Tabela de Chat por Agente</CardTitle>
              </CardHeader>
              <CardContent>
                {dadosAgregados.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
                ) : (
                  <TabelaResumida
                    linhas={dadosAgregados}
                    chaveDaLinha={(agg, i) => `${agg.agente}-${agg.periodo}-${i}`}
                    colunas={[
                      { chave: 'agente', rotulo: 'Agente', alinhar: 'esquerda', principal: true, valor: (agg) => <span className="font-medium">{agg.agente}</span> },
                      { chave: 'periodo', rotulo: 'Período', alinhar: 'esquerda', principal: true, valor: (agg) => <span className="whitespace-nowrap">{agg.periodo}</span> },
                      { chave: 'total', rotulo: 'Total de chats', principal: true, valor: (agg) => agg.chat.total_chats },
                      { chave: 'avaliados', rotulo: 'Avaliados', principal: true, valor: (agg) => agg.chat.total_avaliados },
                      { chave: 'positivos', rotulo: 'Positivos', principal: true, valor: (agg) => agg.chat.total_positivos },
                      { chave: 'aval', rotulo: '% Avaliados', principal: true, valor: (agg) => `${agg.chat.percentual_avaliados.toFixed(1)}%` },
                      { chave: 'csat', rotulo: 'CSAT % (premiação)', principal: true, valor: (agg) => <span className="font-semibold text-primary">{agg.chat.csat.toFixed(1)}%</span> },
                      { chave: 'neutros', rotulo: 'Neutros (nota 3)', valor: (agg) => agg.chat.total_neutros || 0 },
                      { chave: 'csatsn', rotulo: 'CSAT sem neutros', valor: (agg) => `${agg.chat.csat_sem_neutros.toFixed(1)}%` },
                    ]}
                  />
                )}
              </CardContent>
            </Card>
          </div>
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
                  <TabelaResumida
                    linhas={consolidadoSemanal}
                    chaveDaLinha={(sem, i) => `${sem.rotulo}-${i}`}
                    colunas={[
                      { chave: 'periodo', rotulo: 'Semana', alinhar: 'esquerda', principal: true, valor: (sem) => <span className="whitespace-nowrap text-xs font-medium">{sem.rotulo}</span> },
                      { chave: 'telcsat', rotulo: 'CSAT tel.', principal: true, valor: (sem) => `${sem.telefone.csat.toFixed(1)}%` },
                      { chave: 'telperf', rotulo: 'Perf. tel.', principal: true, valor: (sem) => `${sem.telefone.performance.toFixed(1)}%` },
                      { chave: 'chatcsat', rotulo: 'CSAT chat', principal: true, valor: (sem) => `${sem.chat.csat.toFixed(1)}%` },
                      { chave: 'satisf', rotulo: 'Satisf. média', principal: true, valor: (sem) => <span className="font-semibold text-success">{sem.satisfacao_media.toFixed(1)}%</span> },
                      { chave: 'avalcomb', rotulo: '% aval. comb.', principal: true, valor: (sem) => <span className="font-semibold text-success">{sem.percentual_avaliados_medio.toFixed(1)}%</span> },
                      { chave: 'tellig', rotulo: 'Tel: ligações', valor: (sem) => sem.telefone.total_ligacoes },
                      { chave: 'telaten', rotulo: 'Tel: atendidas', valor: (sem) => sem.telefone.total_atendidas },
                      { chave: 'telavald', rotulo: 'Tel: avaliadas', valor: (sem) => sem.telefone.total_avaliadas },
                      { chave: 'telpos', rotulo: 'Tel: positivas', valor: (sem) => sem.telefone.total_positivas },
                      { chave: 'telaval', rotulo: 'Tel: % aval.', valor: (sem) => `${sem.telefone.percentual_avaliados.toFixed(1)}%` },
                      { chave: 'chattotal', rotulo: 'Chat: total', valor: (sem) => sem.chat.total_chats },
                      { chave: 'chataval', rotulo: 'Chat: avaliados', valor: (sem) => sem.chat.total_avaliados },
                      { chave: 'chatpos', rotulo: 'Chat: positivos', valor: (sem) => sem.chat.total_positivos },
                      { chave: 'chatpaval', rotulo: 'Chat: % aval.', valor: (sem) => `${sem.chat.percentual_avaliados.toFixed(1)}%` },
                    ]}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}