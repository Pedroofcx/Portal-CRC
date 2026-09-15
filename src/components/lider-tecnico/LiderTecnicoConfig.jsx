import db from '@/api/db';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, UserCog, Save, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { STATUS_LABELS } from './rodizioUtils';

const STATUS_OPTIONS = [
  { value: 'permitido', label: 'Permitido' },
  { value: 'ferias', label: 'Férias' },
  { value: 'bloqueado', label: 'Bloqueado' },
];

export default function LiderTecnicoConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: '', ordem: 1, status: 'permitido' });
  const [excluirTarget, setExcluirTarget] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: lideres = [], isLoading } = useQuery({ queryKey: ['lideres-tecnicos'], queryFn: () => db.entities.LiderTecnico.list() });
  const { data: acionamentosHist = [] } = useQuery({ queryKey: ['acionamentos-lider-config'], queryFn: () => db.entities.AcionamentoLiderTecnico.list() });

  const lideresOrdenados = useMemo(() => lideres.filter(l => l.ativo !== false).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)), [lideres]);
  const lideresRemovidos = useMemo(() => lideres.filter(l => l.ativo === false), [lideres]);

  const logAuditoria = async (acao, entidadeId, dadosAnteriores, dadosNovos) => {
    try {
      await db.entities.LogAuditoria.create({
        acao,
        modulo: 'Líder Técnico Config',
        entidade: 'LiderTecnico',
        entidade_id: entidadeId,
        usuario_id: user?.id || '',
        usuario_nome: user?.full_name || '—',
        dados_anteriores: dadosAnteriores ? JSON.stringify(dadosAnteriores) : '',
        dados_novos: dadosNovos ? JSON.stringify(dadosNovos) : '',
        data_hora: new Date().toISOString(),
      });
    } catch {}
  };

  const salvarMutation = useMutation({
    mutationFn: async ({ editId, form }) => {
      const dados = {
        colaborador_nome: form.nome.trim(),
        ordem: parseInt(form.ordem) || 1,
        status: form.status,
        ativo: true,
      };
      if (editId) {
        const anterior = lideres.find(l => l.id === editId);
        await db.entities.LiderTecnico.update(editId, dados);
        await logAuditoria('editar', editId, anterior, dados);
      } else {
        const criado = await db.entities.LiderTecnico.create(dados);
        await logAuditoria('criar', criado.id, null, dados);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lideres-tecnicos'] });
      setDialogOpen(false);
      setEditId(null);
      setForm({ nome: '', ordem: 1, status: 'permitido' });
      toast({ title: editId ? 'Líder Técnico atualizado' : 'Líder Técnico cadastrado' });
    },
    onError: () => toast({ title: 'Erro ao salvar', variant: 'destructive' }),
  });

  const removerMutation = useMutation({
    mutationFn: async (lider) => {
      await db.entities.LiderTecnico.update(lider.id, { ativo: false });
      await logAuditoria('excluir', lider.id, lider, { ativo: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lideres-tecnicos'] });
      toast({ title: 'Líder Técnico removido do rodízio', description: 'O histórico de tratativas vinculadas é preservado.' });
    },
  });

  const excluirMutation = useMutation({
    mutationFn: async (lider) => {
      const temHistorico = acionamentosHist.some(a => a.lider_tecnico_id === lider.id);
      if (temHistorico) {
        await db.entities.LiderTecnico.update(lider.id, { ativo: false });
        await logAuditoria('excluir', lider.id, lider, { ativo: false, motivo: 'inativacao_com_historico' });
      } else {
        await db.entities.LiderTecnico.delete(lider.id);
        await logAuditoria('excluir', lider.id, lider, null);
      }
    },
    onSuccess: (_, lider) => {
      queryClient.invalidateQueries({ queryKey: ['lideres-tecnicos'] });
      const temHist = acionamentosHist.some(a => a.lider_tecnico_id === lider.id);
      setExcluirTarget(null);
      toast({ title: temHist ? 'Líder Técnico inativado' : 'Líder Técnico excluído', description: temHist ? 'O histórico de acionamentos foi preservado.' : 'O cadastro foi removido permanentemente.' });
    },
    onError: () => toast({ title: 'Erro ao excluir', variant: 'destructive' }),
  });

  const reordenarMutation = useMutation({
    mutationFn: async ({ lider, direcao }) => {
      const idx = lideresOrdenados.findIndex(l => l.id === lider.id);
      const trocaIdx = direcao === 'up' ? idx - 1 : idx + 1;
      if (trocaIdx < 0 || trocaIdx >= lideresOrdenados.length) return;
      const troca = lideresOrdenados[trocaIdx];
      await Promise.all([
        db.entities.LiderTecnico.update(lider.id, { ordem: troca.ordem }),
        db.entities.LiderTecnico.update(troca.id, { ordem: lider.ordem }),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lideres-tecnicos'] }),
  });

  const handleEditar = (lider) => {
    setEditId(lider.id);
    setForm({ nome: lider.colaborador_nome, ordem: lider.ordem, status: lider.status });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditId(null);
    const proximaOrdem = lideresOrdenados.length > 0 ? Math.max(...lideresOrdenados.map(l => l.ordem)) + 1 : 1;
    setForm({ nome: '', ordem: proximaOrdem, status: 'permitido' });
    setDialogOpen(true);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCog className="w-5 h-5 text-primary" />
                Líderes Técnicos — Rodízio
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Gerencie os participantes do rodízio, suas posições e status.</p>
            </div>
            <Button className="bg-primary hover:bg-violet-700" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar Líder
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {lideresOrdenados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCog className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum Líder Técnico cadastrado.</p>
              <p className="text-xs mt-1">Clique em "Adicionar Líder" para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                    <th className="text-left py-2 px-3">Ordem</th>
                    <th className="text-left py-2 px-3">Líder Técnico</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-right py-2 px-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lideresOrdenados.map((lider, idx) => (
                    <tr key={lider.id} className="border-b border-border hover:bg-muted">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <span className="w-7 h-7 rounded-full bg-info-soft text-primary flex items-center justify-center text-xs font-bold">{lider.ordem}</span>
                          <div className="flex flex-col">
                            <button onClick={() => reordenarMutation.mutate({ lider, direcao: 'up' })} disabled={idx === 0} className="text-muted-foreground hover:text-primary disabled:opacity-30">
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button onClick={() => reordenarMutation.mutate({ lider, direcao: 'down' })} disabled={idx === lideresOrdenados.length - 1} className="text-muted-foreground hover:text-primary disabled:opacity-30">
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-foreground">{lider.colaborador_nome}</td>
                      <td className="py-3 px-3">
                        <Badge className={STATUS_LABELS[lider.status]?.color || 'bg-muted text-foreground'}>
                          {STATUS_LABELS[lider.status]?.label || lider.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditar(lider)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setExcluirTarget(lider)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {lideresRemovidos.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Removidos do rodízio (histórico preservado):</p>
              <div className="flex flex-wrap gap-2">
                {lideresRemovidos.map(l => (
                  <Badge key={l.id} variant="outline" className="text-muted-foreground">{l.colaborador_nome}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Add/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Líder Técnico' : 'Adicionar Líder Técnico'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do Líder Técnico</Label>
              <Input placeholder="Digite o nome..." value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} disabled={!!editId} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Ordem no rodízio</Label>
                <Input type="number" min="1" value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-3 bg-info-soft rounded-lg border border-blue-100 text-xs text-primary space-y-1">
              <p><strong>Permitido:</strong> disponível para acionamentos pelo rodízio.</p>
              <p><strong>Férias:</strong> pulado temporariamente, sem perder a posição.</p>
              <p><strong>Bloqueado:</strong> não disponibilizado no rodízio, sem perder a posição.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-primary hover:bg-violet-700" disabled={!form.nome.trim() || salvarMutation.isPending} onClick={() => salvarMutation.mutate({ editId, form })}>
              <Save className="w-4 h-4 mr-1" /> {salvarMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Excluir */}
      <Dialog open={!!excluirTarget} onOpenChange={(v) => !v && setExcluirTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Excluir Líder Técnico
            </DialogTitle>
          </DialogHeader>
          {excluirTarget && (() => {
            const temHistorico = acionamentosHist.some(a => a.lider_tecnico_id === excluirTarget.id);
            return (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Você está prestes a excluir <strong>{excluirTarget.colaborador_nome}</strong> (Posição #{excluirTarget.ordem}).
                </p>
                {temHistorico ? (
                  <div className="p-3 bg-warning-soft border border-warning/25 rounded-lg text-sm text-warning">
                    <p className="font-semibold mb-1">Este líder possui acionamentos vinculados.</p>
                    <p>O cadastro será inativado (removido do rodízio), mas o histórico de acionamentos será preservado para auditoria.</p>
                  </div>
                ) : (
                  <div className="p-3 bg-destructive/10 border border-destructive/25 rounded-lg text-sm text-destructive">
                    <p className="font-semibold mb-1">Exclusão permanente</p>
                    <p>Este líder não possui acionamentos vinculados. O cadastro será removido permanentemente do sistema.</p>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setExcluirTarget(null)}>Cancelar</Button>
                  <Button variant="destructive" disabled={excluirMutation.isPending} onClick={() => excluirMutation.mutate(excluirTarget)}>
                    {excluirMutation.isPending ? 'Excluindo...' : temHistorico ? 'Inativar' : 'Excluir Permanentemente'}
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}