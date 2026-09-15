import db from '@/api/db';
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2, RefreshCw, CheckSquare, X, AlertTriangle, Zap } from 'lucide-react';
import { statusLabels } from '@/components/utils/helpers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AdminBulkActions({ selectedIds, tratativas, onClearSelection, currentUser }) {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const queryClient = useQueryClient();

  const count = selectedIds.size;

  const bulkStatusMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const promises = Array.from(selectedIds).map(id => {
        const tratativa = tratativas.find(t => t.id === id);
        const historicoAtual = tratativa?.historico_estados || [];
        return db.entities.Tratativa.update(id, {
          status: newStatus,
          ...(newStatus === 'encerrada' && !tratativa?.data_encerramento ? { data_encerramento: now } : {}),
          historico_estados: [
            ...historicoAtual,
            {
              estado_anterior: tratativa?.status,
              estado_novo: newStatus,
              data_mudanca: now,
              usuario: currentUser?.full_name || 'Admin',
              observacao: 'Atualização manual pelo administrador'
            }
          ]
        });
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tratativas']);
      toast.success(`${count} tratativa(s) atualizada(s) com sucesso`);
      setStatusDialogOpen(false);
      setNewStatus('');
      onClearSelection();
    },
    onError: () => toast.error('Erro ao atualizar tratativas'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const promises = Array.from(selectedIds).map(id =>
        db.entities.Tratativa.update(id, {
          status: 'excluida',
          excluida: true,
          justificativa_exclusao: 'Exclusão em massa pelo administrador',
          data_exclusao: now,
          excluida_por_nome: currentUser?.full_name || 'Admin',
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tratativas']);
      toast.success(`${count} tratativa(s) excluída(s)`);
      setDeleteDialogOpen(false);
      onClearSelection();
    },
    onError: () => toast.error('Erro ao excluir tratativas'),
  });

  // Quick action: fechar todas aguardando_confirmacao selecionadas
  const quickCloseMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const selecionadas = tratativas.filter(t => selectedIds.has(t.id) && t.status === 'aguardando_confirmacao_reabertura');
      if (selecionadas.length === 0) {
        throw new Error('Nenhuma das selecionadas está em "Aguardando Confirmação"');
      }
      const promises = selecionadas.map(t =>
        db.entities.Tratativa.update(t.id, {
          status: 'encerrada',
          data_encerramento: t.data_encerramento || now,
          status_reabertura: 'nao_houve',
          historico_estados: [
            ...(t.historico_estados || []),
            {
              estado_anterior: t.status,
              estado_novo: 'encerrada',
              data_mudanca: now,
              usuario: currentUser?.full_name || 'Admin',
              observacao: 'Encerramento administrativo — prazo de reabertura expirado'
            }
          ]
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tratativas']);
      toast.success('Tratativas encerradas com status "Sem Reabertura"');
      onClearSelection();
    },
    onError: (err) => toast.error(err.message || 'Erro ao encerrar tratativas'),
  });

  if (count === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4 border border-slate-700">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-blue-400" />
          <span className="font-semibold">{count} selecionada{count > 1 ? 's' : ''}</span>
        </div>

        <div className="w-px h-6 bg-slate-600" />

        <Button
          size="sm"
          variant="outline"
          className="bg-transparent border-slate-600 text-white hover:bg-slate-800"
          onClick={() => setStatusDialogOpen(true)}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Alterar Status
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="bg-transparent border-amber-500 text-amber-400 hover:bg-amber-900/20"
          onClick={() => quickCloseMutation.mutate()}
          disabled={quickCloseMutation.isPending}
        >
          <Zap className="w-4 h-4 mr-2" />
          Encerrar Aguardando
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="bg-transparent border-red-500 text-red-400 hover:bg-red-900/20"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Excluir
        </Button>

        <div className="w-px h-6 bg-slate-600" />

        <Button
          size="sm"
          variant="ghost"
          className="text-slate-400 hover:text-white hover:bg-slate-800"
          onClick={onClearSelection}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Dialog: Alterar Status */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Status em Massa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Alterar o status de <strong>{count}</strong> tratativa(s) selecionada(s) para:
            </p>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o novo status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {newStatus === 'encerrada' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Tratativas encerradas via admin <strong>não</strong> calculam pontuação automaticamente. Use esta ação apenas para correções administrativas.
                </p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!newStatus || bulkStatusMutation.isPending}
                onClick={() => bulkStatusMutation.mutate()}
              >
                {bulkStatusMutation.isPending ? 'Atualizando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Excluir */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Tem certeza que deseja excluir <strong>{count}</strong> tratativa(s)? Esta ação marca as tratativas como excluídas e elas não serão contabilizadas nos indicadores.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
              <Button
                variant="destructive"
                disabled={bulkDeleteMutation.isPending}
                onClick={() => bulkDeleteMutation.mutate()}
              >
                {bulkDeleteMutation.isPending ? 'Excluindo...' : `Excluir ${count} tratativa(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}