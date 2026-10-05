import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, CalendarDays, CheckCircle2, Circle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const _MESES = [
  '01','02','03','04','05','06','07','08','09','10','11','12'
];
const MESES_LABEL = {
  '01':'Janeiro','02':'Fevereiro','03':'Março','04':'Abril','05':'Maio','06':'Junho',
  '07':'Julho','08':'Agosto','09':'Setembro','10':'Outubro','11':'Novembro','12':'Dezembro'
};

function fmtDate(d) {
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d || '—'; }
}
function fmtMes(ym) {
  if (!ym) return '—';
  const [year, month] = ym.split('-');
  return `${MESES_LABEL[month] || month}/${year}`;
}

const CICLOS_PADRAO = [
  { nome: 'Ciclo 1 – Mar/Abr/Mai', data_inicio: '2025-03-01', data_fim: '2025-05-31', mes_pagamento: '2025-06' },
  { nome: 'Ciclo 2 – Jun/Jul/Ago', data_inicio: '2025-06-01', data_fim: '2025-08-31', mes_pagamento: '2025-09' },
  { nome: 'Ciclo 3 – Set/Out/Nov', data_inicio: '2025-09-01', data_fim: '2025-11-30', mes_pagamento: '2025-12' },
  { nome: 'Ciclo 4 – Dez/Jan/Fev', data_inicio: '2025-12-01', data_fim: '2026-02-28', mes_pagamento: '2026-03' },
];

export default function ConfigCiclosTrimestral() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', data_inicio: '', data_fim: '', mes_pagamento: '', descricao: '' });
  const queryClient = useQueryClient();

  const { data: ciclos = [] } = useQuery({
    queryKey: ['ciclos-trimestrais', "list('-data_inicio')"],
    queryFn: () => db.entities.CicloTrimestral.list('-data_inicio'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.CicloTrimestral.create({ ...data, ativo: false }),
    onSuccess: () => {
      queryClient.invalidateQueries(['ciclos-trimestrais']);
      toast.success('Ciclo criado');
      setDialogOpen(false);
      setForm({ nome: '', data_inicio: '', data_fim: '', mes_pagamento: '', descricao: '' });
    },
    onError: () => toast.error('Não consegui criar o ciclo.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.CicloTrimestral.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ciclos-trimestrais']);
      toast.success('Ciclo atualizado');
    },
    onError: () => toast.error('Não consegui atualizar o ciclo.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.CicloTrimestral.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['ciclos-trimestrais']);
      toast.success('Ciclo removido');
    },
    onError: () => toast.error('Não consegui remover o ciclo.'),
  });

  const handleAtivar = async (ciclo) => {
    // Desativa todos e ativa o selecionado
    await Promise.all(ciclos.filter(c => c.ativo).map(c => updateMutation.mutateAsync({ id: c.id, data: { ativo: false } })));
    await updateMutation.mutateAsync({ id: ciclo.id, data: { ativo: true } });
  };

  const handleCriarPadroes = async () => {
    for (const c of CICLOS_PADRAO) {
      await db.entities.CicloTrimestral.create({ ...c, ativo: false });
    }
    queryClient.invalidateQueries(['ciclos-trimestrais']);
    toast.success('Ciclos padrão criados');
  };

  const cicloAtivo = ciclos.find(c => c.ativo);

  return (
    <div className="space-y-6">
      {/* Ciclo Ativo */}
      {cicloAtivo && (
        <div className="bg-success-soft border border-success/25 rounded-xl p-4 flex items-center gap-4">
          <CheckCircle2 className="w-8 h-8 text-success flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-success">{cicloAtivo.nome}</p>
            <p className="text-sm text-success">
              Avaliação: {fmtDate(cicloAtivo.data_inicio)} → {fmtDate(cicloAtivo.data_fim)} &nbsp;•&nbsp; Pagamento: {fmtMes(cicloAtivo.mes_pagamento)}
            </p>
          </div>
          <Badge className="bg-success text-success-foreground">Ciclo Ativo</Badge>
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Ciclos Trimestrais de Premiação
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Configure os períodos de avaliação e meses de pagamento</p>
            </div>
            <div className="flex gap-2">
              {ciclos.length === 0 && (
                <Button variant="outline" size="sm" onClick={handleCriarPadroes}>
                  Criar Ciclos Padrão
                </Button>
              )}
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Novo Ciclo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ciclos.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhum ciclo configurado</p>
              <p className="text-sm mt-1">Crie ciclos padrão ou adicione manualmente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ciclos.map(ciclo => (
                <div
                  key={ciclo.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    ciclo.ativo ? 'bg-success-soft border-success/25' : 'bg-muted border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleAtivar(ciclo)}
                      className="flex-shrink-0"
                      title="Ativar este ciclo"
                    >
                      {ciclo.ativo
                        ? <CheckCircle2 className="w-5 h-5 text-success" />
                        : <Circle className="w-5 h-5 text-muted-foreground hover:text-success transition-colors" />
                      }
                    </button>
                    <div>
                      <p className="font-medium text-sm">{ciclo.nome}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Avaliação: <strong>{fmtDate(ciclo.data_inicio)}</strong> → <strong>{fmtDate(ciclo.data_fim)}</strong>
                        &nbsp;•&nbsp; Pagamento: <strong>{fmtMes(ciclo.mes_pagamento)}</strong>
                      </p>
                      {ciclo.descricao && <p className="text-xs text-muted-foreground mt-0.5 italic">{ciclo.descricao}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ciclo.ativo && <Badge className="bg-success text-success-foreground text-xs">Ativo</Badge>}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => { if (confirm('Remover este ciclo?')) deleteMutation.mutate(ciclo.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog novo ciclo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Ciclo Trimestral</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nome do Ciclo *</Label>
              <Input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Ciclo 1 – Mar/Abr/Mai"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início da Avaliação *</Label>
                <Input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Fim da Avaliação *</Label>
                <Input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Mês de Pagamento * (YYYY-MM)</Label>
              <Input
                type="month"
                value={form.mes_pagamento}
                onChange={e => setForm(f => ({ ...f, mes_pagamento: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Mês em que a premiação será paga</p>
            </div>
            <div>
              <Label>Observação</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Opcional" className="mt-1" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.nome || !form.data_inicio || !form.data_fim || !form.mes_pagamento}
              >
                Criar Ciclo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}