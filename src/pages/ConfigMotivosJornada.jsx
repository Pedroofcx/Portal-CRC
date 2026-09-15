import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Settings, Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ConfigMotivosJornada() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({
    motivo: '',
    descricao: '',
    submotivos: [],
    cor: '#3B82F6',
    ordem: 0,
    ativo: true,
    esforco_correcao_ti: ''
  });
  const [submotivoInput, setSubmotivoInput] = useState('');

  const queryClient = useQueryClient();

  const { data: motivos = [], isLoading } = useQuery({
    queryKey: ['motivos'],
    queryFn: () => db.entities.MotivoTratativa.list(),
  });

  const { data: etapas = [] } = useQuery({
    queryKey: ['etapas-jornada'],
    queryFn: () => db.entities.EtapaJornada.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.MotivoTratativa.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['motivos']);
      toast.success('Motivo criado');
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.MotivoTratativa.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['motivos']);
      toast.success('Motivo atualizado');
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.MotivoTratativa.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['motivos']);
      toast.success('Motivo excluído');
      setDeleteDialogOpen(false);
    },
  });

  const createEtapaMutation = useMutation({
    mutationFn: (data) => db.entities.EtapaJornada.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['etapas-jornada']);
      toast.success('Etapa criada');
    },
  });

  const openCreate = () => {
    setSelected(null);
    setFormData({ motivo: '', descricao: '', submotivos: [], cor: '#3B82F6', ordem: 0, ativo: true, esforco_correcao_ti: '' });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setSelected(item);
    setFormData({
      motivo: item.motivo || '',
      descricao: item.descricao || '',
      submotivos: item.submotivos || [],
      cor: item.cor || '#3B82F6',
      ordem: item.ordem || 0,
      ativo: item.ativo !== false,
      esforco_correcao_ti: item.esforco_correcao_ti || ''
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelected(null);
    setSubmotivoInput('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.motivo) {
      toast.error('Preencha o motivo');
      return;
    }

    if (selected) {
      updateMutation.mutate({ id: selected.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addSubmotivo = () => {
    if (!submotivoInput.trim()) return;
    setFormData({
      ...formData,
      submotivos: [...formData.submotivos, submotivoInput.trim()]
    });
    setSubmotivoInput('');
  };

  const removeSubmotivo = (index) => {
    setFormData({
      ...formData,
      submotivos: formData.submotivos.filter((_, i) => i !== index)
    });
  };

  const columns = [
    {
      header: 'Motivo',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0" 
            style={{ backgroundColor: row.cor || '#3B82F6' }}
          />
          <span className="font-medium">{row.motivo}</span>
        </div>
      )
    },
    {
      header: 'Submotivos',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.submotivos?.length > 0 ? (
            row.submotivos.map((sub, i) => (
              <Badge key={i} variant="outline" className="text-xs">{sub}</Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">Nenhum</span>
          )}
        </div>
      )
    },
    {
      header: 'Esforço TI',
      render: (row) => row.esforco_correcao_ti ? (
        <Badge variant="outline" className="text-xs">{row.esforco_correcao_ti}</Badge>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge className={row.ativo !== false ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground'}>
          {row.ativo !== false ? 'Ativo' : 'Inativo'}
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
        title="Configurar Motivos & Jornada"
        subtitle="Gerenciar motivos, submotivos e etapas da jornada"
        icon={Settings}
        backTo="Configuracoes"
        actions={
          <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Novo Motivo
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={motivos}
        isLoading={isLoading}
        emptyIcon={Tag}
        emptyTitle="Nenhum motivo cadastrado"
        emptyAction={openCreate}
        emptyActionLabel="Criar Primeiro Motivo"
      />

      {/* Etapas da Jornada */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Etapas da Jornada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {etapas.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhuma etapa cadastrada</p>
            ) : (
              etapas.map(etapa => (
                <div key={etapa.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: etapa.cor || '#3B82F6' }}
                    />
                    <span className="font-medium">{etapa.nome}</span>
                  </div>
                  <Badge variant="outline">Ordem: {etapa.ordem || 0}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? 'Editar Motivo' : 'Novo Motivo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Motivo *</Label>
              <Input
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                placeholder="Ex: Problema com cobrança"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do motivo..."
                rows={2}
              />
            </div>
            <div>
              <Label>Submotivos</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={submotivoInput}
                  onChange={(e) => setSubmotivoInput(e.target.value)}
                  placeholder="Digite um submotivo..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubmotivo())}
                />
                <Button type="button" onClick={addSubmotivo} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.submotivos.map((sub, i) => (
                  <Badge key={i} className="bg-info-soft text-primary">
                    {sub}
                    <button
                      type="button"
                      onClick={() => removeSubmotivo(i)}
                      className="ml-2 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
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
            <div>
              <Label>Esforço de Correção (TI/Produto)</Label>
              <Select
                value={formData.esforco_correcao_ti}
                onValueChange={(value) => setFormData({ ...formData, esforco_correcao_ti: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o esforço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixo">Baixo</SelectItem>
                  <SelectItem value="Medio">Médio</SelectItem>
                  <SelectItem value="Alto">Alto</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Usado na Matriz de Esforço x Impacto (Jornada do Cliente)</p>
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
        title="Excluir Motivo"
        description="Tem certeza? Esta ação não pode ser desfeita."
        onConfirm={() => selected && deleteMutation.mutate(selected.id)}
        variant="danger"
      />
    </div>
  );
}