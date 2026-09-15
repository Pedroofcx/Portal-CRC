import db from '@/api/db';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Zap, Save, Send, RotateCcw,
  AlertTriangle, CheckCircle2, Users
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import GradeSemanasWFM from './GradeSemanasWFM';
import DiagnosticoEscala from './DiagnosticoEscala';
import EquilibrioAgentes from './EquilibrioAgentes';
import LegendaWFM from './LegendaWFM';
import { gerarEscalaAutomatica, validarEscala, getSemanaISO, getSegundaFeira } from './gerarEscala';

function navegarSemana(segundaFeira, delta) {
  const d = new Date(segundaFeira + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta * 7);
  return d.toISOString().split('T')[0];
}

export default function PainelWFM({ colaboradores, isGestor }) {
  const queryClient = useQueryClient();

  // Semana navegada
  const [segundaFeira, setSegundaFeira] = useState(() => getSegundaFeira(new Date()));
  const semanaRef = useMemo(() => getSemanaISO(new Date(segundaFeira + 'T12:00:00Z')), [segundaFeira]);

  // Escala local (rascunho em memória antes de salvar)
  const [escalaDraft, setEscalaDraft] = useState(null);
  const [confirmGerarOpen, setConfirmGerarOpen] = useState(false);

  // Agentes ativos da equipe CRC
  const agentesAtivos = useMemo(() =>
    colaboradores.filter(c => c.ativo !== false && c.papel === 'agente'),
    [colaboradores]
  );

  // Buscar escala da semana atual no banco
  const { data: escalasDb = [], isLoading } = useQuery({
    queryKey: ['escalaTurno', semanaRef],
    queryFn: () => db.entities.EscalaTurno.filter({ semana_referencia: semanaRef, ativa: true }),
  });

  // Histórico do mês para cálculo de equilíbrio (últimas 8 semanas)
  const { data: historicoMes = [] } = useQuery({
    queryKey: ['escalaTurnoHistorico'],
    queryFn: () => db.entities.EscalaTurno.list('-data_inicio_semana', 8),
  });

  // Escala exibida: draft ou banco
  const escalaSalva = escalasDb[0] || null;
  const escala = escalaDraft || escalaSalva;

  // Slots travados da escala atual (preservados ao regerar)
  const slotsFixos = useMemo(() => {
    if (!escala?.turnos) return [];
    const fixos = [];
    escala.turnos.forEach(diaObj => {
      ['manha', 'tarde'].forEach(periodo => {
        diaObj[periodo]?.forEach(s => {
          if (s.travado) fixos.push({ dia: diaObj.dia, periodo, ...s });
        });
      });
    });
    return fixos;
  }, [escala]);
  

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (novaEscala) => {
      if (escalaSalva?.id) {
        return db.entities.EscalaTurno.update(escalaSalva.id, novaEscala);
      }
      return db.entities.EscalaTurno.create(novaEscala);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['escalaTurno', semanaRef]);
      queryClient.invalidateQueries(['escalaTurnoHistorico']);
      setEscalaDraft(null);
      toast.success('Escala salva com sucesso!');
    },
    onError: () => toast.error('Erro ao salvar escala'),
  });

  const publicarMutation = useMutation({
    mutationFn: async () => {
      const erros = validarEscala(escala);
      if (erros.length > 0) throw new Error(erros.join(', '));
      const dados = { ...(escalaDraft || escalaSalva), publicada: true };
      if (escalaSalva?.id) {
        return db.entities.EscalaTurno.update(escalaSalva.id, dados);
      }
      return db.entities.EscalaTurno.create(dados);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['escalaTurno', semanaRef]);
      setEscalaDraft(null);
      toast.success('✅ Escala publicada para a equipe!');
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  function handleGerar() {
    if (slotsFixos.length > 0) {
      setConfirmGerarOpen(true);
    } else {
      executarGeracao();
    }
  }

  function executarGeracao() {
    setConfirmGerarOpen(false);
    const novaEscala = gerarEscalaAutomatica(
      agentesAtivos,
      historicoMes.filter(e => e.semana_referencia !== semanaRef),
      semanaRef,
      segundaFeira,
      slotsFixos
    );
    setEscalaDraft(novaEscala);
    const alertas = novaEscala.alertas || [];
    if (alertas.length > 0) {
      toast.warning(`Escala gerada com ${alertas.length} alerta(s). Verifique o diagnóstico.`);
    } else {
      toast.success('Escala gerada automaticamente!');
    }
  }

  function handleSalvar() {
    if (!escalaDraft) {
      toast.info('Nenhuma alteração para salvar.');
      return;
    }
    saveMutation.mutate(escalaDraft);
  }

  function handlePublicar() {
    publicarMutation.mutate();
  }

  function handleReset() {
    setEscalaDraft(null);
  }

  // Label da semana
  const labelSemana = useMemo(() => {
    const inicio = new Date(segundaFeira + 'T12:00:00Z');
    const fim = new Date(segundaFeira + 'T12:00:00Z');
    fim.setUTCDate(fim.getUTCDate() + 4);
    const fmt = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
    return `${fmt(inicio)} – ${fmt(fim)}`;
  }, [segundaFeira]);

  const isDraft = !!escalaDraft;
  const isPublicada = escalaSalva?.publicada && !isDraft;
  const erros = escala ? validarEscala(escala) : [];

  if (agentesAtivos.length < 4) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Agentes insuficientes</p>
          <p className="text-slate-400 text-sm mt-1">
            São necessários pelo menos 4 agentes ativos para gerar a escala WFM.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header da semana */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Navegação de semana */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="icon"
                onClick={() => setSegundaFeira(navegarSemana(segundaFeira, -1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center min-w-[160px]">
                <p className="font-bold text-slate-800">{semanaRef}</p>
                <p className="text-xs text-slate-500">{labelSemana}</p>
              </div>
              <Button
                variant="outline" size="icon"
                onClick={() => setSegundaFeira(navegarSemana(segundaFeira, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost" size="sm"
                onClick={() => setSegundaFeira(getSegundaFeira(new Date()))}
                className="text-slate-500 text-xs"
              >
                Hoje
              </Button>
            </div>

            {/* Status + Ações */}
            <div className="flex items-center gap-2">
              {isPublicada && (
                <Badge className="bg-green-100 text-green-700 border border-green-300">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Publicada
                </Badge>
              )}
              {isDraft && (
                <Badge className="bg-amber-100 text-amber-700 border border-amber-300">
                  Rascunho
                </Badge>
              )}
              {erros.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" /> {erros.length} erro(s)
                </Badge>
              )}

              {isGestor && (
                <>
                  <Button
                    onClick={handleGerar}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    <Zap className="w-4 h-4 mr-1.5" />
                    Gerar Automático
                  </Button>
                  {isDraft && (
                    <>
                      <Button variant="outline" size="sm" onClick={handleReset}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Descartar
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        onClick={handleSalvar}
                        disabled={saveMutation.isPending}
                      >
                        <Save className="w-3.5 h-3.5 mr-1" />
                        Salvar
                      </Button>
                    </>
                  )}
                  {escala && !isPublicada && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handlePublicar}
                      disabled={publicarMutation.isPending || erros.length > 0}
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      Publicar
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade WFM */}
      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Carregando escala...</p>
          </CardContent>
        </Card>
      ) : escala ? (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-800">Grade Semanal WFM</CardTitle>
              <LegendaWFM />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <GradeSemanasWFM
              escala={escala}
              colaboradores={agentesAtivos}
              onEscalaChange={setEscalaDraft}
              isGestor={isGestor}
              alertas={escala.alertas || []}
            />
          </CardContent>
        </Card>
      ) : (
        /* Estado vazio — escala não gerada ainda */
        <Card className="border-0 shadow-sm border-2 border-dashed border-slate-200">
          <CardContent className="p-12 text-center">
            <Zap className="w-14 h-14 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-semibold text-lg">Semana sem escala gerada</p>
            <p className="text-slate-400 text-sm mt-1 mb-6">
              Clique em "Gerar Automático" para distribuir os 4 slots diários automaticamente,
              respeitando equilíbrio, anti-dobra e rotação.
            </p>
            {isGestor && (
              <Button onClick={handleGerar} className="bg-blue-600 hover:bg-blue-700" size="lg">
                <Zap className="w-5 h-5 mr-2" />
                Gerar Escala Automaticamente
              </Button>
            )}
            {/* Preview dos slots vazios */}
            <div className="mt-8 grid grid-cols-5 gap-2 max-w-2xl mx-auto opacity-40">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map(d => (
                <div key={d} className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-500 text-center">{d}</p>
                  {['M-ATEND', 'M-ANÁL', 'T-ATEND', 'T-ANÁL'].map(s => (
                    <div key={s} className="border-2 border-dashed border-slate-200 rounded-lg p-1.5 text-center">
                      <span className="text-[10px] text-slate-400 font-medium">{s}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnóstico + Equilíbrio */}
      {escala && (
        <div className="grid md:grid-cols-2 gap-4">
          <DiagnosticoEscala
            escala={escala}
            agentes={agentesAtivos}
            historicoMes={historicoMes.filter(e => e.semana_referencia !== semanaRef)}
          />
          <EquilibrioAgentes
            escala={escala}
            colaboradores={agentesAtivos}
            historicoMes={historicoMes.filter(e => e.semana_referencia !== semanaRef)}
          />
        </div>
      )}

      {/* Dialog confirmação com slots travados */}
      <Dialog open={confirmGerarOpen} onOpenChange={setConfirmGerarOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {slotsFixos.length} slot(s) travado(s)
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-600 text-sm">
            O algoritmo irá respeitar os slots travados e preencher apenas os restantes.
            Deseja continuar?
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmGerarOpen(false)}>Cancelar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={executarGeracao}>
              ✅ Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}