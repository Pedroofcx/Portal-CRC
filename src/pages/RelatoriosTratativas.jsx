import db from '@/api/db';
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { formatDateSP, tipoTratativaLabels } from '@/components/utils/helpers';
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
  TrendingUp,
  TrendingDown,
  Star,
  DollarSign,
  MessageSquare,
  ThumbsUp,
  AlertTriangle
} from 'lucide-react';
import RelatorioFinanceiroConsolidado from '@/components/relatorios/RelatorioFinanceiroConsolidado';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function RelatoriosTratativas() {
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');

  const { data: tratativas = [], isLoading } = useQuery({
    queryKey: ['tratativas-relatorios'],
    queryFn: () => db.entities.Tratativa.list('-created_date', 2000),
    staleTime: 60000,
    retry: 2,
  });

  // Filtrar por período
  const tratativasFiltradas = useMemo(() => {
    let filtradas = tratativas.filter(t => t.status !== 'excluida');
    if (periodoInicio) {
      filtradas = filtradas.filter(t => new Date(t.data_registro || t.created_date) >= new Date(periodoInicio));
    }
    if (periodoFim) {
      const fimDia = new Date(periodoFim);
      fimDia.setHours(23, 59, 59, 999);
      filtradas = filtradas.filter(t => new Date(t.data_registro || t.created_date) <= fimDia);
    }
    return filtradas;
  }, [tratativas, periodoInicio, periodoFim]);

  // Análises por tipo
  const analisePorTipo = useMemo(() => {
    const analise = {
      reclamacao_interna: {
        total: 0,
        encerradas: 0,
        dentraSLA: 0,
        semReabertura: 0,
        solucoesReplicaveis: 0,
        tempoMedio: 0,
        categorias: {},
        totalDevolucoes: 0,
        valorTotalDevolvido: 0
      },
      reclame_aqui: {
        total: 0,
        encerradas: 0,
        notaMedia: 0,
        notas: [],
        voltariaFazerNegocio: 0,
        totalDevolucoes: 0,
        valorTotalDevolvido: 0,
        categorias: {},
        tempoMedio: 0,
        dentraSLA: 0
      },
      google_meu_negocio: {
        total: 0,
        encerradas: 0,
        reavaliacoesPositivas: 0,
        exclusoesAvaliacao: 0,
        totalDevolucoes: 0,
        valorTotalDevolvido: 0,
        tempoMedio: 0,
        dentraSLA: 0,
        comentariosMantidos: 0,
        comentariosEditados: 0,
        comentariosExcluidos: 0
      },
      contestacao: {
        total: 0,
        encerradas: 0,
        valorTotalContestado: 0,
        valorTotalRecuperado: 0,
        valorTotalPago: 0,
        cancelamentos: 0,
        pagamentosIntegrais: 0,
        acordos: 0,
        semAcordo: 0,
        semContato: 0,
        tempoMedio: 0,
        dentraSLA: 0,
        categorias: {}
      }
    };

    tratativasFiltradas.forEach(t => {
      const tipo = t.tipo_tratativa;
      if (!analise[tipo]) return;

      analise[tipo].total++;
      if (t.status === 'encerrada' || t.status === 'aguardando_confirmacao_reabertura') {
        analise[tipo].encerradas++;
      }

      // Devolução financeira para tipos que suportam
      if (tipo !== 'contestacao' && analise[tipo]) {
        if (t.houve_devolucao_financeira) {
          analise[tipo].totalDevolucoes++;
          const valorDev = parseFloat(t.valor_devolvido_cliente || 0);
          analise[tipo].valorTotalDevolvido += isNaN(valorDev) ? 0 : valorDev;
        }
      }

      // Reclamações Internas
      if (tipo === 'reclamacao_interna') {
        if (t.encerrado_no_sla) analise[tipo].dentraSLA++;
        if (t.status_reabertura === 'nao_houve') analise[tipo].semReabertura++;
        if (t.solucao_replicavel) analise[tipo].solucoesReplicaveis++;
        if (t.tempo_total_minutos && analise[tipo].encerradas > 0) {
          analise[tipo].tempoMedio = (analise[tipo].tempoMedio * (analise[tipo].encerradas - 1) + t.tempo_total_minutos) / analise[tipo].encerradas;
        }
        if (t.motivo_nome) {
          analise[tipo].categorias[t.motivo_nome] = (analise[tipo].categorias[t.motivo_nome] || 0) + 1;
        }
      }

      // Reclame Aqui
      if (tipo === 'reclame_aqui') {
        if (t.nota_reclame_aqui) {
          analise[tipo].notas.push(t.nota_reclame_aqui);
          if (t.voltaria_fazer_negocio) analise[tipo].voltariaFazerNegocio++;
        }
        if (t.categoria_reclame_aqui) {
          analise[tipo].categorias[t.categoria_reclame_aqui] = (analise[tipo].categorias[t.categoria_reclame_aqui] || 0) + 1;
        }
        if (t.encerrado_no_sla) analise[tipo].dentraSLA++;
        if (t.tempo_total_minutos && analise[tipo].encerradas > 0) {
          analise[tipo].tempoMedio = (analise[tipo].tempoMedio * (analise[tipo].encerradas - 1) + t.tempo_total_minutos) / analise[tipo].encerradas;
        }
      }

      // Contestações
      if (tipo === 'contestacao') {
        const valorContestado = parseFloat(t.valor_contestado_final || t.valor_contestado_inicial || t.valor_contestacao || 0);
        // Valor recuperado: campo valor_recuperado OU valor contestado quando status = "pagou"
        const valorRecuperadoExplicito = parseFloat(t.valor_recuperado || 0);
        const valorPago = (t.status_resolucao_contestacao === 'pagou' || t.tipo_resolucao_contestacao === 'pagamento_integral')
          ? parseFloat(t.valor_contestado_final || t.valor_contestado_inicial || 0)
          : 0;
        const valorRecuperado = valorRecuperadoExplicito || valorPago;
        if (valorContestado) analise[tipo].valorTotalContestado += valorContestado;
        if (valorRecuperado) analise[tipo].valorTotalRecuperado += valorRecuperado;
        // Tipo de resolução — considera ambos os campos
        const tipoRes = t.tipo_resolucao_contestacao;
        const statusRes = t.status_resolucao_contestacao;
        if (tipoRes === 'cancelamento' || statusRes === 'cancelou_contestacao') analise[tipo].cancelamentos++;
        if (tipoRes === 'pagamento_integral' || statusRes === 'pagou') {
          analise[tipo].pagamentosIntegrais++;
          analise[tipo].valorTotalPago += parseFloat(t.valor_contestado_final || t.valor_contestado_inicial || 0);
        }
        if (tipoRes === 'acordo_custo_reduzido' || statusRes === 'acordo') analise[tipo].acordos++;
        if (statusRes === 'sem_acordo') analise[tipo].semAcordo++;
        if (statusRes === 'sem_contato') analise[tipo].semContato++;
        if (t.encerrado_no_sla) analise[tipo].dentraSLA++;
        if (t.tempo_total_minutos && analise[tipo].encerradas > 0) {
          analise[tipo].tempoMedio = (analise[tipo].tempoMedio * (analise[tipo].encerradas - 1) + t.tempo_total_minutos) / analise[tipo].encerradas;
        }
        if (t.categoria_contestacao) {
          analise[tipo].categorias[t.categoria_contestacao] = (analise[tipo].categorias[t.categoria_contestacao] || 0) + 1;
        }
      }

      // Google
      if (tipo === 'google_meu_negocio') {
        if (t.reavaliacao_positiva_google) analise[tipo].reavaliacoesPositivas++;
        if (t.exclusao_avaliacao_negativa_google) analise[tipo].exclusoesAvaliacao++;
        if (t.encerrado_no_sla) analise[tipo].dentraSLA++;
        if (t.tempo_total_minutos && analise[tipo].encerradas > 0) {
          analise[tipo].tempoMedio = (analise[tipo].tempoMedio * (analise[tipo].encerradas - 1) + t.tempo_total_minutos) / analise[tipo].encerradas;
        }
        if (t.situacao_comentario_google === 'comentario_mantido') analise[tipo].comentariosMantidos++;
        if (t.situacao_comentario_google === 'comentario_editado') analise[tipo].comentariosEditados++;
        if (t.situacao_comentario_google === 'comentario_excluido') analise[tipo].comentariosExcluidos++;
      }
    });

    // Calcular nota média Reclame Aqui
    if (analise.reclame_aqui.notas.length > 0) {
      analise.reclame_aqui.notaMedia = analise.reclame_aqui.notas.reduce((a, b) => a + b, 0) / analise.reclame_aqui.notas.length;
    }

    return analise;
  }, [tratativasFiltradas]);

  // Dados para gráficos
  const volumePorTipoData = useMemo(() => {
    return Object.entries(analisePorTipo).map(([tipo, dados]) => ({
      tipo: tipoTratativaLabels[tipo] || tipo,
      volume: dados.total,
      encerradas: dados.encerradas
    }));
  }, [analisePorTipo]);

  const exportarCSV = (tipo) => {
    const tratativasTipo = tratativasFiltradas.filter(t => t.tipo_tratativa === tipo);
    let headers = ['Data Registro', 'ID Interno', 'Status', 'Categoria', 'Agente', 'SLA Cumprido'];
    
    if (tipo === 'contestacao') {
      headers = [
        'Data Registro',
        'ID Interno',
        'Número do Case',
        'Link Ticket Zendesk',
        'ID Base Cliente',
        'Nome Cliente',
        'Motivo da Contestação',
        'Valor Contestado Inicial',
        'Valor Contestado Final',
        'Prazo SLA (dias)',
        'SLA Cumprido',
        'Status',
        'Status da Resolução',
        'Status Final',
        'Resolvemos',
        'Conta Bloqueada',
        'Agente Responsável',
        'Data Início',
        'Data Encerramento',
        'Tempo Total (min)',
        'Motivo Principal',
        'Submotivos'
      ];
    } else if (tipo === 'reclame_aqui') {
      headers.push('Nota', 'Voltaria Fazer Negócio', 'Houve Devolução', 'Valor Devolvido (R$)');
    } else {
      headers.push('Houve Devolução', 'Valor Devolvido (R$)');
    }

    const rows = tratativasTipo.map(t => {
      let row = [];

      if (tipo === 'contestacao') {
        row = [
          formatDateSP(t.data_registro || t.created_date, 'DD/MM/YYYY HH:mm'),
          t.id_interno || '-',
          t.numero_case_contestacao || '-',
          t.link_zendesk || '-',
          t.id_base_cliente || '-',
          t.nome_cliente || '-',
          t.motivo_contestacao || '-',
          t.valor_contestado_inicial || '0',
          t.valor_contestado_final || t.valor_contestado_inicial || '0',
          t.prazo_sla_dias || '-',
          t.encerrado_no_sla ? 'Sim' : 'Não',
          t.status || '-',
          t.status_resolucao_contestacao ? t.status_resolucao_contestacao.replace(/_/g, ' ') : '-',
          t.status_final_contestacao ? t.status_final_contestacao.replace(/_/g, ' ') : '-',
          t.resolvemos_contestacao ? 'Sim' : 'Não',
          t.conta_bloqueada_contestacao ? 'Sim' : 'Não',
          t.agente_responsavel_nome || '-',
          t.data_inicio_tratativa ? formatDateSP(t.data_inicio_tratativa, 'DD/MM/YYYY HH:mm') : '-',
          t.data_encerramento ? formatDateSP(t.data_encerramento, 'DD/MM/YYYY HH:mm') : '-',
          t.tempo_total_minutos || '0',
          t.motivo_nome || '-',
          (t.submotivos || []).join('; ') || '-'
        ];
      } else {
        row = [
          formatDateSP(t.data_registro || t.created_date, 'DD/MM/YYYY'),
          t.id_interno || t.id?.substring(0, 8) || '-',
          t.status,
          t.categoria || '-',
          t.agente_responsavel_nome || '-',
          t.encerrado_no_sla ? 'Sim' : 'Não'
        ];

        if (tipo === 'reclame_aqui') {
          row.push(
            t.nota_reclame_aqui || '-', 
            t.voltaria_fazer_negocio ? 'Sim' : 'Não',
            t.houve_devolucao_financeira ? 'Sim' : 'Não',
            t.houve_devolucao_financeira && t.valor_devolvido_cliente ? parseFloat(t.valor_devolvido_cliente).toFixed(2) : '0.00'
          );
        } else {
          row.push(
            t.houve_devolucao_financeira ? 'Sim' : 'Não',
            t.houve_devolucao_financeira && t.valor_devolvido_cliente ? parseFloat(t.valor_devolvido_cliente).toFixed(2) : '0.00'
          );
        }
      }

      return row;
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${tipo}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return <LoadingSpinner text="Carregando relatórios..." />;
  }

  const ri = analisePorTipo.reclamacao_interna;
  const ra = analisePorTipo.reclame_aqui;
  const gmn = analisePorTipo.google_meu_negocio;
  const cont = analisePorTipo.contestacao;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Relatórios por Tipo de Tratativa"
        subtitle="Análises detalhadas e insights estratégicos"
        icon={BarChart3}
      />

      {/* Filtros */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Data Início</Label>
              <Input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Data Fim</Label>
              <Input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={() => { setPeriodoInicio(''); setPeriodoFim(''); }}>
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visão Geral */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Volume por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volumePorTipoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="volume" fill="#3b82f6" name="Total" />
              <Bar dataKey="encerradas" fill="#10b981" name="Encerradas" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabs por Tipo */}
      <Tabs defaultValue="reclamacao">
        <TabsList>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="reclamacao">Reclamações Internas</TabsTrigger>
          <TabsTrigger value="reclameaqui">Reclame Aqui</TabsTrigger>
          <TabsTrigger value="google">Google</TabsTrigger>
          <TabsTrigger value="contestacao">Contestações</TabsTrigger>
        </TabsList>

        {/* ABA FINANCEIRO */}
        <TabsContent value="financeiro" className="mt-6">
          <RelatorioFinanceiroConsolidado tratativasFiltradas={tratativasFiltradas} />
        </TabsContent>

        {/* RECLAMAÇÕES INTERNAS */}
        <TabsContent value="reclamacao" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total" value={ri.total} icon={BarChart3} color="blue" />
            <StatCard title="Encerradas" value={ri.encerradas} icon={ThumbsUp} color="green" />
            <StatCard 
              title="Dentro do SLA" 
              value={`${ri.encerradas > 0 ? Math.round((ri.dentraSLA / ri.encerradas) * 100) : 0}%`} 
              subtitle={`${ri.dentraSLA} de ${ri.encerradas}`}
              icon={TrendingUp} 
              color="purple" 
            />
            <StatCard title="Sem Reabertura" value={ri.semReabertura} icon={Star} color="amber" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Métricas de Qualidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">Tempo Médio de Resolução</span>
                  <span className="font-bold text-lg text-blue-600">
                    {Math.round(ri.tempoMedio / 60)}h {Math.round(ri.tempoMedio % 60)}min
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">Taxa de SLA</span>
                  <span className="font-bold text-lg text-green-600">
                    {ri.encerradas > 0 ? Math.round((ri.dentraSLA / ri.encerradas) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">Soluções Replicáveis</span>
                  <span className="font-bold text-lg text-purple-600">{ri.solucoesReplicaveis}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <span className="text-sm text-slate-700">Casos com Devolução</span>
                  <span className="font-bold text-lg text-orange-600">{ri.totalDevolucoes || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-lg">
                  <span className="text-sm text-slate-700">Valor Total Devolvido</span>
                  <span className="font-bold text-lg text-red-600">
                    R$ {(ri.valorTotalDevolvido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Categorias Mais Recorrentes</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => exportarCSV('reclamacao_interna')}>
                    <Download className="w-4 h-4 mr-1" />
                    CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {Object.keys(ri.categorias).length === 0 ? (
                  <p className="text-slate-500 text-center py-8">Sem dados</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(ri.categorias)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([cat, count]) => (
                        <div key={cat} className="flex items-center justify-between">
                          <span className="text-sm">{cat}</span>
                          <Badge variant="outline">{count} casos</Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* RECLAME AQUI */}
        <TabsContent value="reclameaqui" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total" value={ra.total} icon={MessageSquare} color="blue" />
            <StatCard title="Encerradas" value={ra.encerradas} icon={ThumbsUp} color="green" />
            <StatCard title="Nota Média" value={ra.notaMedia.toFixed(1)} subtitle="de 7 a 10" icon={Star} color="amber" />
            <StatCard title="Voltaria Fazer Negócio" value={ra.voltariaFazerNegocio} subtitle={`${ra.notas.length > 0 ? Math.round((ra.voltariaFazerNegocio / ra.notas.length) * 100) : 0}% dos avaliados`} icon={ThumbsUp} color="green" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{ra.encerradas > 0 ? Math.round((ra.dentraSLA / ra.encerradas) * 100) : 0}%</p>
              <p className="text-xs text-slate-600 mt-1">SLA Cumprido</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <p className="text-2xl font-bold text-slate-700">{ra.tempoMedio > 0 ? `${Math.round(ra.tempoMedio / 60)}h ${Math.round(ra.tempoMedio % 60)}m` : '-'}</p>
              <p className="text-xs text-slate-600 mt-1">Tempo Médio</p>
            </div>
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
              <p className="text-2xl font-bold text-orange-600">{ra.totalDevolucoes || 0}</p>
              <p className="text-xs text-slate-600 mt-1">Casos com Devolução</p>
            </div>
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-center">
              <p className="text-xl font-bold text-red-600">R$ {(ra.valorTotalDevolvido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-600 mt-1">Valor Devolvido</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Distribuição de Notas</CardTitle></CardHeader>
              <CardContent>
                {ra.notas.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">Sem notas registradas</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={[{ name: 'Nota 7-8', value: ra.notas.filter(n => n >= 7 && n <= 8).length }, { name: 'Nota 9', value: ra.notas.filter(n => n === 9).length }, { name: 'Nota 10', value: ra.notas.filter(n => n === 10).length }]} cx="50%" cy="50%" labelLine={false} label={(e) => `${e.name}: ${e.value}`} outerRadius={70} dataKey="value">
                        {COLORS.map((c, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Categorias de Reclamação</CardTitle></CardHeader>
              <CardContent>
                {Object.keys(ra.categorias).length === 0 ? (
                  <p className="text-slate-500 text-center py-8">Sem categorias registradas</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(ra.categorias).sort(([, a], [, b]) => b - a).slice(0, 6).map(([cat, count]) => (
                      <div key={cat} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <span className="text-sm text-slate-700 truncate">{cat}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Insights</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => exportarCSV('reclame_aqui')}><Download className="w-4 h-4 mr-1" />CSV</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs font-medium text-blue-900 mb-1">Recomendação</p>
                  <p className="text-xs text-blue-700">{ra.notaMedia >= 9 ? 'Excelente! Continue o padrão.' : ra.notaMedia >= 8 ? 'Bom. Busque nota 9+.' : 'Plano de ação necessário.'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-xs">
                  <div className="flex justify-between"><span>Notas 10</span><strong>{ra.notas.filter(n => n === 10).length}</strong></div>
                  <div className="flex justify-between"><span>SLA Estourado</span><strong className="text-red-600">{ra.encerradas - ra.dentraSLA}</strong></div>
                  <div className="flex justify-between"><span>Em Aberto</span><strong>{ra.total - ra.encerradas}</strong></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* GOOGLE */}
        <TabsContent value="google" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total" value={gmn.total} icon={MessageSquare} color="blue" />
            <StatCard title="Encerradas" value={gmn.encerradas} icon={ThumbsUp} color="green" />
            <StatCard title="Reavaliações Positivas" value={gmn.reavaliacoesPositivas} icon={Star} color="amber" />
            <StatCard title="Exclusões Conseguidas" value={gmn.exclusoesAvaliacao} icon={AlertTriangle} color="red" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{gmn.encerradas > 0 ? Math.round((gmn.dentraSLA / gmn.encerradas) * 100) : 0}%</p>
              <p className="text-xs text-slate-600 mt-1">SLA Cumprido</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-slate-700">{gmn.tempoMedio > 0 ? `${Math.round(gmn.tempoMedio / 60)}h ${Math.round(gmn.tempoMedio % 60)}m` : '-'}</p>
              <p className="text-xs text-slate-600 mt-1">Tempo Médio</p>
            </div>
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
              <p className="text-2xl font-bold text-orange-600">{gmn.totalDevolucoes || 0}</p>
              <p className="text-xs text-slate-600 mt-1">Casos com Devolução</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg text-center">
              <p className="text-xl font-bold text-red-600">R$ {(gmn.valorTotalDevolvido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-600 mt-1">Valor Devolvido</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Situação dos Comentários</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-700">{gmn.comentariosMantidos}</p>
                    <p className="text-xs text-slate-500 mt-1">Mantidos</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <p className="text-2xl font-bold text-amber-600">{gmn.comentariosEditados}</p>
                    <p className="text-xs text-slate-500 mt-1">Editados</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{gmn.comentariosExcluidos}</p>
                    <p className="text-xs text-slate-500 mt-1">Excluídos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Taxa de Sucesso</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => exportarCSV('google_meu_negocio')}><Download className="w-4 h-4 mr-1" />CSV</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="text-center p-5 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">{gmn.encerradas > 0 ? Math.round((gmn.reavaliacoesPositivas / gmn.encerradas) * 100) : 0}%</p>
                    <p className="text-xs text-slate-600 mt-1">Reavaliação Positiva</p>
                  </div>
                  <div className="text-center p-5 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">{gmn.encerradas > 0 ? Math.round((gmn.exclusoesAvaliacao / gmn.encerradas) * 100) : 0}%</p>
                    <p className="text-xs text-slate-600 mt-1">Taxa de Exclusão</p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between"><span>SLA Estourado</span><strong className="text-red-600">{gmn.encerradas - gmn.dentraSLA}</strong></div>
                  <div className="flex justify-between"><span>Em Aberto</span><strong>{gmn.total - gmn.encerradas}</strong></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CONTESTAÇÕES */}
        <TabsContent value="contestacao" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total" value={cont.total} icon={BarChart3} color="blue" />
            <StatCard title="Encerradas" value={cont.encerradas} icon={ThumbsUp} color="green" />
            <StatCard title="Valor Contestado" value={cont.valorTotalContestado >= 1000 ? `R$ ${(cont.valorTotalContestado / 1000).toFixed(1)}k` : `R$ ${cont.valorTotalContestado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} color="red" />
            <StatCard title="Valor Recuperado" value={cont.valorTotalRecuperado >= 1000 ? `R$ ${(cont.valorTotalRecuperado / 1000).toFixed(1)}k` : `R$ ${cont.valorTotalRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} subtitle={`${cont.valorTotalContestado > 0 ? Math.round((cont.valorTotalRecuperado / cont.valorTotalContestado) * 100) : 0}% recuperado`} icon={DollarSign} color="green" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{cont.encerradas > 0 ? Math.round((cont.dentraSLA / cont.encerradas) * 100) : 0}%</p>
              <p className="text-xs text-slate-600 mt-1">SLA Cumprido</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-slate-700">{cont.tempoMedio > 0 ? `${Math.round(cont.tempoMedio / 60)}h ${Math.round(cont.tempoMedio % 60)}m` : '-'}</p>
              <p className="text-xs text-slate-600 mt-1">Tempo Médio</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">{cont.encerradas - cont.dentraSLA}</p>
              <p className="text-xs text-slate-600 mt-1">SLA Estourado</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-amber-600">{cont.total - cont.encerradas}</p>
              <p className="text-xs text-slate-600 mt-1">Em Aberto</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Impacto Financeiro</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-slate-500">Valor Contestado</p>
                  <p className="text-xl font-bold text-red-600">R$ {cont.valorTotalContestado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-slate-500">Valor Pago (cliente pagou)</p>
                  <p className="text-xl font-bold text-blue-600">R$ {cont.valorTotalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-blue-500">{cont.pagamentosIntegrais} caso{cont.pagamentosIntegrais !== 1 ? 's' : ''}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-slate-500">Valor Recuperado (total)</p>
                  <p className="text-xl font-bold text-green-600">R$ {cont.valorTotalRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Valor Perdido / Não Recuperado</p>
                  <p className="text-xl font-bold text-slate-600">
                    R$ {Math.max(0, cont.valorTotalContestado - cont.valorTotalRecuperado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-xs text-slate-500">Taxa de Recuperação</p>
                  <p className="text-2xl font-bold text-amber-600">{cont.valorTotalContestado > 0 ? Math.round((cont.valorTotalRecuperado / cont.valorTotalContestado) * 100) : 0}%</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Categorias de Motivo</CardTitle></CardHeader>
              <CardContent>
                {Object.keys(cont.categorias).length === 0 ? (
                  <p className="text-slate-500 text-center py-8">Sem categorias registradas</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(cont.categorias).sort(([, a], [, b]) => b - a).map(([cat, count]) => {
                      const labels = { erro_cobranca: 'Erro de Cobrança', fraude: 'Fraude', cancelamento_compra: 'Cancelamento', erro_operacional: 'Erro Operacional', outros: 'Outros' };
                      return (
                        <div key={cat} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <span className="text-sm">{labels[cat] || cat}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Tipos de Resolução</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => exportarCSV('contestacao')}><Download className="w-4 h-4 mr-1" />CSV</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mt-2">
                  {[
                    { label: 'Pagou (integral)', value: cont.pagamentosIntegrais, color: 'bg-blue-100 text-blue-700' },
                    { label: 'Cancelamento', value: cont.cancelamentos, color: 'bg-green-100 text-green-700' },
                    { label: 'Acordo', value: cont.acordos, color: 'bg-amber-100 text-amber-700' },
                    { label: 'Sem Acordo', value: cont.semAcordo, color: 'bg-red-100 text-red-700' },
                    { label: 'Sem Contato', value: cont.semContato, color: 'bg-slate-100 text-slate-700' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{item.label}</span>
                      <Badge className={item.color}>{item.value}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}