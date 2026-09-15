import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RotateCcw, User } from 'lucide-react';
import { TIPOS_CONFIG, PRIORIDADE_CONFIG, sugerirProximoAgente } from './distribuicaoUtils';

// Usar fuso SP para não criar atribuição com data de ontem (ex: 23h SP = dia seguinte UTC)
function hoje() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}
function horaAgora() {
  return new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function DialogNovaAtribuicao({ open, onClose, onSalvar, agentes, distribuicoes, isPending }) {
  const [form, setForm] = useState({
    agente_id: '', ticket_id: '', tipo_tratativa: '', prioridade: 'media',
    turno: 'manha', data_atribuicao: hoje(), horario_atribuicao: horaAgora(), observacao: '',
  });
  const [overrideConfirmado, setOverrideConfirmado] = useState(false);
  const [justificativaOverride, setJustificativaOverride] = useState('');

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const sugestao = useMemo(() => {
    if (!form.tipo_tratativa) return null;
    return sugerirProximoAgente(form.tipo_tratativa, agentes, distribuicoes);
  }, [form.tipo_tratativa, agentes, distribuicoes]);

  const agenteAtual = agentes.find(a => a.id === form.agente_id);
  const ehOverride = sugestao && form.agente_id && sugestao.sugerido?.id !== form.agente_id;

  // Última atribuição deste agente neste tipo
  const ultimaAtribuicaoAgente = useMemo(() => {
    if (!form.agente_id || !form.tipo_tratativa) return null;
    const doAgenteTipo = distribuicoes
      .filter(d => d.agente_id === form.agente_id && d.tipo_tratativa === form.tipo_tratativa)
      .sort((a, b) => {
        const da = `${a.data_atribuicao} ${a.horario_atribuicao || ''}`;
        const db = `${b.data_atribuicao} ${b.horario_atribuicao || ''}`;
        return db.localeCompare(da);
      });
    return doAgenteTipo[0] || null;
  }, [form.agente_id, form.tipo_tratativa, distribuicoes]);

  const handleSalvar = () => {
    if (!form.agente_id || !form.ticket_id || !form.tipo_tratativa) return;
    onSalvar({
      ...form,
      override_rodizio: ehOverride && overrideConfirmado,
      justificativa_override: ehOverride ? justificativaOverride : '',
      agente_sugerido_id: sugestao?.sugerido?.id || '',
      agente_sugerido_nome: sugestao?.sugerido?.nome_completo || '',
    });
    // Reset
    setForm({ agente_id: '', ticket_id: '', tipo_tratativa: '', prioridade: 'media', turno: 'manha', data_atribuicao: hoje(), horario_atribuicao: horaAgora(), observacao: '' });
    setOverrideConfirmado(false);
    setJustificativaOverride('');
  };

  const podeConfirmar = !ehOverride || overrideConfirmado;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-4 h-4" /> Nova Atribuição de Tratativa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Tipo */}
          <div>
            <Label className="text-xs">Tipo de Tratativa <span className="text-destructive">*</span></Label>
            <Select value={form.tipo_tratativa} onValueChange={v => { f('tipo_tratativa', v); setOverrideConfirmado(false); }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>
                {Object.entries(TIPOS_CONFIG).map(([k, cfg]) => (
                  <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sugestão do Rodízio */}
          {sugestao && (
            <div className="p-3 bg-info-soft border border-indigo-200 rounded-lg">
              <p className="text-xs font-semibold text-primary flex items-center gap-1 mb-1">
                <RotateCcw className="w-3 h-3" /> Sugestão do Rodízio Assistido
              </p>
              <p className="text-sm font-bold text-primary">{sugestao.sugerido?.nome_completo}</p>
              {sugestao.ultimaAtribuicao ? (
                <p className="text-xs text-primary">Última: #{sugestao.ultimaAtribuicao.ticket_id} em {sugestao.ultimaAtribuicao.data_atribuicao}</p>
              ) : (
                <p className="text-xs text-success">Nunca recebeu este tipo</p>
              )}
            </div>
          )}

          {/* Agente */}
          <div>
            <Label className="text-xs">Agente Responsável <span className="text-destructive">*</span></Label>
            <Select value={form.agente_id} onValueChange={v => { f('agente_id', v); setOverrideConfirmado(false); }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o agente" /></SelectTrigger>
              <SelectContent>
                {agentes.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome_completo}
                    {sugestao?.sugerido?.id === a.id ? ' ✓ Sugerido' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Alerta de override */}
          {ehOverride && !overrideConfirmado && (
            <Alert className="border-warning/30 bg-warning-soft">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <AlertDescription className="text-warning text-xs space-y-2">
                <p>
                  <strong>{agenteAtual?.nome_completo}</strong> não é o próximo no rodízio para <strong>{TIPOS_CONFIG[form.tipo_tratativa]?.label}</strong>.
                </p>
                {ultimaAtribuicaoAgente && (
                  <p>Última atribuição deste agente neste canal: Ticket #{ultimaAtribuicaoAgente.ticket_id} em {ultimaAtribuicaoAgente.data_atribuicao} às {ultimaAtribuicaoAgente.horario_atribuicao}</p>
                )}
                <p>Próximo sugerido: <strong>{sugestao.sugerido?.nome_completo}</strong></p>
                <div>
                  <Label className="text-xs text-warning">Justificativa do override (opcional)</Label>
                  <Textarea
                    rows={2}
                    className="mt-1 text-xs"
                    placeholder="Ex: Agente sugerido está em reunião..."
                    value={justificativaOverride}
                    onChange={e => setJustificativaOverride(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => { f('agente_id', sugestao.sugerido?.id || ''); }}>
                    Usar sugerido
                  </Button>
                  <Button size="sm" className="bg-warning hover:bg-amber-700 text-white" onClick={() => setOverrideConfirmado(true)}>
                    Atribuir mesmo assim
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {ehOverride && overrideConfirmado && (
            <div className="p-2 bg-warning-soft border border-warning/25 rounded text-xs text-warning">
              Override confirmado — será registrado no histórico do rodízio.
            </div>
          )}

          {/* Ticket */}
          <div>
            <Label className="text-xs">ID do Ticket <span className="text-destructive">*</span></Label>
            <Input value={form.ticket_id} onChange={e => f('ticket_id', e.target.value)} placeholder="Ex: 975357" className="mt-1 font-mono" />
          </div>

          {/* Prioridade e turno */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Prioridade</Label>
              <Select value={form.prioridade} onValueChange={v => f('prioridade', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORIDADE_CONFIG).map(([k, cfg]) => (
                    <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Turno</Label>
              <Select value={form.turno} onValueChange={v => f('turno', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha">Manhã</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data e hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Data</Label>
              <Input type="date" value={form.data_atribuicao} onChange={e => f('data_atribuicao', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Horário</Label>
              <Input type="time" value={form.horario_atribuicao} onChange={e => f('horario_atribuicao', e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Observação</Label>
            <Input value={form.observacao} onChange={e => f('observacao', e.target.value)} placeholder="Opcional" className="mt-1" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={handleSalvar}
              disabled={!form.agente_id || !form.ticket_id || !form.tipo_tratativa || !podeConfirmar || isPending}
              className="bg-primary hover:bg-indigo-700"
            >
              {isPending ? 'Registrando...' : 'Registrar Atribuição'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}