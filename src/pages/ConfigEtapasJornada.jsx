import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Map } from 'lucide-react';

export default function ConfigEtapasJornada() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cor: 'hsl(var(--chart-1))',
    ordem: 0,
    ativa: true
  });

  const queryClient = useQueryClient();

  const { data: etapas = [], isLoading } = useQuery({
    queryKey: ['etapas-jornada'],
    queryFn: () => db.entities.EtapaJornada.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.EtapaJornada.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['etapas-jornada']);
      toast.success('Etapa criada');
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.EtapaJornada.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['etapas-jornada']);
      toast.success('Etapa atualizada');
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.EtapaJornada.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['etapas-jornada']);
      toast.success('Etapa excluída');
      setDeleteDialogOpen(false);
    },
  });

  const openCreate = () => {
    setSelected(null);
    setFormData({ nome: '', descricao: '', cor: 'hsl(var(--chart-1))', ordem: 0, ativa: true });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setSelected(item);
    setFormData({
      nome: item.nome || '',
      descricao: item.descricao || '',
      cor: item.cor || 'hsl(var(--chart-1))',
      ordem: item.ordem || 0,
      ativa: item.ativa !== false
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelected(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nome) {
      toast.error('Preencha o nome da etapa');
      return;
    }

    if (selected) {
      updateMutation.mutate({ id: selected.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const columns = [
    {
      header: 'Ordem',
      render: (row) => (
        <Badge variant="outline" className="font-mono">{row.ordem || 0}</Badge>
      )
    },
    {
      header: 'Etapa',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: row.cor || 'hsl(var(--chart-1))' }}
          />
          <span className="font-medium">{row.nome}</span>
        </div>
      )
    },
    {
      header: 'Descrição',
      accessor: 'descricao'
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge className={row.ativa !== false ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground'}>
          {row.ativa !== false ? 'Ativa' : 'Inativa'}
        </Badge>
      )
    },
    {
      header: 'Ações',
      render: (row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-destructive"
            onClick={() => { setSelected(row); setDeleteDialogOpen(true); }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Etapas da Jornada"
        subtitle="Definir as etapas que o cliente percorre"
        icon={Map}
        backTo="Configuracoes"
        actions={
          <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Nova Etapa
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={etapas.sort((a, b) => (a.ordem || 0) - (b.ordem || 0))}
        isLoading={isLoading}
        emptyIcon={Map}
        emptyTitle="Nenhuma etapa cadastrada"
        emptyDescription="Crie as etapas da jornada do cliente"
        emptyAction={openCreate}
        emptyActionLabel="Criar Primeira Etapa"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected ? 'Editar Etapa' : 'Nova Etapa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Nome da Etapa *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Aquisição/Venda"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição da etapa..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cor</Label>
                <Input
                  type="color"
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                />
              </div>
              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={formData.ordem}
                  onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {selected ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Etapa"
        description="Tem certeza? Esta ação não pode ser desfeita."
        onConfirm={() => selected && deleteMutation.mutate(selected.id)}
        variant="danger"
      />
    </div>
  );
}