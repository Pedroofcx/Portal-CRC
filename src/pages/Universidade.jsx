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
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  GraduationCap,
  Plus,
  BookOpen,
  Clock,
  CheckCircle,
  Play,
  ExternalLink
} from 'lucide-react';

export default function Universidade() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    categoria: '',
    carga_horaria: '',
    conteudo_url: '',
    obrigatorio: false
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

  const { data: cursos = [], isLoading } = useQuery({
    queryKey: ['cursos'],
    queryFn: () => db.entities.Curso.filter({ ativo: true }, '-created_date'),
  });

  const { data: matriculas = [] } = useQuery({
    queryKey: ['matriculas'],
    queryFn: () => db.entities.CursoMatricula.list(),
  });

  const colaborador = React.useMemo(() => 
    colaboradores.find(c => c.email === user?.email),
    [colaboradores, user]
  );
  const isGestor = colaborador?.papel === 'gestor';

  // Cleanup ao desmontar - CRITICAL
  React.useEffect(() => {
    return () => {
      setDialogOpen(false);
      setSelectedCurso(null);
    };
  }, []);

  const createCursoMutation = useMutation({
    mutationFn: (data) => db.entities.Curso.create({
      ...data,
      carga_horaria: parseFloat(data.carga_horaria) || 0,
      ativo: true,
      data_criacao: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['cursos']);
      toast.success('Curso criado com sucesso');
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Erro ao criar curso'),
  });

  const inscreverMutation = useMutation({
    mutationFn: (curso) => db.entities.CursoMatricula.create({
      curso_id: curso.id,
      curso_titulo: curso.titulo,
      colaborador_id: colaborador?.id,
      colaborador_nome: colaborador?.nome_completo || user?.full_name,
      status: 'inscrito',
      progresso: 0,
      data_inscricao: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['matriculas']);
      toast.success('Inscrição realizada');
    },
    onError: () => toast.error('Erro na inscrição'),
  });

  const atualizarProgressoMutation = useMutation({
    mutationFn: ({ id, progresso }) => db.entities.CursoMatricula.update(id, {
      progresso,
      status: progresso >= 100 ? 'concluido' : 'em_andamento',
      data_conclusao: progresso >= 100 ? new Date().toISOString() : null
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['matriculas']);
      toast.success('Progresso atualizado');
    },
  });

  if (!user) {
    return <LoadingSpinner />;
  }

  // Minhas matrículas
  const minhasMatriculas = matriculas.filter(m => m.colaborador_id === colaborador?.id);

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      categoria: '',
      carga_horaria: '',
      conteudo_url: '',
      obrigatorio: false
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.titulo || !formData.descricao) {
      toast.error('Preencha título e descrição');
      return;
    }
    createCursoMutation.mutate(formData);
  };

  const isInscrito = (cursoId) => minhasMatriculas.some(m => m.curso_id === cursoId);
  const getMatricula = (cursoId) => minhasMatriculas.find(m => m.curso_id === cursoId);

  // Stats
  const cursosInscritos = minhasMatriculas.length;
  const cursosConcluidos = minhasMatriculas.filter(m => m.status === 'concluido').length;
  const horasConcluidas = minhasMatriculas
    .filter(m => m.status === 'concluido')
    .reduce((acc, m) => {
      const curso = cursos.find(c => c.id === m.curso_id);
      return acc + (curso?.carga_horaria || 0);
    }, 0);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Universidade CRC"
        subtitle="Cursos e capacitações"
        icon={GraduationCap}
        actions={
          isGestor && (
            <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Novo Curso
            </Button>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-info-soft rounded-xl">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cursosInscritos}</p>
                <p className="text-sm text-muted-foreground">Cursos inscritos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-success-soft rounded-xl">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cursosConcluidos}</p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-info-soft rounded-xl">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{horasConcluidas}h</p>
                <p className="text-sm text-muted-foreground">Horas concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="catalogo">
        <TabsList>
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="meus">Meus Cursos</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="mt-6">
          {cursos.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-16 text-center">
                <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhum curso disponível</h3>
                <p className="text-muted-foreground">Aguarde novos cursos serem publicados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cursos.map((curso) => {
                const matricula = getMatricula(curso.id);
                return (
                  <Card key={curso.id} className="border-0 shadow-sm hover:shadow-sm transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{curso.titulo}</CardTitle>
                          {curso.categoria && (
                            <Badge variant="outline" className="mt-1">{curso.categoria}</Badge>
                          )}
                        </div>
                        {curso.obrigatorio && (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/25">Obrigatório</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{curso.descricao}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {curso.carga_horaria}h
                        </span>
                      </div>

                      {matricula ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progresso</span>
                            <span className="font-medium">{matricula.progresso}%</span>
                          </div>
                          <Progress value={matricula.progresso} className="h-2" />
                          {matricula.status === 'concluido' ? (
                            <Badge className="bg-success-soft text-success w-full justify-center">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Concluído
                            </Badge>
                          ) : (
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => atualizarProgressoMutation.mutate({ 
                                  id: matricula.id, 
                                  progresso: Math.min(matricula.progresso + 25, 100) 
                                })}
                              >
                                +25%
                              </Button>
                              {curso.conteudo_url && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={curso.conteudo_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Button 
                          className="w-full bg-primary hover:bg-primary/90"
                          onClick={() => inscreverMutation.mutate(curso)}
                          disabled={inscreverMutation.isPending}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Inscrever-se
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="meus" className="mt-6">
          {minhasMatriculas.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-16 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma inscrição</h3>
                <p className="text-muted-foreground">Inscreva-se em um curso do catálogo</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {minhasMatriculas.map((matricula) => {
                const curso = cursos.find(c => c.id === matricula.curso_id);
                return (
                  <Card key={matricula.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${
                            matricula.status === 'concluido' ? 'bg-success-soft' : 'bg-info-soft'
                          }`}>
                            {matricula.status === 'concluido' ? (
                              <CheckCircle className="w-6 h-6 text-success" />
                            ) : (
                              <BookOpen className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{matricula.curso_titulo}</p>
                            <p className="text-sm text-muted-foreground">
                              {matricula.status === 'concluido' 
                                ? `Concluído em ${formatDateSP(matricula.data_conclusao, 'DD/MM/YYYY')}`
                                : `Inscrito em ${formatDateSP(matricula.data_inscricao, 'DD/MM/YYYY')}`
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold">{matricula.progresso}%</p>
                            <Progress value={matricula.progresso} className="w-24 h-2" />
                          </div>
                          {curso?.conteudo_url && matricula.status !== 'concluido' && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={curso.conteudo_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de Criação de Curso */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Curso</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Nome do curso"
              />
            </div>
            <div>
              <Label>Descrição *</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do curso..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Input
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  placeholder="Ex: Atendimento"
                />
              </div>
              <div>
                <Label>Carga Horária (h)</Label>
                <Input
                  type="number"
                  value={formData.carga_horaria}
                  onChange={(e) => setFormData({ ...formData, carga_horaria: e.target.value })}
                  placeholder="Ex: 4"
                />
              </div>
            </div>
            <div>
              <Label>URL do Conteúdo</Label>
              <Input
                value={formData.conteudo_url}
                onChange={(e) => setFormData({ ...formData, conteudo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-3 p-3 bg-warning-soft rounded-lg">
              <Switch
                checked={formData.obrigatorio}
                onCheckedChange={(checked) => setFormData({ ...formData, obrigatorio: checked })}
              />
              <div>
                <Label>Curso Obrigatório</Label>
                <p className="text-xs text-warning">Será destacado para todos os colaboradores</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createCursoMutation.isPending}>
                {createCursoMutation.isPending ? 'Salvando...' : 'Criar Curso'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}