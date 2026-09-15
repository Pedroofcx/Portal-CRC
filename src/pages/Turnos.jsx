const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ui/PageHeader';
import { Sun, Moon, Users, Calendar, Check, Shuffle, BanIcon, ArrowLeftRight, AlertTriangle, BarChart2, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import CancelarDiaDialog from '@/components/turnos/CancelarDiaDialog';
import MoverTurnoDialog from '@/components/turnos/MoverTurnoDialog';
import RelatorioProdutividadeTurnos from '@/components/turnos/RelatorioProdutividadeTurnos';
import PainelWFM from '@/components/escalas/wfm/PainelWFM';

// ── Helpers ──────────────────────────────────────────────────
const DIAS_PT = {
  segunda: 'Segunda-feira', terca: 'Terça-feira', quarta: 'Quarta-feira',
  quinta: 'Quinta-feira', sexta: 'Sexta-feira',
};

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function getDiaDate(monday, index) {
  const d = new Date(monday);
  d.setDate(d.getDate() + index);
  return d.toISOString().split('T')[0];
}

function gerarEscala(colaboradores, dataInicio) {
  if (!colaboradores?.length) return [];
  const shuffle = arr => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  return ['segunda', 'terca', 'quarta', 'quinta', 'sexta'].map((dia, idx) => {
    const rotacao = idx % 2 === 0 ? shuffle(colaboradores) : shuffle(colaboradores).reverse();
    const metade = Math.ceil(rotacao.length / 2);
    return {
      dia,
      data: getDiaDate(dataInicio, idx),
      cancelado: false,
      motivo_cancelamento: '',
      manha: rotacao.slice(0, metade).map(c => ({ colaborador_id: c.id, colaborador_nome: c.nome_completo })),
      tarde: rotacao.slice(metade).map(c => ({ colaborador_id: c.id, colaborador_nome: c.nome_completo })),
    };
  });
}

// ── Página Principal ──────────────────────────────────────────
export default function Turnos() {
  const queryClient = useQueryClient();
  const [selecionados, setSelecionados] = useState([]);
  const [gerarDialogOpen, setGerarDialogOpen] = useState(false);
  const [moverDiaIndex, setMoverDiaIndex] = useState(null);
  const [cancelarDiaIndex, setCancelarDiaIndex] = useState(null);
  const [semanaOffset, setSemanaOffset] = useState(0);

  const semanaRef = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + semanaOffset * 7);
    return getISOWeek(d);
  }, [semanaOffset]);

  const dataInicioSemana = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + semanaOffset * 7);
    return getMondayOfWeek(d);
  }, [semanaOffset]);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores'], queryFn: () => db.entities.Colaborador.list() });
  const { data: escalas = [], isLoading: loadingEscalas } = useQuery({ queryKey: ['escalas-turno'], queryFn: () => db.entities.EscalaTurno.filter({ ativa: true }, '-created_date', 52) });
  const { data: tratativas = [] } = useQuery({ queryKey: ['tratativas'], queryFn: () => db.entities.Tratativa.list('-created_date', 500) });

  const colaborador = useMemo(() => colaboradores.find(c => c.email === user?.email), [colaboradores, user]);
  const isGestor = colaborador?.papel === 'gestor';
  const colaboradoresAtivos = useMemo(() => colaboradores.filter(c => c.ativo && c.papel === 'agente'), [colaboradores]);
  const escalaAtual = useMemo(() => escalas.find(e => e.semana_referencia === semanaRef), [escalas, semanaRef]);

  const criarEscala = useMutation({
    mutationFn: (data) => db.entities.EscalaTurno.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalas-turno'] });
      setGerarDialogOpen(false);
      setSelecionados([]);
      toast.success('Escala gerada com sucesso!');
    },
    onError: () => toast.error('Erro ao criar escala'),
  });

  const atualizarEscala = useMutation({
    mutationFn: ({ id, data }) => db.entities.EscalaTurno.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalas-turno'] });
      toast.success('Escala atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar escala'),
  });

  const handleGerarEscala = () => {
    const participantes = colaboradoresAtivos.filter(c => selecionados.includes(c.id));
    if (participantes.length < 2) { toast.error('Selecione ao menos 2 colaboradores'); return; }
    criarEscala.mutate({
      semana_referencia: semanaRef,
      data_inicio_semana: dataInicioSemana,
      colaboradores_participantes: participantes.map(c => c.id),
      turnos: gerarEscala(participantes, dataInicioSemana),
      gerado_por_id: colaborador?.id,
      gerado_por_nome: colaborador?.nome_completo,
      ativa: true,
    });
  };

  const handleRegerar = () => {
    if (!escalaAtual) return;
    const participantes = colaboradoresAtivos.filter(c => escalaAtual.colaboradores_participantes?.includes(c.id));
    if (participantes.length < 2) { toast.error('Poucos colaboradores para regerar'); return; }
    atualizarEscala.mutate({ id: escalaAtual.id, data: { turnos: gerarEscala(participantes, dataInicioSemana) } });
  };

  const handleSalvarTurnos = (novosTurnos) => {
    if (!escalaAtual?.id) { toast.error('Escala não encontrada'); return; }
    atualizarEscala.mutate({ id: escalaAtual.id, data: { turnos: novosTurnos } });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Turnos"
        subtitle="Distribuição de turnos da equipe"
        icon={Calendar}
        actions={isGestor && (
          <div className="flex gap-2">
            {escalaAtual ? (
              <Button variant="outline" size="sm" onClick={handleRegerar} disabled={atualizarEscala.isPending}>
                <Shuffle className="w-4 h-4 mr-1.5" />
                Regerar Tudo
              </Button>
            ) : (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setGerarDialogOpen(true)}>
                <Calendar className="w-4 h-4 mr-1.5" />
                Gerar Escala
              </Button>
            )}
          </div>
        )}
      />

      <Tabs defaultValue="wfm">
        <TabsList>
          <TabsTrigger value="wfm" className="gap-1.5">
            <Zap className="w-3.5 h-3.5" />WFM
          </TabsTrigger>
          <TabsTrigger value="escala" className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" />Escala Manual
          </TabsTrigger>
          {isGestor && (
            <TabsTrigger value="relatorio" className="gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" />Produtividade
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── ABA WFM ── */}
        <TabsContent value="wfm" className="pt-4">
          <PainelWFM
            colaboradores={colaboradores}
            isGestor={isGestor}
          />
        </TabsContent>

        {/* ── ABA ESCALA MANUAL ── */}
        <TabsContent value="escala" className="pt-4">
          <div className="flex items-center gap-3 mb-5">
            <Button variant="outline" size="sm" onClick={() => setSemanaOffset(o => o - 1)}>←</Button>
            <span className="text-sm font-medium text-slate-700 min-w-44 text-center">
              {semanaRef} · {new Date(dataInicioSemana + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
            <Button variant="outline" size="sm" onClick={() => setSemanaOffset(o => o + 1)}>→</Button>
            {semanaOffset !== 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSemanaOffset(0)} className="text-blue-600">Hoje</Button>
            )}
          </div>

          {loadingEscalas ? (
            <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
          ) : !escalaAtual ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-16 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 font-medium">Nenhuma escala para esta semana</p>
                {isGestor && (
                  <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => setGerarDialogOpen(true)}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Gerar Escala para Esta Semana
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {escalaAtual.turnos?.map((turno, diaIndex) => (
                <Card key={turno.dia} className={`border-0 shadow-sm overflow-hidden ${turno.cancelado ? 'ring-2 ring-red-200' : ''}`}>
                  {/* Header do card */}
                  <div className={`px-4 pt-4 pb-2 ${turno.cancelado ? 'bg-red-50' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{DIAS_PT[turno.dia]}</p>
                        <p className="text-xs text-slate-400">
                          {turno.data ? new Date(turno.data + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''}
                        </p>
                      </div>
                      {turno.cancelado && (
                        <div className="flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md">
                          <BanIcon className="w-3 h-3" />
                          CANCELADO
                        </div>
                      )}
                    </div>
                    {turno.cancelado && turno.motivo_cancelamento && (
                      <div className="mt-2 flex items-start gap-1.5 bg-red-100 border border-red-200 rounded-lg p-2">
                        <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">{turno.motivo_cancelamento}</p>
                      </div>
                    )}
                  </div>

                  <CardContent className="px-3 pb-3 space-y-2">
                    {turno.cancelado ? (
                      <div className="py-6 text-center">
                        <BanIcon className="w-8 h-8 mx-auto text-red-300 mb-1" />
                        <p className="text-xs text-red-400 font-medium">Sem operação neste dia</p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Sun className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-xs font-semibold text-amber-700">Manhã</span>
                            <span className="ml-auto text-xs text-amber-500">{turno.manha?.length || 0}</span>
                          </div>
                          <div className="space-y-0.5">
                            {turno.manha?.map(c => (
                              <p key={c.colaborador_id} className="text-xs text-amber-800 font-medium truncate">
                                {c.colaborador_nome?.split(' ').slice(0, 2).join(' ')}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Moon className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-xs font-semibold text-indigo-700">Tarde</span>
                            <span className="ml-auto text-xs text-indigo-500">{turno.tarde?.length || 0}</span>
                          </div>
                          <div className="space-y-0.5">
                            {turno.tarde?.map(c => (
                              <p key={c.colaborador_id} className="text-xs text-indigo-800 font-medium truncate">
                                {c.colaborador_nome?.split(' ').slice(0, 2).join(' ')}
                              </p>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {isGestor && (
                      <div className="flex gap-1.5 pt-1">
                        {!turno.cancelado && (
                          <Button
                            variant="outline" size="sm"
                            className="flex-1 h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => setMoverDiaIndex(diaIndex)}
                            disabled={atualizarEscala.isPending}
                          >
                            <ArrowLeftRight className="w-3 h-3 mr-1" />
                            Manejar
                          </Button>
                        )}
                        <Button
                          variant="outline" size="sm"
                          className={`flex-1 h-7 text-xs ${turno.cancelado
                            ? 'text-green-600 border-green-200 hover:bg-green-50'
                            : 'text-red-600 border-red-200 hover:bg-red-50'}`}
                          onClick={() => setCancelarDiaIndex(diaIndex)}
                          disabled={atualizarEscala.isPending}
                        >
                          <BanIcon className="w-3 h-3 mr-1" />
                          {turno.cancelado ? 'Reativar' : 'Cancelar'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ABA RELATÓRIO ── */}
        {isGestor && (
          <TabsContent value="relatorio" className="pt-4">
            <RelatorioProdutividadeTurnos escalas={escalas} tratativas={tratativas} colaboradores={colaboradores} />
          </TabsContent>
        )}
      </Tabs>

      {/* Dialog: Gerar Escala */}
      <Dialog open={gerarDialogOpen} onOpenChange={v => { setGerarDialogOpen(v); if (!v) setSelecionados([]); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Selecionar Colaboradores
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Semana <strong>{semanaRef}</strong> · Selecione os participantes.</p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {colaboradoresAtivos.map(c => {
                const sel = selecionados.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelecionados(prev => sel ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${sel ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${sel ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                      {sel && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm font-medium text-slate-800 flex-1">{c.nome_completo}</span>
                    <Badge className="bg-slate-100 text-slate-600 border-0 text-xs">{c.cargo_atual}</Badge>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">{selecionados.length} selecionado(s)</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setGerarDialogOpen(false)}>Cancelar</Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleGerarEscala} disabled={criarEscala.isPending || selecionados.length < 2}>
                  <Shuffle className="w-4 h-4 mr-1.5" />
                  {criarEscala.isPending ? 'Gerando...' : 'Gerar Aleatoriamente'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Remanejar */}
      <MoverTurnoDialog
        open={moverDiaIndex !== null}
        onClose={() => setMoverDiaIndex(null)}
        turno={moverDiaIndex !== null ? escalaAtual?.turnos?.[moverDiaIndex] ?? null : null}
        diaIndex={moverDiaIndex}
        escala={escalaAtual}
        onSalvar={handleSalvarTurnos}
        salvando={atualizarEscala.isPending}
      />

      {/* Dialog: Cancelar/Reativar */}
      <CancelarDiaDialog
        open={cancelarDiaIndex !== null}
        onClose={() => setCancelarDiaIndex(null)}
        turno={cancelarDiaIndex !== null ? escalaAtual?.turnos?.[cancelarDiaIndex] ?? null : null}
        diaIndex={cancelarDiaIndex}
        escala={escalaAtual}
        onSalvar={handleSalvarTurnos}
        salvando={atualizarEscala.isPending}
      />
    </div>
  );
}