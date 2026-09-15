import db from '@/api/db';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { formatDateSP } from '@/components/utils/helpers';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  TrendingUp, Send, Eye, Users, CheckCircle, Search, Filter, Calendar
} from 'lucide-react';
import HanseiEnvioDialog from '@/components/hansei/HanseiEnvioDialog';
import HanseiVisualizarDialog from '@/components/hansei/HanseiVisualizarDialog';
import HanseiAgenteDashboard from '@/components/hansei/HanseiAgenteDashboard';

export default function Hansei() {
  const [envioDialogOpen, setEnvioDialogOpen] = useState(false);
  const [visualizarDialogOpen, setVisualizarDialogOpen] = useState(false);
  const [envioSelecionado, setEnvioSelecionado] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({ comentario: '', sentimento: 'neutro' });

  // Filtros para gestor
  const [filtroColaborador, setFiltroColaborador] = useState('');
  const [filtroPeriodoInicio, setFiltroPeriodoInicio] = useState('');
  const [filtroPeriodoFim, setFiltroPeriodoFim] = useState('');

  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores'], queryFn: () => db.entities.Colaborador.list() });
  const { data: tratativas = [] } = useQuery({ queryKey: ['tratativas'], queryFn: () => db.entities.Tratativa.list('-created_date', 500) });
  const { data: apuracoes = [] } = useQuery({ queryKey: ['apuracoes'], queryFn: () => db.entities.Apuracao.list('-created_date', 200) });
  const { data: pontuacoes = [] } = useQuery({ queryKey: ['pontuacoes'], queryFn: () => db.entities.Pontuacao.list('-created_date') });
  const { data: envios = [], isLoading } = useQuery({ queryKey: ['hansei-envios'], queryFn: () => db.entities.HanseiEnvio.list('-data_envio', 200) });
  const { data: comentarios = [] } = useQuery({ queryKey: ['hansei-comentarios'], queryFn: () => db.entities.HanseiComentario.list('-data_comentario') });

  const colaborador = colaboradores.find(c => c.email === user?.email);
  const isGestor = colaborador?.papel === 'gestor';

  const enviarMutation = useMutation({
    mutationFn: (data) => db.entities.HanseiEnvio.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['hansei-envios']);
      toast.success('Resultados enviados com sucesso!');
      setEnvioDialogOpen(false);
    },
    onError: () => toast.error('Erro ao enviar resultados'),
  });

  const marcarVisualizadoMutation = useMutation({
    mutationFn: (id) => db.entities.HanseiEnvio.update(id, { visualizado: true, data_visualizacao: new Date().toISOString() }),
    onSuccess: () => queryClient.invalidateQueries(['hansei-envios']),
  });

  const comentarioMutation = useMutation({
    mutationFn: (data) => db.entities.HanseiComentario.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['hansei-comentarios']);
      toast.success('Feedback enviado!');
      setFeedbackForm({ comentario: '', sentimento: 'neutro' });
    },
    onError: () => toast.error('Erro ao enviar feedback'),
  });

  const handleVisualizar = (envio) => {
    setEnvioSelecionado(envio);
    setVisualizarDialogOpen(true);
    if (!envio.visualizado && envio.colaborador_id === colaborador?.id) {
      marcarVisualizadoMutation.mutate(envio.id);
    }
  };

  const handleEnviarFeedback = () => {
    if (!feedbackForm.comentario.trim()) { toast.error('Digite seu comentário'); return; }
    comentarioMutation.mutate({
      hansei_envio_id: envioSelecionado.id,
      colaborador_id: colaborador?.id,
      colaborador_nome: colaborador?.nome_completo || user?.full_name,
      comentario: feedbackForm.comentario,
      sentimento: feedbackForm.sentimento,
      data_comentario: new Date().toISOString()
    });
  };

  const meusEnvios = useMemo(() => {
    if (!colaborador?.id) return [];
    return envios.filter(e => e.colaborador_id === colaborador.id);
  }, [envios, colaborador]);

  const enviosFiltrados = useMemo(() => {
    let lista = isGestor ? envios : meusEnvios;
    if (filtroColaborador) lista = lista.filter(e => e.colaborador_id === filtroColaborador);
    if (filtroPeriodoInicio) lista = lista.filter(e => e.periodo_inicio >= filtroPeriodoInicio);
    if (filtroPeriodoFim) lista = lista.filter(e => e.periodo_fim <= filtroPeriodoFim);
    return lista;
  }, [envios, meusEnvios, isGestor, filtroColaborador, filtroPeriodoInicio, filtroPeriodoFim]);

  const statsGestor = useMemo(() => {
    if (!isGestor) return null;
    const agentes = new Set(envios.map(e => e.colaborador_id)).size;
    const naoVistos = envios.filter(e => !e.visualizado).length;
    return { total: envios.length, agentes, naoVistos };
  }, [envios, isGestor]);

  if (!user || !colaborador) return <LoadingSpinner text="Carregando..." />;
  if (isLoading) return <LoadingSpinner text="Carregando Hansei..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hansei — Resultados & Evolução"
        subtitle="Reflexão contínua e acompanhamento de desempenho individual"
        icon={TrendingUp}
        actions={
          isGestor && (
            <Button onClick={() => setEnvioDialogOpen(true)} className="bg-primary hover:bg-primary/90">
              <Send className="w-4 h-4 mr-2" />
              Enviar Resultados
            </Button>
          )
        }
      />

      {/* Cards de estatísticas para gestor */}
      {isGestor && statsGestor && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total de Envios', value: statsGestor.total, icon: Send, color: 'text-primary', bg: 'bg-info-soft' },
            { label: 'Colaboradores', value: statsGestor.agentes, icon: Users, color: 'text-primary', bg: 'bg-info-soft' },
            { label: 'Não Visualizados', value: statsGestor.naoVistos, icon: Eye, color: 'text-warning', bg: 'bg-warning-soft' },
          ].map(s => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue={isGestor ? 'gestor' : 'agente'} className="space-y-4">
        <TabsList>
          {isGestor && (
            <TabsTrigger value="gestor">
              <Users className="w-4 h-4 mr-2" />
              Painel do Gestor
            </TabsTrigger>
          )}
          <TabsTrigger value="agente">
            <TrendingUp className="w-4 h-4 mr-2" />
            {isGestor ? 'Visão Agente' : 'Meus Resultados'}
          </TabsTrigger>
        </TabsList>

        {/* TAB GESTOR */}
        {isGestor && (
          <TabsContent value="gestor" className="space-y-4">
            {/* Filtros */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-medium">Filtros</span>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <Label className="text-xs mb-1 block">Colaborador</Label>
                    <Select value={filtroColaborador} onValueChange={setFiltroColaborador}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Todos</SelectItem>
                        {colaboradores.filter(c => c.papel === 'agente').map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">De</Label>
                    <Input type="date" className="h-8 text-xs w-36" value={filtroPeriodoInicio} onChange={e => setFiltroPeriodoInicio(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Até</Label>
                    <Input type="date" className="h-8 text-xs w-36" value={filtroPeriodoFim} onChange={e => setFiltroPeriodoFim(e.target.value)} />
                  </div>
                  {(filtroColaborador || filtroPeriodoInicio || filtroPeriodoFim) && (
                    <Button variant="ghost" size="sm" onClick={() => { setFiltroColaborador(''); setFiltroPeriodoInicio(''); setFiltroPeriodoFim(''); }}>
                      Limpar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Lista de envios */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Histórico de Envios
                  <Badge variant="outline" className="ml-2">{enviosFiltrados.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {enviosFiltrados.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum envio encontrado</p>
                ) : (
                  <div className="space-y-2">
                    {enviosFiltrados.map(envio => {
                      const d = envio.dados_consolidados || {};
                      return (
                        <div key={envio.id}
                          className="p-4 bg-muted hover:bg-muted rounded-xl cursor-pointer transition-colors border border-transparent hover:border-border"
                          onClick={() => handleVisualizar(envio)}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-foreground">{envio.colaborador_nome}</p>
                                <Badge variant="outline" className="text-xs capitalize">{envio.periodicidade}</Badge>
                                {envio.visualizado
                                  ? <Badge className="bg-success-soft text-success border-success/25 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Visto</Badge>
                                  : <Badge className="bg-warning-soft text-warning text-xs">Não visto</Badge>
                                }
                              </div>
                              <p className="text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                {formatDateSP(envio.periodo_inicio, 'DD/MM/YY')} – {formatDateSP(envio.periodo_fim, 'DD/MM/YY')}
                                <span className="ml-3">Perf: <strong>{d.performance_percentual || 0}%</strong></span>
                                <span className="ml-2">CSAT: <strong>{d.csat_individual || 0}%</strong></span>
                                <span className="ml-2 hidden sm:inline">Trat: <strong>{d.tratativas_solucionadas || 0}/{d.tratativas_total || 0}</strong></span>
                              </p>
                            </div>
                            <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* TAB AGENTE */}
        <TabsContent value="agente">
          <HanseiAgenteDashboard
            meusEnvios={isGestor ? (filtroColaborador ? envios.filter(e => e.colaborador_id === filtroColaborador) : meusEnvios) : meusEnvios}
            onVerDetalhes={handleVisualizar}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog de Envio */}
      <HanseiEnvioDialog
        open={envioDialogOpen}
        onClose={() => setEnvioDialogOpen(false)}
        colaboradores={colaboradores}
        tratativas={tratativas}
        apuracoes={apuracoes}
        pontuacoes={pontuacoes}
        colaborador={colaborador}
        user={user}
        onEnviar={enviarMutation.mutate}
        isEnviando={enviarMutation.isPending}
      />

      {/* Dialog de Visualização */}
      <HanseiVisualizarDialog
        open={visualizarDialogOpen}
        onClose={() => { setVisualizarDialogOpen(false); setEnvioSelecionado(null); }}
        envio={envioSelecionado}
        comentarios={comentarios}
        isGestor={isGestor}
        feedbackForm={feedbackForm}
        setFeedbackForm={setFeedbackForm}
        onEnviarFeedback={handleEnviarFeedback}
        isEnviandoFeedback={comentarioMutation.isPending}
      />
    </div>
  );
}