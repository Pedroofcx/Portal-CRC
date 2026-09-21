import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { formatDateSP } from '@/components/utils/helpers';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import POPForm from '@/components/pop/POPForm';
import POPViewer from '@/components/pop/POPViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';


import { FileText, Plus, Eye, Trash2, Search } from 'lucide-react';
import PainelLateral from '@/components/ui/PainelLateral';

export default function POP() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPOP, setSelectedPOP] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: pops = [], isLoading } = useQuery({
    queryKey: ['pops'],
    queryFn: () => db.entities.POP.filter({ ativo: true }, '-created_date'),
  });

  const colaborador = colaboradores.find((c) => c.email === user?.email);
  const isGestor = colaborador?.papel === 'gestor';

  const popsFiltrados = pops.filter(
    (pop) =>
      pop.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pop.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pop.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: (data) =>
      db.entities.POP.create({
        ...data,
        ativo: true,
        versao: '1.0',
        data_criacao: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['pops']);
      toast.success('POP criado com sucesso');
      setDialogOpen(false);
    },
    onError: () => toast.error('Erro ao criar POP'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.POP.update(id, { ativo: false }),
    onSuccess: () => {
      queryClient.invalidateQueries(['pops']);
      toast.success('POP excluído');
      setDeleteDialogOpen(false);
    },
    onError: () => toast.error('Erro ao excluir'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="POP — Procedimentos Operacionais"
        subtitle="Central de documentação operacional padronizada do CSC"
        icon={FileText}
        actions={
          isGestor && (
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-muted superficie-escura hover:bg-muted gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo POP
            </Button>
          )
        }
      />

      {/* Busca */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, título ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Listagem */}
      {isLoading ? (
        <LoadingSpinner text="Carregando procedimentos..." />
      ) : popsFiltrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum POP encontrado</p>
          {isGestor && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setDialogOpen(true)}
            >
              Criar primeiro POP
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {popsFiltrados.map((pop) => (
            <Card
              key={pop.id}
              className="border-0 shadow-sm hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => { setSelectedPOP(pop); setViewDialogOpen(true); }}
            >
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs">{pop.codigo}</Badge>
                      {pop.categoria && (
                        <Badge variant="secondary" className="text-xs">{pop.categoria}</Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{pop.titulo}</p>
                    {pop.objetivo && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xl">{pop.objetivo}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {formatDateSP(pop.data_criacao, 'DD/MM/YYYY')}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); setSelectedPOP(pop); setViewDialogOpen(true); }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {isGestor && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setSelectedPOP(pop); setDeleteDialogOpen(true); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog — Criação */}
      <PainelLateral
        open={dialogOpen} onOpenChange={setDialogOpen}
        largura="2xl"
        titulo="Novo Procedimento Operacional Padrão"
      >
          <div className="mt-2">
            <POPForm
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setDialogOpen(false)}
              isLoading={createMutation.isPending}
            />
          </div>
        </PainelLateral>

      {/* Dialog — Visualização */}
      <PainelLateral
        open={viewDialogOpen} onOpenChange={setViewDialogOpen}
        largura="2xl"
        titulo="Visualizar POP"
      >
          <POPViewer pop={selectedPOP} />
        </PainelLateral>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir POP"
        description={`Tem certeza que deseja excluir o POP "${selectedPOP?.codigo} — ${selectedPOP?.titulo}"?`}
        confirmLabel="Excluir"
        onConfirm={() => selectedPOP && deleteMutation.mutate(selectedPOP.id)}
        variant="danger"
      />
    </div>
  );
}