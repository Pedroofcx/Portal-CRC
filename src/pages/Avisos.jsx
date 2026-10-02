import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { formatDateSP } from '@/components/utils/helpers';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';


import {
  Bell,
  Plus,
  AlertTriangle,
  Info,
  AlertCircle,
  Megaphone,
  Trash2,
  Eye
} from 'lucide-react';
import PainelLateral, { RodapeFixo } from '@/components/ui/PainelLateral';
import { avisosVisiveis as filtrarAvisosVisiveis } from '@/lib/pendencias';
import { usePermissoes } from '@/hooks/usePermissoes';

const tipoConfig = {
  informativo: { icon: Info, color: 'bg-info-soft text-primary border-info/25' },
  urgente: { icon: AlertTriangle, color: 'bg-destructive/10 text-destructive border-destructive/25' },
  alerta: { icon: AlertCircle, color: 'bg-warning-soft text-warning border-warning/25' },
  comunicado: { icon: Megaphone, color: 'bg-info-soft text-primary border-info/25' }
};

export default function Avisos() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAviso, setSelectedAviso] = useState(null);
  const [formData, setFormData] = useState({
    titulo: '',
    conteudo: '',
    tipo: 'informativo',
    prioridade: 'media',
    destinatarios: 'todos',
    data_expiracao: ''
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: avisos = [], isLoading } = useQuery({
    queryKey: ['avisos'],
    queryFn: () => db.entities.Aviso.list('-data_publicacao'),
  });

  const { data: leituras = [] } = useQuery({
    queryKey: ['avisoLeituras'],
    queryFn: () => db.entities.AvisoLeitura.list(),
  });

  const colaborador = React.useMemo(() => 
    colaboradores.find(c => c.email === user?.email),
    [colaboradores, user]
  );
  const { temPermissao } = usePermissoes();
  const isGestor = temPermissao('gerenciar_avisos');

  // Cleanup ao desmontar - CRITICAL
  React.useEffect(() => {
    return () => {
      setDialogOpen(false);
      setViewDialogOpen(false);
      setDeleteDialogOpen(false);
      setSelectedAviso(null);
    };
  }, []);

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Aviso.create({
      ...data,
      data_publicacao: new Date().toISOString(),
      autor_id: colaborador?.id,
      autor_nome: user?.full_name,
      ativo: true,
      lido_por: []
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['avisos']);
      toast.success('Aviso publicado');
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Erro ao publicar aviso'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Aviso.update(id, { ativo: false }),
    onSuccess: () => {
      queryClient.invalidateQueries(['avisos']);
      toast.success('Aviso removido');
      setDeleteDialogOpen(false);
    },
    onError: () => toast.error('Erro ao remover'),
  });

  const marcarComoLido = useMutation({
    mutationFn: (aviso) => {
      const lidoPor = aviso.lido_por || [];
      if (!lidoPor.includes(user?.email)) {
        return db.entities.Aviso.update(aviso.id, {
          lido_por: [...lidoPor, user?.email]
        });
      }
      return Promise.resolve();
    },
    onSuccess: () => queryClient.invalidateQueries(['avisos']),
    onError: () => toast.error('Não consegui marcar o aviso como lido.'),
  });

  if (!user) {
    return <LoadingSpinner />;
  }

  // Gestor vê todos os ativos; o agente, só os que são para ele, estão
  // vigentes e foram publicados DEPOIS do cadastro dele (src/lib/pendencias).
  const avisosVisiveis = isGestor
    ? avisos.filter(aviso => aviso.ativo)
    : filtrarAvisosVisiveis(avisos, colaborador);

  const resetForm = () => {
    setFormData({
      titulo: '',
      conteudo: '',
      tipo: 'informativo',
      prioridade: 'media',
      destinatarios: 'todos',
      data_expiracao: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.titulo || !formData.conteudo) {
      toast.error('Preencha título e conteúdo');
      return;
    }
    createMutation.mutate(formData);
  };

  const openAviso = (aviso) => {
    setSelectedAviso(aviso);
    setViewDialogOpen(true);
    marcarComoLido.mutate(aviso);
  };

  const isLido = (aviso) => aviso.lido_por?.includes(user?.email);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Avisos"
        subtitle="Comunicados e alertas importantes"
        icon={Bell}
        actions={
          isGestor && (
            <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Novo Aviso
            </Button>
          )
        }
      />

      {avisosVisiveis.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum aviso</h3>
            <p className="text-muted-foreground">Não há avisos no momento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {avisosVisiveis.map((aviso) => {
            const config = tipoConfig[aviso.tipo] || tipoConfig.informativo;
            const Icon = config.icon;
            const lido = isLido(aviso);

            return (
              <Card 
                key={aviso.id} 
                className={`border-0 shadow-sm cursor-pointer transition-all hover:shadow-sm ${!lido ? 'ring-2 ring-ring' : ''}`}
                onClick={() => openAviso(aviso)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl ${config.color.split(' ')[0]}`}>
                      <Icon className={`w-5 h-5 ${config.color.split(' ')[1]}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold ${!lido ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {aviso.titulo}
                            </h3>
                            <Badge variant="outline" className={config.color}>
                              {aviso.tipo}
                            </Badge>
                            {!lido && (
                              <Badge className="bg-primary text-white">Novo</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{aviso.conteudo}</p>
                        </div>
                        {isGestor && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setSelectedAviso(aviso);
                              setDeleteDialogOpen(true); 
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>Por: {aviso.autor_nome}</span>
                        <span>{formatDateSP(aviso.data_publicacao, 'DD/MM/YYYY HH:mm')}</span>
                        {aviso.destinatarios !== 'todos' && (
                          <Badge variant="outline" className="text-xs">
                            Para: {aviso.destinatarios}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de Criação */}
      <PainelLateral
        open={dialogOpen} onOpenChange={setDialogOpen}
        largura="lg"
        titulo="Novo Aviso"
      >
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Título do aviso"
              />
            </div>
            <div>
              <Label>Conteúdo *</Label>
              <Textarea
                value={formData.conteudo}
                onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                placeholder="Escreva o conteúdo do aviso..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="informativo">Informativo</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                    <SelectItem value="alerta">Alerta</SelectItem>
                    <SelectItem value="comunicado">Comunicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(value) => setFormData({ ...formData, prioridade: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Destinatários</Label>
                <Select
                  value={formData.destinatarios}
                  onValueChange={(value) => setFormData({ ...formData, destinatarios: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="agentes">Apenas Agentes</SelectItem>
                    <SelectItem value="gestores">Apenas Gestores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expira em (opcional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.data_expiracao}
                  onChange={(e) => setFormData({ ...formData, data_expiracao: e.target.value })}
                />
              </div>
            </div>
            <RodapeFixo>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Publicando...' : 'Publicar'}
              </Button>
            </RodapeFixo>
          </form>
        </PainelLateral>

      {/* Dialog de Visualização com Leituras */}
      <PainelLateral
        open={viewDialogOpen} onOpenChange={setViewDialogOpen}
        largura="xl"
        titulo={<>{selectedAviso?.titulo} <Badge variant="outline" className={tipoConfig[selectedAviso?.tipo]?.color}> {selectedAviso?.tipo} </Badge></>}
      >
          {selectedAviso && (
            <div className="space-y-4 mt-4">
              <p className="text-foreground whitespace-pre-wrap">{selectedAviso.conteudo}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
                <span>Por: {selectedAviso.autor_nome}</span>
                <span>{formatDateSP(selectedAviso.data_publicacao)}</span>
              </div>

              {/* Quem leu e confirmou */}
              {isGestor && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Quem Confirmou Leitura ({leituras.filter(l => l.aviso_id === selectedAviso.id && l.confirmou).length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {leituras
                      .filter(l => l.aviso_id === selectedAviso.id && l.confirmou)
                      .map(leitura => {
                        const colab = colaboradores.find(c => c.id === leitura.colaborador_id);
                        return (
                          <Badge key={leitura.id} variant="outline" className="bg-success-soft border-success/25 text-success">
                            {colab?.nome_completo || 'Colaborador'}
                            <span className="ml-1 text-xs text-success">
                              • {formatDateSP(leitura.data_leitura, 'DD/MM HH:mm')}
                            </span>
                          </Badge>
                        );
                      })}
                    {leituras.filter(l => l.aviso_id === selectedAviso.id && l.confirmou).length === 0 && (
                      <p className="text-sm text-muted-foreground">Nenhuma confirmação ainda</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </PainelLateral>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remover Aviso"
        description="Tem certeza que deseja remover este aviso?"
        confirmLabel="Remover"
        onConfirm={() => selectedAviso && deleteMutation.mutate(selectedAviso.id)}
        variant="danger"
      />
    </div>
  );
}