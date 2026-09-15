import db from '@/api/db';
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StickyNote, X, Plus, Bell, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const corPaleta = {
  amarelo: 'bg-warning-soft border border-warning/25 text-warning',
  azul: 'bg-info-soft border border-info/25 text-primary',
  verde: 'bg-success-soft border border-success/25 text-success',
  rosa: 'bg-info-soft border border-primary/25 text-primary',
  roxo: 'bg-info-soft border border-info/25 text-primary',
};

const corBadge = {
  amarelo: 'bg-warning-soft text-warning',
  azul: 'bg-info-soft text-primary',
  verde: 'bg-success-soft text-success',
  rosa: 'bg-info-soft text-primary',
  roxo: 'bg-info-soft text-primary',
};

export default function MinhasAnotacoes({ colaboradorId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ titulo: '', conteudo: '', tipo: 'anotacao', cor: 'amarelo', data_alerta: '', hora_alerta: '' });
  const [lembreteAtivo, setLembreteAtivo] = useState(null);
  const queryClient = useQueryClient();

  const { data: anotacoes = [] } = useQuery({
    queryKey: ['anotacoes-pessoais', colaboradorId],
    queryFn: () => db.entities.AnotacaoPessoal.filter({ colaborador_id: colaboradorId }, '-created_date'),
    enabled: !!colaboradorId,
  });

  const criarMutation = useMutation({
    mutationFn: (data) => db.entities.AnotacaoPessoal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['anotacoes-pessoais', colaboradorId]);
      setForm({ titulo: '', conteudo: '', tipo: 'anotacao', cor: 'amarelo', data_alerta: '' });
      setDialogOpen(false);
      toast.success('Anotação criada');
    },
    onError: () => toast.error('Erro ao criar anotação'),
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.AnotacaoPessoal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['anotacoes-pessoais', colaboradorId]);
      setForm({ titulo: '', conteudo: '', tipo: 'anotacao', cor: 'amarelo', data_alerta: '' });
      setEditandoId(null);
      setDialogOpen(false);
      toast.success('Anotação atualizada');
    },
    onError: () => toast.error('Erro ao atualizar anotação'),
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => db.entities.AnotacaoPessoal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['anotacoes-pessoais', colaboradorId]);
      toast.success('Anotação deletada');
    },
    onError: () => toast.error('Erro ao deletar anotação'),
  });

  const handleSubmit = () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      toast.error('Preencha título e conteúdo');
      return;
    }
    if (form.tipo === 'aviso' && !form.data_alerta) {
      toast.error('Defina uma data para o aviso');
      return;
    }

    const data = {
      colaborador_id: colaboradorId,
      titulo: form.titulo,
      conteudo: form.conteudo,
      tipo: form.tipo,
      cor: form.cor,
      data_alerta: form.tipo === 'aviso' ? form.data_alerta : null,
      hora_alerta: form.tipo === 'aviso' && form.hora_alerta ? form.hora_alerta : null,
      visualizado: false,
    };

    if (editandoId) {
      atualizarMutation.mutate({ id: editandoId, data });
    } else {
      criarMutation.mutate(data);
    }
  };

  const handleEditar = (anotacao) => {
    setEditandoId(anotacao.id);
    setForm({
      titulo: anotacao.titulo,
      conteudo: anotacao.conteudo,
      tipo: anotacao.tipo,
      cor: anotacao.cor || 'amarelo',
      data_alerta: anotacao.data_alerta || '',
      hora_alerta: anotacao.hora_alerta || '',
    });
    setDialogOpen(true);
  };

  const handleNovo = () => {
    setEditandoId(null);
    setForm({ titulo: '', conteudo: '', tipo: 'anotacao', cor: 'amarelo', data_alerta: '', hora_alerta: '' });
    setDialogOpen(true);
  };

  // Verificar lembretes a cada minuto
  useEffect(() => {
    if (!colaboradorId) return;
    
    const verificar = () => {
      const agora = new Date();
      const lembrete = anotacoes.find(a => {
        if (a.tipo !== 'aviso' || a.visualizado) return false;
        if (!a.data_alerta) return false;
        
        // Montar datetime do alerta
        const dataHora = a.hora_alerta
          ? new Date(`${a.data_alerta}T${a.hora_alerta}`)
          : new Date(`${a.data_alerta}T00:00`);
        
        return dataHora <= agora;
      });
      
      if (lembrete && (!lembreteAtivo || lembreteAtivo.id !== lembrete.id)) {
        setLembreteAtivo(lembrete);
      }
    };
    
    verificar();
    const interval = setInterval(verificar, 60000);
    return () => clearInterval(interval);
  }, [anotacoes, colaboradorId]);

  const dispensarLembrete = (id) => {
    atualizarMutation.mutate({ id, data: { visualizado: true, data_visualizacao: new Date().toISOString() } });
    setLembreteAtivo(null);
  };

  const avisosPendentes = anotacoes.filter(a => {
    if (a.tipo !== 'aviso' || a.visualizado || !a.data_alerta) return false;
    const dataHora = a.hora_alerta
      ? new Date(`${a.data_alerta}T${a.hora_alerta}`)
      : new Date(`${a.data_alerta}T00:00`);
    return dataHora <= new Date();
  });

  return (
    <>
      {/* Popup de Lembrete */}
      {lembreteAtivo && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="max-w-md" aria-describedby="lembrete-desc">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-warning">
                <Bell className="w-5 h-5 animate-bounce" />
                Lembrete: {lembreteAtivo.titulo}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4" id="lembrete-desc">
              <div className={`p-4 rounded-lg border ${corPaleta[lembreteAtivo.cor] || corPaleta.amarelo}`}>
                <p className="text-sm whitespace-pre-wrap">{lembreteAtivo.conteudo}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Agendado para: {new Date(`${lembreteAtivo.data_alerta}T00:00`).toLocaleDateString('pt-BR')}
                {lembreteAtivo.hora_alerta && ` às ${lembreteAtivo.hora_alerta}`}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setLembreteAtivo(null)}
                >
                  Depois
                </Button>
                <Button
                  className="flex-1 bg-warning hover:bg-warning"
                  onClick={() => dispensarLembrete(lembreteAtivo.id)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Dispensar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-warning" />
              Minhas Anotações
              {avisosPendentes.length > 0 && (
                <span className="bg-destructive text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {avisosPendentes.length}
                </span>
              )}
            </CardTitle>
            <Button size="sm" onClick={handleNovo} className="bg-warning hover:bg-warning h-7 w-7 p-0">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1">
          {anotacoes.length === 0 ? (
            <p className="text-muted-foreground text-xs text-center py-3">Nenhuma anotação. Clique + para criar.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {anotacoes.map((anotacao) => (
                <div
                  key={anotacao.id}
                  className={`rounded-lg p-2.5 ${corPaleta[anotacao.cor] || corPaleta.amarelo}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-xs truncate">{anotacao.titulo}</p>
                        {anotacao.tipo === 'aviso' && <Bell className="w-3 h-3 opacity-60 flex-shrink-0" />}
                      </div>
                      <p className="text-xs opacity-65 truncate mt-0.5">{anotacao.conteudo.substring(0, 45)}</p>
                      {anotacao.data_alerta && (
                        <p className="text-xs opacity-50 mt-0.5">
                          {new Date(`${anotacao.data_alerta}T00:00`).toLocaleDateString('pt-BR')}
                          {anotacao.hora_alerta && ` ${anotacao.hora_alerta}`}
                          {anotacao.visualizado && ' ✓'}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-6 w-6 opacity-60 hover:opacity-100" onClick={() => handleEditar(anotacao)}>
                        
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10 opacity-60 hover:opacity-100" onClick={() => deletarMutation.mutate(anotacao.id)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoId ? 'Editar Anotação' : 'Nova Anotação'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Título</label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ex: Revisar cliente X"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Conteúdo</label>
              <Textarea
                value={form.conteudo}
                onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                placeholder="Escreva sua anotação..."
                rows={4}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="anotacao">Anotação simples</option>
                <option value="aviso">Aviso com alerta</option>
              </select>
            </div>

            {form.tipo === 'aviso' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Data do Lembrete *</label>
                  <Input
                    type="date"
                    value={form.data_alerta}
                    onChange={(e) => setForm({ ...form, data_alerta: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Horário (opcional)</label>
                  <Input
                    type="time"
                    value={form.hora_alerta}
                    onChange={(e) => setForm({ ...form, hora_alerta: e.target.value })}
                    placeholder="Ex: 09:00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Se não informar horário, o lembrete aparece assim que você entrar no sistema nesse dia.</p>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Cor</label>
              <div className="flex gap-2">
                {['amarelo', 'azul', 'verde', 'rosa', 'roxo'].map((cor) => (
                  <button
                    key={cor}
                    onClick={() => setForm({ ...form, cor })}
                    className={`w-8 h-8 rounded border-2 ${corBadge[cor]} ${
                      form.cor === cor ? 'border-border' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-warning hover:bg-warning"
                onClick={handleSubmit}
                disabled={criarMutation.isPending || atualizarMutation.isPending}
              >
                {editandoId ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}