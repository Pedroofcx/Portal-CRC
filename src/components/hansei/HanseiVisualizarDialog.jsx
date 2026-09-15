import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from 'recharts';
import { CheckCircle, Clock, Target, MessageSquare, BarChart3, Award, AlertTriangle, Info, Send, Lightbulb, Zap } from 'lucide-react';
import { formatDateSP } from '@/components/utils/helpers';
import { gerarInsights, ACOES_MELHORIA } from './hanseiUtils';

const TIPOS_LABEL = {
  reclamacao_interna: 'Rec. Interna', reclame_aqui: 'Reclame Aqui',
  google_meu_negocio: 'Google', contestacao: 'Contestação'
};

function InsightCard({ ins }) {
  const config = {
    danger: { bg: 'bg-destructive/10 border-destructive/25', icon: <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />, title: 'text-destructive', desc: 'text-destructive' },
    warning: { bg: 'bg-warning-soft border-warning/25', icon: <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />, title: 'text-warning', desc: 'text-warning' },
    success: { bg: 'bg-success-soft border-success/25', icon: <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />, title: 'text-success', desc: 'text-success' },
    info: { bg: 'bg-info-soft border-info/25', icon: <Info className="w-4 h-4 text-primary flex-shrink-0" />, title: 'text-primary', desc: 'text-primary' },
  }[ins.tipo] || {};
  return (
    <div className={`flex gap-2 p-3 border rounded-lg ${config.bg}`}>
      {config.icon}
      <div>
        <p className={`text-sm font-semibold ${config.title}`}>{ins.titulo}</p>
        <p className={`text-xs ${config.desc}`}>{ins.desc}</p>
      </div>
    </div>
  );
}

export default function HanseiVisualizarDialog({
  open, onClose, envio, comentarios, isGestor,
  feedbackForm, setFeedbackForm, onEnviarFeedback, isEnviandoFeedback
}) {
  const [reflexao, setReflexao] = useState({ q1: '', q2: '', q3: '' });
  const [acaoSelecionada, setAcaoSelecionada] = useState('');

  if (!envio) return null;
  const d = envio.dados_consolidados || {};
  const insights = gerarInsights(d);

  const slaTotal = (d.slas_cumpridos || 0) + (d.slas_estourados || 0);
  const slaPct = slaTotal > 0 ? Math.round((d.slas_cumpridos / slaTotal) * 100) : 0;

  const radarData = [
    { subject: 'Performance', value: Math.min(d.performance_percentual || 0, 100) },
    { subject: 'CSAT', value: Math.min(d.csat_individual || 0, 100) },
    { subject: 'SLA', value: slaPct },
    { subject: 'Volume', value: Math.min(((d.tratativas_solucionadas || 0) / Math.max(d.tratativas_total || 1, 1)) * 100, 100) },
    { subject: 'CX', value: ((d.cx_nota_media || 0) / 10) * 100 },
    { subject: 'Pontuação', value: Math.min((d.pontuacao_trimestre || 0) / 10, 100) },
  ];

  const tiposBarData = Object.entries(d.tratativas_por_tipo || {}).map(([tipo, count]) => ({
    name: TIPOS_LABEL[tipo] || tipo, count
  }));

  const motivosBarData = (d.top_motivos || []).map(m => ({
    name: m.nome.length > 15 ? m.nome.slice(0, 13) + '...' : m.nome, count: m.count
  }));

  const envioComentarios = comentarios.filter(c => c.hansei_envio_id === envio.id);

  const handleEnviarFeedbackCompleto = () => {
    // Mescla reflexão + ação na área de comentário
    let textoCompleto = feedbackForm.comentario || '';
    const partes = [];
    if (reflexao.q1.trim()) partes.push(`O que funcionou bem: ${reflexao.q1}`);
    if (reflexao.q2.trim()) partes.push(`O que poderia melhorar: ${reflexao.q2}`);
    if (reflexao.q3.trim()) partes.push(`Ajuste para próxima semana: ${reflexao.q3}`);
    if (acaoSelecionada) partes.push(`Ação de melhoria: ${acaoSelecionada}`);
    if (partes.length > 0 && textoCompleto.trim()) {
      textoCompleto = textoCompleto + '\n\n' + partes.join('\n');
    } else if (partes.length > 0) {
      textoCompleto = partes.join('\n');
    }
    if (!textoCompleto.trim()) {
      onEnviarFeedback();
      return;
    }
    setFeedbackForm(f => ({ ...f, comentario: textoCompleto }));
    setTimeout(() => onEnviarFeedback(), 50);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Hansei — {envio.colaborador_nome || 'Meus Resultados'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Cabeçalho do período */}
          <div className="flex flex-wrap gap-2 items-center p-3 bg-muted rounded-lg">
            <Badge variant="outline" className="capitalize">{envio.periodicidade}</Badge>
            <span className="text-sm text-foreground font-medium">
              {formatDateSP(envio.periodo_inicio, 'DD/MM/YYYY')} → {formatDateSP(envio.periodo_fim, 'DD/MM/YYYY')}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">Enviado por {envio.enviado_por_nome} em {formatDateSP(envio.data_envio)}</span>
          </div>

          {/* KPIs principais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: CheckCircle, label: 'Solucionadas', value: d.tratativas_solucionadas || 0, color: 'text-success', bg: 'bg-success-soft' },
              { icon: Clock, label: 'Em Aberto', value: d.tratativas_em_aberto || 0, color: 'text-warning', bg: 'bg-warning-soft' },
              { icon: Target, label: 'Performance', value: `${d.performance_percentual || 0}%`, color: (d.performance_percentual || 0) >= 80 ? 'text-success' : 'text-destructive', bg: (d.performance_percentual || 0) >= 80 ? 'bg-success-soft' : 'bg-destructive/10' },
              { icon: Award, label: 'CSAT', value: `${d.csat_individual || 0}%`, color: (d.csat_individual || 0) >= 85 ? 'text-success' : 'text-warning', bg: 'bg-info-soft' },
              { icon: CheckCircle, label: 'SLA Cumprido', value: slaPct ? `${slaPct}%` : 'N/A', color: slaPct >= 80 ? 'text-success' : 'text-destructive', bg: slaPct >= 80 ? 'bg-success-soft' : 'bg-destructive/10' },
              { icon: MessageSquare, label: 'Chats', value: d.chats_atendidos || 0, color: 'text-primary', bg: 'bg-info-soft' },
              { icon: BarChart3, label: 'Ligações', value: d.ligacoes_atendidas || 0, color: 'text-primary', bg: 'bg-info-soft' },
              { icon: Award, label: 'Pontos/Trim.', value: (d.pontuacao_trimestre || 0).toFixed(0), color: 'text-critical', bg: 'bg-critical-soft' },
            ].map(item => (
              <div key={item.label} className={`p-3 rounded-xl ${item.bg}`}>
                <div className="flex items-center gap-1 mb-1">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Radar + Gráficos */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Visão Geral</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <Radar name="Desempenho" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {motivosBarData.length > 0 ? (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Top Motivos de Tratativas</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={motivosBarData} layout="vertical" margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                        {motivosBarData.map((_, i) => <Cell key={i} fill={['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444'][i % 5]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : tiposBarData.length > 0 ? (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Tratativas por Tipo</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={tiposBarData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Detalhes extras */}
          {((d.contestacoes_total || 0) > 0 || (d.reaberturas || 0) > 0 || (d.cx_nota_media || 0) > 0) && (
            <div className="grid sm:grid-cols-3 gap-3">
              {(d.contestacoes_total || 0) > 0 && (
                <div className="p-3 bg-muted border rounded-lg">
                  <p className="text-xs text-muted-foreground">Contestações</p>
                  <p className="text-lg font-bold text-foreground">{d.contestacoes_resolvidas}/{d.contestacoes_total}</p>
                  {(d.valor_recuperado_total || 0) > 0 && <p className="text-xs text-success">R$ {d.valor_recuperado_total.toFixed(2)} recuperado</p>}
                </div>
              )}
              {(d.reaberturas || 0) > 0 && (
                <div className="p-3 bg-warning-soft border border-warning/25 rounded-lg">
                  <p className="text-xs text-warning">Reaberturas</p>
                  <p className="text-lg font-bold text-warning">{d.reaberturas}</p>
                </div>
              )}
              {(d.cx_nota_media || 0) > 0 && (
                <div className="p-3 bg-info-soft border border-info/25 rounded-lg">
                  <p className="text-xs text-primary">Nota CX Média</p>
                  <p className="text-lg font-bold text-primary">{d.cx_nota_media}</p>
                  <p className="text-xs text-primary">{d.cx_total_avaliacoes} avaliações</p>
                </div>
              )}
            </div>
          )}

          {/* Insights */}
          {insights.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-warning" />
                Insights & Pontos de Atenção
              </p>
              <div className="space-y-2">
                {insights.map((ins, i) => <InsightCard key={i} ins={ins} />)}
              </div>
            </div>
          )}

          {/* Comentário do gestor */}
          {envio.comentario_gestor && (
            <Card className="border-0 bg-info-soft border border-info/25">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-primary">Comentário do Gestor</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-foreground whitespace-pre-wrap">{envio.comentario_gestor}</p></CardContent>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* REFLEXÃO HANSEI — apenas para agente */}
          {/* ═══════════════════════════════════════════════════════ */}
          {!isGestor && (
            <>
              {/* Seção de Reflexão Guiada */}
              <Card className="border-0 shadow-sm border border-purple-100 bg-info-soft/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-primary">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    Reflexão Hansei
                  </CardTitle>
                  <p className="text-xs text-primary">Responda com honestidade. Suas respostas orientam sua melhoria contínua.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-foreground">O que funcionou bem nesta semana?</Label>
                    <Textarea
                      rows={2}
                      className="mt-1 bg-card"
                      value={reflexao.q1}
                      onChange={e => setReflexao(r => ({ ...r, q1: e.target.value }))}
                      placeholder="Ex: consegui resolver os casos mais complexos com mais agilidade..."
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-foreground">O que poderia ter sido melhor na execução dos atendimentos?</Label>
                    <Textarea
                      rows={2}
                      className="mt-1 bg-card"
                      value={reflexao.q2}
                      onChange={e => setReflexao(r => ({ ...r, q2: e.target.value }))}
                      placeholder="Ex: preciso investigar mais antes de encerrar, algumas soluções não foram efetivas..."
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-foreground">Qual ajuste ou melhoria você pretende aplicar na próxima semana?</Label>
                    <Textarea
                      rows={2}
                      className="mt-1 bg-card"
                      value={reflexao.q3}
                      onChange={e => setReflexao(r => ({ ...r, q3: e.target.value }))}
                      placeholder="Ex: vou confirmar com o cliente se o problema foi resolvido antes de encerrar..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Ação de Melhoria */}
              <Card className="border-0 shadow-sm border border-amber-100 bg-warning-soft/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-warning">
                    <Zap className="w-4 h-4 text-warning" />
                    Ação de Melhoria
                  </CardTitle>
                  <p className="text-xs text-warning">Selecione a prática que você vai priorizar no próximo período.</p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {ACOES_MELHORIA.map((acao, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAcaoSelecionada(acaoSelecionada === acao ? '' : acao)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          acaoSelecionada === acao
                            ? 'bg-warning border-amber-500 text-white font-medium'
                            : 'bg-card border-warning/30 text-warning hover:bg-warning-soft'
                        }`}
                      >
                        {acao}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Área de feedback / sentimento + envio */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Comentário Geral & Sentimento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {envioComentarios.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {envioComentarios.map(c => (
                        <div key={c.id} className="p-3 bg-muted rounded-lg text-sm">
                          <div className="flex gap-2 mb-1">
                            <Badge variant="outline" className="text-xs capitalize">{c.sentimento}</Badge>
                            <span className="text-xs text-muted-foreground">{formatDateSP(c.data_comentario)}</span>
                          </div>
                          <p className="text-foreground whitespace-pre-wrap">{c.comentario}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <Select value={feedbackForm.sentimento} onValueChange={v => setFeedbackForm(f => ({ ...f, sentimento: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positivo">Positivo — estou bem com os resultados</SelectItem>
                      <SelectItem value="neutro">Neutro — posso melhorar</SelectItem>
                      <SelectItem value="negativo">Negativo — preciso melhorar muito</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    rows={3}
                    value={feedbackForm.comentario}
                    onChange={e => setFeedbackForm(f => ({ ...f, comentario: e.target.value }))}
                    placeholder="Adicione qualquer observação extra sobre o período (opcional)..."
                  />
                  <Button
                    onClick={handleEnviarFeedbackCompleto}
                    disabled={(!feedbackForm.comentario.trim() && !reflexao.q1.trim() && !reflexao.q2.trim() && !reflexao.q3.trim() && !acaoSelecionada) || isEnviandoFeedback}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isEnviandoFeedback ? 'Enviando...' : 'Enviar Reflexão'}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Comentários para gestor (somente leitura) */}
          {isGestor && envioComentarios.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Reflexões do Colaborador</p>
              <div className="space-y-2">
                {envioComentarios.map(c => (
                  <div key={c.id} className="p-3 bg-muted border rounded-lg text-sm">
                    <div className="flex gap-2 mb-1">
                      <Badge variant="outline" className="text-xs capitalize">{c.sentimento}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDateSP(c.data_comentario)}</span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{c.comentario}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}