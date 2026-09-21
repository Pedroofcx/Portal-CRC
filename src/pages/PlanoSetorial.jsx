import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { formatDateSP } from '@/components/utils/helpers';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';


import {
  BarChart3,
  Plus,
  Trash2,
  Eye,
  Target,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PainelLateral, { RodapeFixo } from '@/components/ui/PainelLateral';

export default function PlanoSetorial() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [pdiDialogOpen, setPdiDialogOpen] = useState(false);
  const [viewPDIDialogOpen, setViewPDIDialogOpen] = useState(false);
  const [selectedPlano, setSelectedPlano] = useState(null);
  const [selectedPDI, setSelectedPDI] = useState(null);
  const [formData, setFormData] = useState({
    titulo: '',
    periodo: '',
    estrategias: [''],
    objetivos: [{ descricao: '', meta: '', prazo: '' }],
    acoes: [{ descricao: '', responsavel: '', prazo: '', status: 'pendente' }],
    indicadores: [{ nome: '', meta: '', atual: '', unidade: '' }]
  });
  const [pdiFormData, setPdiFormData] = useState({
    colaborador_id: '',
    titulo: '',
    objetivo_geral: '',
    etapas: []
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

  const { data: planos = [], isLoading } = useQuery({
    queryKey: ['planosSetoriais'],
    queryFn: () => db.entities.PlanoSetorial.list('-created_date'),
  });

  const { data: pdis = [] } = useQuery({
    queryKey: ['pdis'],
    queryFn: () => db.entities.PDI.list('-created_date'),
  });

  const colaborador = colaboradores.find(c => c.email === user?.email);
  const isGestor = colaborador?.papel === 'gestor';

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.PlanoSetorial.create({
      ...data,
      data_criacao: new Date().toISOString(),
      criado_por_id: colaborador?.id,
      criado_por_nome: user?.full_name
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['planosSetoriais']);
      toast.success('Plano criado com sucesso');
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Erro ao criar plano'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.PlanoSetorial.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['planosSetoriais']);
      toast.success('Plano atualizado');
    },
    onError: () => toast.error('Erro ao atualizar'),
  });

  const createPDIMutation = useMutation({
    mutationFn: (data) => {
      const colab = colaboradores.find(c => c.id === data.colaborador_id);
      return db.entities.PDI.create({
        ...data,
        colaborador_nome: colab?.nome_completo,
        status: 'em_andamento',
        data_criacao: new Date().toISOString(),
        criado_por_id: colaborador?.id,
        criado_por_nome: user?.full_name,
        percentual_conclusao: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pdis']);
      toast.success('PDI criado com sucesso');
      setPdiDialogOpen(false);
      resetPDIForm();
    },
    onError: () => toast.error('Erro ao criar PDI'),
  });

  const updatePDIMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.PDI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['pdis']);
      toast.success('PDI atualizado');
    },
    onError: () => toast.error('Erro ao atualizar'),
  });

  const resetForm = () => {
    setFormData({
      titulo: '',
      periodo: '',
      estrategias: [''],
      objetivos: [{ descricao: '', meta: '', prazo: '' }],
      acoes: [{ descricao: '', responsavel: '', prazo: '', status: 'pendente' }],
      indicadores: [{ nome: '', meta: '', atual: '', unidade: '' }]
    });
  };

  const resetPDIForm = () => {
    setPdiFormData({
      colaborador_id: '',
      titulo: '',
      objetivo_geral: '',
      etapas: []
    });
  };

  // Estratégias
  const addEstrategia = () => setFormData({ ...formData, estrategias: [...formData.estrategias, ''] });
  const updateEstrategia = (index, value) => {
    const newEstrategias = [...formData.estrategias];
    newEstrategias[index] = value;
    setFormData({ ...formData, estrategias: newEstrategias });
  };
  const removeEstrategia = (index) => {
    setFormData({ ...formData, estrategias: formData.estrategias.filter((_, i) => i !== index) });
  };

  // Objetivos
  const addObjetivo = () => setFormData({ 
    ...formData, 
    objetivos: [...formData.objetivos, { descricao: '', meta: '', prazo: '' }] 
  });
  const updateObjetivo = (index, field, value) => {
    const newObjetivos = [...formData.objetivos];
    newObjetivos[index] = { ...newObjetivos[index], [field]: value };
    setFormData({ ...formData, objetivos: newObjetivos });
  };
  const removeObjetivo = (index) => {
    setFormData({ ...formData, objetivos: formData.objetivos.filter((_, i) => i !== index) });
  };

  // Ações
  const addAcao = () => setFormData({ 
    ...formData, 
    acoes: [...formData.acoes, { descricao: '', responsavel: '', prazo: '', status: 'pendente' }] 
  });
  const updateAcao = (index, field, value) => {
    const newAcoes = [...formData.acoes];
    newAcoes[index] = { ...newAcoes[index], [field]: value };
    setFormData({ ...formData, acoes: newAcoes });
  };
  const removeAcao = (index) => {
    setFormData({ ...formData, acoes: formData.acoes.filter((_, i) => i !== index) });
  };

  // Indicadores
  const addIndicador = () => setFormData({ 
    ...formData, 
    indicadores: [...formData.indicadores, { nome: '', meta: '', atual: '', unidade: '' }] 
  });
  const updateIndicador = (index, field, value) => {
    const newIndicadores = [...formData.indicadores];
    newIndicadores[index] = { ...newIndicadores[index], [field]: value };
    setFormData({ ...formData, indicadores: newIndicadores });
  };
  const removeIndicador = (index) => {
    setFormData({ ...formData, indicadores: formData.indicadores.filter((_, i) => i !== index) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.titulo || !formData.periodo) {
      toast.error('Preencha título e período');
      return;
    }
    createMutation.mutate(formData);
  };

  const toggleAcaoStatus = (plano, acaoIndex) => {
    const newAcoes = [...plano.acoes];
    const currentStatus = newAcoes[acaoIndex].status;
    const nextStatus = currentStatus === 'pendente' ? 'em_andamento' : currentStatus === 'em_andamento' ? 'concluida' : 'pendente';
    newAcoes[acaoIndex] = { ...newAcoes[acaoIndex], status: nextStatus };
    updateMutation.mutate({ id: plano.id, data: { acoes: newAcoes } });
  };

  const addEtapaPDI = () => {
    setPdiFormData({
      ...pdiFormData,
      etapas: [...pdiFormData.etapas, { id: Date.now().toString(), titulo: '', descricao: '', conteudo_profissional: '', prazo: '', concluida: false }]
    });
  };

  const updateEtapaPDI = (index, field, value) => {
    const newEtapas = [...pdiFormData.etapas];
    newEtapas[index] = { ...newEtapas[index], [field]: value };
    setPdiFormData({ ...pdiFormData, etapas: newEtapas });
  };

  const removeEtapaPDI = (index) => {
    setPdiFormData({ ...pdiFormData, etapas: pdiFormData.etapas.filter((_, i) => i !== index) });
  };

  const handlePDISubmit = (e) => {
    e.preventDefault();
    if (!pdiFormData.colaborador_id || !pdiFormData.titulo || !pdiFormData.objetivo_geral) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (pdiFormData.etapas.length === 0) {
      toast.error('Adicione ao menos uma etapa');
      return;
    }
    createPDIMutation.mutate(pdiFormData);
  };

  const toggleEtapaPDI = (pdi, etapaIndex) => {
    const newEtapas = [...pdi.etapas];
    newEtapas[etapaIndex] = {
      ...newEtapas[etapaIndex],
      concluida: !newEtapas[etapaIndex].concluida,
      data_conclusao: !newEtapas[etapaIndex].concluida ? new Date().toISOString() : null
    };
    const concluidas = newEtapas.filter(e => e.concluida).length;
    const percentual = Math.round((concluidas / newEtapas.length) * 100);
    updatePDIMutation.mutate({
      id: pdi.id,
      data: { etapas: newEtapas, percentual_conclusao: percentual, status: percentual === 100 ? 'concluido' : 'em_andamento' }
    });
  };

  const pdisFiltrados = isGestor ? pdis : pdis.filter(p => p.colaborador_id === colaborador?.id);

  if (isLoading) {
    return <LoadingSpinner text="Carregando planos..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Plano Setorial & PDI"
        subtitle="Planejamento estratégico e desenvolvimento individual"
        icon={BarChart3}
        actions={
          isGestor && (
            <div className="flex gap-2">
              <Button onClick={() => setPdiDialogOpen(true)} variant="outline">
                <Target className="w-4 h-4 mr-2" />
                Novo PDI
              </Button>
              <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Novo Plano Setorial
              </Button>
            </div>
          )
        }
      />

      <Tabs defaultValue="setorial">
        <TabsList>
          <TabsTrigger value="setorial">Plano Setorial</TabsTrigger>
          <TabsTrigger value="pdis">PDIs Individuais</TabsTrigger>
        </TabsList>

        <TabsContent value="setorial" className="mt-6 space-y-6">
      {planos.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum plano setorial</h3>
            <p className="text-muted-foreground mb-4">Crie o primeiro plano estratégico para sua área</p>
            <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Criar Plano
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {planos.map((plano) => (
            <Card key={plano.id} className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{plano.titulo}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Período: {plano.periodo}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedPlano(plano); setViewDialogOpen(true); }}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Estratégias */}
                {plano.estrategias?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Estratégias
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {plano.estrategias.map((est, i) => (
                        <Badge key={i} variant="outline" className="bg-info-soft text-primary border-info/25">
                          {est}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Indicadores */}
                {plano.indicadores?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Indicadores
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {plano.indicadores.map((ind, i) => (
                        <div key={i} className="p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium">{ind.nome}</p>
                          <div className="flex items-end gap-1 mt-1">
                            <span className="text-2xl font-bold text-primary">{ind.atual || 0}</span>
                            <span className="text-muted-foreground">/ {ind.meta} {ind.unidade}</span>
                          </div>
                          <Progress 
                            value={ind.meta ? (parseFloat(ind.atual || 0) / parseFloat(ind.meta)) * 100 : 0} 
                            className="h-1.5 mt-2" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ações */}
                {plano.acoes?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Ações ({plano.acoes.filter(a => a.status === 'concluida').length}/{plano.acoes.length} concluídas)
                    </p>
                    <div className="space-y-2">
                      {plano.acoes.slice(0, 5).map((acao, i) => (
                        <div 
                          key={i} 
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                            acao.status === 'concluida' ? 'bg-success-soft' : acao.status === 'em_andamento' ? 'bg-warning-soft' : 'bg-muted'
                          }`}
                          onClick={() => toggleAcaoStatus(plano, i)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              acao.status === 'concluida' ? 'bg-success text-white' : 
                              acao.status === 'em_andamento' ? 'bg-warning text-white' : 
                              'bg-muted'
                            }`}>
                              {acao.status === 'concluida' && <CheckCircle className="w-4 h-4" />}
                              {acao.status === 'em_andamento' && <Clock className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className={`text-sm ${acao.status === 'concluida' ? 'line-through text-muted-foreground' : ''}`}>
                                {acao.descricao}
                              </p>
                              <p className="text-xs text-muted-foreground">{acao.responsavel}</p>
                            </div>
                          </div>
                          {acao.prazo && (
                            <span className="text-xs text-muted-foreground">
                              {formatDateSP(acao.prazo, 'DD/MM/YYYY')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </TabsContent>

        <TabsContent value="pdis" className="mt-6 space-y-6">
          {pdisFiltrados.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-16 text-center">
                <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhum PDI encontrado</h3>
                <p className="text-muted-foreground mb-4">{isGestor ? 'Crie o primeiro PDI para um colaborador' : 'Você não possui PDI ativo'}</p>
                {isGestor && (
                  <Button onClick={() => setPdiDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar PDI
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {pdisFiltrados.map((pdi) => {
                const colab = colaboradores.find(c => c.id === pdi.colaborador_id);
                return (
                  <Card key={pdi.id} className="border-0 shadow-sm">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={colab?.foto_url} />
                            <AvatarFallback className="bg-info-soft text-primary">
                              {pdi.colaborador_nome?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle>{pdi.titulo}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">{pdi.colaborador_nome}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={pdi.status === 'concluido' ? 'default' : 'outline'} className={pdi.status === 'concluido' ? 'bg-success' : ''}>
                            {pdi.status === 'em_andamento' ? 'Em Andamento' : pdi.status === 'concluido' ? 'Concluído' : 'Cancelado'}
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedPDI(pdi); setViewPDIDialogOpen(true); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{pdi.objetivo_geral}</p>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Progresso</span>
                          <span className="font-medium">{pdi.percentual_conclusao || 0}%</span>
                        </div>
                        <Progress value={pdi.percentual_conclusao || 0} className="h-3" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {pdi.etapas?.filter(e => e.concluida).length || 0} de {pdi.etapas?.length || 0} etapas concluídas
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de Criação Plano */}
      <PainelLateral
        open={dialogOpen} onOpenChange={setDialogOpen}
        largura="2xl"
        titulo="Novo Plano Setorial"
      >
          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Título *</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Plano Q1 2024"
                />
              </div>
              <div>
                <Label>Período *</Label>
                <Input
                  value={formData.periodo}
                  onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                  placeholder="Ex: Janeiro - Março 2024"
                />
              </div>
            </div>

            {/* Estratégias */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Estratégias</Label>
                <Button type="button" variant="outline" size="sm" onClick={addEstrategia}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.estrategias.map((est, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input
                    value={est}
                    onChange={(e) => updateEstrategia(i, e.target.value)}
                    placeholder="Estratégia"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeEstrategia(i)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Objetivos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Objetivos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addObjetivo}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.objetivos.map((obj, i) => (
                <Card key={i} className="mb-2">
                  <CardContent className="p-3 grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Descrição"
                      value={obj.descricao}
                      onChange={(e) => updateObjetivo(i, 'descricao', e.target.value)}
                    />
                    <Input
                      placeholder="Meta"
                      value={obj.meta}
                      onChange={(e) => updateObjetivo(i, 'meta', e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={obj.prazo}
                        onChange={(e) => updateObjetivo(i, 'prazo', e.target.value)}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeObjetivo(i)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Ações */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Ações</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAcao}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.acoes.map((acao, i) => (
                <Card key={i} className="mb-2">
                  <CardContent className="p-3 grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Descrição"
                      value={acao.descricao}
                      onChange={(e) => updateAcao(i, 'descricao', e.target.value)}
                    />
                    <Input
                      placeholder="Responsável"
                      value={acao.responsavel}
                      onChange={(e) => updateAcao(i, 'responsavel', e.target.value)}
                    />
                    <Input
                      type="date"
                      value={acao.prazo}
                      onChange={(e) => updateAcao(i, 'prazo', e.target.value)}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeAcao(i)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Indicadores */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Indicadores</Label>
                <Button type="button" variant="outline" size="sm" onClick={addIndicador}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.indicadores.map((ind, i) => (
                <Card key={i} className="mb-2">
                  <CardContent className="p-3 grid grid-cols-5 gap-2">
                    <Input
                      placeholder="Nome"
                      value={ind.nome}
                      onChange={(e) => updateIndicador(i, 'nome', e.target.value)}
                    />
                    <Input
                      placeholder="Meta"
                      type="number"
                      value={ind.meta}
                      onChange={(e) => updateIndicador(i, 'meta', e.target.value)}
                    />
                    <Input
                      placeholder="Atual"
                      type="number"
                      value={ind.atual}
                      onChange={(e) => updateIndicador(i, 'atual', e.target.value)}
                    />
                    <Input
                      placeholder="Unidade"
                      value={ind.unidade}
                      onChange={(e) => updateIndicador(i, 'unidade', e.target.value)}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeIndicador(i)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <RodapeFixo>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Salvando...' : 'Criar Plano'}
              </Button>
            </RodapeFixo>
          </form>
        </PainelLateral>

      {/* Dialog de Visualização */}
      <PainelLateral
        open={viewDialogOpen} onOpenChange={setViewDialogOpen}
        largura="xl"
        titulo={selectedPlano?.titulo}
      >
          {selectedPlano && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Período: {selectedPlano.periodo}</span>
                <span>Criado por: {selectedPlano.criado_por_nome}</span>
              </div>

              {selectedPlano.estrategias?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Estratégias</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {selectedPlano.estrategias.map((est, i) => (
                      <li key={i}>{est}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedPlano.objetivos?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Objetivos</h4>
                  <div className="space-y-2">
                    {selectedPlano.objetivos.map((obj, i) => (
                      <Card key={i}>
                        <CardContent className="p-3">
                          <p className="font-medium">{obj.descricao}</p>
                          <p className="text-sm text-muted-foreground">Meta: {obj.meta}</p>
                          {obj.prazo && <p className="text-xs text-muted-foreground">Prazo: {formatDateSP(obj.prazo, 'DD/MM/YYYY')}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {selectedPlano.acoes?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Ações</h4>
                  <div className="space-y-2">
                    {selectedPlano.acoes.map((acao, i) => (
                      <div 
                        key={i} 
                        className={`p-3 rounded-lg ${
                          acao.status === 'concluida' ? 'bg-success-soft' : acao.status === 'em_andamento' ? 'bg-warning-soft' : 'bg-muted'
                        }`}
                      >
                        <div className="flex justify-between">
                          <p className={acao.status === 'concluida' ? 'line-through text-muted-foreground' : ''}>{acao.descricao}</p>
                          <Badge variant="outline">{acao.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{acao.responsavel}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </PainelLateral>

      {/* Dialog Criar PDI */}
      <PainelLateral
        open={pdiDialogOpen} onOpenChange={setPdiDialogOpen}
        largura="xl"
        titulo="Novo PDI"
      >
          <form onSubmit={handlePDISubmit} className="space-y-4 mt-4">
            <div>
              <Label>Colaborador *</Label>
              <Select value={pdiFormData.colaborador_id} onValueChange={(value) => setPdiFormData({ ...pdiFormData, colaborador_id: value })}>
                <SelectTrigger><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
                <SelectContent>
                  {colaboradores.filter(c => c.ativo !== false).map(colab => (
                    <SelectItem key={colab.id} value={colab.id}>{colab.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título do PDI *</Label>
              <Input value={pdiFormData.titulo} onChange={(e) => setPdiFormData({ ...pdiFormData, titulo: e.target.value })} placeholder="Ex: Desenvolvimento de Liderança" />
            </div>
            <div>
              <Label>Objetivo Geral *</Label>
              <Textarea value={pdiFormData.objetivo_geral} onChange={(e) => setPdiFormData({ ...pdiFormData, objetivo_geral: e.target.value })} placeholder="Descreva o objetivo principal..." rows={3} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Etapas do PDI</Label>
                <Button type="button" variant="outline" size="sm" onClick={addEtapaPDI}>
                  <Plus className="w-4 h-4 mr-1" />Adicionar Etapa
                </Button>
              </div>
              {pdiFormData.etapas.map((etapa, index) => (
                <Card key={etapa.id} className="mb-3">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Etapa {index + 1}</Badge>
                      <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeEtapaPDI(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Input placeholder="Título da etapa" value={etapa.titulo} onChange={(e) => updateEtapaPDI(index, 'titulo', e.target.value)} />
                    <Textarea placeholder="Descrição" value={etapa.descricao} onChange={(e) => updateEtapaPDI(index, 'descricao', e.target.value)} rows={2} />
                    <Textarea placeholder="Conteúdo profissional / Recursos" value={etapa.conteudo_profissional} onChange={(e) => updateEtapaPDI(index, 'conteudo_profissional', e.target.value)} rows={2} />
                    <Input type="date" value={etapa.prazo} onChange={(e) => updateEtapaPDI(index, 'prazo', e.target.value)} />
                  </CardContent>
                </Card>
              ))}
              {pdiFormData.etapas.length === 0 && (
                <p className="text-center text-muted-foreground py-4 bg-muted rounded-lg">Nenhuma etapa adicionada</p>
              )}
            </div>
            <RodapeFixo>
              <Button type="button" variant="outline" onClick={() => setPdiDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createPDIMutation.isPending}>
                {createPDIMutation.isPending ? 'Salvando...' : 'Criar PDI'}
              </Button>
            </RodapeFixo>
          </form>
        </PainelLateral>

      {/* Dialog Visualizar PDI */}
      <PainelLateral
        open={viewPDIDialogOpen} onOpenChange={setViewPDIDialogOpen}
        largura="xl"
        titulo={selectedPDI?.titulo}
      >
          {selectedPDI && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Colaborador</p>
                  <p className="font-medium">{selectedPDI.colaborador_nome}</p>
                </div>
                <Badge variant={selectedPDI.status === 'concluido' ? 'default' : 'outline'} className={selectedPDI.status === 'concluido' ? 'bg-success' : ''}>
                  {selectedPDI.status === 'em_andamento' ? 'Em Andamento' : 'Concluído'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Objetivo</p>
                <p>{selectedPDI.objetivo_geral}</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Progresso</span>
                  <span className="font-medium">{selectedPDI.percentual_conclusao || 0}%</span>
                </div>
                <Progress value={selectedPDI.percentual_conclusao || 0} className="h-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-3">Etapas</p>
                <div className="space-y-3">
                  {selectedPDI.etapas?.map((etapa, index) => (
                    <Card key={index} className={`${etapa.concluida ? 'bg-success-soft border-success/25' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox checked={etapa.concluida} onCheckedChange={() => toggleEtapaPDI(selectedPDI, index)} disabled={selectedPDI.status === 'concluido'} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`font-medium ${etapa.concluida ? 'line-through text-muted-foreground' : ''}`}>{etapa.titulo}</p>
                              {etapa.concluida && <CheckCircle className="w-4 h-4 text-success" />}
                            </div>
                            {etapa.descricao && <p className="text-sm text-muted-foreground mt-1">{etapa.descricao}</p>}
                            {etapa.conteudo_profissional && <p className="text-sm text-muted-foreground mt-1"><strong>Conteúdo:</strong> {etapa.conteudo_profissional}</p>}
                            {etapa.prazo && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />Prazo: {formatDateSP(etapa.prazo, 'DD/MM/YYYY')}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </PainelLateral>
    </div>
  );
}