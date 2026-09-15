import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Tag, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ConfigCategoriasTratativa() {
  const [showForm, setShowForm] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cor: '#3B82F6'
  });

  const queryClient = useQueryClient();

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['categorias-tratativa'],
    queryFn: () => db.entities.CategoriaTratativa.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.CategoriaTratativa.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categorias-tratativa']);
      toast.success('Categoria criada');
      resetForm();
    },
    onError: () => toast.error('Erro ao criar'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.CategoriaTratativa.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categorias-tratativa']);
      toast.success('Categoria atualizada');
      resetForm();
    },
    onError: () => toast.error('Erro ao atualizar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.CategoriaTratativa.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['categorias-tratativa']);
      toast.success('Categoria removida');
      setConfirmDialog({ open: false, id: null });
    },
    onError: () => toast.error('Erro ao remover'),
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      cor: '#3B82F6'
    });
    setEditingCategoria(null);
    setShowForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validação: deve ter pelo menos 2 categorias ativas
    const ativasCount = categorias.filter(c => c.ativa).length;
    if (editingCategoria) {
      updateMutation.mutate({ id: editingCategoria.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (categoria) => {
    setEditingCategoria(categoria);
    setFormData({
      nome: categoria.nome || '',
      descricao: categoria.descricao || '',
      cor: categoria.cor || '#3B82F6'
    });
    setShowForm(true);
  };

  const handleToggleAtiva = (categoria) => {
    const ativasCount = categorias.filter(c => c.ativa && c.id !== categoria.id).length;
    
    // Não permite desativar se ficaria com menos de 2
    if (categoria.ativa && ativasCount < 2) {
      toast.error('Deve haver pelo menos 2 categorias ativas');
      return;
    }

    updateMutation.mutate({
      id: categoria.id,
      data: { ...categoria, ativa: !categoria.ativa }
    });
  };

  const columns = [
    { 
      key: 'nome', 
      label: 'Nome',
      render: (cat) => (
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: cat.cor }}
          />
          <span className="font-medium">{cat.nome}</span>
        </div>
      )
    },
    { 
      key: 'descricao', 
      label: 'Descrição',
      render: (cat) => <span className="text-muted-foreground">{cat.descricao || '-'}</span>
    },
    {
      key: 'ativa',
      label: 'Status',
      render: (cat) => (
        <button
          onClick={() => handleToggleAtiva(cat)}
          className="cursor-pointer"
        >
          {cat.ativa ? (
            <Badge className="bg-success-soft text-success">Ativa</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">Inativa</Badge>
          )}
        </button>
      )
    },
    {
      key: 'acoes',
      label: 'Ações',
      render: (cat) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setConfirmDialog({ open: true, id: cat.id })}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  const categoriasAtivas = categorias.filter(c => c.ativa).length;

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Categorias de Tratativas
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Defina as categorias disponíveis para classificar tratativas
              </p>
            </div>
            <Button onClick={() => setShowForm(!showForm)} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              {showForm ? 'Cancelar' : 'Nova Categoria'}
            </Button>
          </div>
        </CardHeader>

        {categoriasAtivas < 2 && (
          <div className="mx-6 mb-4">
            <div className="p-4 bg-warning-soft border border-warning/25 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning">Atenção: Categorias Insuficientes</p>
                <p className="text-warning mt-1">
                  É obrigatório ter pelo menos 2 categorias ativas para gerar dados no sistema.
                  Atualmente você tem {categoriasAtivas} categoria{categoriasAtivas !== 1 ? 's' : ''} ativa{categoriasAtivas !== 1 ? 's' : ''}.
                </p>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <CardContent className="border-t">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nome da Categoria *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Atendimento"
                    required
                  />
                </div>
                <div>
                  <Label>Cor</Label>
                  <Input
                    type="color"
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva esta categoria..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-success hover:bg-success/90">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {editingCategoria ? 'Atualizar' : 'Criar'} Categoria
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
            data={categorias}
            isLoading={isLoading}
            emptyState={
              <EmptyState
                icon={Tag}
                title="Nenhuma categoria cadastrada"
                description="Comece criando pelo menos 2 categorias para poder gerar dados"
                action={
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeira Categoria
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
        title="Remover Categoria"
        description="Tem certeza que deseja remover esta categoria? Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        onConfirm={() => deleteMutation.mutate(confirmDialog.id)}
        variant="danger"
      />
    </div>
  );
}