import React, { useState, useMemo, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Plus, Trash2, Calendar, AlertTriangle, Info, ChevronDown, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, differenceInCalendarDays, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { parseDataLocal, fmtDate, identificarCiclo, calcularStatus } from '@/pages/GestaoFerias';

const STATUS_CONFIG = {
  em_aquisicao: { label: 'Em Aquisição', cls: 'bg-muted text-muted-foreground' },
  disponivel: { label: 'Disponível', cls: 'bg-success-soft text-success' },
  parcialmente_utilizado: { label: 'Parcial', cls: 'bg-info-soft text-primary' },
  utilizado: { label: 'Utilizado', cls: 'bg-muted text-muted-foreground' },
  vencendo: { label: 'Vencendo ', cls: 'bg-warning-soft text-warning' },
  vencido: { label: 'Vencido ', cls: 'bg-destructive/10 text-destructive' },
};

// ── Dialog: Registrar Férias ─────────────────────────────────────────────────

function RegistrarFeriasDialog({ open, onOpenChange, ciclos, onSalvar, loading }) {
  const [form, setForm] = useState({ data_inicio: '', data_fim: '', observacao: '', status: 'agendado', abono_dias: 0 });

  React.useEffect(() => {
    if (open) setForm({ data_inicio: '', data_fim: '', observacao: '', status: 'agendado', abono_dias: 0 });
  }, [open]);

  const diasCalc = React.useMemo(() => {
    if (!form.data_inicio || !form.data_fim) return 0;
    try { return differenceInCalendarDays(parseISO(form.data_fim), parseISO(form.data_inicio)) + 1; }
    catch { return 0; }
  }, [form.data_inicio, form.data_fim]);

  // Identifica automaticamente o ciclo alvo
  const cicloAlvo = React.useMemo(() => {
    if (!form.data_inicio) return null;
    return identificarCiclo(ciclos, form.data_inicio);
  }, [form.data_inicio, ciclos]);

  const diasFeriasDisp = cicloAlvo ? (cicloAlvo.dias_direito || 30) - (cicloAlvo.abono_dias || 0) : 30;
  const disponiveis = cicloAlvo ? Math.max(0, diasFeriasDisp - (cicloAlvo.dias_utilizados || 0)) : 0;
  const fragmentosAtuais = (cicloAlvo?.fragmentos || []).length;

  const handleSalvar = () => {
    if (!form.data_inicio || !form.data_fim) { toast.error('Preencha as datas'); return; }
    if (diasCalc <= 0) { toast.error('Data fim deve ser após data início'); return; }

    // Alertas CLT (não bloqueiam)
    if (!cicloAlvo) toast.warning('Atenção: não foi possível identificar o período aquisitivo automaticamente.');
    if (fragmentosAtuais >= 3) toast.warning('Atenção CLT: máximo recomendado de 3 períodos por ciclo.');
    if (cicloAlvo && diasCalc > disponiveis) toast.warning(`Atenção: ${diasCalc} dias lançados, mas apenas ${disponiveis} disponíveis no ciclo.`);
    if (diasCalc < 5) toast.warning('Atenção CLT: período inferior a 5 dias corridos.');

    onSalvar({ id: Date.now().toString(), ...form, dias: diasCalc, abono_dias: form.abono_dias || 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Férias</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data Início *</Label>
              <Input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Data Fim *</Label>
              <Input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} className="mt-1" />
            </div>
          </div>

          {diasCalc > 0 && (
            <div className={`p-3 rounded-lg text-sm font-medium ${diasCalc >= 14 ? 'bg-success-soft text-success' : diasCalc >= 5 ? 'bg-info-soft text-primary' : 'bg-destructive/10 text-destructive'}`}>
              {diasCalc} dias de férias
              {diasCalc >= 14 && <span className="ml-2 text-xs opacity-70">(✓ mínimo 14 dias CLT)</span>}
            </div>
          )}

          {/* Identificação automática do ciclo */}
          {form.data_inicio && (
            cicloAlvo ? (
              <Alert className="bg-info-soft border-info/25">
                <Info className="w-4 h-4 text-primary" />
                <AlertDescription className="text-primary text-sm">
                  <strong>Período aquisitivo identificado automaticamente:</strong><br />
                  {fmtDate(cicloAlvo.aquisitivo_inicio)} — {fmtDate(cicloAlvo.aquisitivo_fim)}<br />
                  <span className="text-xs opacity-70">{disponiveis} dias disponíveis · {fragmentosAtuais}/3 períodos registrados</span>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-destructive/10 border-destructive/25">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <AlertDescription className="text-destructive text-sm">
                  Não foi encontrado período aquisitivo para esta data. Verifique se o ciclo correspondente existe.
                </AlertDescription>
              </Alert>
            )
          )}

          {/* Abono Pecuniário */}
          <div className="border border-border rounded-xl p-4 space-y-3 bg-warning-soft">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-warning" />
              <Label className="font-semibold text-warning">Abono Pecuniário (Venda de Dias)</Label>
            </div>
            <p className="text-xs text-warning">O colaborador pode vender até 10 dias do período de férias.</p>
            <div className="flex gap-3">
              {[0, 10].map(dias => (
                <button
                  key={dias}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, abono_dias: dias }))}
                  className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                    form.abono_dias === dias
                      ? 'border-amber-500 bg-warning text-white'
                      : 'border-border bg-card text-foreground hover:border-warning/30'
                  }`}
                >
                  {dias === 0 ? 'Sem abono' : `Vender 10 dias`}
                </button>
              ))}
            </div>
            {form.abono_dias === 10 && (
              <p className="text-xs text-warning bg-warning-soft rounded-lg p-2">
                O colaborador receberá o valor de 10 dias adicionais na remuneração de férias.
              </p>
            )}
          </div>

          <div>
            <Label>Status do período</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="em_execucao">Em execução</SelectItem>
                <SelectItem value="pendente_validacao">Pendente de validação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Observação</Label>
            <Input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} className="mt-1" placeholder="Opcional" />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={loading || !cicloAlvo} className="bg-success hover:bg-success/90">
              {loading ? 'Salvando...' : 'Registrar Férias'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Componente Principal ─────────────────────────────────────────────────────

export default function DetalheColaboradorFerias({ colaborador, ciclos, onBack, onAdicionarFragmento, onRemoverFragmento, onEditarCiclo, onDeletarCiclo, loadingMutation }) {
  const [dialogFerias, setDialogFerias] = useState(false);

  const ciclosOrdenados = [...ciclos].sort((a, b) =>
    (b.aquisitivo_inicio || '').localeCompare(a.aquisitivo_inicio || '')
  );

  const handleSalvarFerias = (frag) => {
    onAdicionarFragmento(frag);
    setDialogFerias(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" />Voltar
        </Button>
      </div>

      {/* Perfil */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={colaborador.foto_url} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xl font-semibold">
              {colaborador.nome_completo?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{colaborador.nome_completo}</h2>
            <p className="text-muted-foreground text-sm">{colaborador.cargo_atual}{colaborador.equipe_nome && ` • ${colaborador.equipe_nome}`}</p>
            {colaborador.data_admissao && (
              <p className="text-xs text-muted-foreground mt-1">Admissão: <strong>{fmtDate(colaborador.data_admissao)}</strong> — ciclos gerados automaticamente</p>
            )}
          </div>
          <Button onClick={() => setDialogFerias(true)} className="bg-success hover:bg-success/90 self-start sm:self-center">
            <Plus className="w-4 h-4 mr-2" />Registrar Férias
          </Button>
        </div>
      </div>

      {/* Lista de ciclos */}
      {ciclosOrdenados.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum ciclo cadastrado</p>
          <p className="text-xs text-muted-foreground mt-1">Os ciclos são gerados automaticamente ao abrir o perfil com data de admissão.</p>
        </div>
      ) : ciclosOrdenados.map(ciclo => {
        const status = calcularStatus(ciclo);
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.em_aquisicao;
        const diasDireito = ciclo.dias_direito || 30;
        const abono = ciclo.abono_dias || 0;
        const utilizados = ciclo.dias_utilizados || 0;
        const restantes = Math.max(0, diasDireito - abono - utilizados);
        const diasConcessivo = ciclo.concessivo_fim ? differenceInDays(parseDataLocal(ciclo.concessivo_fim), new Date()) : null;
        // Barra mostra dias de férias utilizados sobre o total disponível para férias (excluindo abono)
        const diasFerias = diasDireito - abono;
        const barPercent = diasFerias > 0 ? Math.min(100, (utilizados / diasFerias) * 100) : 0;

        return (
          <Card key={ciclo.id} className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base">
                    {fmtDate(ciclo.aquisitivo_inicio)} — {fmtDate(ciclo.aquisitivo_fim)}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Concessivo até: <strong>{fmtDate(ciclo.concessivo_fim)}</strong>
                    {diasConcessivo !== null && diasConcessivo <= 90 && status !== 'utilizado' && (
                      <span className="ml-2 text-destructive">{diasConcessivo < 0 ? '(VENCIDO)' : `(${diasConcessivo} dias)`}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={config.cls}>{config.label}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => { if (confirm('Excluir este ciclo?')) onDeletarCiclo(ciclo.id); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(status === 'vencendo' || status === 'vencido') && (
                <Alert className="border-warning/30 bg-warning-soft">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <AlertDescription className="text-warning text-sm">
                    {status === 'vencido' ? 'Férias vencidas! Risco trabalhista.' : `Férias devem ser concedidas até ${fmtDate(ciclo.concessivo_fim)}.`}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{diasDireito}</p>
                  <p className="text-xs text-muted-foreground">dias de direito</p>
                </div>
                <div className="bg-warning-soft rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-warning">{abono}</p>
                  <p className="text-xs text-warning">abono (vendidos)</p>
                </div>
                <div className="bg-info-soft rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-primary">{utilizados}</p>
                  <p className="text-xs text-primary">férias usufruídas</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${restantes > 0 ? 'bg-success-soft' : 'bg-muted'}`}>
                  <p className={`text-xl font-bold ${restantes > 0 ? 'text-success' : 'text-muted-foreground'}`}>{restantes}</p>
                  <p className="text-xs text-muted-foreground">restantes</p>
                </div>
              </div>

              <div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${barPercent >= 100 ? 'bg-slate-400' : barPercent > 70 ? 'bg-amber-400' : 'bg-primary'}`}
                    style={{ width: `${barPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{Math.round(barPercent)}% utilizado</p>
              </div>

              {/* Fragmentos */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Períodos registrados ({(ciclo.fragmentos || []).length}/3)</p>
                {(ciclo.fragmentos || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum período de férias registrado</p>
                ) : (
                  <div className="space-y-2">
                    {(ciclo.fragmentos || []).map((frag, idx) => (
                      <div key={frag.id || idx} className="flex items-center justify-between p-3 bg-success-soft border border-green-100 rounded-lg">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="w-6 h-6 rounded-full bg-green-200 text-success flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</span>
                          <div>
                            <span className="font-medium">{fmtDate(frag.data_inicio)}</span>
                            <span className="text-muted-foreground mx-1">→</span>
                            <span className="font-medium">{fmtDate(frag.data_fim)}</span>
                            <Badge className="ml-2 bg-success-soft text-success text-xs">{frag.dias} dias</Badge>
                            {frag.status && frag.status !== 'agendado' && (
                              <Badge className={`ml-2 text-xs ${frag.status === 'em_execucao' ? 'bg-info-soft text-primary' : 'bg-warning-soft text-warning'}`}>
                                {frag.status === 'em_execucao' ? 'Em execução' : 'Pendente'}
                              </Badge>
                            )}
                            {frag.observacao && <span className="ml-2 text-muted-foreground italic text-xs">{frag.observacao}</span>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 flex-shrink-0" onClick={() => onRemoverFragmento(ciclo, frag.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <RegistrarFeriasDialog
        open={dialogFerias}
        onOpenChange={setDialogFerias}
        ciclos={ciclosOrdenados}
        onSalvar={handleSalvarFerias}
        loading={loadingMutation}
      />
    </div>
  );
}