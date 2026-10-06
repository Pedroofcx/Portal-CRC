import db from '@/api/db';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  TrendingUp, Send, Users, Search
} from 'lucide-react';
import HanseiEnvioDialog from '@/components/hansei/HanseiEnvioDialog';
import HanseiVisualizarDialog from '@/components/hansei/HanseiVisualizarDialog';
import HanseiAgenteDashboard from '@/components/hansei/HanseiAgenteDashboard';
import { Cartao } from '@/components/ui/Cartao';
import CartaoColaboradorHansei from '@/components/hansei/CartaoColaboradorHansei';
import PainelColaboradorHansei from '@/components/hansei/PainelColaboradorHansei';

export default function Hansei() {
  const [envioDialogOpen, setEnvioDialogOpen] = useState(false);
  const [visualizarDialogOpen, setVisualizarDialogOpen] = useState(false);
  const [envioSelecionado, setEnvioSelecionado] = useState(null);
  const [pessoaAberta, setPessoaAberta] = useState(null);
  const [busca, setBusca] = useState('');
  const [feedbackForm, setFeedbackForm] = useState({ comentario: '', sentimento: 'neutro' });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores', "list()"], queryFn: () => db.entities.Colaborador.list() });
  // Todas (sem limite) e as mesmas buscas do ranking: o Hansei usa a conta oficial.
  const { data: tratativas = [] } = useQuery({ queryKey: ['tratativas', "list('-created_date')"], queryFn: () => db.entities.Tratativa.list('-created_date') });
  const { data: apuracoes = [] } = useQuery({ queryKey: ['apuracoes-equipe'], queryFn: () => db.entities.Apuracao.list('-periodo_fim') });
  const { data: bonus = [] } = useQuery({ queryKey: ['bonus-manual'], queryFn: () => db.entities.Pontuacao.filter({ tipo: 'bonus_manual' }, '-created_date') });
  const { data: ciclos = [] } = useQuery({ queryKey: ['ciclos-trimestrais', "list()"], queryFn: () => db.entities.CicloTrimestral.list() });
  const { data: envios = [], isLoading } = useQuery({ queryKey: ['hansei-envios', "list('-data_envio', 200)"], queryFn: () => db.entities.HanseiEnvio.list('-data_envio', 200) });
  const { data: comentarios = [] } = useQuery({ queryKey: ['hansei-comentarios'], queryFn: () => db.entities.HanseiComentario.list('-data_comentario') });

  const colaborador = colaboradores.find(c => c.email === user?.email);
  const isGestor = colaborador?.papel === 'gestor';

  const [ultimoEnvio, setUltimoEnvio] = useState(null);

  const enviarMutation = useMutation({
    mutationFn: (data) => db.entities.HanseiEnvio.create(data),
    onSuccess: (_, enviado) => {
      queryClient.invalidateQueries(['hansei-envios']);
      toast.success('Resultados enviados com sucesso!');
      // A janela fica aberta com a confirmação: dali dá para enviar a outra
      // pessoa ou voltar à tela inicial (a lista de pessoas).
      setUltimoEnvio({ nome: enviado?.colaborador_nome ?? 'a pessoa escolhida' });
    },
    onError: () => toast.error('Erro ao enviar resultados'),
  });

  const marcarVisualizadoMutation = useMutation({
    mutationFn: (id) => db.entities.HanseiEnvio.update(id, { visualizado: true, data_visualizacao: new Date().toISOString() }),
    onSuccess: () => queryClient.invalidateQueries(['hansei-envios']),
    onError: () => toast.error('Não consegui marcar como visualizado.'),
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

  const agentesDaLista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return colaboradores
      .filter((c) => c.papel === 'agente' && c.ativo !== false)
      .filter((c) => !termo || c.nome_completo?.toLowerCase().includes(termo))
      .sort((a, b) => String(a.nome_completo).localeCompare(String(b.nome_completo)));
  }, [colaboradores, busca]);

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

      {isGestor && statsGestor && (
        <Cartao>
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-xs text-muted-foreground">Hanseis enviados</p><p className="text-2xl font-semibold tabular-nums text-foreground">{statsGestor.total}</p></div>
            <div><p className="text-xs text-muted-foreground">Colaboradores com Hansei</p><p className="text-2xl font-semibold tabular-nums text-foreground">{statsGestor.agentes}</p></div>
            <div><p className="text-xs text-muted-foreground">Ainda não lidos</p><p className="text-2xl font-semibold tabular-nums text-foreground">{statsGestor.naoVistos}</p></div>
          </div>
        </Cartao>
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

        {/* TAB GESTOR — a pessoa primeiro, o histórico dentro (como em Observações) */}
        {isGestor && (
          <TabsContent value="gestor" className="space-y-4">
            {pessoaAberta ? (
              <PainelColaboradorHansei
                colaborador={pessoaAberta}
                envios={envios}
                comentarios={comentarios}
                onVoltar={() => setPessoaAberta(null)}
                onAbrir={handleVisualizar}
                onEnviar={() => setEnvioDialogOpen(true)}
              />
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar colaborador..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {agentesDaLista.map((c) => (
                    <CartaoColaboradorHansei key={c.id} colaborador={c} envios={envios} onClick={() => setPessoaAberta(c)} />
                  ))}
                </div>
                {agentesDaLista.length === 0 && (
                  <p className="py-10 text-center text-sm text-muted-foreground">Nenhum colaborador encontrado.</p>
                )}
              </>
            )}
          </TabsContent>
        )}

        {/* TAB AGENTE */}
        <TabsContent value="agente">
          <HanseiAgenteDashboard
            meusEnvios={isGestor ? (pessoaAberta ? envios.filter(e => e.colaborador_id === pessoaAberta.id) : meusEnvios) : meusEnvios}
            onVerDetalhes={handleVisualizar}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog de Envio */}
      <HanseiEnvioDialog
        open={envioDialogOpen}
        onClose={() => { setEnvioDialogOpen(false); setUltimoEnvio(null); }}
        ultimoEnvio={ultimoEnvio}
        onEnviarOutro={() => { setUltimoEnvio(null); setPessoaAberta(null); }}
        onVoltarAoInicio={() => { setEnvioDialogOpen(false); setUltimoEnvio(null); setPessoaAberta(null); }}
        colaboradores={colaboradores}
        tratativas={tratativas}
        apuracoes={apuracoes}
        bonus={bonus}
        ciclos={ciclos}
        colaborador={colaborador}
        colaboradorInicial={pessoaAberta}
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