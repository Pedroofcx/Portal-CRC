const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Headset, Save, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { STATUS_N2_LABELS } from './rodizioN2Utils';

const STATUS_OPTIONS = [
  { value: 'permitido', label: 'Permitido' },
  { value: 'ferias', label: 'Férias' },
  { value: 'bloqueado', label: 'Bloqueado' },
];

export default function AgenteN2Config() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ colaborador_id: '', colaborador_nome: '', ordem: 1, status: 'permitido' });
  const [excluirTarget, setExcluirTarget] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores'], queryFn: () => db.entities.Colaborador.list() });
  const { data: agentes = [], isLoading } = useQuery({ queryKey: ['agentes-n2'], queryFn: () => db.entities.AgenteN2.list() });
  const { data: acionamentosHist = [] } = useQuery({ queryKey: ['acionamentos-n2-config'], queryFn: () => db.entities.AcionamentoN2.list() });

  const agentesOrdenados = useMemo(() => agentes.filter(a => a.ativo !== false).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)), [agentes]);
  const agentesRemovidos = useMemo(() => agentes.filter(a => a.ativo === false), [agentes]);

  const logAuditoria = async (acao, entidadeId, dadosAnteriores, dadosNovos) => {
    try {
      await db.entities.LogAuditoria.create({
        acao,
        modulo: 'Agente N2 Config',
        entidade: 'AgenteN2',
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
        colaborador_id: form.colaborador_id || '',
        colaborador_nome: form.colaborador_nome.trim(),
        ordem: parseInt(form.ordem) || 1,
        status: form.status,
        ativo: true,
      };
      if (editId) {
        const anterior = agentes.find(a => a.id === editId);
        await db.entities.AgenteN2.update(editId, dados);
        await logAuditoria('editar', editId, anterior, dados);
      } else {
        const criado = await db.entities.AgenteN2.create(dados);
        await logAuditoria('criar', criado.id, null, dados);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentes-n2'] });
      setDialogOpen(false);
      setEditId(null);
      setForm({ colaborador_id: '', colaborador_nome: '', ordem: 1, status: 'permitido' });
      toast({ title: editId ? 'Agente N2 atualizado' : 'Agente N2 cadastrado' });
    },
    onError: () => toast({ title: 'Erro ao salvar', variant: 'destructive' }),
  });

  const removerMutation = useMutation({
    mutationFn: async (agente) => {
      await db.entities.AgenteN2.update(agente.id, { ativo: false });
      await logAuditoria('excluir', agente.id, agente, { ativo: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentes-n2'] });
      toast({ title: 'Agente N2 removido do rodízio', description: 'O histórico de acionamentos é preservado.' });
    },
  });

  const excluirMutation = useMutation({
    mutationFn: async (agente) => {
      const temHistorico = acionamentosHist.some(a => a.agente_n2_id === agente.id);
      if (temHistorico) {
        await db.entities.AgenteN2.update(agente.id, { ativo: false });
        await logAuditoria('excluir', agente.id, agente, { ativo: false, motivo: 'inativacao_com_historico' });
      } else {
        await db.entities.AgenteN2.delete(agente.id);
        await logAuditoria('excluir', agente.id, agente, null);
      }
    },
    onSuccess: (_, agente) => {
      queryClient.invalidateQueries({ queryKey: ['agentes-n2'] });
      const temHist = acionamentosHist.some(a => a.agente_n2_id === agente.id);
      setExcluirTarget(null);
      toast({ title: temHist ? 'Agente N2 inativado' : 'Agente N2 excluído', description: temHist ? 'O histórico de acionamentos foi preservado.' : 'O cadastro foi removido permanentemente.' });
    },
    onError: () => toast({ title: 'Erro ao excluir', variant: 'destructive' }),
  });

  const reordenarMutation = useMutation({
    mutationFn: async ({ agente, direcao }) => {
      const idx = agentesOrdenados.findIndex(a => a.id === agente.id);
      const trocaIdx = direcao === 'up' ? idx - 1 : idx + 1;
      if (trocaIdx < 0 || trocaIdx >= agentesOrdenados.length) return;
      const troca = agentesOrdenados[trocaIdx];
      await Promise.all([
        db.entities.AgenteN2.update(agente.id, { ordem: troca.ordem }),
        db.entities.AgenteN2.update(troca.id, { ordem: agente.ordem }),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agentes-n2'] }),
  });

  const handleEditar = (agente) => {
    setEditId(agente.id);
    setForm({ colaborador_id: agente.colaborador_id || '', colaborador_nome: agente.colaborador_nome, ordem: agente.ordem, status: agente.status });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditId(null);
    const proximaOrdem = agentesOrdenados.length > 0 ? Math.max(...agentesOrdenados.map(a => a.ordem)) + 1 : 1;
    setForm({ colaborador_id: '', colaborador_nome: '', ordem: proximaOrdem, status: 'permitido' });
    setDialogOpen(true);
  };

  const colabsDisponiveis = colaboradores.filter(c => c.ativo !== false && (!agentesOrdenados.some(a => a.colaborador_id === c.id) || editId));

  const handleSelectColaborador = (colabId) => {
    const colab = colaboradores.find(c => c.id === colabId);
    setForm(f => ({ ...f, colaborador_id: colabId, colaborador_nome: colab?.nome_completo || '' }));
  };

  if (isLoading) return <p className="text-sm text-slate-500">Carregando...</p>;

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Headset className="w-5 h-5 text-violet-600" />
                Agentes N2 — Rodízio
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">Gerencie os agentes do Time N2, posições e status. O cadastro não cria usuário no sistema.</p>
            </div>
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar Agente N2
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {agentesOrdenados.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Headset className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum Agente N2 cadastrado.</p>
              <p className="text-xs mt-1">Clique em "Adicionar Agente N2" para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                    <th className="text-left py-2 px-3">Ordem</th>
                    <th className="text-left py-2 px-3">Agente N2</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-right py-2 px-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {agentesOrdenados.map((agente, idx) => (
                    <tr key={agente.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">{agente.ordem}</span>
                          <div className="flex flex-col">
                            <button onClick={() => reordenarMutation.mutate({ agente, direcao: 'up' })} disabled={idx === 0} className="text-slate-400 hover:text-violet-600 disabled:opacity-30">
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button onClick={() => reordenarMutation.mutate({ agente, direcao: 'down' })} disabled={idx === agentesOrdenados.length - 1} className="text-slate-400 hover:text-violet-600 disabled:opacity-30">
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">{agente.colaborador_nome}</td>
                      <td className="py-3 px-3">
                        <Badge className={STATUS_N2_LABELS[agente.status]?.color || 'bg-slate-100 text-slate-700'}>
                          {STATUS_N2_LABELS[agente.status]?.label || agente.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditar(agente)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => setExcluirTarget(agente)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {agentesRemovidos.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-slate-400 mb-2">Removidos do rodízio (histórico preservado):</p>
              <div className="flex flex-wrap gap-2">
                {agentesRemovidos.map(a => (
                  <Badge key={a.id} variant="outline" className="text-slate-400">{a.colaborador_nome}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Agente N2' : 'Adicionar Agente N2'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Colaborador (referência)</Label>
              <Select value={form.colaborador_id} onValueChange={handleSelectColaborador} disabled={!!editId}>
                <SelectTrigger><SelectValue placeholder="Selecione o colaborador..." /></SelectTrigger>
                <SelectContent>
                  {colabsDisponiveis.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_completo} ({c.cargo_atual || '—'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">O cadastro não cria usuário no sistema — é apenas referência para rodízio e acionamento.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do Agente N2</Label>
              <Input placeholder="Nome exibido no rodízio..." value={form.colaborador_nome} onChange={e => setForm(f => ({ ...f, colaborador_nome: e.target.value }))} />
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
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700 space-y-1">
              <p><strong>Permitido:</strong> participa do rodízio normalmente.</p>
              <p><strong>Férias:</strong> pulado temporariamente, sem perder a posição.</p>
              <p><strong>Bloqueado:</strong> não participa do rodízio, sem perder a posição.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-violet-600 hover:bg-violet-700" disabled={!form.colaborador_nome.trim() || salvarMutation.isPending} onClick={() => salvarMutation.mutate({ editId, form })}>
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
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Excluir Agente N2
            </DialogTitle>
          </DialogHeader>
          {excluirTarget && (() => {
            const temHistorico = acionamentosHist.some(a => a.agente_n2_id === excluirTarget.id);
            return (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Você está prestes a excluir <strong>{excluirTarget.colaborador_nome}</strong> (Posição #{excluirTarget.ordem}).
                </p>
                {temHistorico ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                    <p className="font-semibold mb-1">⚠️ Este agente possui acionamentos vinculados.</p>
                    <p>O cadastro será inativado (removido do rodízio), mas o histórico de acionamentos será preservado para auditoria.</p>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <p className="font-semibold mb-1">🗑️ Exclusão permanente</p>
                    <p>Este agente não possui acionamentos vinculados. O cadastro será removido permanentemente do sistema.</p>
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