const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Trash2, Award, CalendarDays, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ConfigCiclosTrimestral from '@/components/elegibilidade/ConfigCiclosTrimestral';

function fmtDate(d) {
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d || '—'; }
}
function fmtMes(ym) {
  const MESES_LABEL = {
    '01':'Janeiro','02':'Fevereiro','03':'Março','04':'Abril','05':'Maio','06':'Junho',
    '07':'Julho','08':'Agosto','09':'Setembro','10':'Outubro','11':'Novembro','12':'Dezembro'
  };
  if (!ym) return '—';
  const [year, month] = ym.split('-');
  return `${MESES_LABEL[month] || month}/${year}`;
}

const TIPOS_VALIDACAO = {
  csat_minimo: 'CSAT Mínimo (%)',
  performance_minima: 'Performance Mínima (%)',
  presenca_minima: 'Presença Mínima (%)',
  tratativas_minimas: 'Tratativas Mínimas',
  cursos_obrigatorios: 'Cursos Obrigatórios Concluídos',
  avaliacoes_cx: 'Avaliação CX Mínima',
  execucao_tratativas_categoria: 'Execução Mínima de Tratativas por Categoria',
  volume_minimo_canal: 'Volume Mínimo de Canal',
  personalizado: 'Personalizado',
};

const TIPO_ICONS = {
  csat_minimo: '⭐',
  performance_minima: '📊',
  presenca_minima: '📅',
  tratativas_minimas: '📋',
  cursos_obrigatorios: '🎓',
  avaliacoes_cx: '💬',
  execucao_tratativas_categoria: '🏷️',
  volume_minimo_canal: '📉',
  personalizado: '⚙️',
};

const CATEGORIAS_TRATATIVA = [
  { value: 'reclame_aqui', label: 'Reclame Aqui' },
  { value: 'reclamacao_interna', label: 'Reclamação Interna' },
  { value: 'contestacao_compra', label: 'Contestação de Compra' },
  { value: 'google_meu_negocio', label: 'Google Meu Negócio' },
];

const EMPTY_FORM = {
  nome_exigencia: '',
  descricao: '',
  tipo_validacao: 'csat_minimo',
  valor_minimo: '',
  volume_minimo_canal: 4,
  categorias_tratativa: [],
  obrigatoria: true,
};

export default function ConfigElegibilidade() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [activeSection, setActiveSection] = useState('criterios'); // 'criterios' | 'ciclos'
  const queryClient = useQueryClient();

  const { data: elegibilidades = [] } = useQuery({
    queryKey: ['elegibilidades'],
    queryFn: () => db.entities.ElegibilidadePremio.filter({ ativa: true }),
  });

  const { data: ciclos = [] } = useQuery({
    queryKey: ['ciclos-trimestrais'],
    queryFn: () => db.entities.CicloTrimestral.list('-data_inicio'),
  });

  const cicloAtivo = ciclos.find(c => c.ativo);

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.ElegibilidadePremio.create({
      ...data,
      valor_minimo: parseFloat(data.valor_minimo) || 0,
      ativa: true,
      ordem: elegibilidades.length + 1,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['elegibilidades']);
      toast.success('Exigência criada');
      setDialogOpen(false);
      setFormData(EMPTY_FORM);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.ElegibilidadePremio.update(id, { ativa: false }),
    onSuccess: () => {
      queryClient.invalidateQueries(['elegibilidades']);
      toast.success('Exigência removida');
    },
  });

  const toggleCategoria = (value) => {
    setFormData(f => ({
      ...f,
      categorias_tratativa: f.categorias_tratativa.includes(value)
        ? f.categorias_tratativa.filter(v => v !== value)
        : [...f.categorias_tratativa, value],
    }));
  };

  const mostraValorMinimo = !['execucao_tratativas_categoria', 'volume_minimo_canal'].includes(formData.tipo_validacao);

  return (
    <div className="space-y-6">
      {/* Ciclo Ativo Banner */}
      {cicloAtivo ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800 text-sm">Ciclo Ativo: {cicloAtivo.nome}</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Período de avaliação: <strong>{fmtDate(cicloAtivo.data_inicio)}</strong> → <strong>{fmtDate(cicloAtivo.data_fim)}</strong>
              &nbsp;•&nbsp; Pagamento: <strong>{fmtMes(cicloAtivo.mes_pagamento)}</strong>
            </p>
            <p className="text-xs text-blue-600 mt-1">Todos os critérios de elegibilidade aplicam-se a este período.</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Nenhum ciclo trimestral ativo</p>
            <p className="text-xs text-amber-700 mt-0.5">Configure e ative um ciclo trimestral na aba "Ciclos Trimestrais" abaixo.</p>
          </div>
        </div>
      )}

      {/* Nav interna */}
      <div className="flex gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveSection('criterios')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeSection === 'criterios' ? 'bg-white border border-b-white border-slate-200 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Award className="w-4 h-4 inline mr-1.5" />
          Critérios de Elegibilidade
        </button>
        <button
          onClick={() => setActiveSection('ciclos')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeSection === 'ciclos' ? 'bg-white border border-b-white border-slate-200 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <CalendarDays className="w-4 h-4 inline mr-1.5" />
          Ciclos Trimestrais
        </button>
      </div>

      {/* CRITÉRIOS */}
      {activeSection === 'criterios' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Exigências para Premiação Trimestral
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Defina os critérios que os agentes devem atender para participar
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Info sobre regra de volume */}
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2 text-xs text-slate-600">
              <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Regra de volume mínimo:</strong> Canais com menos de 4 registros no trimestre são automaticamente desconsiderados na validação, evitando distorções por baixo volume.
              </span>
            </div>

            {elegibilidades.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Nenhuma exigência configurada</p>
            ) : (
              <div className="space-y-2">
                {elegibilidades.map(elegib => {
                  const cats = elegib.categorias_tratativa || [];
                  return (
                    <div key={elegib.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base">{TIPO_ICONS[elegib.tipo_validacao] || '⚙️'}</span>
                          <p className="font-medium text-sm">{elegib.nome_exigencia}</p>
                          {elegib.obrigatoria && (
                            <Badge className="bg-red-100 text-red-700 text-xs">Obrigatória</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {TIPOS_VALIDACAO[elegib.tipo_validacao]}
                          {elegib.tipo_validacao === 'execucao_tratativas_categoria' && cats.length > 0 && (
                            <span> — {cats.map(c => CATEGORIAS_TRATATIVA.find(x => x.value === c)?.label || c).join(', ')}</span>
                          )}
                          {elegib.tipo_validacao === 'volume_minimo_canal' && (
                            <span> — mín. {elegib.volume_minimo_canal ?? elegib.valor_minimo ?? 4} registros/canal</span>
                          )}
                          {mostraValorMinimo && elegib.valor_minimo != null && elegib.tipo_validacao !== 'volume_minimo_canal' && (
                            <span> • Mínimo: {elegib.valor_minimo}</span>
                          )}
                        </p>
                        {elegib.descricao && <p className="text-xs text-slate-400 mt-0.5 italic">{elegib.descricao}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-600 flex-shrink-0"
                        onClick={() => deleteMutation.mutate(elegib.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CICLOS */}
      {activeSection === 'ciclos' && <ConfigCiclosTrimestral />}

      {/* Dialog nova exigência */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Exigência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nome da Exigência *</Label>
              <Input
                value={formData.nome_exigencia}
                onChange={(e) => setFormData({ ...formData, nome_exigencia: e.target.value })}
                placeholder="Ex: CSAT mínimo de 85%"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Detalhes da exigência..."
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tipo de Validação</Label>
              <Select
                value={formData.tipo_validacao}
                onValueChange={(value) => setFormData({ ...formData, tipo_validacao: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPOS_VALIDACAO).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {TIPO_ICONS[key]} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categorias de tratativa */}
            {formData.tipo_validacao === 'execucao_tratativas_categoria' && (
              <div>
                <Label>Categorias exigidas *</Label>
                <p className="text-xs text-slate-500 mt-1 mb-2">
                  O colaborador deve ter executado ao menos 1 tratativa em cada categoria selecionada durante o trimestre.
                </p>
                <div className="space-y-2">
                  {CATEGORIAS_TRATATIVA.map(cat => (
                    <div key={cat.value} className="flex items-center gap-2">
                      <Checkbox
                        id={cat.value}
                        checked={formData.categorias_tratativa.includes(cat.value)}
                        onCheckedChange={() => toggleCategoria(cat.value)}
                      />
                      <label htmlFor={cat.value} className="text-sm cursor-pointer">{cat.label}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Volume mínimo de canal */}
            {formData.tipo_validacao === 'volume_minimo_canal' && (
              <div>
                <Label>Volume mínimo por canal</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.volume_minimo_canal}
                  onChange={(e) => setFormData({ ...formData, volume_minimo_canal: parseInt(e.target.value) || 4 })}
                  className="mt-1"
                  placeholder="4"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Canais com menos registros que este valor serão desconsiderados na validação da premiação.
                </p>
              </div>
            )}

            {/* Valor mínimo genérico */}
            {mostraValorMinimo && (
              <div>
                <Label>Valor Mínimo</Label>
                <Input
                  type="number"
                  value={formData.valor_minimo}
                  onChange={(e) => setFormData({ ...formData, valor_minimo: e.target.value })}
                  placeholder="Ex: 85"
                  className="mt-1"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.obrigatoria}
                onCheckedChange={(checked) => setFormData({ ...formData, obrigatoria: checked })}
              />
              <Label>Obrigatória para participação</Label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.nome_exigencia || createMutation.isPending}
              >
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}