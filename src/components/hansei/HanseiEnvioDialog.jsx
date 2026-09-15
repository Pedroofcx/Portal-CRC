import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Send, Eye, Zap, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { getQuickPeriod, calcularDadosConsolidados, gerarInsights } from './hanseiUtils';
import { formatDateSP } from '@/components/utils/helpers';

const TIPOS_LABEL = {
  reclamacao_interna: 'Rec. Interna', reclame_aqui: 'Reclame Aqui',
  google_meu_negocio: 'Google', contestacao: 'Contestação'
};

function PreviewDados({ dados, colaboradorNome, periodoInicio, periodoFim }) {
  if (!dados) return null;
  const insights = gerarInsights(dados);
  const slaTotal = (dados.slas_cumpridos || 0) + (dados.slas_estourados || 0);
  const slaPct = slaTotal > 0 ? Math.round((dados.slas_cumpridos / slaTotal) * 100) : null;

  const InsightIcon = ({ tipo }) => {
    if (tipo === 'danger') return <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />;
    if (tipo === 'warning') return <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />;
    if (tipo === 'success') return <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />;
    return <Info className="w-4 h-4 text-primary flex-shrink-0" />;
  };
  const insightColor = { danger: 'bg-destructive/10 border-destructive/25 text-destructive', warning: 'bg-warning-soft border-warning/25 text-warning', success: 'bg-success-soft border-success/25 text-success', info: 'bg-info-soft border-info/25 text-primary' };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-muted rounded-lg text-sm">
        <span className="font-medium">{colaboradorNome}</span>
        <span className="text-muted-foreground ml-2">{formatDateSP(periodoInicio, 'DD/MM/YY')} → {formatDateSP(periodoFim, 'DD/MM/YY')}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Tratativas', value: dados.tratativas_total || 0, color: 'text-foreground' },
          { label: 'Solucionadas', value: dados.tratativas_solucionadas || 0, color: 'text-success' },
          { label: 'Em Aberto', value: dados.tratativas_em_aberto || 0, color: 'text-warning' },
          { label: 'Performance', value: `${dados.performance_percentual || 0}%`, color: (dados.performance_percentual || 0) >= 80 ? 'text-success' : 'text-destructive' },
          { label: 'CSAT', value: `${dados.csat_individual || 0}%`, color: (dados.csat_individual || 0) >= 85 ? 'text-success' : 'text-warning' },
          { label: 'SLA', value: slaPct !== null ? `${slaPct}%` : 'N/A', color: (slaPct || 0) >= 80 ? 'text-success' : 'text-destructive' },
          { label: 'Chats', value: dados.chats_atendidos || 0, color: 'text-primary' },
          { label: 'Ligações', value: dados.ligacoes_atendidas || 0, color: 'text-primary' },
          { label: 'Pontos', value: (dados.pontuacao_trimestre || 0).toFixed(0), color: 'text-critical' },
        ].map(item => (
          <div key={item.label} className="p-2 bg-card border rounded-lg text-center">
            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {Object.keys(dados.tratativas_por_tipo || {}).length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Por Tipo</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(dados.tratativas_por_tipo).map(([tipo, count]) => (
              <Badge key={tipo} variant="outline" className="text-xs">{TIPOS_LABEL[tipo] || tipo}: {count}</Badge>
            ))}
          </div>
        </div>
      )}

      {dados.top_motivos?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Top Motivos</p>
          <div className="flex flex-wrap gap-1">
            {dados.top_motivos.map(m => (
              <Badge key={m.nome} variant="secondary" className="text-xs">{m.nome}: {m.count}</Badge>
            ))}
          </div>
        </div>
      )}

      {insights.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Insights Automáticos</p>
          {insights.map((ins, i) => (
            <div key={i} className={`flex gap-2 p-2 border rounded-lg ${insightColor[ins.tipo]}`}>
              <InsightIcon tipo={ins.tipo} />
              <div>
                <p className="text-xs font-semibold">{ins.titulo}</p>
                <p className="text-xs opacity-80">{ins.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HanseiEnvioDialog({ open, onClose, colaboradores, tratativas, apuracoes, pontuacoes, colaborador, user, onEnviar, isEnviando }) {
  const [formData, setFormData] = useState({
    colaborador_id: '',
    periodicidade: 'semanal',
    periodo_inicio: '',
    periodo_fim: '',
    comentario_gestor: ''
  });
  const [preview, setPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const handlePeriodoRapido = (tipo) => {
    const { inicio, fim } = getQuickPeriod(tipo);
    setFormData(f => ({ ...f, periodo_inicio: inicio, periodo_fim: fim }));
    setPreview(null); setShowPreview(false);
  };

  const handlePreview = () => {
    if (!formData.colaborador_id || !formData.periodo_inicio || !formData.periodo_fim) return;
    const dados = calcularDadosConsolidados(formData.colaborador_id, formData.periodo_inicio, formData.periodo_fim, { tratativas, apuracoes, pontuacoes });
    setPreview(dados);
    setShowPreview(true);
  };

  const handleEnviar = () => {
    if (!formData.colaborador_id || !formData.periodo_inicio || !formData.periodo_fim) return;
    const col = colaboradores.find(c => c.id === formData.colaborador_id);
    const dados = preview || calcularDadosConsolidados(formData.colaborador_id, formData.periodo_inicio, formData.periodo_fim, { tratativas, apuracoes, pontuacoes });
    onEnviar({
      colaborador_id: formData.colaborador_id,
      colaborador_nome: col?.nome_completo,
      periodo_inicio: formData.periodo_inicio,
      periodo_fim: formData.periodo_fim,
      periodicidade: formData.periodicidade,
      dados_consolidados: dados,
      comentario_gestor: formData.comentario_gestor,
      data_envio: new Date().toISOString(),
      enviado_por_id: colaborador?.id,
      enviado_por_nome: user?.full_name,
      visualizado: false
    });
    setFormData({ colaborador_id: '', periodicidade: 'semanal', periodo_inicio: '', periodo_fim: '', comentario_gestor: '' });
    setPreview(null); setShowPreview(false);
  };

  const colSelecionado = colaboradores.find(c => c.id === formData.colaborador_id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Enviar Resultados Hansei
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Formulário */}
          <div className="space-y-4">
            <div>
              <Label>Colaborador *</Label>
              <Select value={formData.colaborador_id} onValueChange={v => { setFormData(f => ({ ...f, colaborador_id: v })); setPreview(null); setShowPreview(false); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {colaboradores.filter(c => c.papel === 'agente' && c.ativo !== false).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Periodicidade</Label>
              <Select value={formData.periodicidade} onValueChange={v => setFormData(f => ({ ...f, periodicidade: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Diário</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block">Período Rápido</Label>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'esta_semana', label: 'Esta semana' },
                  { key: 'semana_anterior', label: 'Sem. anterior' },
                  { key: 'este_mes', label: 'Este mês' },
                  { key: 'mes_anterior', label: 'Mês anterior' },
                  { key: 'ultimos_30', label: 'Últ. 30 dias' },
                ].map(p => (
                  <button key={p.key} onClick={() => handlePeriodoRapido(p.key)}
                    className="text-xs px-2 py-1 border rounded-md hover:bg-info-soft hover:border-primary/40 hover:text-primary transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início *</Label>
                <Input type="date" className="mt-1" value={formData.periodo_inicio}
                  onChange={e => { setFormData(f => ({ ...f, periodo_inicio: e.target.value })); setPreview(null); setShowPreview(false); }} />
              </div>
              <div>
                <Label>Fim *</Label>
                <Input type="date" className="mt-1" value={formData.periodo_fim}
                  onChange={e => { setFormData(f => ({ ...f, periodo_fim: e.target.value })); setPreview(null); setShowPreview(false); }} />
              </div>
            </div>

            <div>
              <Label>Comentário do Gestor</Label>
              <Textarea className="mt-1" rows={4} value={formData.comentario_gestor}
                onChange={e => setFormData(f => ({ ...f, comentario_gestor: e.target.value }))}
                placeholder="Feedback sobre o desempenho, pontos de atenção, elogios..." />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePreview} disabled={!formData.colaborador_id || !formData.periodo_inicio || !formData.periodo_fim}
                className="flex-1">
                <Eye className="w-4 h-4 mr-1" /> Ver Dados
              </Button>
              <Button onClick={handleEnviar} disabled={!formData.colaborador_id || !formData.periodo_inicio || !formData.periodo_fim || isEnviando}
                className="flex-1 bg-primary hover:bg-primary/90">
                <Send className="w-4 h-4 mr-1" /> {isEnviando ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div>
            {showPreview && preview ? (
              <div>
                <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                  <Zap className="w-4 h-4 text-primary" /> Prévia dos Dados
                </p>
                <PreviewDados dados={preview} colaboradorNome={colSelecionado?.nome_completo} periodoInicio={formData.periodo_inicio} periodoFim={formData.periodo_fim} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-xl p-8">
                <Eye className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Selecione colaborador e período, depois clique em <strong>"Ver Dados"</strong> para prévia</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}