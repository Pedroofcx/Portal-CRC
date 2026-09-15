import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { formatDateSP, papelLabels, formatBRL } from '@/components/utils/helpers';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Star,
  UserCheck,
  UserX,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Upload,
  FileText
} from 'lucide-react';
import ExternalImage, { validateImageUrl } from '@/components/ui/ExternalImage';

export default function Cadastro() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedColaborador, setSelectedColaborador] = useState(null);
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    cargo_atual: '',
    salario: '',
    data_admissao: '',
    foto_url: '',
    papel: 'agente',
    equipe_id: '',
    equipe_nome: '',
    is_facilitador_interno: false,
    fi_expiracao: '',
    ativo: true
  });
  const [imageUrlValidation, setImageUrlValidation] = useState(null);
  const [promocaoDialog, setPromocaoDialog] = useState(false);
  const [promocaoForm, setPromocaoForm] = useState({
    cargo_novo: '',
    salario_novo: '',
    data_promocao: '',
    observacoes: ''
  });

  const queryClient = useQueryClient();

  const { data: colaboradores = [], isLoading } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => db.entities.Colaborador.list('-created_date'),
  });

  const { data: equipes = [] } = useQuery({
    queryKey: ['equipes'],
    queryFn: () => db.entities.Equipe.filter({ ativa: true }),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const colaboradorLogado = colaboradores.find(c => c.email === user?.email);
  const isGestor = colaboradorLogado?.papel === 'gestor';

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Colaborador.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['colaboradores']);
      toast.success('Colaborador criado com sucesso');
      closeDialog();
    },
    onError: () => toast.error('Erro ao criar colaborador'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Colaborador.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['colaboradores']);
      toast.success('Colaborador atualizado com sucesso');
      closeDialog();
    },
    onError: () => toast.error('Erro ao atualizar colaborador'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Colaborador.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['colaboradores']);
      toast.success('Colaborador excluído com sucesso');
      setDeleteDialogOpen(false);
      setSelectedColaborador(null);
    },
    onError: () => toast.error('Erro ao excluir colaborador'),
  });

  const openCreateDialog = () => {
    setSelectedColaborador(null);
    setFormData({
      nome_completo: '',
      email: '',
      cargo_atual: '',
      salario: '',
      data_admissao: '',
      foto_url: '',
      papel: 'agente',
      equipe_id: '',
      equipe_nome: '',
      is_facilitador_interno: false,
      fi_expiracao: '',
      ativo: true
    });
    setDialogOpen(true);
  };

  const openEditDialog = (colaborador) => {
    setSelectedColaborador(colaborador);
    setFormData({
      nome_completo: colaborador.nome_completo || '',
      email: colaborador.email || '',
      cargo_atual: colaborador.cargo_atual || '',
      salario: colaborador.salario || '',
      data_admissao: colaborador.data_admissao || '',
      foto_url: colaborador.foto_url || '',
      papel: colaborador.papel || 'agente',
      equipe_id: colaborador.equipe_id || '',
      equipe_nome: colaborador.equipe_nome || '',
      is_facilitador_interno: colaborador.is_facilitador_interno || false,
      fi_expiracao: colaborador.fi_expiracao || '',
      ativo: colaborador.ativo !== false
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedColaborador(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nome_completo || !formData.email || !formData.cargo_atual || !formData.papel) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (selectedColaborador) {
      updateMutation.mutate({ id: selectedColaborador.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = () => {
    if (selectedColaborador) {
      deleteMutation.mutate(selectedColaborador.id);
    }
  };

  const handlePromocao = () => {
    if (!selectedColaborador || !promocaoForm.cargo_novo) {
      toast.error('Preencha o cargo novo');
      return;
    }

    const promocoes = selectedColaborador.promocoes || [];
    const historicoCargos = selectedColaborador.historico_cargos || [];

    const novaPromocao = {
      cargo_anterior: selectedColaborador.cargo_atual,
      cargo_novo: promocaoForm.cargo_novo,
      salario_anterior: selectedColaborador.salario,
      salario_novo: parseFloat(promocaoForm.salario_novo) || null,
      data_promocao: promocaoForm.data_promocao || new Date().toISOString().split('T')[0],
      observacoes: promocaoForm.observacoes
    };

    // Adicionar ao histórico de cargos
    // If the last entry in historico_cargos is the current cargo, update its data_fim
    // Otherwise, add a new entry for the *previous* cargo before the promotion
    const updatedHistoricoCargos = [...historicoCargos];
    const lastHistoryEntry = updatedHistoricoCargos[updatedHistoricoCargos.length - 1];

    // Update the end date of the *previous* cargo entry if it exists and matches the current cargo
    if (lastHistoryEntry && lastHistoryEntry.cargo === selectedColaborador.cargo_atual && !lastHistoryEntry.data_fim) {
      lastHistoryEntry.data_fim = promocaoForm.data_promocao || new Date().toISOString().split('T')[0];
    } else {
      // Add the previous cargo to history with an end date
      updatedHistoricoCargos.push({
        cargo: selectedColaborador.cargo_atual,
        data_inicio: selectedColaborador.data_admissao || new Date().toISOString().split('T')[0],
        data_fim: promocaoForm.data_promocao || new Date().toISOString().split('T')[0]
      });
    }

    const updateData = {
      cargo_atual: promocaoForm.cargo_novo,
      promocoes: [...promocoes, novaPromocao],
      historico_cargos: updatedHistoricoCargos,
      // Add new entry for the current (new) cargo to historico_cargos without an end date yet
      // This is implicit as cargo_atual is updated, and the logic above handles the 'previous' cargo.
      // For the NEW cargo, a new entry should be added with data_inicio as data_promocao.
      // This part needs a slight adjustment if `historico_cargos` should include the *current* cargo without an end date.
      // For simplicity and to match the outline's implied logic, we'll keep `historico_cargos` for *past* roles.
      // The current role is handled by `cargo_atual`.
    };

    if (promocaoForm.salario_novo) {
      updateData.salario = parseFloat(promocaoForm.salario_novo);
    }

    updateMutation.mutate({
      id: selectedColaborador.id,
      data: updateData
    });
    setPromocaoDialog(false);
    setPromocaoForm({ cargo_novo: '', salario_novo: '', data_promocao: '', observacoes: '' });
  };

  const columns = [
    {
      header: 'Colaborador',
      render: (row) => (
        <div className="flex items-center gap-3">
          <ExternalImage
            src={row.foto_url}
            alt={row.nome_completo}
            size="sm"
            rounded={true}
          />
          <div>
            <p className="font-medium text-foreground">{row.nome_completo}</p>
            <p className="text-sm text-muted-foreground">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Cargo',
      accessor: 'cargo_atual'
    },
    {
      header: 'Papel',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {papelLabels[row.papel] || row.papel}
          </Badge>
          {row.is_facilitador_interno && (
            <Badge className="bg-info-soft text-primary border-info/25">
              <Star className="w-3 h-3 mr-1" /> FI
            </Badge>
          )}
        </div>
      )
    },
    {
      header: 'Admissão',
      render: (row) => formatDateSP(row.data_admissao, 'DD/MM/YYYY')
    },
    {
      header: 'Status',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.ativo !== false ? (
            <Badge className="bg-success-soft text-success border-success/25">
              <UserCheck className="w-3 h-3 mr-1" /> Ativo
            </Badge>
          ) : (
            <Badge className="bg-muted text-muted-foreground border-border">
              <UserX className="w-3 h-3 mr-1" /> Inativo
            </Badge>
          )}
        </div>
      )
    },
    {
      header: 'Ações',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); openEditDialog(row); }}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedColaborador(row);
              setDeleteDialogOpen(true);
            }}
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
        title="Cadastro de Colaboradores"
        subtitle={`${colaboradores.length} colaboradores registrados`}
        icon={Users}
        actions={
          <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Novo Colaborador
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={colaboradores}
        isLoading={isLoading}
        emptyIcon={Users}
        emptyTitle="Nenhum colaborador cadastrado"
        emptyDescription="Adicione o primeiro colaborador clicando no botão acima."
        emptyAction={openCreateDialog}
        emptyActionLabel="Adicionar Colaborador"
      />

      {/* Dialog de Criação/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedColaborador ? 'Editar Colaborador' : 'Novo Colaborador'}
            </DialogTitle>
          </DialogHeader>

          {selectedColaborador ? (
            <Tabs defaultValue="dados" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="promocoes">Promoções</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="mt-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Nome Completo *</Label>
                      <Input
                        value={formData.nome_completo}
                        onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>E-mail (Login) *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@empresa.com"
                      />
                    </div>
                    <div>
                      <Label>Cargo Atual *</Label>
                      <Input
                        value={formData.cargo_atual}
                        onChange={(e) => setFormData({ ...formData, cargo_atual: e.target.value })}
                        placeholder="Cargo"
                      />
                    </div>
                    <div>
                      <Label>Data de Admissão</Label>
                      <Input
                        type="date"
                        value={formData.data_admissao}
                        onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
                      />
                    </div>
                    {isGestor && (
                      <div className="col-span-2">
                        <Label>Salário (R$) - Visível apenas para Gestores</Label>
                        <CurrencyInput
                          value={formData.salario || 0}
                          onChange={(num) => setFormData({ ...formData, salario: num })}
                        />
                      </div>
                    )}
                    <div className="col-span-2">
                      <Label>Foto do Colaborador</Label>
                      <div className="space-y-3">
                        {/* Upload Interno */}
                        <div className="p-4 border border-dashed border-border rounded-lg bg-muted">
                          <input
                            type="file"
                            accept="image/*"
                            id="foto-upload-input"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              if (!file.type.startsWith('image/')) {
                                toast.error('Por favor, selecione uma imagem válida');
                                return;
                              }

                              if (file.size > 5 * 1024 * 1024) {
                                toast.error('Imagem muito grande. Máximo: 5MB');
                                return;
                              }

                              try {
                                toast.info('Enviando foto...');
                                const result = await db.integrations.Core.UploadFile({ file });
                                setFormData({ ...formData, foto_url: result.file_url });
                                setImageUrlValidation({ valid: true, message: 'Upload realizado com sucesso' });
                                toast.success('Foto enviada!');
                              } catch (_error) {
                                toast.error('Erro ao fazer upload');
                              }
                            }}
                          />
                          <label htmlFor="foto-upload-input" className="cursor-pointer">
                            <div className="text-center">
                              <div className="w-12 h-12 mx-auto bg-info-soft rounded-full flex items-center justify-center mb-2">
                                <Upload className="w-6 h-6 text-primary" />
                              </div>
                              <p className="text-sm font-medium text-foreground">Clique para fazer upload</p>
                              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF (máx. 5MB)</p>
                            </div>
                          </label>
                        </div>

                        {/* OU Inserir URL */}
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border"></div>
                          </div>
                          <div className="relative flex justify-center text-xs">
                            <span className="bg-card px-2 text-muted-foreground">ou insira uma URL</span>
                          </div>
                        </div>

                        <Input
                          value={formData.foto_url}
                          onChange={(e) => {
                            const url = e.target.value;
                            setFormData({ ...formData, foto_url: url });
                            if (url) {
                              const validation = validateImageUrl(url);
                              setImageUrlValidation(validation);
                            } else {
                              setImageUrlValidation(null);
                            }
                          }}
                          placeholder="https://... ou Google Drive link"
                        />
                        {imageUrlValidation && (
                          <div className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                            imageUrlValidation.valid
                              ? 'bg-success-soft text-success'
                              : 'bg-warning-soft text-warning'
                          }`}>
                            {imageUrlValidation.valid ? (
                              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            )}
                            <p>{imageUrlValidation.message || (imageUrlValidation.valid ? 'URL válida' : 'URL inválida')}</p>
                          </div>
                        )}
                        {formData.foto_url && (
                          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-border">
                            <Label className="text-xs text-muted-foreground">Preview:</Label>
                            <ExternalImage
                              src={formData.foto_url}
                              alt="Preview"
                              size="lg"
                              rounded={true}
                            />
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Google Drive: Compartilhe como "Qualquer pessoa com o link"
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label>Papel *</Label>
                      <Select
                        value={formData.papel}
                        onValueChange={(value) => setFormData({ ...formData, papel: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agente">Agente</SelectItem>
                          <SelectItem value="gestor">Gestor</SelectItem>
                          <SelectItem value="fi">Facilitador Interno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Equipe</Label>
                      <Select
                        value={formData.equipe_id}
                        onValueChange={(value) => {
                          const equipe = equipes.find(e => e.id === value);
                          setFormData({
                            ...formData,
                            equipe_id: value,
                            equipe_nome: equipe?.nome || ''
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma equipe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Sem equipe</SelectItem>
                          {equipes.map(equipe => (
                            <SelectItem key={equipe.id} value={equipe.id}>
                              {equipe.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-4 pt-6">
                      <Switch
                        checked={formData.ativo}
                        onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                      />
                      <Label>Ativo</Label>
                    </div>
                    <div className="col-span-2 p-4 bg-info-soft rounded-lg border border-info/25">
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={formData.is_facilitador_interno}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_facilitador_interno: checked })}
                        />
                        <div className="flex-1">
                          <Label className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-primary" />
                            Facilitador Interno (FI)
                          </Label>
                          <p className="text-xs text-primary mt-1">Papel temporário com acesso especial</p>
                        </div>
                      </div>
                      {formData.is_facilitador_interno && (
                        <div className="mt-3">
                          <Label>Data de Expiração do FI</Label>
                          <Input
                            type="date"
                            value={formData.fi_expiracao}
                            onChange={(e) => setFormData({ ...formData, fi_expiracao: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={closeDialog}>
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="bg-primary hover:bg-primary/90"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="promocoes" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">Histórico de Promoções</h3>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setPromocaoDialog(true)}
                      className="bg-primary hover:bg-primary"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Nova Promoção
                    </Button>
                  </div>

                  {selectedColaborador?.promocoes && selectedColaborador.promocoes.length > 0 ? (
                    <div className="space-y-3">
                      {selectedColaborador.promocoes.map((prom, idx) => (
                        <div key={idx} className="p-4 bg-muted rounded-lg border border-border">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-foreground">
                                {prom.cargo_anterior} → {prom.cargo_novo}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDateSP(prom.data_promocao, 'DD/MM/YYYY')}
                              </p>
                            </div>
                            <Badge className="bg-success-soft text-success border-success/25">
                              Promoção #{selectedColaborador.promocoes.length - idx}
                            </Badge>
                          </div>
                          {(prom.salario_anterior || prom.salario_novo) && isGestor && (
                            <div className="mt-2 p-2 bg-card rounded border border-border">
                              <p className="text-sm text-muted-foreground">
                                <strong>Salário:</strong> {prom.salario_anterior ? formatBRL(prom.salario_anterior) : '---'} → {prom.salario_novo ? formatBRL(prom.salario_novo) : '---'}
                              </p>
                            </div>
                          )}
                          {prom.observacoes && (
                            <div className="mt-2 p-2 bg-info-soft rounded border border-info/25">
                              <p className="text-sm text-foreground">
                                <strong>Observações:</strong> {prom.observacoes}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm">Nenhuma promoção registrada</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => setPromocaoDialog(true)}
                      >
                        Registrar Primeira Promoção
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="historico" className="mt-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-foreground">Histórico de Cargos</h3>

                  {selectedColaborador?.historico_cargos && selectedColaborador.historico_cargos.length > 0 ? (
                    <div className="space-y-2">
                      {/* Cargo Atual */}
                      <div className="p-3 bg-info-soft rounded-lg border border-info/25">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{selectedColaborador.cargo_atual}</p>
                            <p className="text-xs text-muted-foreground mt-1">Cargo Atual</p>
                          </div>
                          <Badge className="bg-primary text-white">Atual</Badge>
                        </div>
                      </div>

                      {/* Cargos Anteriores */}
                      {[...selectedColaborador.historico_cargos].reverse().map((hist, idx) => (
                        <div key={idx} className="p-3 bg-muted rounded-lg border border-border">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-foreground">{hist.cargo}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDateSP(hist.data_inicio, 'DD/MM/YYYY')} - {formatDateSP(hist.data_fim, 'DD/MM/YYYY')}
                              </p>
                            </div>
                            <Badge variant="outline">Anterior</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm">Sem histórico de cargos anteriores</p>
                    </div>
                  )}

                  {/* Informações Adicionais */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <h3 className="text-sm font-medium text-foreground mb-3">Informações de Cadastro</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Data de Admissão:</span>
                        <span className="font-medium">{formatDateSP(selectedColaborador.data_admissao, 'DD/MM/YYYY')}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">E-mail:</span>
                        <span className="font-medium">{selectedColaborador.email}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Papel:</span>
                        <span className="font-medium capitalize">{papelLabels[selectedColaborador.papel]}</span>
                      </div>
                      {selectedColaborador.equipe_nome && (
                        <div className="flex justify-between py-2 border-b border-border">
                          <span className="text-muted-foreground">Equipe:</span>
                          <span className="font-medium">{selectedColaborador.equipe_nome}</span>
                        </div>
                      )}
                      {isGestor && selectedColaborador.salario && (
                        <div className="flex justify-between py-2 border-b border-border">
                          <span className="text-muted-foreground">Salário Atual:</span>
                          <span className="font-medium">{formatBRL(selectedColaborador.salario)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Status:</span>
                        <StatusBadge status={selectedColaborador.ativo !== false ? 'ativo' : 'inativo'} />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    value={formData.nome_completo}
                    onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="col-span-2">
                  <Label>E-mail (Login) *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@empresa.com"
                  />
                </div>
                <div>
                  <Label>Cargo Atual *</Label>
                  <Input
                    value={formData.cargo_atual}
                    onChange={(e) => setFormData({ ...formData, cargo_atual: e.target.value })}
                    placeholder="Cargo"
                  />
                </div>
                <div>
                  <Label>Data de Admissão</Label>
                  <Input
                    type="date"
                    value={formData.data_admissao}
                    onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
                  />
                </div>
                {isGestor && (
                  <div className="col-span-2">
                    <Label>Salário (R$) - Visível apenas para Gestores</Label>
                    <CurrencyInput
                      value={formData.salario || 0}
                      onChange={(num) => setFormData({ ...formData, salario: num })}
                    />
                  </div>
                )}
                <div className="col-span-2">
                  <Label>Foto do Colaborador</Label>
                  <div className="space-y-3">
                    <div className="p-4 border border-dashed border-border rounded-lg bg-muted">
                      <input
                        type="file"
                        accept="image/*"
                        id="foto-upload-input"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          if (!file.type.startsWith('image/')) {
                            toast.error('Por favor, selecione uma imagem válida');
                            return;
                          }

                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('Imagem muito grande. Máximo: 5MB');
                            return;
                          }

                          try {
                            toast.info('Enviando foto...');
                            const result = await db.integrations.Core.UploadFile({ file });
                            setFormData({ ...formData, foto_url: result.file_url });
                            setImageUrlValidation({ valid: true, message: 'Upload realizado com sucesso' });
                            toast.success('Foto enviada!');
                          } catch (_error) {
                            toast.error('Erro ao fazer upload');
                          }
                        }}
                      />
                      <label htmlFor="foto-upload-input" className="cursor-pointer">
                        <div className="text-center">
                          <div className="w-12 h-12 mx-auto bg-info-soft rounded-full flex items-center justify-center mb-2">
                            <Upload className="w-6 h-6 text-primary" />
                          </div>
                          <p className="text-sm font-medium text-foreground">Clique para fazer upload</p>
                          <p className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF (máx. 5MB)</p>
                        </div>
                      </label>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-card px-2 text-muted-foreground">ou insira uma URL</span>
                      </div>
                    </div>

                    <Input
                      value={formData.foto_url}
                      onChange={(e) => {
                        const url = e.target.value;
                        setFormData({ ...formData, foto_url: url });
                        if (url) {
                          const validation = validateImageUrl(url);
                          setImageUrlValidation(validation);
                        } else {
                          setImageUrlValidation(null);
                        }
                      }}
                      placeholder="https://... ou Google Drive link"
                    />
                    {imageUrlValidation && (
                      <div className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                        imageUrlValidation.valid
                          ? 'bg-success-soft text-success'
                          : 'bg-warning-soft text-warning'
                      }`}>
                        {imageUrlValidation.valid ? (
                          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        )}
                        <p>{imageUrlValidation.message || (imageUrlValidation.valid ? 'URL válida' : 'URL inválida')}</p>
                      </div>
                    )}
                    {formData.foto_url && (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-border">
                        <Label className="text-xs text-muted-foreground">Preview:</Label>
                        <ExternalImage
                          src={formData.foto_url}
                          alt="Preview"
                          size="lg"
                          rounded={true}
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Google Drive: Compartilhe como "Qualquer pessoa com o link"
                    </p>
                  </div>
                </div>
                <div>
                  <Label>Papel *</Label>
                  <Select
                    value={formData.papel}
                    onValueChange={(value) => setFormData({ ...formData, papel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agente">Agente</SelectItem>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="fi">Facilitador Interno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Equipe</Label>
                  <Select
                    value={formData.equipe_id}
                    onValueChange={(value) => {
                      const equipe = equipes.find(e => e.id === value);
                      setFormData({
                        ...formData,
                        equipe_id: value,
                        equipe_nome: equipe?.nome || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Sem equipe</SelectItem>
                      {equipes.map(equipe => (
                        <SelectItem key={equipe.id} value={equipe.id}>
                          {equipe.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <Switch
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                  <Label>Ativo</Label>
                </div>
                <div className="col-span-2 p-4 bg-info-soft rounded-lg border border-info/25">
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={formData.is_facilitador_interno}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_facilitador_interno: checked })}
                    />
                    <div className="flex-1">
                      <Label className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-primary" />
                        Facilitador Interno (FI)
                      </Label>
                      <p className="text-xs text-primary mt-1">Papel temporário com acesso especial</p>
                    </div>
                  </div>
                  {formData.is_facilitador_interno && (
                    <div className="mt-3">
                      <Label>Data de Expiração do FI</Label>
                      <Input
                        type="date"
                        value={formData.fi_expiracao}
                        onChange={(e) => setFormData({ ...formData, fi_expiracao: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Promoção */}
      <Dialog open={promocaoDialog} onOpenChange={setPromocaoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Registrar Promoção
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedColaborador && (
              <>
                <div className="p-3 bg-info-soft rounded-lg">
                  <p className="text-sm text-foreground">
                    <strong>Colaborador:</strong> {selectedColaborador.nome_completo}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Cargo Atual:</strong> {selectedColaborador.cargo_atual}
                  </p>
                </div>

                {/* Histórico de Promoções */}
                {selectedColaborador.promocoes && selectedColaborador.promocoes.length > 0 && (
                  <div className="border border-border rounded-lg p-3 max-h-64 overflow-y-auto">
                    <p className="text-sm font-medium text-foreground mb-2">Histórico de Promoções</p>
                    <div className="space-y-2">
                      {selectedColaborador.promocoes.map((prom, idx) => (
                        <div key={idx} className="p-2 bg-muted rounded text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">
                              {prom.cargo_anterior} → {prom.cargo_novo}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {formatDateSP(prom.data_promocao, 'DD/MM/YYYY')}
                            </Badge>
                          </div>
                          {(prom.salario_anterior || prom.salario_novo) && (
                            <p className="text-muted-foreground">
                              Salário: {prom.salario_anterior ? formatBRL(prom.salario_anterior) : '---'} → {prom.salario_novo ? formatBRL(prom.salario_novo) : '---'}
                            </p>
                          )}
                          {prom.observacoes && (
                            <p className="text-muted-foreground italic">{prom.observacoes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <div>
              <Label>Novo Cargo *</Label>
              <Input
                value={promocaoForm.cargo_novo}
                onChange={(e) => setPromocaoForm({ ...promocaoForm, cargo_novo: e.target.value })}
                placeholder="Ex: Supervisor, Coordenador"
              />
            </div>
            <div>
              <Label>Novo Salário (R$)</Label>
              <CurrencyInput
                value={promocaoForm.salario_novo ? parseFloat(promocaoForm.salario_novo) : 0}
                onChange={(num) => setPromocaoForm({ ...promocaoForm, salario_novo: String(num) })}
              />
            </div>
            <div>
              <Label>Data da Promoção</Label>
              <Input
                type="date"
                value={promocaoForm.data_promocao}
                onChange={(e) => setPromocaoForm({ ...promocaoForm, data_promocao: e.target.value })}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Input
                value={promocaoForm.observacoes}
                onChange={(e) => setPromocaoForm({ ...promocaoForm, observacoes: e.target.value })}
                placeholder="Motivo, contexto, etc."
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setPromocaoDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handlePromocao} className="bg-primary hover:bg-primary">
                Registrar Promoção
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Colaborador"
        description={`Tem certeza que deseja excluir ${selectedColaborador?.nome_completo}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}