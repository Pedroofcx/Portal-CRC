import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { formatDateSP } from '@/components/utils/helpers';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';


import {
  Star,
  Plus,
  Eye,
  Trash2,
  CheckCircle,
  BarChart3,
  Send,
  Heart,
  Copy
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AgendamentoPesquisa from '@/components/pesquisas/AgendamentoPesquisa';
import { ResultadosVisuaisCSAT, ResultadosVisuaisNPS } from '@/components/pesquisas/ResultadosVisuais';
import PainelLateral, { RodapeFixo } from '@/components/ui/PainelLateral';

export default function Pesquisas() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [responderDialogOpen, setResponderDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reenviarDialogOpen, setReenviarDialogOpen] = useState(false);
  const [selectedPesquisa, setSelectedPesquisa] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'personalizada',
    categoria: 'interna',
    perguntas: [{ id: Date.now().toString(), texto: '', tipo_resposta: 'texto', opcoes: [], obrigatoria: false }],
    data_inicio: '',
    data_fim: '',
    requer_confirmacao_leitura: true, // SEMPRE TRUE - obrigatório para todos
    peso_health_score: 0,
    agendamento: {
      ativo: false,
      tipo: 'unico',
      prazo_resposta_dias: 7,
      enviar_lembrete: true,
      dias_antes_lembrete: 2
    }
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

  const { data: pesquisas = [], isLoading } = useQuery({
    queryKey: ['pesquisas', "filter({ ativa: true }, '-created_date')"],
    queryFn: () => db.entities.Pesquisa.filter({ ativa: true }, '-created_date'),
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });

  const { data: minhasRespostas = [] } = useQuery({
    queryKey: ['respostasPesquisa'],
    queryFn: () => db.entities.RespostaPesquisa.list(),
  });

  const colaborador = colaboradores.find(c => c.email === user?.email);
  const isGestor = colaborador?.papel === 'gestor';

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Pesquisa.create({
      ...data,
      ativa: true
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['pesquisas']);
      toast.success('Pesquisa criada com sucesso');
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Erro ao criar pesquisa'),
  });

  const responderMutation = useMutation({
    mutationFn: (data) => db.entities.RespostaPesquisa.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['respostasPesquisa']);
      toast.success('Resposta enviada');
      setResponderDialogOpen(false);
      setRespostas({});
    },
    onError: () => toast.error('Erro ao enviar resposta'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Pesquisa.update(id, { ativa: false }),
    onSuccess: () => {
      queryClient.invalidateQueries(['pesquisas']);
      toast.success('Pesquisa removida');
      setDeleteDialogOpen(false);
    },
    onError: () => toast.error('Erro ao remover'),
  });

  const reenviarMutation = useMutation({
    mutationFn: async (pesquisaId) => {
      // Limpar todas as flags de exibição no sessionStorage para forçar popup
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes(`pesquisa_shown_timestamp_${pesquisaId}`) || 
            key.includes(`pesquisa_popup_shown_`)) {
          sessionStorage.removeItem(key);
        }
      });
      
      return db.entities.Pesquisa.update(pesquisaId, { 
        reenviar_timestamp: new Date().toISOString() 
      });
    },
    onSuccess: (data, pesquisaId) => {
      queryClient.invalidateQueries(['pesquisas']);
      queryClient.invalidateQueries(['pesquisas-ativas']);
      
      setReenviarDialogOpen(false);
      
      // Buscar quantos colaboradores existem e quantos ainda não responderam
      const totalColaboradores = colaboradores.length;
      const jaResponderam = minhasRespostas.filter(r => r.pesquisa_id === pesquisaId).length;
      const precisamResponder = totalColaboradores - jaResponderam;
      
      toast.success(`Pesquisa reenviada! ${precisamResponder} usuário(s) receberão o popup (${jaResponderam} já responderam)`);
    },
    onError: () => {
      toast.error('Erro ao reenviar pesquisa');
      setReenviarDialogOpen(false);
    },
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPesquisa, setEditingPesquisa] = useState(null);

  const clonarMutation = useMutation({
    mutationFn: (pesquisa) => {
      const { _id, _created_date, _updated_date, _created_by, _publicada, _data_publicacao, _reenviar_timestamp, ...dadosPesquisa } = pesquisa;
      return db.entities.Pesquisa.create({
        ...dadosPesquisa,
        titulo: `${pesquisa.titulo} (Cópia)`,
        ativa: true,
        publicada: false,
        criado_por_id: colaborador?.id,
        criado_por_nome: user?.full_name
      });
    },
    onSuccess: (_nova) => {
      queryClient.invalidateQueries(['pesquisas']);
      toast.success('Pesquisa clonada! Você pode editá-la agora.');
      // Após clonar, abrir para edição
      setTimeout(() => {
        queryClient.fetchQuery({ queryKey: ['pesquisas', "filter({ ativa: true }, '-created_date')"], queryFn: () => db.entities.Pesquisa.filter({ ativa: true }, '-created_date') }).then(_lista => {
          // Recarregar e abrir edição não é trivial sem o id novo, então apenas notificamos
        });
      }, 500);
    },
    onError: () => toast.error('Erro ao clonar pesquisa'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Pesquisa.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['pesquisas']);
      toast.success('Pesquisa atualizada com sucesso');
      setEditDialogOpen(false);
      setEditingPesquisa(null);
    },
    onError: () => toast.error('Erro ao atualizar pesquisa'),
  });

  const handleOpenEdit = (pesquisa) => {
    setEditingPesquisa({
      id: pesquisa.id,
      titulo: pesquisa.titulo || '',
      descricao: pesquisa.descricao || '',
      tipo: pesquisa.tipo || 'personalizada',
      categoria: pesquisa.categoria || 'interna',
      perguntas: pesquisa.perguntas?.length > 0 ? pesquisa.perguntas : [{ id: Date.now().toString(), texto: '', tipo_resposta: 'texto', opcoes: [], obrigatoria: false }],
      data_inicio: pesquisa.data_inicio || '',
      data_fim: pesquisa.data_fim || '',
      peso_health_score: pesquisa.peso_health_score || 0,
      agendamento: pesquisa.agendamento || { ativo: false, tipo: 'unico', prazo_resposta_dias: 7, enviar_lembrete: true, dias_antes_lembrete: 2 }
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingPesquisa?.titulo || !editingPesquisa?.perguntas?.length) {
      toast.error('Preencha título e adicione perguntas'); return;
    }
    const { id, ...data } = editingPesquisa;
    updateMutation.mutate({ id, data: { ...data, requer_confirmacao_leitura: true } });
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      tipo: 'personalizada',
      categoria: 'interna',
      perguntas: [{ id: Date.now().toString(), texto: '', tipo_resposta: 'texto', opcoes: [], obrigatoria: false }],
      data_inicio: '',
      data_fim: '',
      requer_confirmacao_leitura: true, // SEMPRE TRUE - obrigatório para todos
      peso_health_score: 0,
      agendamento: {
        ativo: false,
        tipo: 'unico',
        prazo_resposta_dias: 7,
        enviar_lembrete: true,
        dias_antes_lembrete: 2
      }
    });
  };

  const addPergunta = () => {
    setFormData({
      ...formData,
      perguntas: [...formData.perguntas, { 
        id: Date.now().toString(), 
        texto: '', 
        tipo_resposta: 'texto', 
        opcoes: [], 
        obrigatoria: false 
      }]
    });
  };

  const updatePergunta = (index, field, value) => {
    const newPerguntas = [...formData.perguntas];
    newPerguntas[index] = { ...newPerguntas[index], [field]: value };
    setFormData({ ...formData, perguntas: newPerguntas });
  };

  const removePergunta = (index) => {
    setFormData({ ...formData, perguntas: formData.perguntas.filter((_, i) => i !== index) });
  };

  const addOpcao = (perguntaIndex) => {
    const newPerguntas = [...formData.perguntas];
    newPerguntas[perguntaIndex].opcoes = [...(newPerguntas[perguntaIndex].opcoes || []), ''];
    setFormData({ ...formData, perguntas: newPerguntas });
  };

  const updateOpcao = (perguntaIndex, opcaoIndex, value) => {
    const newPerguntas = [...formData.perguntas];
    newPerguntas[perguntaIndex].opcoes[opcaoIndex] = value;
    setFormData({ ...formData, perguntas: newPerguntas });
  };

  const removeOpcao = (perguntaIndex, opcaoIndex) => {
    const newPerguntas = [...formData.perguntas];
    newPerguntas[perguntaIndex].opcoes = newPerguntas[perguntaIndex].opcoes.filter((_, i) => i !== opcaoIndex);
    setFormData({ ...formData, perguntas: newPerguntas });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.titulo || formData.perguntas.length === 0) {
      toast.error('Preencha título e adicione perguntas');
      return;
    }
    // GARANTIR que requer_confirmacao_leitura seja sempre true
    createMutation.mutate({
      ...formData,
      requer_confirmacao_leitura: true
    });
  };

  const handleResponder = (pesquisa) => {
    setSelectedPesquisa(pesquisa);
    setRespostas({});
    setResponderDialogOpen(true);
  };

  const handleEnviarResposta = () => {
    if (!selectedPesquisa) return;

    const respostasArray = selectedPesquisa.perguntas.map(p => ({
      pergunta_id: p.id,
      pergunta_texto: p.texto,
      resposta: respostas[p.id] || ''
    }));

    const obrigatoriasSemResposta = selectedPesquisa.perguntas.filter(p => p.obrigatoria && !respostas[p.id]);
    if (obrigatoriasSemResposta.length > 0) {
      toast.error('Responda todas as perguntas obrigatórias');
      return;
    }

    // Calcular nota para CSAT/NPS
    let notaCalculada = null;
    let sentimento = 'neutro';

    if (selectedPesquisa.tipo === 'csat' || selectedPesquisa.tipo === 'nps') {
      const primeiraResposta = respostas[selectedPesquisa.perguntas[0]?.id];
      if (primeiraResposta) {
        notaCalculada = parseFloat(primeiraResposta);
        
        if (selectedPesquisa.tipo === 'csat') {
          sentimento = notaCalculada >= 4 ? 'positivo' : notaCalculada >= 3 ? 'neutro' : 'negativo';
        } else if (selectedPesquisa.tipo === 'nps') {
          sentimento = notaCalculada >= 9 ? 'positivo' : notaCalculada >= 7 ? 'neutro' : 'negativo';
        }
      }
    }

    responderMutation.mutate({
      pesquisa_id: selectedPesquisa.id,
      pesquisa_titulo: selectedPesquisa.titulo,
      pesquisa_tipo: selectedPesquisa.tipo,
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

  const jaRespondeu = (pesquisaId) => minhasRespostas.some(r => r.pesquisa_id === pesquisaId && r.colaborador_id === colaborador?.id);

  // Filtrar respostas para gestores - apenas gestores veem dados
  const respostasVisiveis = isGestor ? minhasRespostas : [];

  const columns = [
    {
      header: 'Título',
      accessor: 'titulo'
    },
    {
      header: 'Tipo',
      render: (row) => (
        <Badge variant="outline" className="capitalize">
          {row.tipo}
        </Badge>
      )
    },
    {
      header: 'Perguntas',
      render: (row) => `${row.perguntas?.length || 0} perguntas`
    },
    {
      header: 'Período',
      render: (row) => {
        if (!row.data_inicio && !row.data_fim) return 'Sem limite';
        return `${row.data_inicio ? formatDateSP(row.data_inicio, 'DD/MM/YYYY') : '?'} - ${row.data_fim ? formatDateSP(row.data_fim, 'DD/MM/YYYY') : '?'}`;
      }
    },
    {
      header: 'Respostas',
      render: (row) => {
        if (isGestor) {
          const respostasDaPesquisa = respostasVisiveis.filter(r => r.pesquisa_id === row.id);
          return <span>{respostasDaPesquisa.length} respostas</span>;
        } else {
          return jaRespondeu(row.id) ? (
            <Badge className="bg-success-soft text-success border-success/25">
              <CheckCircle className="w-3 h-3 mr-1" />
              Respondida
            </Badge>
          ) : (
            <Badge variant="outline" className="text-warning">
              Pendente
            </Badge>
          );
        }
      }
    },
    {
      header: '',
      render: (row) => (
        <div className="flex items-center gap-1">
          {!jaRespondeu(row.id) && (
            <Button 
              variant="default"
              size="sm"
              onClick={() => handleResponder(row)}
              className="bg-primary hover:bg-primary/90"
            >
              Responder
            </Button>
          )}
          {isGestor && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenEdit(row)}
                title="Editar pesquisa"
              >
                <Star className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => clonarMutation.mutate(row)}
                title="Clonar pesquisa"
                disabled={clonarMutation.isPending}
              >
                <Copy className="w-4 h-4 text-primary" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => { 
                  setSelectedPesquisa(row); 
                  setReenviarDialogOpen(true); 
                }}
                title="Reenviar para todos"
              >
                <Send className="w-4 h-4 text-success" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => { setSelectedPesquisa(row); setViewDialogOpen(true); }}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => { setSelectedPesquisa(row); setViewDialogOpen(true); }}
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            </>
          )}
          {isGestor && (
            <Button 
              variant="ghost" 
              size="icon"
              className="text-destructive"
              onClick={() => { setSelectedPesquisa(row); setDeleteDialogOpen(true); }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Pesquisas"
        subtitle="Pesquisas de satisfação e feedback"
        icon={Star}
        actions={
          isGestor && (
            <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Nova Pesquisa
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={pesquisas}
        isLoading={isLoading}
        emptyIcon={Star}
        emptyTitle="Nenhuma pesquisa disponível"
        emptyDescription="Aguarde novas pesquisas serem publicadas"
      />

      {/* Dialog de Criação */}
      <PainelLateral
        open={dialogOpen} onOpenChange={setDialogOpen}
        largura="xl"
        titulo="Nova Pesquisa"
      >
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Título da pesquisa"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição da pesquisa..."
                rows={2}
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
                    <SelectItem value="csat">CSAT (Satisfação)</SelectItem>
                    <SelectItem value="nps">NPS (Lealdade)</SelectItem>
                    <SelectItem value="clima_organizacional">Clima Organizacional</SelectItem>
                    <SelectItem value="personalizada">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cliente">Cliente Externo</SelectItem>
                    <SelectItem value="interna">Interna (Colaboradores)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                />
              </div>
            </div>

            {/* Perguntas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Perguntas</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPergunta}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.perguntas.map((pergunta, pIndex) => (
                <Card key={pergunta.id} className="mb-3">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Pergunta {pIndex + 1}</Badge>
                      {formData.perguntas.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removePergunta(pIndex)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Texto da pergunta"
                      value={pergunta.texto}
                      onChange={(e) => updatePergunta(pIndex, 'texto', e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={pergunta.tipo_resposta}
                        onValueChange={(value) => updatePergunta(pIndex, 'tipo_resposta', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo de resposta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="texto">Texto Livre</SelectItem>
                          <SelectItem value="escala_1_5">Escala 1-5</SelectItem>
                          <SelectItem value="escala_0_10">Escala 0-10 (NPS)</SelectItem>
                          <SelectItem value="sim_nao">Sim/Não</SelectItem>
                          <SelectItem value="multipla_escolha">Múltipla Escolha (uma opção)</SelectItem>
                          <SelectItem value="multipla_escolha_multipla">Múltipla Escolha (várias opções)</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2 col-span-2">
                        <Switch
                          checked={pergunta.obrigatoria}
                          onCheckedChange={(checked) => updatePergunta(pIndex, 'obrigatoria', checked)}
                        />
                        <Label className="text-sm">Obrigatória</Label>
                      </div>
                    </div>

                    {pergunta.tipo_resposta === 'multipla_escolha' && (
                      <div className="pl-4 border-l-2 border-border">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm">Opções</Label>
                          <Button type="button" variant="ghost" size="sm" onClick={() => addOpcao(pIndex)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        {pergunta.opcoes?.map((opcao, oIndex) => (
                          <div key={oIndex} className="flex gap-2 mb-1">
                            <Input
                              size="sm"
                              placeholder={`Opção ${oIndex + 1}`}
                              value={opcao}
                              onChange={(e) => updateOpcao(pIndex, oIndex, e.target.value)}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeOpcao(pIndex, oIndex)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Agendamento */}
            <AgendamentoPesquisa 
              agendamento={formData.agendamento}
              onChange={(agendamento) => setFormData({ ...formData, agendamento })}
            />

            {/* Configurações Adicionais */}
            {formData.tipo === 'clima_organizacional' && (
              <Card className="border-2 border-info/25 bg-info-soft/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-medium">Configurações de Clima Organizacional</Label>
                  </div>
                  <div className="pl-6 border-l-2 border-primary/25 space-y-2">
                    <div>
                      <Label className="text-xs">Peso no Health Score (0-10)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        className="h-9 mt-1"
                        value={formData.peso_health_score}
                        onChange={(e) => setFormData({ ...formData, peso_health_score: parseFloat(e.target.value) })}
                      />
                      <p className="text-xs text-primary mt-1">
                        Quanto maior o peso, maior o impacto no Health Score do colaborador
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="p-3 bg-info-soft border border-info/25 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium text-primary">Confirmação de Leitura Obrigatória</Label>
              </div>
              <p className="text-xs text-primary pl-6">
                Todas as pesquisas exigem confirmação de leitura e resposta obrigatória de todos os usuários (gestores e agentes).
              </p>
            </div>

            <RodapeFixo>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar Pesquisa'}
              </Button>
            </RodapeFixo>
          </form>
        </PainelLateral>

      {/* Dialog de Resposta */}
      <PainelLateral
        open={responderDialogOpen} onOpenChange={setResponderDialogOpen}
        largura="lg"
        titulo={selectedPesquisa?.titulo}
      >
          {selectedPesquisa && (
            <div className="space-y-4 mt-4">
              {selectedPesquisa.descricao && (
                <p className="text-sm text-muted-foreground">{selectedPesquisa.descricao}</p>
              )}
              {selectedPesquisa.perguntas?.map((pergunta, _index) => (
                <Card key={pergunta.id}>
                  <CardContent className="p-4 space-y-2">
                    <Label className="flex items-center gap-2">
                      {pergunta.texto}
                      {pergunta.obrigatoria && <span className="text-destructive">*</span>}
                    </Label>

                    {pergunta.tipo_resposta === 'texto' && (
                      <Textarea
                        value={respostas[pergunta.id] || ''}
                        onChange={(e) => setRespostas({ ...respostas, [pergunta.id]: e.target.value })}
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
                            variant={respostas[pergunta.id] === num.toString() ? 'default' : 'outline'}
                            className={`flex-1 ${respostas[pergunta.id] === num.toString() ? 'bg-primary' : ''}`}
                            onClick={() => setRespostas({ ...respostas, [pergunta.id]: num.toString() })}
                          >
                            {num}
                          </Button>
                        ))}
                      </div>
                    )}

                    {pergunta.tipo_resposta === 'escala_0_10' && (
                      <div className="grid grid-cols-11 gap-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                          <Button
                            key={num}
                            type="button"
                            size="sm"
                            variant={respostas[pergunta.id] === num.toString() ? 'default' : 'outline'}
                            className={`${respostas[pergunta.id] === num.toString() ? 'bg-primary' : ''}`}
                            onClick={() => setRespostas({ ...respostas, [pergunta.id]: num.toString() })}
                          >
                            {num}
                          </Button>
                        ))}
                      </div>
                    )}

                    {pergunta.tipo_resposta === 'sim_nao' && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={respostas[pergunta.id] === 'sim' ? 'default' : 'outline'}
                          className={`flex-1 ${respostas[pergunta.id] === 'sim' ? 'bg-primary' : ''}`}
                          onClick={() => setRespostas({ ...respostas, [pergunta.id]: 'sim' })}
                        >
                          Sim
                        </Button>
                        <Button
                          type="button"
                          variant={respostas[pergunta.id] === 'nao' ? 'default' : 'outline'}
                          className={`flex-1 ${respostas[pergunta.id] === 'nao' ? 'bg-primary' : ''}`}
                          onClick={() => setRespostas({ ...respostas, [pergunta.id]: 'nao' })}
                        >
                          Não
                        </Button>
                      </div>
                    )}

                    {(pergunta.tipo_resposta === 'multipla_escolha') && (
                      <Select
                        value={respostas[pergunta.id] || ''}
                        onValueChange={(value) => setRespostas({ ...respostas, [pergunta.id]: value })}
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
                          <label key={i} className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(respostas[pergunta.id] || '').split(',').includes(opcao)}
                              onChange={(e) => {
                                const current = (respostas[pergunta.id] || '').split(',').filter(v => v);
                                const updated = e.target.checked
                                  ? [...current, opcao]
                                  : current.filter(v => v !== opcao);
                                setRespostas({ ...respostas, [pergunta.id]: updated.join(',') });
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{opcao}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setResponderDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleEnviarResposta} className="bg-primary hover:bg-primary/90" disabled={responderMutation.isPending}>
                  {responderMutation.isPending ? 'Enviando...' : 'Enviar Resposta'}
                </Button>
              </div>
            </div>
          )}
        </PainelLateral>

      {/* Dialog de Visualização com Resultados Visuais */}
      <PainelLateral
        open={viewDialogOpen} onOpenChange={setViewDialogOpen}
        largura="4xl"
        titulo={<>{selectedPesquisa?.tipo === 'csat' && 'CSAT - '} {selectedPesquisa?.tipo === 'nps' && 'NPS - '} {selectedPesquisa?.tipo === 'clima_organizacional' && 'Clima - '} {selectedPesquisa?.titulo}</>}
      >
          {selectedPesquisa && (
            <Tabs defaultValue="resultados" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="resultados">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Resultados
                </TabsTrigger>
                <TabsTrigger value="perguntas">Perguntas</TabsTrigger>
                <TabsTrigger value="respostas">Respostas</TabsTrigger>
              </TabsList>

              <TabsContent value="resultados" className="mt-4">
                {selectedPesquisa.tipo === 'csat' && (
                  <ResultadosVisuaisCSAT 
                    respostas={respostasVisiveis.filter(r => r.pesquisa_id === selectedPesquisa.id)}
                  />
                )}
                {selectedPesquisa.tipo === 'nps' && (
                  <ResultadosVisuaisNPS 
                    respostas={respostasVisiveis.filter(r => r.pesquisa_id === selectedPesquisa.id)}
                  />
                )}
                {selectedPesquisa.tipo !== 'csat' && selectedPesquisa.tipo !== 'nps' && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center text-muted-foreground">
                        <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                        <p>Visualização de resultados disponível para CSAT e NPS</p>
                        <p className="text-sm mt-1">
                          Total de {respostasVisiveis.filter(r => r.pesquisa_id === selectedPesquisa.id).length} respostas recebidas
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="perguntas" className="mt-4">
                <div className="space-y-2">
                  {selectedPesquisa.descricao && (
                    <Card className="bg-info-soft border-info/25">
                      <CardContent className="p-3 text-sm text-foreground">
                        {selectedPesquisa.descricao}
                      </CardContent>
                    </Card>
                  )}
                  {selectedPesquisa.perguntas?.map((p, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <p className="font-medium">{i + 1}. {p.texto}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">{p.tipo_resposta}</Badge>
                          {p.obrigatoria && <Badge className="text-xs bg-destructive/10 text-destructive">Obrigatória</Badge>}
                        </div>
                        {p.opcoes && p.opcoes.length > 0 && (
                          <div className="mt-2 pl-4 border-l-2 border-border">
                            <p className="text-xs text-muted-foreground mb-1">Opções:</p>
                            <ul className="text-sm space-y-1">
                              {p.opcoes.map((op, idx) => (
                                <li key={idx}>• {op}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="respostas" className="mt-4">
                <div className="space-y-3">
                  <p className="font-medium">
                    Total: {respostasVisiveis.filter(r => r.pesquisa_id === selectedPesquisa.id).length} respostas
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {respostasVisiveis
                      .filter(r => r.pesquisa_id === selectedPesquisa.id)
                      .map((resp, idx) => (
                        <Card key={idx}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <p className="font-medium text-sm">
                                {resp.colaborador_nome}
                              </p>
                              <div className="flex items-center gap-2">
                                {resp.nota_calculada && (
                                  <Badge className={
                                    resp.sentimento === 'positivo' ? 'bg-success-soft text-success' :
                                    resp.sentimento === 'negativo' ? 'bg-destructive/10 text-destructive' :
                                    'bg-warning-soft text-warning'
                                  }>
                                    {resp.nota_calculada}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatDateSP(resp.data_resposta, 'DD/MM/YYYY HH:mm')}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {resp.respostas?.map((r, i) => (
                                <div key={i} className="text-sm bg-muted p-2 rounded">
                                  <span className="text-muted-foreground font-medium">{r.pergunta_texto}:</span>{' '}
                                  <span>{r.resposta || '-'}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    }
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </PainelLateral>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remover Pesquisa"
        description="Tem certeza que deseja remover esta pesquisa?"
        confirmLabel="Remover"
        onConfirm={() => selectedPesquisa && deleteMutation.mutate(selectedPesquisa.id)}
        variant="danger"
      />

      <ConfirmDialog
        open={reenviarDialogOpen}
        onOpenChange={setReenviarDialogOpen}
        title="Reenviar Pesquisa"
        description={`Deseja reenviar "${selectedPesquisa?.titulo}" para TODOS os usuários? Quem ainda não respondeu receberá o popup imediatamente.`}
        confirmLabel="Sim, Reenviar"
        onConfirm={() => selectedPesquisa && reenviarMutation.mutate(selectedPesquisa.id)}
        variant="warning"
      />

      {/* Dialog de Edição */}
      <PainelLateral
        open={editDialogOpen} onOpenChange={setEditDialogOpen}
        largura="xl"
        titulo="Editar Pesquisa"
      >
          {editingPesquisa && (
            <form onSubmit={handleSaveEdit} className="space-y-4 mt-4">
              <div>
                <Label>Título *</Label>
                <Input value={editingPesquisa.titulo} onChange={e => setEditingPesquisa(p => ({ ...p, titulo: e.target.value }))} placeholder="Título da pesquisa" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={editingPesquisa.descricao} onChange={e => setEditingPesquisa(p => ({ ...p, descricao: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={editingPesquisa.tipo} onValueChange={v => setEditingPesquisa(p => ({ ...p, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csat">CSAT</SelectItem>
                      <SelectItem value="nps">NPS</SelectItem>
                      <SelectItem value="ces">CES</SelectItem>
                      <SelectItem value="clima_organizacional">Clima Organizacional</SelectItem>
                      <SelectItem value="personalizada">Personalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={editingPesquisa.categoria} onValueChange={v => setEditingPesquisa(p => ({ ...p, categoria: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente">Cliente Externo</SelectItem>
                      <SelectItem value="interna">Interna</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data Início</Label>
                  <Input type="date" value={editingPesquisa.data_inicio} onChange={e => setEditingPesquisa(p => ({ ...p, data_inicio: e.target.value }))} />
                </div>
                <div>
                  <Label>Data Fim</Label>
                  <Input type="date" value={editingPesquisa.data_fim} onChange={e => setEditingPesquisa(p => ({ ...p, data_fim: e.target.value }))} />
                </div>
              </div>

              {/* Perguntas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Perguntas</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingPesquisa(p => ({ ...p, perguntas: [...p.perguntas, { id: Date.now().toString(), texto: '', tipo_resposta: 'texto', opcoes: [], obrigatoria: false }] }))}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {editingPesquisa.perguntas.map((pergunta, pIndex) => (
                  <Card key={pergunta.id || pIndex} className="mb-3">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Pergunta {pIndex + 1}</Badge>
                        {editingPesquisa.perguntas.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => setEditingPesquisa(p => ({ ...p, perguntas: p.perguntas.filter((_, i) => i !== pIndex) }))}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <Input placeholder="Texto da pergunta" value={pergunta.texto}
                        onChange={e => { const ps = [...editingPesquisa.perguntas]; ps[pIndex] = { ...ps[pIndex], texto: e.target.value }; setEditingPesquisa(p => ({ ...p, perguntas: ps })); }} />
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={pergunta.tipo_resposta}
                          onValueChange={v => { const ps = [...editingPesquisa.perguntas]; ps[pIndex] = { ...ps[pIndex], tipo_resposta: v }; setEditingPesquisa(p => ({ ...p, perguntas: ps })); }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="texto">Texto Livre</SelectItem>
                            <SelectItem value="escala_1_5">Escala 1-5</SelectItem>
                            <SelectItem value="escala_0_10">Escala 0-10 (NPS)</SelectItem>
                            <SelectItem value="sim_nao">Sim/Não</SelectItem>
                            <SelectItem value="multipla_escolha">Múltipla Escolha</SelectItem>
                            <SelectItem value="multipla_escolha_multipla">Múltipla (várias)</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Switch checked={pergunta.obrigatoria}
                            onCheckedChange={v => { const ps = [...editingPesquisa.perguntas]; ps[pIndex] = { ...ps[pIndex], obrigatoria: v }; setEditingPesquisa(p => ({ ...p, perguntas: ps })); }} />
                          <Label className="text-sm">Obrigatória</Label>
                        </div>
                      </div>
                      {(pergunta.tipo_resposta === 'multipla_escolha' || pergunta.tipo_resposta === 'multipla_escolha_multipla') && (
                        <div className="pl-4 border-l-2 border-border">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm">Opções</Label>
                            <Button type="button" variant="ghost" size="sm" onClick={() => { const ps = [...editingPesquisa.perguntas]; ps[pIndex].opcoes = [...(ps[pIndex].opcoes || []), '']; setEditingPesquisa(p => ({ ...p, perguntas: ps })); }}>
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          {pergunta.opcoes?.map((opcao, oIndex) => (
                            <div key={oIndex} className="flex gap-2 mb-1">
                              <Input size="sm" placeholder={`Opção ${oIndex + 1}`} value={opcao}
                                onChange={e => { const ps = [...editingPesquisa.perguntas]; ps[pIndex].opcoes[oIndex] = e.target.value; setEditingPesquisa(p => ({ ...p, perguntas: ps })); }} />
                              <Button type="button" variant="ghost" size="icon" onClick={() => { const ps = [...editingPesquisa.perguntas]; ps[pIndex].opcoes = ps[pIndex].opcoes.filter((_, i) => i !== oIndex); setEditingPesquisa(p => ({ ...p, perguntas: ps })); }}>
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <RodapeFixo>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </RodapeFixo>
            </form>
          )}
        </PainelLateral>
    </div>
  );
}