import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RotateCcw, User } from 'lucide-react';
import { TIPOS_CONFIG, PRIORIDADE_CONFIG } from './distribuicaoUtils';
import { turnoDoHorario, ROTULO_TURNO } from '@/lib/escalas';
import { indisponiveisEm, filaDoCanal, MOTIVOS_OVERRIDE, montarJustificativa, dataCurta } from '@/lib/equidade';
import PainelLateral, { RodapeFixo } from '@/components/ui/PainelLateral';

// Usar fuso SP para não criar atribuição com data de ontem (ex: 23h SP = dia seguinte UTC)
function hoje() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}
function horaAgora() {
  return new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false });
}

const formVazio = () => ({
  agente_id: '', ticket_id: '', tipo_tratativa: '', prioridade: 'media',
  data_atribuicao: hoje(), horario_atribuicao: horaAgora(), observacao: '',
});

/**
 * Nova atribuição. O sistema já tira da fila quem está de férias ou ausente
 * na data escolhida; a lista de pessoas vem NA ORDEM do rodízio, com a última
 * atribuição do canal e quantas já recebeu no mês — para não precisar abrir
 * o histórico. Fora da ordem, o motivo é obrigatório.
 */
export default function DialogNovaAtribuicao({ open, onClose, onSalvar, agentes, distribuicoes, solicitacoes = [], atribuicoes = [], inicial, isPending }) {
  const [form, setForm] = useState(formVazio);
  const [overrideConfirmado, setOverrideConfirmado] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [detalhe, setDetalhe] = useState('');

  // Abre já preenchido quando vem do quadro do rodízio.
  useEffect(() => {
    if (!open) return;
    setForm({ ...formVazio(), tipo_tratativa: inicial?.tipo ?? '', agente_id: inicial?.agenteId ?? '' });
    setOverrideConfirmado(false);
    setMotivo('');
    setDetalhe('');
  }, [open, inicial]);

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const indisponiveis = useMemo(
    () => indisponiveisEm(form.data_atribuicao, { solicitacoes, atribuicoes }),
    [form.data_atribuicao, solicitacoes, atribuicoes],
  );

  const rodizio = useMemo(() => {
    if (!form.tipo_tratativa) return null;
    return filaDoCanal(form.tipo_tratativa, agentes, distribuicoes, indisponiveis, form.data_atribuicao);
  }, [form.tipo_tratativa, agentes, distribuicoes, indisponiveis, form.data_atribuicao]);

  const sugerido = rodizio?.sugerido ?? null;
  const agenteAtual = agentes.find(a => a.id === form.agente_id);
  const linhaAtual = rodizio?.fila.find(l => l.agente.id === form.agente_id) ?? null;
  const ehOverride = Boolean(sugerido && form.agente_id && sugerido.agente.id !== form.agente_id);

  // O turno sai do horário da atribuição (08:00–11:59 manhã, 12:00 em diante
  // tarde). Ele alimenta o relatório de produtividade por turno, e escolher à
  // mão fazia a conta sair diferente do horário registrado.
  const turno = turnoDoHorario(form.horario_atribuicao);

  const handleSalvar = () => {
    if (!form.agente_id || !form.ticket_id || !form.tipo_tratativa) return;
    onSalvar({
      ...form,
      turno,
      override_rodizio: ehOverride && overrideConfirmado,
      justificativa_override: ehOverride ? montarJustificativa(motivo, detalhe) : '',
      agente_sugerido_id: sugerido?.agente.id || '',
      agente_sugerido_nome: sugerido?.agente.nome_completo || '',
    });
  };

  const podeConfirmar = !ehOverride || overrideConfirmado;

  const rotuloDaLinha = (l) => {
    if (!l.disponivel) return `${l.agente.nome_completo} — ${l.motivo}${l.ate ? ` até ${dataCurta(l.ate)}` : ''}`;
    const ultima = l.ultima ? `última ${dataCurta(l.ultima.data_atribuicao)}` : 'nunca recebeu';
    return `${l.posicao}. ${l.agente.nome_completo} — ${ultima}, ${l.noMes} no mês${l.posicao === 1 ? ' (próxima)' : ''}`;
  };

  return (
    <PainelLateral
      open={open} onOpenChange={(v) => { if (!v) onClose(); }}
      largura="lg"
      titulo={<><User className="w-4 h-4" /> Nova Atribuição de Tratativa</>}
    >
        <div className="space-y-4 mt-2">
          {/* Tipo */}
          <div>
            <Label className="text-xs">Tipo de Tratativa <span className="text-destructive">*</span></Label>
            <Select value={form.tipo_tratativa} onValueChange={v => { f('tipo_tratativa', v); f('agente_id', ''); setOverrideConfirmado(false); }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>
                {Object.entries(TIPOS_CONFIG).map(([k, cfg]) => (
                  <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sugestão do Rodízio */}
          {rodizio && (
            <div className="p-3 bg-info-soft border border-primary/25 rounded-lg space-y-1">
              <p className="text-xs font-semibold text-primary flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Próxima do rodízio em {dataCurta(form.data_atribuicao)}
              </p>
              {sugerido ? (
                <>
                  <p className="text-sm font-bold text-primary">{sugerido.agente.nome_completo}</p>
                  <p className="text-xs text-primary">
                    {sugerido.ultima ? `Última: #${sugerido.ultima.ticket_id} em ${dataCurta(sugerido.ultima.data_atribuicao)}` : 'Nunca recebeu este tipo'}
                    {` · ${sugerido.noMes} no mês`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-primary">Ninguém disponível nesta data.</p>
              )}
              {rodizio.puladosAFrente.length > 0 && (
                <p className="text-xs text-warning">
                  Pulada: {rodizio.puladosAFrente.map(p => `${p.agente.nome_completo} (${p.motivo.toLowerCase()}${p.ate ? `, até ${dataCurta(p.ate)}` : ''})`).join('; ')}
                </p>
              )}
            </div>
          )}

          {/* Agente */}
          <div>
            <Label className="text-xs">Agente Responsável <span className="text-destructive">*</span></Label>
            <Select value={form.agente_id} onValueChange={v => { f('agente_id', v); setOverrideConfirmado(false); }} disabled={!form.tipo_tratativa}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={form.tipo_tratativa ? 'Selecione o agente' : 'Escolha o tipo primeiro'} /></SelectTrigger>
              <SelectContent>
                {(rodizio?.fila ?? []).map(l => (
                  <SelectItem key={l.agente.id} value={l.agente.id} disabled={!l.disponivel}>
                    {rotuloDaLinha(l)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">Na ordem do rodízio. Quem está ausente aparece no fim e não pode ser escolhida.</p>
          </div>

          {/* Fora da ordem: motivo obrigatório */}
          {ehOverride && !overrideConfirmado && (
            <Alert className="border-warning/30 bg-warning-soft">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <AlertDescription className="text-warning text-xs space-y-2">
                <p>
                  <strong>{agenteAtual?.nome_completo}</strong> não é a próxima do rodízio para <strong>{TIPOS_CONFIG[form.tipo_tratativa]?.label}</strong>
                  {linhaAtual?.ultima && <> (última em {dataCurta(linhaAtual.ultima.data_atribuicao)}, {linhaAtual.noMes} no mês)</>}.
                  A próxima é <strong>{sugerido.agente.nome_completo}</strong>.
                </p>
                <div>
                  <Label className="text-xs text-warning">Motivo <span className="text-destructive">*</span></Label>
                  <Select value={motivo} onValueChange={setMotivo}>
                    <SelectTrigger className="mt-1 bg-card text-foreground"><SelectValue placeholder="Por que fora da ordem?" /></SelectTrigger>
                    <SelectContent>
                      {MOTIVOS_OVERRIDE.map(m => <SelectItem key={m.valor} value={m.valor}>{m.rotulo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea
                    rows={2}
                    className="mt-2 text-xs bg-card text-foreground"
                    placeholder="Detalhe (opcional)"
                    value={detalhe}
                    onChange={e => setDetalhe(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => f('agente_id', sugerido.agente.id)}>
                    Usar a próxima
                  </Button>
                  <Button size="sm" className="bg-warning hover:bg-warning text-warning-foreground" disabled={!motivo} onClick={() => setOverrideConfirmado(true)}>
                    Atribuir mesmo assim
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {ehOverride && overrideConfirmado && (
            <div className="p-2 bg-warning-soft border border-warning/25 rounded text-xs text-warning">
              Fora do rodízio: {montarJustificativa(motivo, detalhe)}. Fica registrado no histórico.
            </div>
          )}

          {/* Ticket */}
          <div>
            <Label className="text-xs">ID do Ticket <span className="text-destructive">*</span></Label>
            <Input value={form.ticket_id} onChange={e => f('ticket_id', e.target.value)} placeholder="Ex: 975357" className="mt-1 font-mono" />
          </div>

          {/* Prioridade e turno — o turno sai do horário, não se escolhe */}
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
              <div className="mt-1 flex h-10 items-center rounded-md border border-border bg-muted px-3 text-sm text-foreground">
                {ROTULO_TURNO[turno] ?? '—'}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Pelo horário: até 11:59 é manhã, das 12:00 em diante é tarde.</p>
            </div>
          </div>

          {/* Data e hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Data</Label>
              <Input type="date" value={form.data_atribuicao} onChange={e => { f('data_atribuicao', e.target.value); f('agente_id', ''); setOverrideConfirmado(false); }} className="mt-1" />
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

          <RodapeFixo>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={handleSalvar}
              disabled={!form.agente_id || !form.ticket_id || !form.tipo_tratativa || !podeConfirmar || isPending}
              className="bg-primary hover:bg-primary"
            >
              {isPending ? 'Registrando...' : 'Registrar Atribuição'}
            </Button>
          </RodapeFixo>
        </div>
    </PainelLateral>
  );
}
