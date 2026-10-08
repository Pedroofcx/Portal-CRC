import db from '@/api/db';
import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDateSP } from '@/components/utils/helpers';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StatusBadge from '@/components/ui/StatusBadge';
import CardBoasVindas from '@/components/dashboard/CardBoasVindas';
import MinhasAnotacoes from '@/components/dashboard/MinhasAnotacoes';
import DistribuicaoTratativas from '@/components/dashboard/DistribuicaoTratativas';
import FaixaVencidas from '@/components/dashboard/gestor/FaixaVencidas';
import AvisoEncerramentoAutomatico from '@/components/dashboard/AvisoEncerramentoAutomatico';
import PainelCicloGestor from '@/components/dashboard/gestor/PainelCicloGestor';
import { useCicloEquipe } from '@/hooks/useCicloEquipe';
import MinhaSemanaCard from '@/components/escalas/MinhaSemanaCard';
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
import { ClipboardList, TrendingUp, CheckCircle, AlertCircle, ArrowRight, Users, Target } from 'lucide-react';


import { usePontuacaoAgente } from '@/hooks/usePontuacaoAgente';
import CentralDePendencias from '@/components/dashboard/CentralDePendencias';
import { avisosVisiveis } from '@/lib/pendencias';

export default function Dashboard() {

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







  const { data: solicitacoesApoio = [] } = useQuery({
    queryKey: ['solicitacoes-apoio-dashboard'],
    queryFn: () => db.entities.SolicitacaoApoio.list('-created_date', 500),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });


  // Mutations também devem ser definidos antes de lógica condicional



  // Calcular colaborador e papel APÓS todos os hooks
  const colaborador = React.useMemo(() => 
    colaboradores.find(c => c.email === user?.email),
    [colaboradores, user]
  );
  const isGestor = colaborador?.papel === 'gestor';

  // Confirmações de leitura SÓ desta pessoa (antes: as últimas 1000 de todo
  // mundo). Mesma chave da central de pendências — as duas andam juntas.
  const { data: leituras = [] } = useQuery({
    queryKey: ['aviso-leituras', colaborador?.id],
    queryFn: () => db.entities.AvisoLeitura.filter({ colaborador_id: colaborador.id }),
    enabled: Boolean(colaborador?.id),
    staleTime: 0,
  });

  // Férias esperando a validação da própria pessoa. Precisa vir DEPOIS de
  // `colaborador`: antes, o useMemo lia a variável ainda não criada e a tela
  // inicial inteira caía (ReferenceError). — só dá para validar
  // pelo diálogo desta tela, então o card na lateral do operador não pode sair.



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
  
  

  // Avisos não lidos para os cards: as mesmas regras da central de
  // pendências (para a pessoa, vigente, publicado depois do cadastro).
  const avisosParaExibir = React.useMemo(() => {
    if (!colaborador?.id || !Array.isArray(todosAvisos)) return [];
    const confirmados = new Set(leituras.filter(l => l.confirmou === true).map(l => l.aviso_id));
    return avisosVisiveis(todosAvisos, colaborador).filter(aviso => !confirmados.has(aviso.id));
  }, [todosAvisos, leituras, colaborador]);




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
      <AvisoEncerramentoAutomatico tratativas={minhasTratativas} mostrarAgente />
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
          <AvisoEncerramentoAutomatico tratativas={minhasTratativas} />
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
              <MinhaSemanaCard colaboradorId={colaborador?.id} />
              <CardRodizioDashboard tipo="lider" />
              <CardRodizioDashboard tipo="n2" />
              <AvisosDoOperador avisosParaExibir={avisosParaExibir} leituras={leituras} colaborador={colaborador} />
              <MinhasAnotacoes colaboradorId={colaborador?.id} />

              <CardMinhasFerias colaboradorId={colaborador?.id} />
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




      {/* Avisos a confirmar, pesquisas a responder e Hansei novo — uma
          pendência por vez (src/components/dashboard/CentralDePendencias). */}
      <CentralDePendencias colaborador={colaborador} />
      </div>
    </ErrorBoundary>
  );
}