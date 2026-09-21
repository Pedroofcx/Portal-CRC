import db from '@/api/db';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDateSP } from '@/components/utils/helpers';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StatusBadge from '@/components/ui/StatusBadge';
import CardBoasVindas from '@/components/dashboard/CardBoasVindas';
import MinhasAnotacoes from '@/components/dashboard/MinhasAnotacoes';
import DistribuicaoTratativas from '@/components/dashboard/DistribuicaoTratativas';
import FaixaVencidas from '@/components/dashboard/gestor/FaixaVencidas';
import PainelCicloGestor from '@/components/dashboard/gestor/PainelCicloGestor';
import { useCicloEquipe } from '@/hooks/useCicloEquipe';
import MeuTurnoCard from '@/components/turnos/MeuTurnoCard';
import CardHorasImplantacao from '@/components/dashboard/CardHorasImplantacao';
import CardRodizioDashboard from '@/components/rodizio/CardRodizioDashboard';
import PainelMeuCiclo from '@/components/dashboard/operador/PainelMeuCiclo';
import FilaDoOperador from '@/components/dashboard/operador/FilaDoOperador';
import AvisosDoOperador from '@/components/dashboard/operador/AvisosDoOperador';
import CardMinhasFerias from '@/components/dashboard/operador/CardMinhasFerias';
import AtalhosDoOperador from '@/components/dashboard/operador/AtalhosDoOperador';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardList,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Bell,
  ArrowRight,
  Users,
  Target,
  CheckSquare,
  Star,
  Eye,
  Palmtree
} from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { usePontuacaoAgente } from '@/hooks/usePontuacaoAgente';
import PainelLateral, { RodapeFixo } from '@/components/ui/PainelLateral';

export default function Dashboard() {
  const [avisoPopupOpen, setAvisoPopupOpen] = React.useState(false);
  const [currentAvisoIndex, setCurrentAvisoIndex] = React.useState(0);
  const [pesquisaPopupOpen, setPesquisaPopupOpen] = React.useState(false);
  const [currentPesquisaIndex, setCurrentPesquisaIndex] = React.useState(0);
  const [hanseiPopupOpen, setHanseiPopupOpen] = React.useState(false);
  const [respostasPesquisaAtual, setRespostasPesquisaAtual] = React.useState({});
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // CRITICAL: Todos os hooks devem ser chamados antes de qualquer lógica condicional
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: tratativas = [], isLoading: loadingTratativas } = useQuery({
    queryKey: ['tratativas', "list('-created_date', 500)"],
    queryFn: () => db.entities.Tratativa.list('-created_date', 500),
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // avisos: usar todosAvisos abaixo (query unificada)




  const { data: elegibilidades = [] } = useQuery({
    queryKey: ['elegibilidades'],
    queryFn: () => db.entities.ElegibilidadePremio.filter({ ativa: true }),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
  });

  // Unificado: um único query para avisos (evita fetch duplo)
  const { data: todosAvisos = [] } = useQuery({
    queryKey: ['avisos-todos'],
    queryFn: () => db.entities.Aviso.filter({ ativo: true }, '-data_publicacao', 20),
    staleTime: 30000,
    retry: 2,
  });

  const { data: leituras = [], isSuccess: leiturasLoaded } = useQuery({
    queryKey: ['avisoLeituras'],
    // Filtra pelo colaborador atual para não trazer leituras de outros usuários
    queryFn: async () => {
      const all = await db.entities.AvisoLeitura.list('-created_date', 1000);
      return all;
    },
    staleTime: 0, // sempre fresco — crítico para não reexibir avisos já lidos
    refetchOnWindowFocus: true,
  });

  const { data: pesquisasAtivas = [] } = useQuery({
    queryKey: ['pesquisas-ativas'],
    queryFn: () => db.entities.Pesquisa.filter({ ativa: true }),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: respostasPesquisa = [] } = useQuery({
    queryKey: ['respostas-pesquisa'],
    queryFn: () => db.entities.RespostaPesquisa.list(),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: hanseiEnvios = [] } = useQuery({
    queryKey: ['hansei-envios', "list('-data_envio', 10)"],
    queryFn: () => db.entities.HanseiEnvio.list('-data_envio', 10),
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: ciclosFerias = [] } = useQuery({
    queryKey: ['ciclos-ferias-dashboard'],
    queryFn: () => db.entities.CicloFerias.list('-created_date', 50),
    staleTime: 120000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });


  const { data: solicitacoesApoio = [] } = useQuery({
    queryKey: ['solicitacoes-apoio-dashboard'],
    queryFn: () => db.entities.SolicitacaoApoio.list('-created_date', 500),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const [validarFeriasOpen, setValidarFeriasOpen] = React.useState(false);

  // Mutations também devem ser definidos antes de lógica condicional
  const [avisoAttemptCount, setAvisoAttemptCount] = React.useState(0);

  const confirmarLeituraAviso = useMutation({
    mutationFn: (avisoId) => db.entities.AvisoLeitura.create({
      aviso_id: avisoId,
      colaborador_id: colaborador?.id,
      data_leitura: new Date().toISOString(),
      confirmou: true
    }),
    onSuccess: async () => {
      // Refetch imediato para garantir dado atualizado antes de fechar o popup
      await queryClient.refetchQueries({ queryKey: ['avisoLeituras'] });
      queryClient.invalidateQueries(['avisos-todos']);
      
      setAvisoPopupOpen(false);
      setCurrentAvisoIndex(0);
      setAvisoAttemptCount(0);
      
      toast.success('Aviso confirmado');
    },
    onError: () => {
      setAvisoAttemptCount(prev => prev + 1);
      toast.error('Erro ao confirmar leitura. Tente novamente.');
    }
  });

  const responderPesquisaMutation = useMutation({
    mutationFn: (data) => db.entities.RespostaPesquisa.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['respostas-pesquisa']);
      queryClient.invalidateQueries(['pesquisas-ativas']);
      
      setPesquisaPopupOpen(false);
      setCurrentPesquisaIndex(0);
      setRespostasPesquisaAtual({});
      toast.success('Resposta enviada com sucesso');
    },
    onError: () => toast.error('Erro ao enviar resposta'),
  });

  // Calcular colaborador e papel APÓS todos os hooks
  const colaborador = React.useMemo(() => 
    colaboradores.find(c => c.email === user?.email),
    [colaboradores, user]
  );
  const isGestor = colaborador?.papel === 'gestor';

  // Férias esperando a validação da própria pessoa. Precisa vir DEPOIS de
  // `colaborador`: antes, o useMemo lia a variável ainda não criada e a tela
  // inicial inteira caía (ReferenceError). — só dá para validar
  // pelo diálogo desta tela, então o card na lateral do operador não pode sair.
  const minhasferiasPendentes = React.useMemo(() => {
    if (!colaborador?.id) return [];
    const meusCiclos = ciclosFerias.filter(c => c.colaborador_id === colaborador.id);
    const pendentes = [];
    meusCiclos.forEach(ciclo => {
      (ciclo.fragmentos || []).forEach(frag => {
        if (frag.status === 'pendente_validacao') {
          pendentes.push({ ...frag, ciclo });
        }
      });
    });
    return pendentes;
  }, [ciclosFerias, colaborador]);


  // Férias pendentes de validação para o agente atual

  // Filtrar tratativas baseado no papel
  const minhasTratativas = React.useMemo(() => {
    if (!Array.isArray(tratativas)) return [];
    if (isGestor) return tratativas;
    if (!colaborador?.id) return [];
    return tratativas.filter(t => 
      t.agente_responsavel_id === colaborador.id || t.created_by === user?.email
    );
  }, [tratativas, isGestor, colaborador, user]);

  // Tratativas recentes
  const tratativasRecentes = React.useMemo(() => {
    if (!Array.isArray(minhasTratativas)) return [];
    return minhasTratativas.slice(0, 5);
  }, [minhasTratativas]);


  // Meus PDIs e Observações
  
  

  // Avisos não lidos para exibir no card (excluir os já confirmados)
  const avisosParaExibir = React.useMemo(() => {
    if (!colaborador?.id || !Array.isArray(todosAvisos)) return [];
    
    return todosAvisos.filter(aviso => {
      // Verificar se já confirmou leitura
      const jaConfirmou = leituras.some(l => 
        l.aviso_id === aviso.id && 
        l.colaborador_id === colaborador.id && 
        l.confirmou === true
      );
      
      return !jaConfirmou;
    });
  }, [todosAvisos, leituras, colaborador]);

  // Avisos não lidos obrigatórios - apenas os que o colaborador ainda não confirmou
  const avisosObrigatorios = React.useMemo(() => {
    if (!colaborador?.id || !Array.isArray(todosAvisos)) return [];
    
    return todosAvisos.filter(aviso => {
      // Verificar se já leu E confirmou
      const jaConfirmou = leituras.some(l => 
        l.aviso_id === aviso.id && 
        l.colaborador_id === colaborador.id && 
        l.confirmou === true
      );
      
      if (jaConfirmou) return false;
      
      // Verificar destinatário
      if (aviso.destinatarios === 'todos') return true;
      if (aviso.destinatarios === 'agentes' && colaborador?.papel === 'agente') return true;
      if (aviso.destinatarios === 'gestores' && colaborador?.papel === 'gestor') return true;
      return false;
    });
  }, [todosAvisos, leituras, colaborador]);

  // Pesquisas não respondidas (TODOS os usuários - gestores e agentes)
  const pesquisasPendentes = React.useMemo(() => {
    if (!colaborador?.id || !Array.isArray(pesquisasAtivas)) return [];
    
    return pesquisasAtivas.filter(pesquisa => {
      const jaRespondeu = respostasPesquisa.some(r => 
        r.pesquisa_id === pesquisa.id && 
        r.colaborador_id === colaborador.id
      );
      
      // REGRA: Nunca mostrar pesquisa se já respondeu (mesmo com reenvio)
      if (jaRespondeu) return false;
      
      // FORÇAR REENVIO: Se tem timestamp de reenvio, exibir se ainda não foi mostrada após o reenvio
      if (pesquisa.reenviar_timestamp) {
        const lastShown = sessionStorage.getItem(`pesquisa_shown_timestamp_${pesquisa.id}_${colaborador.id}`);
        if (!lastShown || new Date(lastShown) < new Date(pesquisa.reenviar_timestamp)) {
          return true; // Forçar popup para quem ainda não respondeu
        }
      }
      
      // Comportamento normal: mostrar se não respondeu
      return true;
    });
  }, [pesquisasAtivas, respostasPesquisa, colaborador]);

  // Hansei não visualizados (apenas agentes)
  const hanseiNaoVisualizados = React.useMemo(() => {
    if (!colaborador?.id || isGestor || !Array.isArray(hanseiEnvios)) return [];
    
    return hanseiEnvios.filter(h => 
      h.colaborador_id === colaborador.id && 
      h.visualizado === false
    );
  }, [hanseiEnvios, colaborador, isGestor]);

  // Dados de Performance (consolidado de MinhaPerformance)

  // Config ranking visível
  const { data: configuracoes = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => db.entities.Configuracao.list(),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
  });
  const rankingVisivel = React.useMemo(() => {
    const conf = configuracoes.find(c => c.chave === 'ranking_visivel_agentes');
    if (!conf) return true; // padrão: visível
    return conf.valor !== 'false';
  }, [configuracoes]);

  

  // Horas de Implantação utilizadas no mês (global)
  const horasImplantacaoUtilizadas = React.useMemo(() => {
    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return (solicitacoesApoio || [])
      .filter(s => s.mes_referencia === mesAtual && s.status !== 'cancelada')
      .reduce((sum, s) => sum + (s.minutos_solicitados || 0), 0);
  }, [solicitacoesApoio]);

  const {
    totalPontos: totalPontosAgente,
    detalhamentoPontos,
    cicloAtivo,
    bonusManual,
  } = usePontuacaoAgente(colaborador?.id);
  // A equipe no ciclo — só a visão do gestor usa, mas hooks não podem ser
  // condicionais; para o operador as consultas são as mesmas do ranking.
  // ?ciclo=<id> mostra um ciclo do histórico; sem ele, o ativo. Fica no
  // endereço para o "voltar" da página detalhada cair no mesmo ciclo.
  const [parametros, setParametros] = useSearchParams();
  const cicloEquipe = useCicloEquipe(parametros.get('ciclo'));
  const escolherCiclo = (id) => setParametros(
    id === cicloEquipe.cicloAtivo?.id ? {} : { ciclo: id },
    { replace: true },
  );
  

  // Exibir avisos obrigatórios como popup — apenas após leituras carregadas do servidor
  React.useEffect(() => {
    let mounted = true;
    // Aguarda leituras serem buscadas do servidor antes de decidir exibir popup
    if (!colaborador?.id || !leiturasLoaded) return;
    
    if (mounted && avisosObrigatorios.length > 0 && !avisoPopupOpen) {
      setAvisoPopupOpen(true);
      setCurrentAvisoIndex(0);
    }
    
    return () => { mounted = false; };
  }, [avisosObrigatorios.length, colaborador?.id, leiturasLoaded]);

  // Exibir pesquisas pendentes após avisos (TODOS OS USUÁRIOS)
  React.useEffect(() => {
    let mounted = true;
    
    if (mounted && colaborador && pesquisasPendentes.length > 0 && !pesquisaPopupOpen && !avisoPopupOpen && !hanseiPopupOpen) {
      setPesquisaPopupOpen(true);
      setCurrentPesquisaIndex(0);
    }
    
    return () => {
      mounted = false;
    };
  }, [pesquisasPendentes.length, avisoPopupOpen, hanseiPopupOpen, colaborador?.id]);

  // Exibir Hansei não visualizados (apenas agentes, após avisos e pesquisas)
  React.useEffect(() => {
    let mounted = true;
    
    if (mounted && !isGestor && hanseiNaoVisualizados.length > 0 && !hanseiPopupOpen && !avisoPopupOpen && !pesquisaPopupOpen) {
      setHanseiPopupOpen(true);
    }
    
    return () => {
      mounted = false;
    };
  }, [hanseiNaoVisualizados.length, avisoPopupOpen, pesquisaPopupOpen, isGestor, colaborador?.id]);

  // Cleanup ao desmontar - CRITICAL
  React.useEffect(() => {
    return () => {
      // Reset de estados ao desmontar
      setAvisoPopupOpen(false);
      setPesquisaPopupOpen(false);
      setHanseiPopupOpen(false);
      setCurrentAvisoIndex(0);
      setCurrentPesquisaIndex(0);
      setRespostasPesquisaAtual({});
    };
  }, []);

  const handleEnviarRespostaPesquisa = () => {
    const pesquisaAtual = pesquisasPendentes[currentPesquisaIndex];
    if (!pesquisaAtual) return;

    const respostasArray = pesquisaAtual.perguntas.map(p => ({
      pergunta_id: p.id,
      resposta: respostasPesquisaAtual[p.id] || ''
    }));

    const obrigatoriasSemResposta = pesquisaAtual.perguntas.filter(
      p => p.obrigatoria && !respostasPesquisaAtual[p.id]
    );
    
    if (obrigatoriasSemResposta.length > 0) {
      toast.error('Responda todas as perguntas obrigatórias');
      return;
    }

    // Calcular nota para CSAT/NPS
    let notaCalculada = null;
    let sentimento = 'neutro';

    if (pesquisaAtual.tipo === 'csat' || pesquisaAtual.tipo === 'nps') {
      const primeiraResposta = respostasPesquisaAtual[pesquisaAtual.perguntas[0]?.id];
      if (primeiraResposta) {
        notaCalculada = parseFloat(primeiraResposta);
        
        if (pesquisaAtual.tipo === 'csat') {
          sentimento = notaCalculada >= 4 ? 'positivo' : notaCalculada >= 3 ? 'neutro' : 'negativo';
        } else if (pesquisaAtual.tipo === 'nps') {
          sentimento = notaCalculada >= 9 ? 'positivo' : notaCalculada >= 7 ? 'neutro' : 'negativo';
        }
      }
    }

    responderPesquisaMutation.mutate({
      pesquisa_id: pesquisaAtual.id,
      pesquisa_titulo: pesquisaAtual.titulo,
      pesquisa_tipo: pesquisaAtual.tipo,
      colaborador_id: colaborador?.id,
      colaborador_nome: colaborador?.nome_completo || user?.full_name,
      respostas: respostasArray,
      confirmou_leitura: true,
      data_leitura: new Date().toISOString(),
      data_resposta: new Date().toISOString(),
      nota_calculada: notaCalculada,
      sentimento: sentimento
    });
  };

  const avisoAtual = avisosObrigatorios[currentAvisoIndex];
  const pesquisaAtual = pesquisasPendentes[currentPesquisaIndex];

  if (!user) {
    return <LoadingSpinner text="Carregando..." />;
  }

  if (user && colaboradores.length > 0 && !colaborador) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Cadastro Pendente</h2>
        <p className="text-muted-foreground">Seu usuário ainda não foi registrado como colaborador.</p>
        <p className="text-muted-foreground text-sm mt-2">Entre em contato com o gestor.</p>
      </div>
    );
  }

  if (loadingTratativas) {
    return <LoadingSpinner text="Carregando dashboard..." />;
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8">
      <CardBoasVindas
        nome={user?.full_name}
        papel={colaborador?.papel}
        facilitadorInterno={colaborador?.is_facilitador_interno}
        fiExpiracao={colaborador?.fi_expiracao}
      />

      {/* Visão do GESTOR — proposta C, "O ciclo". No topo, a faixa com as
          tratativas vencidas AGORA (o antigo "Fora do SLA" contava o histórico
          inteiro); abaixo, o ranking com o ritmo e a elegibilidade de cada
          pessoa. Clicar numa pessoa abre a página detalhada (CicloColaborador). */}
      {isGestor && (
      <>
      <FaixaVencidas retrato={cicloEquipe.retrato} isLoading={cicloEquipe.isLoading} />
      <PainelCicloGestor
        ciclo={cicloEquipe.ciclo}
        cicloAtivo={cicloEquipe.cicloAtivo}
        ciclos={cicloEquipe.ciclos}
        aoEscolherCiclo={escolherCiclo}
        gestor={colaborador}
        agentes={cicloEquipe.agentes}
        exigencias={cicloEquipe.exigencias}
        equipe={cicloEquipe.equipe}
        agora={cicloEquipe.agora}
        isLoading={cicloEquipe.isLoading}
      />

      {/* Card Horas de Implantação */}
      <CardHorasImplantacao utilizadosMinutos={horasImplantacaoUtilizadas} />

      {/* Cards de Rodízio — Líder Técnico e Apoio N2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CardRodizioDashboard tipo="lider" />
        <CardRodizioDashboard tipo="n2" />
      </div>

      </>
      )}

      {/*
        * Visão do OPERADOR — proposta B, "Meu ciclo".
        *
        * Antes eram 24 blocos, com números repetidos (encerradas e taxa de
        * conclusão apareciam duas vezes) e a lista de tratativas na 8ª seção,
        * mostrando as mais recentes em vez das mais urgentes. Agora: o ciclo
        * de premiação no topo, a fila por prazo do SLA, e o contexto do dia
        * ao lado. PDI, Hansei, férias e feedbacks continuam no menu.
        */}
      {!isGestor && (
        <div className="space-y-6">
          <PainelMeuCiclo
            colaborador={colaborador}
            cicloAtivo={cicloAtivo}
            totalPontos={totalPontosAgente}
            detalhamentoPontos={detalhamentoPontos}
            bonusManual={bonusManual}
            minhasTratativas={minhasTratativas}
            exigencias={elegibilidades}
            rankingVisivel={rankingVisivel}
          />

          {/* items-start: sem isto a lateral estica até a altura da fila, e o card
              do rodízio (que usa h-full) virava uma coluna enorme. */}
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <FilaDoOperador tratativas={minhasTratativas} />

            <div className="space-y-4">
              <MeuTurnoCard colaboradorId={colaborador?.id} />
              <CardRodizioDashboard tipo="lider" />
              <CardRodizioDashboard tipo="n2" />
              <AvisosDoOperador avisosParaExibir={avisosParaExibir} leituras={leituras} colaborador={colaborador} />
              <MinhasAnotacoes colaboradorId={colaborador?.id} />

              <CardMinhasFerias pendentes={minhasferiasPendentes.length} aoAbrir={() => setValidarFeriasOpen(true)} />
              <AtalhosDoOperador />
            </div>
          </div>
        </div>
      )}

      {/* Layout para Gestores */}
      {isGestor && (
      <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tratativas Recentes */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Tratativas Recentes</CardTitle>
              <Link to={createPageUrl('Tratativas')}>
                <Button variant="ghost" size="sm" className="text-primary">
                  Ver todas <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {tratativasRecentes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhuma tratativa registrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tratativasRecentes.map((tratativa) => (
                  <Link 
                    key={tratativa.id} 
                    to={createPageUrl(`TratativaDetalhe?id=${tratativa.id}`)}
                    className="block p-4 bg-muted rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {tratativa.nome_cliente || tratativa.link_zendesk?.substring(0, 50)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDateSP(tratativa.created_date, 'DD/MM/YYYY HH:mm')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={tratativa.prioridade} />
                        <StatusBadge status={tratativa.status} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar Gestor */}
        <div className="space-y-6">
          {/* Avisos */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Avisos
                </CardTitle>
                <Link to={createPageUrl('Avisos')}>
                  <Button variant="ghost" size="sm" className="text-primary">Ver todos</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {avisosParaExibir.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Nenhum aviso pendente</p>
              ) : (
                <div className="space-y-3">
                  {avisosParaExibir.slice(0, 3).map((aviso) => {
                    const jaLeu = leituras.some(l => l.aviso_id === aviso.id && l.colaborador_id === colaborador?.id && l.confirmou === true);
                    return (
                      <div key={aviso.id} className={`p-3 rounded-lg ${jaLeu ? 'bg-muted opacity-60' : 'bg-muted'}`}>
                        <div className="flex items-start gap-2">
                          {aviso.tipo === 'urgente' && <Badge variant="destructive" className="text-xs">Urgente</Badge>}
                          {jaLeu && <Badge className="bg-success-soft text-success border-success/25 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Lido</Badge>}
                          <div className="flex-1">
                            <p className={`font-medium text-sm ${jaLeu ? 'text-muted-foreground' : 'text-foreground'}`}>{aviso.titulo}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDateSP(aviso.data_publicacao, 'DD/MM/YYYY')}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Link to={createPageUrl('Tratativas')}>
                <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-xs">Nova Tratativa</span>
                </Button>
              </Link>
              <Link to={createPageUrl('Observacoes')}>
                <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                  <Target className="w-5 h-5" />
                  <span className="text-xs">Registrar</span>
                </Button>
              </Link>
              <Link to={createPageUrl('Cadastro')}>
                <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                  <Users className="w-5 h-5" />
                  <span className="text-xs">Equipe</span>
                </Button>
              </Link>
              <Link to={createPageUrl('Relatorios')}>
                <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-xs">Relatórios</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Controle de Distribuição de Tratativas — exclusivo gestor, apenas Equipe CRC */}
      <DistribuicaoTratativas
        gestorId={colaborador?.id}
        gestorNome={colaborador?.nome_completo || user?.full_name}
        colaboradores={colaboradores.filter(c => c.equipe_nome?.toLowerCase().includes('crc'))}
      />
      </div>
      )}


          {/* Modal: Minhas Férias - Validação */}
      <PainelLateral
        open={validarFeriasOpen} onOpenChange={setValidarFeriasOpen}
        largura="xl"
        titulo={<><Palmtree className="w-5 h-5 text-success" /> Meus Períodos de Férias</>}
      >
          <div className="space-y-4 mt-2">
            {ciclosFerias.filter(c => c.colaborador_id === colaborador?.id).length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Nenhum ciclo de férias cadastrado.</p>
            ) : (
              ciclosFerias
                .filter(c => c.colaborador_id === colaborador?.id)
                .sort((a, b) => (b.aquisitivo_inicio || '').localeCompare(a.aquisitivo_inicio || ''))
                .map(ciclo => {
                  const frags = ciclo.fragmentos || [];
                  if (frags.length === 0) return null;
                  return (
                    <div key={ciclo.id} className="border border-border rounded-xl p-4 space-y-3">
                      <p className="text-sm font-semibold text-foreground">
                        Período aquisitivo: {ciclo.aquisitivo_inicio} → {ciclo.aquisitivo_fim}
                      </p>
                      {frags.map((frag, idx) => {
                        return (
                          <div key={frag.id || idx} className="flex items-center justify-between p-3 bg-muted rounded-lg border">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {frag.data_inicio} → {frag.data_fim}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge className="bg-success-soft text-success text-xs">{frag.dias} dias</Badge>
                                <StatusBadge status={frag.status || 'agendado'} className="text-xs" />
                                {frag.observacao && <span className="text-xs text-muted-foreground italic">{frag.observacao}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
            )}
            <RodapeFixo>
              <Link to={createPageUrl('GestaoFerias')}>
                <Button variant="outline" className="w-full">
                  <ArrowRight className="w-4 h-4 mr-2" /> Ver Gestão de Férias completa
                </Button>
              </Link>
            </RodapeFixo>
          </div>
      </PainelLateral>

      {/* Popup de Avisos Obrigatórios - SEM botão X */}
      {avisoPopupOpen && avisoAtual && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent 
            className="max-w-2xl [&>button]:hidden" 
            onInteractOutside={(e) => {
              if (avisoAttemptCount >= 3) {
                sessionStorage.setItem(`aviso_force_closed_${avisoAtual.id}`, 'true');
                setAvisoPopupOpen(false);
                setAvisoAttemptCount(0);
              } else {
                e.preventDefault();
              }
            }}
            onEscapeKeyDown={(e) => {
              if (avisoAttemptCount < 3) e.preventDefault();
            }}
            aria-describedby="aviso-description"
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                {avisoAtual.titulo}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4" id="aviso-description">
              <div className={`p-3 rounded-lg ${
                avisoAtual.tipo === 'urgente' ? 'bg-destructive/10 border border-destructive/25' :
                avisoAtual.tipo === 'alerta' ? 'bg-warning-soft border border-warning/25' :
                'bg-info-soft border border-info/25'
              }`}>
                <p className="text-foreground whitespace-pre-wrap">{avisoAtual.conteudo}</p>
              </div>
              <Button 
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() => confirmarLeituraAviso.mutate(avisoAtual.id)}
                disabled={confirmarLeituraAviso.isPending}
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                {confirmarLeituraAviso.isPending ? 'Confirmando...' : 'Li e Compreendi'}
              </Button>
              {avisoAttemptCount >= 3 && (
                <p className="text-xs text-warning text-center">
                  Clique fora ou pressione ESC para fechar temporariamente
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Popup de Hansei - Resultados Recebidos (apenas agentes) */}
      {hanseiPopupOpen && hanseiNaoVisualizados.length > 0 && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent 
            className="max-w-2xl [&>button]:hidden" 
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            aria-describedby="hansei-description"
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Novos Resultados Disponíveis
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4" id="hansei-description">
              <div className="p-4 bg-info-soft border border-info/25 rounded-lg">
                <p className="text-sm text-primary font-medium mb-2">
                  Você tem {hanseiNaoVisualizados.length} resultado(s) de desempenho para visualizar
                </p>
                <p className="text-xs text-primary">
                  Acesse o módulo Hansei para ver suas métricas consolidadas e feedback do gestor.
                </p>
              </div>

              <div className="space-y-2">
                {hanseiNaoVisualizados.slice(0, 3).map(envio => (
                  <div key={envio.id} className="p-3 bg-muted rounded-lg border">
                    <p className="text-sm font-medium text-foreground">
                      {formatDateSP(envio.periodo_inicio, 'DD/MM')} - {formatDateSP(envio.periodo_fim, 'DD/MM/YYYY')}
                    </p>
                    <p className="text-xs text-muted-foreground">Periodicidade: {envio.periodicidade}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setHanseiPopupOpen(false);
                  }}
                >
                  Depois
                </Button>
                <Button 
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={() => {
                    setHanseiPopupOpen(false);
                    navigate(createPageUrl('Hansei'));
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Agora
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Popup de Pesquisas Pendentes - SEM botão X - TODOS OS USUÁRIOS */}
      {pesquisaPopupOpen && pesquisaAtual && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent 
            className="max-w-4xl max-h-[90vh] overflow-y-auto [&>button]:hidden" 
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            aria-describedby="pesquisa-description"
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                {pesquisaAtual.titulo}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4" id="pesquisa-description">
              {pesquisaAtual.reenviar_timestamp && (
                <div className="p-3 bg-info-soft border border-info/25 rounded-lg">
                  <p className="text-sm text-primary font-medium">
                    Pesquisa importante - Por favor, responda
                  </p>
                </div>
              )}
              {pesquisaAtual.descricao && (
                <p className="text-sm text-muted-foreground bg-info-soft p-3 rounded-lg">
                  {pesquisaAtual.descricao}
                </p>
              )}
              
              {pesquisaAtual.perguntas?.map((pergunta, _index) => (
                <Card key={pergunta.id} className="border-0 shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <Label className="flex items-center gap-2 font-medium">
                      {pergunta.texto}
                      {pergunta.obrigatoria && <span className="text-destructive">*</span>}
                    </Label>

                    {pergunta.tipo_resposta === 'texto' && (
                      <Textarea
                        value={respostasPesquisaAtual[pergunta.id] || ''}
                        onChange={(e) => setRespostasPesquisaAtual({ 
                          ...respostasPesquisaAtual, 
                          [pergunta.id]: e.target.value 
                        })}
                        placeholder="Sua resposta..."
                        rows={3}
                      />
                    )}

                    {pergunta.tipo_resposta === 'escala_1_5' && (
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(num => (
                          <Button
                            key={num}
                            type="button"
                            variant={respostasPesquisaAtual[pergunta.id] === num.toString() ? 'default' : 'outline'}
                            className={`flex-1 h-12 text-lg font-bold ${respostasPesquisaAtual[pergunta.id] === num.toString() ? 'bg-primary text-white' : 'hover:bg-info-soft'}`}
                            onClick={() => setRespostasPesquisaAtual({ 
                              ...respostasPesquisaAtual, 
                              [pergunta.id]: num.toString() 
                            })}
                          >
                            {num}
                          </Button>
                        ))}
                      </div>
                    )}

                    {pergunta.tipo_resposta === 'escala_0_10' && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-11 gap-1">
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <Button
                              key={num}
                              type="button"
                              size="sm"
                              variant={respostasPesquisaAtual[pergunta.id] === num.toString() ? 'default' : 'outline'}
                              className={`h-10 text-sm font-bold ${respostasPesquisaAtual[pergunta.id] === num.toString() ? 'bg-primary text-white' : 'hover:bg-info-soft'}`}
                              onClick={() => setRespostasPesquisaAtual({ 
                                ...respostasPesquisaAtual, 
                                [pergunta.id]: num.toString() 
                              })}
                            >
                              {num}
                            </Button>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground px-1">
                          <span>Muito insatisfeito</span>
                          <span>Muito satisfeito</span>
                        </div>
                      </div>
                    )}

                    {pergunta.tipo_resposta === 'sim_nao' && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={respostasPesquisaAtual[pergunta.id] === 'sim' ? 'default' : 'outline'}
                          className={`flex-1 ${respostasPesquisaAtual[pergunta.id] === 'sim' ? 'bg-primary' : ''}`}
                          onClick={() => setRespostasPesquisaAtual({ 
                            ...respostasPesquisaAtual, 
                            [pergunta.id]: 'sim' 
                          })}
                        >
                          Sim
                        </Button>
                        <Button
                          type="button"
                          variant={respostasPesquisaAtual[pergunta.id] === 'nao' ? 'default' : 'outline'}
                          className={`flex-1 ${respostasPesquisaAtual[pergunta.id] === 'nao' ? 'bg-primary' : ''}`}
                          onClick={() => setRespostasPesquisaAtual({ 
                            ...respostasPesquisaAtual, 
                            [pergunta.id]: 'nao' 
                          })}
                        >
                          Não
                        </Button>
                      </div>
                    )}

                    {pergunta.tipo_resposta === 'multipla_escolha' && (
                      <Select
                        value={respostasPesquisaAtual[pergunta.id] || ''}
                        onValueChange={(value) => setRespostasPesquisaAtual({ 
                          ...respostasPesquisaAtual, 
                          [pergunta.id]: value 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma opção" />
                        </SelectTrigger>
                        <SelectContent>
                          {pergunta.opcoes?.map((opcao, i) => (
                            <SelectItem key={i} value={opcao}>{opcao}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {pergunta.tipo_resposta === 'multipla_escolha_multipla' && (
                      <div className="space-y-2">
                        {pergunta.opcoes?.map((opcao, i) => (
                          <label key={i} className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg cursor-pointer border border-border">
                            <input
                              type="checkbox"
                              checked={(respostasPesquisaAtual[pergunta.id] || '').split(',').includes(opcao)}
                              onChange={(e) => {
                                const current = (respostasPesquisaAtual[pergunta.id] || '').split(',').filter(v => v);
                                const updated = e.target.checked
                                  ? [...current, opcao]
                                  : current.filter(v => v !== opcao);
                                setRespostasPesquisaAtual({ ...respostasPesquisaAtual, [pergunta.id]: updated.join(',') });
                              }}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-sm">{opcao}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Button 
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleEnviarRespostaPesquisa}
                disabled={responderPesquisaMutation.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {responderPesquisaMutation.isPending ? 'Enviando...' : 'Enviar Resposta'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </ErrorBoundary>
  );
}