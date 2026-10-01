import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, FileText, CheckCircle } from 'lucide-react';
import { useEu } from '@/hooks/useGestor';
import AcessoRestrito from '@/components/ui/AcessoRestrito';

export default function ConfigTiposTratativa() {
  const { isGestor, carregando: carregandoEu } = useEu();
  const [showForm, setShowForm] = useState(false);
  const [editingTipo, setEditingTipo] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });
  const [formData, setFormData] = useState({
    nome: '',
    chave: '',
    descricao: '',
    sla_horas: 24,
    permite_reabertura: false,
    cor: 'hsl(var(--chart-1))',
    campos_especificos: []
  });

  const queryClient = useQueryClient();

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ['tipos-tratativa', "list()"],
    queryFn: () => db.entities.TipoTratativa.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.TipoTratativa.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tipos-tratativa']);
      toast.success('Tipo criado');
      resetForm();
    },
    onError: () => toast.error('Erro ao criar'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.TipoTratativa.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tipos-tratativa']);
      toast.success('Tipo atualizado');
      resetForm();
    },
    onError: () => toast.error('Erro ao atualizar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.TipoTratativa.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tipos-tratativa']);
      toast.success('Tipo removido');
      setConfirmDialog({ open: false, id: null });
    },
    onError: () => toast.error('Erro ao remover'),
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      chave: '',
      descricao: '',
      sla_horas: 24,
      permite_reabertura: false,
      cor: 'hsl(var(--chart-1))',
      campos_especificos: []
    });
    setEditingTipo(null);
    setShowForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTipo) {
      updateMutation.mutate({ id: editingTipo.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (tipo) => {
    setEditingTipo(tipo);
    setFormData({
      nome: tipo.nome || '',
      chave: tipo.chave || '',
      descricao: tipo.descricao || '',
      sla_horas: tipo.sla_horas || 24,
      permite_reabertura: tipo.permite_reabertura || false,
      cor: tipo.cor || 'hsl(var(--chart-1))',
      campos_especificos: tipo.campos_especificos || []
    });
    setShowForm(true);
  };

  const columns = [
    { key: 'nome', label: 'Nome' },
    { 
      key: 'chave', 
      label: 'Chave',
      render: (tipo) => <code className="text-xs bg-muted px-2 py-1 rounded">{tipo.chave}</code>
    },
    { 
      key: 'sla_horas', 
      label: 'SLA',
      render: (tipo) => <span>{tipo.sla_horas}h</span>
    },
    { 
      key: 'permite_reabertura', 
      label: 'Reabertura',
      render: (tipo) => tipo.permite_reabertura ? (
        <Badge className="bg-success-soft text-success">Sim</Badge>
      ) : (
        <Badge variant="outline">Não</Badge>
      )
    },
    {
      key: 'ativa',
      label: 'Status',
      render: (tipo) => tipo.ativa ? (
        <Badge className="bg-success-soft text-success">Ativa</Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">Inativa</Badge>
      )
    },
    {
      key: 'acoes',
      label: 'Ações',
      render: (tipo) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(tipo)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setConfirmDialog({ open: true, id: tipo.id })}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  if (!carregandoEu && !isGestor) return <AcessoRestrito />;

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Tipos de Tratativas
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure os tipos de tratativas e suas características específicas
              </p>
            </div>
            <Button onClick={() => setShowForm(!showForm)} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              {showForm ? 'Cancelar' : 'Novo Tipo'}
            </Button>
          </div>
        </CardHeader>

        {showForm && (
          <CardContent className="border-t">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Tipo *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Reclamação Interna"
                    required
                  />
                </div>
                <div>
                  <Label>Chave Única *</Label>
                  <Input
                    value={formData.chave}
                    onChange={(e) => setFormData({ ...formData, chave: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="Ex: reclamacao_interna"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Sem espaços, apenas letras minúsculas e _</p>
                </div>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva este tipo de tratativa..."
                  rows={2}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>SLA Padrão (horas)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.sla_horas}
                    onChange={(e) => setFormData({ ...formData, sla_horas: parseInt(e.target.value) || 24 })}
                  />
                </div>
                <div>
                  <Label>Cor do Badge</Label>
                  <Input
                    type="color"
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-info-soft rounded-lg">
                <Switch
                  checked={formData.permite_reabertura}
                  onCheckedChange={(checked) => setFormData({ ...formData, permite_reabertura: checked })}
                />
                <div>
                  <Label className="text-sm">Permite Controle de Reabertura</Label>
                  <p className="text-xs text-muted-foreground">
                    Ativa o contador de 7 dias para confirmar se houve reabertura
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-success hover:bg-success/90">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {editingTipo ? 'Atualizar' : 'Criar'} Tipo
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        )}

        <CardContent>
          <DataTable
            columns={columns}
            data={tipos}
            isLoading={isLoading}
            emptyState={
              <EmptyState
                icon={FileText}
                title="Nenhum tipo cadastrado"
                description="Comece criando um novo tipo de tratativa"
                action={
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Tipo
                  </Button>
                }
              />
            }
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title="Remover Tipo"
        description="Tem certeza que deseja remover este tipo? Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        onConfirm={() => deleteMutation.mutate(confirmDialog.id)}
        variant="danger"
      />
    </div>
  );
}