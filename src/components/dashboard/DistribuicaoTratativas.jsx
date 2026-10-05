import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Plus, Users, ChevronDown, ChevronUp, RotateCcw,
  AlertTriangle, Clock, CalendarDays, Shield
} from 'lucide-react';
import CardAgenteEquidade from '@/components/distribuicao/CardAgenteEquidade';
import RodizioAssistido from '@/components/distribuicao/RodizioAssistido';
import AlertasConcentracao from '@/components/distribuicao/AlertasConcentracao';
import DialogNovaAtribuicao from '@/components/distribuicao/DialogNovaAtribuicao';
import DialogIndisponibilidade from '@/components/distribuicao/DialogIndisponibilidade';
import EquidadeDoMes from '@/components/distribuicao/EquidadeDoMes';
import HistoricoDistribuicao from '@/components/distribuicao/HistoricoDistribuicao';
import { indisponiveisEm } from '@/lib/equidade';
import db from '@/api/db';
import {
  TIPOS_CONFIG, calcularSaturacao,
  calcularPesoOperacional
} from '@/components/distribuicao/distribuicaoUtils';

export default function DistribuicaoTratativas({ gestorId, gestorNome, colaboradores }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandido, setExpandido] = useState(true);
  const [periodoFiltro, setPeriodoFiltro] = useState('30');
  const [aba, setAba] = useState('rodizio');
  const [inicial, setInicial] = useState(null);
  const [indisponivelAberto, setIndisponivelAberto] = useState(false);
  const queryClient = useQueryClient();
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  const { data: distribuicoes = [] } = useQuery({
    queryKey: ['distribuicoes-tratativas'],
    queryFn: () => db.entities.DistribuicaoTratativa.list('-created_date', 500),
    staleTime: 30000,
  });

  const { data: solicitacoes = [] } = useQuery({
    queryKey: ['solicitacoes-ferias'],
    queryFn: () => db.entities.SolicitacaoFerias.list('-data_inicio', 500),
    staleTime: 60000,
  });

  const { data: atribuicoes = [] } = useQuery({
    queryKey: ['escalaAtribuicoes'],
    queryFn: () => db.entities.EscalaAtribuicao.list('-created_date', 2000),
    staleTime: 60000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.DistribuicaoTratativa.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['distribuicoes-tratativas']);
      toast.success('Atribuição registrada com sucesso');
      setDialogOpen(false);
    },
    onError: () => toast.error('Não consegui registrar a atribuição.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.DistribuicaoTratativa.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['distribuicoes-tratativas']);
      toast.success('Registro removido');
    },
    onError: () => toast.error('Não consegui remover o registro.'),
  });

  const indisponibilidadeMutation = useMutation({
    mutationFn: async ({ agente, inicio, fim }) => db.entities.EscalaAtribuicao.create({
      escala_id: 'direct',
      escala_nome: 'Indisponível (rodízio)',
      colaborador_id: agente.id,
      colaborador_nome: agente.nome_completo,
      data_inicio: inicio,
      data_fim: fim,
      tipo_evento: 'falta',
      ativa: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalaAtribuicoes'] });
      toast.success('Marcada como indisponível. O rodízio já a pula.');
      setIndisponivelAberto(false);
    },
    onError: () => toast.error('Não consegui marcar. Só quem monta a Escala pode fazer isso.'),
  });

  // "Voltou": encerra a ausência ontem; se ela nem começou, apaga.
  const voltouMutation = useMutation({
    mutationFn: async (escalaId) => {
      const marca = atribuicoes.find((a) => a.id === escalaId);
      if (!marca) return;
      if (String(marca.data_inicio).slice(0, 10) >= hoje) return db.entities.EscalaAtribuicao.delete(escalaId);
      const ontem = new Date(`${hoje}T12:00:00`);
      ontem.setDate(ontem.getDate() - 1);
      return db.entities.EscalaAtribuicao.update(escalaId, { data_fim: ontem.toLocaleDateString('en-CA') });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalaAtribuicoes'] });
      toast.success('De volta ao rodízio.');
    },
    onError: () => toast.error('Não consegui atualizar a ausência.'),
  });

  const agentesAtivos = useMemo(
    () => colaboradores.filter(c => c.papel === 'agente' && c.ativo !== false),
    [colaboradores]
  );

  const distribuicoesFiltradas = useMemo(() => {
    if (periodoFiltro === 'todos') return distribuicoes;
    const limite = new Date(Date.now() - parseInt(periodoFiltro) * 86400000).toISOString().split('T')[0];
    return distribuicoes.filter(d => d.data_atribuicao >= limite);
  }, [distribuicoes, periodoFiltro]);

  const stats = useMemo(() => {
    const totalTickets = distribuicoesFiltradas.length;
    const criticas = distribuicoesFiltradas.filter(d => d.prioridade === 'critica').length;
    const pesoTotal = calcularPesoOperacional(distribuicoesFiltradas);

    const volumesPorAgente = agentesAtivos.map(a =>
      distribuicoesFiltradas.filter(d => d.agente_id === a.id).length
    );
    const media = volumesPorAgente.reduce((s, v) => s + v, 0) / (agentesAtivos.length || 1);
    const desvio = Math.sqrt(volumesPorAgente.reduce((s, v) => s + Math.pow(v - media, 2), 0) / (agentesAtivos.length || 1));
    const indiceEquilibrio = media > 0 ? Math.max(0, Math.round(100 - (desvio / media) * 100)) : 100;

    return { totalTickets, criticas, pesoTotal, indiceEquilibrio };
  }, [distribuicoesFiltradas, agentesAtivos]);

  const agentesOrdenados = useMemo(() => {
    return [...agentesAtivos].sort((a, b) => {
      const sa = calcularSaturacao(a.id, distribuicoesFiltradas, []);
      const sb = calcularSaturacao(b.id, distribuicoesFiltradas, []);
      return sb - sa;
    });
  }, [agentesAtivos, distribuicoesFiltradas]);

  const alertasGlobaisCriticos = useMemo(() => {
    return agentesAtivos.filter(a => calcularSaturacao(a.id, distribuicoesFiltradas, []) >= 85).length;
  }, [agentesAtivos, distribuicoesFiltradas]);

  const indisponiveisHoje = useMemo(
    () => indisponiveisEm(hoje, { solicitacoes, atribuicoes }),
    [hoje, solicitacoes, atribuicoes],
  );

  const abrirAtribuicao = (dados = null) => { setInicial(dados); setDialogOpen(true); };

  const handleSalvar = (formData) => {
    const agente = agentesAtivos.find(a => a.id === formData.agente_id);
    createMutation.mutate({
      ...formData,
      agente_nome: agente?.nome_completo || '',
      gestor_id: gestorId,
      gestor_nome: gestorNome,
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-info-soft rounded-lg">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Painel de Equidade Operacional</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Distribuição justa e transparente de tratativas CRC</p>
            </div>
            {alertasGlobaisCriticos > 0 && (
              <Badge className="bg-destructive/10 text-destructive flex items-center gap-1 text-xs">
                <AlertTriangle className="w-3 h-3" /> {alertasGlobaisCriticos} alerta{alertasGlobaisCriticos > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => abrirAtribuicao()} className="bg-primary hover:bg-primary gap-1">
              <Plus className="w-4 h-4" /> Nova Atribuição
            </Button>
            <button onClick={() => setExpandido(e => !e)} className="p-1.5 hover:bg-muted rounded transition-colors">
              {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </CardHeader>

      {expandido && (
        <CardContent className="space-y-5">
          <Tabs value={aba} onValueChange={setAba}>
            <TabsList className="h-auto flex-wrap justify-start bg-muted">
              <TabsTrigger value="rodizio" className="text-xs gap-1.5 data-[state=active]:bg-card">
                <RotateCcw className="w-3.5 h-3.5" /> Rodízio
              </TabsTrigger>
              <TabsTrigger value="mes" className="text-xs gap-1.5 data-[state=active]:bg-card">
                <CalendarDays className="w-3.5 h-3.5" /> Equidade do mês
              </TabsTrigger>
              <TabsTrigger value="historico" className="text-xs gap-1.5 data-[state=active]:bg-card">
                <Clock className="w-3.5 h-3.5" /> Histórico
              </TabsTrigger>
              <TabsTrigger value="alertas" className="text-xs gap-1.5 data-[state=active]:bg-card">
                <AlertTriangle className="w-3.5 h-3.5" /> Alertas
                {alertasGlobaisCriticos > 0 && (
                  <span className="ml-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                    {alertasGlobaisCriticos}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="agentes" className="text-xs gap-1.5 data-[state=active]:bg-card">
                <Users className="w-3.5 h-3.5" /> Agentes ({agentesAtivos.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rodizio" className="mt-4">
              <RodizioAssistido
                agentesAtivos={agentesAtivos}
                distribuicoes={distribuicoes}
                indisponiveis={indisponiveisHoje}
                hoje={hoje}
                onAtribuir={abrirAtribuicao}
                onIndisponivel={({ voltar, escalaId }) => (voltar ? voltouMutation.mutate(escalaId) : setIndisponivelAberto(true))}
              />
            </TabsContent>

            <TabsContent value="mes" className="mt-4">
              <EquidadeDoMes agentesAtivos={agentesAtivos} distribuicoes={distribuicoes} hoje={hoje} indisponiveis={indisponiveisHoje} />
            </TabsContent>

            <TabsContent value="historico" className="mt-4">
              <HistoricoDistribuicao
                distribuicoes={distribuicoes}
                agentesAtivos={agentesAtivos}
                hoje={hoje}
                onRemover={(d) => { if (window.confirm('Remover este registro?')) deleteMutation.mutate(d.id); }}
              />
            </TabsContent>

            <TabsContent value="alertas" className="mt-4 space-y-4">
              <FiltroPeriodo valor={periodoFiltro} onChange={setPeriodoFiltro} />
              <AlertasConcentracao agentes={agentesAtivos} distribuicoes={distribuicoesFiltradas} />
            </TabsContent>

            <TabsContent value="agentes" className="mt-4 space-y-5">
              <FiltroPeriodo valor={periodoFiltro} onChange={setPeriodoFiltro} />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-muted rounded-xl text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.totalTickets}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tickets distribuídos</p>
                </div>
                <div className={`p-3 rounded-xl text-center ${
                  stats.indiceEquilibrio >= 80 ? 'bg-success-soft' : stats.indiceEquilibrio >= 60 ? 'bg-warning-soft' : 'bg-destructive/10'
                }`}>
                  <p className={`text-2xl font-bold ${
                    stats.indiceEquilibrio >= 80 ? 'text-success' : stats.indiceEquilibrio >= 60 ? 'text-warning' : 'text-destructive'
                  }`}>{stats.indiceEquilibrio}%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Índice de equilíbrio</p>
                </div>
                <div className="p-3 bg-muted rounded-xl text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.pesoTotal.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Peso operacional total</p>
                </div>
                <div className={`p-3 rounded-xl text-center ${stats.criticas > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                  <p className={`text-2xl font-bold ${stats.criticas > 0 ? 'text-destructive' : 'text-foreground'}`}>{stats.criticas}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tickets críticos</p>
                </div>
              </div>

              {agentesOrdenados.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">Nenhum agente ativo cadastrado.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {agentesOrdenados.map(agente => (
                    <CardAgenteEquidade
                      key={agente.id}
                      agente={agente}
                      distribuicoes={distribuicoesFiltradas}
                      todas={distribuicoesFiltradas}
                    />
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Distribuição por canal no período</p>
                <div className="space-y-2">
                  {Object.entries(TIPOS_CONFIG).map(([key, cfg]) => {
                    const qtd = distribuicoesFiltradas.filter(d => d.tipo_tratativa === key).length;
                    const pct = distribuicoesFiltradas.length > 0 ? Math.round((qtd / distribuicoesFiltradas.length) * 100) : 0;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-40 flex-shrink-0">{cfg.label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cfg.colorSolid }} />
                        </div>
                        <span className="text-xs font-bold text-foreground w-10 text-right">{qtd}</span>
                        <span className="text-xs text-muted-foreground w-10">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}

      <DialogNovaAtribuicao
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSalvar={handleSalvar}
        agentes={agentesAtivos}
        distribuicoes={distribuicoes}
        solicitacoes={solicitacoes}
        atribuicoes={atribuicoes}
        inicial={inicial}
        isPending={createMutation.isPending}
      />

      <DialogIndisponibilidade
        open={indisponivelAberto}
        onClose={() => setIndisponivelAberto(false)}
        agentes={agentesAtivos}
        hoje={hoje}
        onSalvar={(dados) => indisponibilidadeMutation.mutate(dados)}
        isPending={indisponibilidadeMutation.isPending}
      />
    </Card>
  );
}

function FiltroPeriodo({ valor, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-muted-foreground">Período:</span>
      {[['7', '7 dias'], ['14', '14 dias'], ['30', '30 dias'], ['90', 'Trimestre'], ['todos', 'Todo o histórico']].map(([v, l]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
            valor === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
