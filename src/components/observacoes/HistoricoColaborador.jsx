import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import RichTextViewer from '@/components/ui/RichTextViewer';
import { formatDateSP } from '@/components/utils/helpers';
import {
  ArrowLeft, Plus, Eye, EyeOff, Trash2, Sparkles, Calendar, User, Filter, MessageSquare
} from 'lucide-react';

const tipoLabels = {
  observacao_diaria: 'Observação Diária',
  feedback_positivo: 'Feedback Positivo',
  feedback_regular: 'Feedback Regular',
  feedback_negativo: 'Feedback Negativo',
  one_on_one: 'One-on-One',
  kaizen: 'Kaizen',
  hansei: 'Hansei',
  keidoh: 'Keidoh',
  registro_livre: 'Registro Livre',
  feedback: 'Feedback',
  registro_diario: 'Registro Diário'
};

const tipoCores = {
  feedback_positivo: 'bg-success-soft text-success border-success/25',
  feedback_negativo: 'bg-destructive/10 text-destructive border-destructive/25',
  feedback_regular: 'bg-warning-soft text-warning border-warning/25',
  one_on_one: 'bg-info-soft text-primary border-info/25',
  kaizen: 'bg-success-soft text-success border-success/25',
  hansei: 'bg-info-soft text-primary border-info/25',
  keidoh: 'bg-info-soft text-primary border-primary/25',
  registro_livre: 'bg-muted text-foreground border-border',
  observacao_diaria: 'bg-info-soft text-info border-info/25',
};

function ObservacaoCard({ obs, onView, onDelete, podeExcluir }) {
  const tipoLabel = tipoLabels[obs.tipo] || obs.tipo;
  const coresTipo = tipoCores[obs.tipo] || 'bg-muted text-foreground border-border';

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge className={`text-xs border ${coresTipo}`}>{tipoLabel}</Badge>
            {obs.visibilidade === 'gestor' ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <EyeOff className="w-3 h-3" /> Privado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-success">
                <Eye className="w-3 h-3" /> Visível ao agente
              </span>
            )}
          </div>

          {obs.titulo && (
            <h4 className="font-medium text-foreground text-sm mb-1">{obs.titulo}</h4>
          )}

          <div className="text-xs text-muted-foreground line-clamp-2 mb-3">
            <RichTextViewer content={obs.conteudo} maxHeight="60px" />
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {obs.autor_nome}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDateSP(obs.data_registro || obs.created_date, 'DD/MM/YYYY')}
            </span>
            {(obs.soft_skills_avaliadas && Object.keys(obs.soft_skills_avaliadas).length > 0) && (
              <span className="text-primary">Skills avaliadas</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(obs)}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
          {podeExcluir && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(obs)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HistoricoColaborador({
  colaborador,
  observacoes,
  pdis,
  onBack,
  onNovaObservacao,
  isGestor,
  colaboradorAtual,
  onDelete
}) {
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');
  const [filtroPDI, setFiltroPDI] = useState(false);
  const [viewObs, setViewObs] = useState(null);
  const [deleteObs, setDeleteObs] = useState(null);

  const obsDoColab = observacoes
    .filter(o => o.colaboradores_ids?.includes(colaborador.id))
    .sort((a, b) => new Date(b.data_registro || b.created_date) - new Date(a.data_registro || a.created_date));

  const todosTipos = [...new Set(obsDoColab.map(o => o.tipo).filter(Boolean))];

  const obsFiltradas = obsDoColab.filter(o => {
    if (filtroTipo !== 'todos' && o.tipo !== filtroTipo) return false;
    const data = new Date(o.data_registro || o.created_date);
    if (filtroInicio && data < new Date(filtroInicio)) return false;
    if (filtroFim && data > new Date(filtroFim + 'T23:59:59')) return false;
    return true;
  });

  const positivos = obsDoColab.filter(o => o.tipo === 'feedback_positivo' || o.tipo?.toLowerCase().includes('positivo')).length;
  const negativos = obsDoColab.filter(o => o.tipo === 'feedback_negativo' || o.tipo?.toLowerCase().includes('negativo')).length;
  const pdisAtivos = pdis.filter(p => p.colaborador_id === colaborador.id && p.status === 'em_andamento').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
      </div>

      {/* Perfil do Colaborador */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={colaborador.foto_url} />
            <AvatarFallback className="bg-primary text-white text-xl font-semibold">
              {colaborador.nome_completo?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{colaborador.nome_completo}</h2>
            <p className="text-muted-foreground text-sm">{colaborador.cargo_atual}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full">
                {obsDoColab.length} registro{obsDoColab.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xs bg-success-soft text-success px-3 py-1 rounded-full">
                {positivos} positivo{positivos !== 1 ? 's' : ''}
              </span>
              <span className="text-xs bg-destructive/10 text-destructive px-3 py-1 rounded-full">
                {negativos} negativo{negativos !== 1 ? 's' : ''}
              </span>
              <span className="text-xs bg-info-soft text-primary px-3 py-1 rounded-full">
                {pdisAtivos} PDI{pdisAtivos !== 1 ? 's' : ''} ativo{pdisAtivos !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          {isGestor && (
            <Button onClick={onNovaObservacao} className="bg-primary hover:bg-primary/90 self-start sm:self-center">
              <Plus className="w-4 h-4 mr-2" />
              Nova Observação
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Tipo de registro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {todosTipos.map(tipo => (
                <SelectItem key={tipo} value={tipo}>
                  {tipoLabels[tipo] || tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filtroInicio}
            onChange={e => setFiltroInicio(e.target.value)}
            className="h-9 text-sm"
            placeholder="Data início"
          />
          <Input
            type="date"
            value={filtroFim}
            onChange={e => setFiltroFim(e.target.value)}
            className="h-9 text-sm"
            placeholder="Data fim"
          />
        </div>
        {(filtroTipo !== 'todos' || filtroInicio || filtroFim) && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs text-muted-foreground"
            onClick={() => { setFiltroTipo('todos'); setFiltroInicio(''); setFiltroFim(''); }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Lista de Registros */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {obsFiltradas.length} registro{obsFiltradas.length !== 1 ? 's' : ''} encontrado{obsFiltradas.length !== 1 ? 's' : ''}
        </p>

        {obsFiltradas.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum registro encontrado</p>
            <p className="text-muted-foreground text-sm mt-1">Tente ajustar os filtros.</p>
          </div>
        ) : (
          obsFiltradas.map(obs => (
            <ObservacaoCard
              key={obs.id}
              obs={obs}
              onView={setViewObs}
              onDelete={setDeleteObs}
              podeExcluir={isGestor || obs.autor_id === colaboradorAtual?.id}
            />
          ))
        )}
      </div>

      {/* Dialog Visualização */}
      <Dialog open={!!viewObs} onOpenChange={() => setViewObs(null)}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewObs?.titulo || tipoLabels[viewObs?.tipo] || viewObs?.tipo}</DialogTitle>
          </DialogHeader>
          {viewObs && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-xs border ${tipoCores[viewObs.tipo] || 'bg-muted text-foreground border-border'}`}>
                  {tipoLabels[viewObs.tipo] || viewObs.tipo}
                </Badge>
                {viewObs.visibilidade === 'gestor' ? (
                  <Badge variant="outline"><EyeOff className="w-3 h-3 mr-1" />Apenas Gestor</Badge>
                ) : (
                  <Badge variant="outline"><Eye className="w-3 h-3 mr-1" />Visível ao Agente</Badge>
                )}
              </div>

              <RichTextViewer content={viewObs.conteudo} maxHeight="350px" />

              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Por: <strong>{viewObs.autor_nome}</strong></span>
                <span>Em: <strong>{formatDateSP(viewObs.data_registro || viewObs.created_date, 'DD/MM/YYYY')}</strong></span>
              </div>

              {viewObs.analise_swot && Object.values(viewObs.analise_swot).some(v => v?.length > 0) && (
                <Card className="bg-info-soft border-info/25">
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Análise SWOT</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-xs px-4 pb-4">
                    {viewObs.analise_swot.forcas?.length > 0 && <div><p className="font-medium text-success mb-1">Forças</p><ul className="list-disc list-inside text-muted-foreground">{viewObs.analise_swot.forcas.map((f,i) => <li key={i}>{f}</li>)}</ul></div>}
                    {viewObs.analise_swot.fraquezas?.length > 0 && <div><p className="font-medium text-destructive mb-1">Fraquezas</p><ul className="list-disc list-inside text-muted-foreground">{viewObs.analise_swot.fraquezas.map((f,i) => <li key={i}>{f}</li>)}</ul></div>}
                    {viewObs.analise_swot.oportunidades?.length > 0 && <div><p className="font-medium text-primary mb-1">Oportunidades</p><ul className="list-disc list-inside text-muted-foreground">{viewObs.analise_swot.oportunidades.map((f,i) => <li key={i}>{f}</li>)}</ul></div>}
                    {viewObs.analise_swot.ameacas?.length > 0 && <div><p className="font-medium text-warning mb-1">Ameaças</p><ul className="list-disc list-inside text-muted-foreground">{viewObs.analise_swot.ameacas.map((f,i) => <li key={i}>{f}</li>)}</ul></div>}
                  </CardContent>
                </Card>
              )}

              {(viewObs.soft_skills_avaliadas && Object.keys(viewObs.soft_skills_avaliadas).length > 0) ||
               (viewObs.hard_skills_avaliadas && Object.keys(viewObs.hard_skills_avaliadas).length > 0) ? (
                <Card className="bg-info-soft border-primary/25">
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Avaliação de Skills</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm px-4 pb-4">
                    {viewObs.soft_skills_avaliadas && Object.keys(viewObs.soft_skills_avaliadas).length > 0 && (
                      <div><p className="text-xs font-medium mb-2">Soft Skills</p>{Object.entries(viewObs.soft_skills_avaliadas).map(([s,v]) => <div key={s} className="flex justify-between py-0.5"><span className="text-muted-foreground text-xs">{s}</span><Badge variant="outline">{v}/10</Badge></div>)}</div>
                    )}
                    {viewObs.hard_skills_avaliadas && Object.keys(viewObs.hard_skills_avaliadas).length > 0 && (
                      <div><p className="text-xs font-medium mb-2">Hard Skills</p>{Object.entries(viewObs.hard_skills_avaliadas).map(([s,v]) => <div key={s} className="flex justify-between py-0.5"><span className="text-muted-foreground text-xs">{s}</span><Badge variant="outline">{v}/10</Badge></div>)}</div>
                    )}
                  </CardContent>
                </Card>
              ) : null}

              {(viewObs.sugestao_ia_soft_skills || viewObs.sugestao_ia_hard_skills) && (
                <Card className="bg-info-soft border-info/25">
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary"/>Sugestão da IA</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm px-4 pb-4">
                    {viewObs.sugestao_ia_soft_skills && <div><p className="text-xs font-medium mb-2">Soft Skills</p>{Object.entries(viewObs.sugestao_ia_soft_skills).map(([s,v]) => <div key={s} className="flex justify-between py-0.5"><span className="capitalize text-muted-foreground text-xs">{s.replace('_',' ')}</span><span className="text-xs">{v}/10</span></div>)}</div>}
                    {viewObs.sugestao_ia_hard_skills && <div><p className="text-xs font-medium mb-2">Hard Skills</p>{Object.entries(viewObs.sugestao_ia_hard_skills).map(([s,v]) => <div key={s} className="flex justify-between py-0.5"><span className="capitalize text-muted-foreground text-xs">{s.replace('_',' ')}</span><span className="text-xs">{v}/10</span></div>)}</div>}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteObs}
        onOpenChange={() => setDeleteObs(null)}
        title="Excluir Observação"
        description="Tem certeza que deseja excluir esta observação? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => { onDelete(deleteObs.id); setDeleteObs(null); }}
        variant="danger"
      />
    </div>
  );
}