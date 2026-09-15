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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Home,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Plus,
  Eye,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import SolicitarHomeOfficeDialog from '@/components/escalas/SolicitarHomeOfficeDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import StatusBadge from '@/components/ui/StatusBadge';


const statusIcons = {
  pendente: Clock,
  aprovada: CheckCircle2,
  recusada: XCircle,
  cancelada: XCircle
};

export default function HomeOfficeEscolha() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalheDialog, setDetalheDialog] = useState(null);
  const [aprovarDialog, setAprovarDialog] = useState(null);
  const [recusarDialog, setRecusarDialog] = useState(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [mesAtual] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['solicitacoes-home-office'],
    queryFn: () => db.entities.SolicitacaoHomeOffice.list('-created_date'),
  });

  const { data: configuracoes = [] } = useQuery({
    queryKey: ['configuracoes-home-office'],
    queryFn: () => db.entities.ConfiguracaoHomeOffice.list(),
  });

  const { data: atribuicoes = [] } = useQuery({
    queryKey: ['escalaAtribuicoes'],
    queryFn: () => db.entities.EscalaAtribuicao.list(),
  });

  const colaborador = useMemo(() => 
    colaboradores.find(c => c.email === user?.email),
    [colaboradores, user]
  );

  const isGestor = colaborador?.papel === 'gestor';
  const configuracaoAtual = useMemo(() => 
    configuracoes.find(c => c.mes_referencia === mesAtual),
    [configuracoes, mesAtual]
  );

  const minhasSolicitacoes = useMemo(() => 
    solicitacoes.filter(s => s.colaborador_id === colaborador?.id),
    [solicitacoes, colaborador]
  );

  const solicitacoesPendentes = useMemo(() => 
    solicitacoes.filter(s => s.status === 'pendente'),
    [solicitacoes]
  );

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.SolicitacaoHomeOffice.create({
      ...data,
      colaborador_id: colaborador.id,
      colaborador_nome: colaborador.nome_completo,
      status: 'pendente',
      data_solicitacao: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['solicitacoes-home-office']);
      toast.success('Solicitação enviada com sucesso!');
      setDialogOpen(false);
    },
    onError: () => toast.error('Erro ao enviar solicitação'),
  });

  const aprovarMutation = useMutation({
    mutationFn: async (solicitacao) => {
      // Atualizar status da solicitação
      await db.entities.SolicitacaoHomeOffice.update(solicitacao.id, {
        status: 'aprovada',
        data_resposta: new Date().toISOString(),
        aprovador_id: colaborador.id,
        aprovador_nome: colaborador.nome_completo
      });

      // Criar atribuições na escala para os dias escolhidos
      const promises = solicitacao.dias_escolhidos.map(dia => 
        db.entities.EscalaAtribuicao.create({
          escala_id: 'home-office-escolha',
          escala_nome: 'Home Office por Escolha',
          colaborador_id: solicitacao.colaborador_id,
          colaborador_nome: solicitacao.colaborador_nome,
          data_inicio: dia,
          data_fim: dia,
          tipo_evento: 'home_office',
          ativa: true
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['solicitacoes-home-office']);
      queryClient.invalidateQueries(['escalaAtribuicoes']);
      toast.success('Solicitação aprovada e escala atualizada');
      setAprovarDialog(null);
      setDetalheDialog(null);
    },
    onError: () => toast.error('Erro ao aprovar'),
  });

  const recusarMutation = useMutation({
    mutationFn: (solicitacao) => db.entities.SolicitacaoHomeOffice.update(solicitacao.id, {
      status: 'recusada',
      data_resposta: new Date().toISOString(),
      aprovador_id: colaborador.id,
      aprovador_nome: colaborador.nome_completo,
      motivo_recusa: motivoRecusa || 'A solicitação de Home Office por Escolha do Agente foi analisada, porém não pôde ser aprovada por impacto operacional ou descumprimento das regras vigentes. A escala padrão permanece válida.'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['solicitacoes-home-office']);
      toast.success('Solicitação recusada');
      setRecusarDialog(null);
      setDetalheDialog(null);
      setMotivoRecusa('');
    },
    onError: () => toast.error('Erro ao recusar'),
  });

  const handleNovaSolicitacao = (formData) => {
    createMutation.mutate(formData);
  };

  const handleAprovar = () => {
    if (aprovarDialog) {
      aprovarMutation.mutate(aprovarDialog);
    }
  };

  const handleRecusar = () => {
    if (recusarDialog) {
      recusarMutation.mutate(recusarDialog);
    }
  };

  if (!user || !colaborador) {
    return <LoadingSpinner text="Carregando..." />;
  }

  if (isLoading) {
    return <LoadingSpinner text="Carregando solicitações..." />;
  }

  const SolicitacaoCard = ({ solicitacao, showActions = false }) => {
    const StatusIcon = statusIcons[solicitacao.status];
    const colaboradorSol = colaboradores.find(c => c.id === solicitacao.colaborador_id);
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">{colaboradorSol?.nome_completo || 'Colaborador'}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Semana: {formatDateSP(solicitacao.semana_inicio, 'DD/MM')} a {formatDateSP(solicitacao.semana_fim, 'DD/MM')}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5">
              {StatusIcon && <StatusIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
              <StatusBadge status={solicitacao.status} />
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Dias Home Office:</p>
            <div className="flex flex-wrap gap-1">
              {solicitacao.dias_escolhidos?.map((dia, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  <Home className="w-3 h-3 mr-1" />
                  {formatDateSP(dia, 'DD/MM')}
                </Badge>
              ))}
            </div>
          </div>

          {solicitacao.fora_do_prazo && (
            <Alert className="py-2">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                Solicitação fora do prazo mínimo
              </AlertDescription>
            </Alert>
          )}

          {solicitacao.validacoes?.alertas && solicitacao.validacoes.alertas.length > 0 && (
            <div className="text-xs text-warning space-y-1">
              {solicitacao.validacoes.alertas.map((alerta, idx) => (
                <p key={idx}>{alerta}</p>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDetalheDialog(solicitacao)}
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-1" />
              Detalhes
            </Button>
            {showActions && solicitacao.status === 'pendente' && (
              <>
                <Button
                  size="sm"
                  onClick={() => setAprovarDialog(solicitacao)}
                  className="bg-success hover:bg-success/90"
                >
                  <ThumbsUp className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRecusarDialog(solicitacao)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <ThumbsDown className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Home Office por Escolha"
        subtitle={`Gerencie suas solicitações de home office - ${mesAtual}`}
        icon={Home}
        actions={
          !isGestor && configuracaoAtual?.ativo && (
            <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Nova Solicitação
            </Button>
          )
        }
      />

      {!configuracaoAtual && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Não há configuração ativa para este mês. Entre em contato com a gestão.
          </AlertDescription>
        </Alert>
      )}

      {configuracaoAtual && !configuracaoAtual.ativo && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            O sistema de escolha de home office está temporariamente desativado.
          </AlertDescription>
        </Alert>
      )}

      {isGestor ? (
        <Tabs defaultValue="pendentes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pendentes">
              Pendentes ({solicitacoesPendentes.length})
            </TabsTrigger>
            <TabsTrigger value="todas">Todas</TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes" className="space-y-4">
            {solicitacoesPendentes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma solicitação pendente</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {solicitacoesPendentes.map(sol => (
                  <SolicitacaoCard key={sol.id} solicitacao={sol} showActions />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="todas" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {solicitacoes.map(sol => (
                <SolicitacaoCard key={sol.id} solicitacao={sol} showActions />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader>
              <CardTitle className="text-base">Minhas Solicitações - {mesAtual}</CardTitle>
            </CardHeader>
            <CardContent>
              {minhasSolicitacoes.filter(s => s.mes_referencia === mesAtual).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma solicitação neste mês
                </p>
              ) : (
                <div className="grid gap-4">
                  {minhasSolicitacoes.filter(s => s.mes_referencia === mesAtual).map(sol => (
                    <SolicitacaoCard key={sol.id} solicitacao={sol} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {minhasSolicitacoes.filter(s => s.mes_referencia !== mesAtual).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {minhasSolicitacoes.filter(s => s.mes_referencia !== mesAtual).map(sol => (
                    <SolicitacaoCard key={sol.id} solicitacao={sol} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialog Nova Solicitação */}
      <SolicitarHomeOfficeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleNovaSolicitacao}
        configuracao={configuracaoAtual}
        solicitacoesExistentes={minhasSolicitacoes}
        colaboradorId={colaborador?.id}
        mesReferencia={mesAtual}
      />

      {/* Dialog Detalhes */}
      <Dialog open={!!detalheDialog} onOpenChange={(isOpen) => !isOpen && setDetalheDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
          </DialogHeader>
          {detalheDialog && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Colaborador</p>
                  <p className="font-medium">{detalheDialog.colaborador_nome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={detalheDialog.status} />
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Semana</p>
                <p className="font-medium">
                  {formatDateSP(detalheDialog.semana_inicio, 'DD/MM/YYYY')} a {formatDateSP(detalheDialog.semana_fim, 'DD/MM/YYYY')}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Dias Home Office</p>
                <div className="flex flex-wrap gap-2">
                  {detalheDialog.dias_escolhidos?.map((dia, idx) => (
                    <Badge key={idx} className="bg-info-soft text-primary">
                      <Home className="w-3 h-3 mr-1" />
                      {formatDateSP(dia, 'DD/MM/YYYY')}
                    </Badge>
                  ))}
                </div>
              </div>

              {detalheDialog.justificativa && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Justificativa</p>
                  <p className="text-sm p-3 bg-muted rounded-lg">{detalheDialog.justificativa}</p>
                </div>
              )}

              {detalheDialog.motivo_recusa && (
                <Alert variant="destructive">
                  <XCircle className="w-4 h-4" />
                  <AlertDescription>
                    <p className="font-medium mb-1">Motivo da Recusa:</p>
                    <p className="text-sm">{detalheDialog.motivo_recusa}</p>
                  </AlertDescription>
                </Alert>
              )}

              {detalheDialog.validacoes?.alertas && detalheDialog.validacoes.alertas.length > 0 && (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <p className="font-medium mb-1">Alertas:</p>
                    <ul className="text-sm space-y-1">
                      {detalheDialog.validacoes.alertas.map((alerta, idx) => (
                        <li key={idx}>• {alerta}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Aprovar */}
      <Dialog open={!!aprovarDialog} onOpenChange={(isOpen) => !isOpen && setAprovarDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Alert className="bg-success-soft border-success/25">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <AlertDescription className="text-sm">
                Ao aprovar, a escala do colaborador será atualizada automaticamente com os dias de home office escolhidos.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAprovarDialog(null)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAprovar}
                className="bg-success hover:bg-success/90"
                disabled={aprovarMutation.isPending}
              >
                {aprovarMutation.isPending ? 'Aprovando...' : 'Confirmar Aprovação'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Recusar */}
      <Dialog open={!!recusarDialog} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setRecusarDialog(null);
          setMotivoRecusa('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Motivo da Recusa</Label>
              <Textarea
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                placeholder="A solicitação de Home Office por Escolha do Agente foi analisada, porém não pôde ser aprovada por impacto operacional ou descumprimento das regras vigentes. A escala padrão permanece válida."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {motivoRecusa ? '' : 'Deixe em branco para usar a mensagem padrão'}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setRecusarDialog(null);
                setMotivoRecusa('');
              }}>
                Cancelar
              </Button>
              <Button 
                onClick={handleRecusar}
                variant="destructive"
                disabled={recusarMutation.isPending}
              >
                {recusarMutation.isPending ? 'Recusando...' : 'Confirmar Recusa'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}