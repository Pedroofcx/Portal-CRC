import db from '@/api/db';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserCog, Search, CheckCircle2, AlertCircle, ArrowRight, History } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDateSP } from '@/components/utils/helpers';
import { findNextLider, getPosicaoAtual, STATUS_LABELS, TIPO_ACIONAMENTO_LABELS } from './rodizioUtils';
import CardsAcompanhamento from '@/components/rodizio/CardsAcompanhamento';
import FilaVisualizacao from '@/components/rodizio/FilaVisualizacao';

export default function LiderTecnicoTool() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tratativaId, setTratativaId] = useState('');
  const [tipoAcionamento, setTipoAcionamento] = useState('');
  const [liderSupervisorId, setLiderSupervisorId] = useState('');
  const [sucesso, setSucesso] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores'], queryFn: () => db.entities.Colaborador.list() });
  const { data: tratativas = [] } = useQuery({ queryKey: ['tratativas-lider'], queryFn: () => db.entities.Tratativa.list('-created_date', 200) });
  const { data: lideres = [] } = useQuery({ queryKey: ['lideres-tecnicos'], queryFn: () => db.entities.LiderTecnico.list() });
  const { data: configuracoes = [] } = useQuery({ queryKey: ['configuracoes'], queryFn: () => db.entities.Configuracao.list() });
  const { data: acionamentos = [] } = useQuery({ queryKey: ['acionamentos-lider'], queryFn: () => db.entities.AcionamentoLiderTecnico.list('-data_acionamento', 50) });

  const colaborador = useMemo(() => colaboradores.find(c => c.email === user?.email), [colaboradores, user]);
  const isGestor = colaborador?.papel === 'gestor' || user?.role === 'admin';

  const tratativaSelecionada = useMemo(() => tratativas.find(t => t.id === tratativaId), [tratativas, tratativaId]);

  const posicaoAtual = getPosicaoAtual(configuracoes);
  const proximoLider = useMemo(() => findNextLider(lideres, posicaoAtual), [lideres, posicaoAtual]);

  const lideresAtivos = useMemo(() => lideres.filter(l => l.ativo !== false).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)), [lideres]);

  const acionamentosCiclo = useMemo(() => {
    const n = new Date();
    return (acionamentos || []).filter(a => {
      if (!a.data_acionamento) return false;
      const d = new Date(a.data_acionamento);
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    });
  }, [acionamentos]);

  const acionamentosPorLider = useMemo(() => {
    const counts = {};
    acionamentosCiclo.forEach(a => { counts[a.lider_tecnico_id] = (counts[a.lider_tecnico_id] || 0) + 1; });
    return counts;
  }, [acionamentosCiclo]);

  const totalAtivos = useMemo(() => lideresAtivos.filter(l => l.status === 'permitido').length, [lideresAtivos]);
  const naoAcionadosCount = useMemo(() => lideresAtivos.filter(l => l.status === 'permitido' && !acionamentosPorLider[l.id]).length, [lideresAtivos, acionamentosPorLider]);
  const ultimoAcionado = acionamentos?.[0] || null;

  const filaData = useMemo(() => lideresAtivos.map(l => ({
    id: l.id, nome: l.colaborador_nome, status: l.status, ordem: l.ordem,
    countAcionamentos: acionamentosPorLider[l.id] || 0,
    ultimoAcionamento: (acionamentos || []).find(a => a.lider_tecnico_id === l.id)?.data_acionamento || null,
    isProximo: proximoLider?.lider?.id === l.id,
  })), [lideresAtivos, acionamentosPorLider, acionamentos, proximoLider]);

  const acionarMutation = useMutation({
    mutationFn: async ({ tratativa, lider, tipo, statusLiderMomento }) => {
      const now = new Date().toISOString();
      // 1. Criar registro de acionamento
      await db.entities.AcionamentoLiderTecnico.create({
        tratativa_id: tratativa.id,
        tratativa_id_interno: tratativa.id_interno || '',
        tratativa_nome_cliente: tratativa.nome_cliente || '',
        lider_tecnico_id: lider.id,
        lider_tecnico_nome: lider.colaborador_nome,
        lider_tecnico_ordem: lider.ordem,
        tipo_acionamento: tipo,
        usuario_id: colaborador?.id || user?.id || '',
        usuario_nome: user?.full_name || '—',
        status_lider_momento: statusLiderMomento,
        data_acionamento: now,
      });
      // 2. Atualizar a tratativa com o líder vinculado
      await db.entities.Tratativa.update(tratativa.id, {
        lider_tecnico_id: lider.id,
        lider_tecnico_nome: lider.colaborador_nome,
        tipo_acionamento_lider: tipo,
        data_acionamento_lider: now,
        usuario_acionamento_lider: user?.full_name || '—',
      });
      // 3. Se rodízio, avançar a posição
      if (tipo === 'rodizio' && proximoLider) {
        const conf = configuracoes.find(c => c.chave === 'rodizio_lider_tecnico_posicao');
        if (conf) {
          await db.entities.Configuracao.update(conf.id, { valor: String(proximoLider.proximaPosicao) });
        } else {
          await db.entities.Configuracao.create({
            chave: 'rodizio_lider_tecnico_posicao',
            valor: String(proximoLider.proximaPosicao),
            tipo: 'numero',
            categoria: 'geral',
            descricao: 'Posição atual do rodízio de Líderes Técnicos',
          });
        }
      }
      // 4. Log de auditoria (apenas supervisor)
      if (tipo === 'supervisor') {
        await db.entities.LogAuditoria.create({
          acao: 'criar',
          modulo: 'Líder Técnico',
          entidade: 'AcionamentoLiderTecnico',
          entidade_id: tratativa.id,
          usuario_id: colaborador?.id || user?.id || '',
          usuario_nome: user?.full_name || '—',
          usuario_papel: colaborador?.papel || user?.role || '—',
          dados_novos: JSON.stringify({ lider: lider.colaborador_nome, tipo: 'supervisor', status_lider: statusLiderMomento }),
          data_hora: now,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['acionamentos-lider'] });
      queryClient.invalidateQueries({ queryKey: ['tratativas-lider'] });
      queryClient.invalidateQueries({ queryKey: ['tratativas'] });
      queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
      setSucesso({
        tratativa: variables.tratativa.id_interno || variables.tratativa.id.slice(0, 8),
        lider: variables.lider.colaborador_nome,
        tipo: variables.tipo,
      });
      setTratativaId('');
      setTipoAcionamento('');
      setLiderSupervisorId('');
      toast({ title: '✓ Líder Técnico vinculado à tratativa com sucesso!', description: 'O acionamento foi registrado.' });
    },
    onError: () => {
      toast({ title: 'Erro ao vincular líder', description: 'Tente novamente.', variant: 'destructive' });
    },
  });

  const handleConfirmar = () => {
    if (!tratativaSelecionada) return;
    if (tipoAcionamento === 'rodizio' && proximoLider) {
      acionarMutation.mutate({ tratativa: tratativaSelecionada, lider: proximoLider.lider, tipo: 'rodizio', statusLiderMomento: 'permitido' });
    } else if (tipoAcionamento === 'supervisor' && liderSupervisorId) {
      const lider = lideresAtivos.find(l => l.id === liderSupervisorId);
      if (lider) {
        acionarMutation.mutate({ tratativa: tratativaSelecionada, lider, tipo: 'supervisor', statusLiderMomento: lider.status });
      }
    }
  };

  const canConfirm = tratativaSelecionada && (
    (tipoAcionamento === 'rodizio' && proximoLider) ||
    (tipoAcionamento === 'supervisor' && liderSupervisorId && isGestor)
  );

  return (
    <div className="space-y-6">
      <CardsAcompanhamento
        titulo="Líder Técnico"
        icon={UserCog}
        ultimoAcionado={ultimoAcionado ? { nome: ultimoAcionado.lider_tecnico_nome, data: ultimoAcionado.data_acionamento, tipo: ultimoAcionado.tipo_acionamento } : null}
        proximo={proximoLider ? { nome: proximoLider.lider.colaborador_nome, ordem: proximoLider.lider.ordem, status: proximoLider.lider.status } : null}
        totalCadastrados={lideres.length}
        totalAtivos={totalAtivos}
        totalAcionamentosCiclo={acionamentosCiclo.length}
        acionamentosPorPessoa={lideresAtivos.map(l => ({ nome: l.colaborador_nome, count: acionamentosPorLider[l.id] || 0, ordem: l.ordem })).sort((a, b) => b.count - a.count)}
        naoAcionadosCount={naoAcionadosCount}
        statusLabels={STATUS_LABELS}
      />
      <FilaVisualizacao titulo="Líder Técnico" participantes={filaData} statusLabels={STATUS_LABELS} />

      {/* Sucesso */}
      {sucesso && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-green-800">✓ Líder Técnico vinculado à tratativa com sucesso.</p>
                <div className="mt-2 space-y-0.5 text-sm text-green-700">
                  <p><strong>Tratativa:</strong> #{sucesso.tratativa}</p>
                  <p><strong>Líder Técnico:</strong> {sucesso.lider}</p>
                  <p><strong>Tipo de acionamento:</strong> {TIPO_ACIONAMENTO_LABELS[sucesso.tipo].label}</p>
                </div>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setSucesso(null)}>Novo acionamento</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!sucesso && (
        <>
          {/* Passo 1: Selecionar Tratativa */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">1</span>
                Selecione a tratativa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={tratativaId} onValueChange={v => { setTratativaId(v); setTipoAcionamento(''); setLiderSupervisorId(''); }}>
                <SelectTrigger><SelectValue placeholder="Buscar tratativa pelo número ou cliente..." /></SelectTrigger>
                <SelectContent>
                  {tratativas.slice(0, 100).map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.id_interno ? `#${t.id_interno}` : `#${t.id.slice(0, 8)}`} — {t.nome_cliente || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {tratativaSelecionada && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Número</p>
                      <p className="font-semibold text-slate-800">#{tratativaSelecionada.id_interno || tratativaSelecionada.id.slice(0, 8)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Cliente</p>
                      <p className="font-semibold text-slate-800">{tratativaSelecionada.nome_cliente || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Assunto</p>
                      <p className="font-semibold text-slate-800">{tratativaSelecionada.motivo_nome || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Agente responsável</p>
                      <p className="font-semibold text-slate-800">{tratativaSelecionada.agente_responsavel_nome || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Data da tratativa</p>
                      <p className="font-semibold text-slate-800">{tratativaSelecionada.data_registro ? formatDateSP(tratativaSelecionada.data_registro, 'DD/MM/YYYY') : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Status</p>
                      <p className="font-semibold text-slate-800 capitalize">{tratativaSelecionada.status?.replace(/_/g, ' ') || '—'}</p>
                    </div>
                  </div>
                  {tratativaSelecionada.lider_tecnico_nome && (
                    <div className="pt-2 mt-2 border-t border-slate-200">
                      <p className="text-xs text-amber-600">⚠️ Esta tratativa já possui Líder Técnico vinculado: <strong>{tratativaSelecionada.lider_tecnico_nome}</strong> ({TIPO_ACIONAMENTO_LABELS[tratativaSelecionada.tipo_acionamento_lider]?.label || '—'}). Um novo acionamento irá substituir.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Passo 2: Forma de acionamento */}
          {tratativaSelecionada && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">2</span>
                  Como será realizado o acionamento?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoAcionamento('rodizio')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${tipoAcionamento === 'rodizio' ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-4 h-4 rounded-full border-2 ${tipoAcionamento === 'rodizio' ? 'border-violet-500 bg-violet-500' : 'border-slate-300'}`} />
                      <span className="font-semibold text-sm text-slate-800">Estou realizando o acionamento</span>
                    </div>
                    <p className="text-xs text-slate-500 ml-6">O sistema segue a ordem do rodízio automaticamente.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => isGestor ? setTipoAcionamento('supervisor') : toast({ title: 'Sem permissão', description: 'Apenas supervisores/gestores podem usar esta opção.', variant: 'destructive' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${tipoAcionamento === 'supervisor' ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white hover:border-slate-300'} ${!isGestor ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-4 h-4 rounded-full border-2 ${tipoAcionamento === 'supervisor' ? 'border-violet-500 bg-violet-500' : 'border-slate-300'}`} />
                      <span className="font-semibold text-sm text-slate-800">Supervisor realizou a escolha</span>
                    </div>
                    <p className="text-xs text-slate-500 ml-6">Permite selecionar qualquer líder, inclusive bloqueado ou em férias.</p>
                    {!isGestor && <p className="text-xs text-red-500 ml-6 mt-1">🔒 Exige perfil de supervisor/gestor.</p>}
                  </button>
                </div>

                {/* Rodízio: mostrar próximo líder */}
                {tipoAcionamento === 'rodizio' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    {proximoLider ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-600 mb-1">Próximo Líder Técnico</p>
                          <p className="text-lg font-bold text-slate-800">{proximoLider.lider.colaborador_nome}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={STATUS_LABELS[proximoLider.lider.status].color}>Status: {STATUS_LABELS[proximoLider.lider.status].label}</Badge>
                            <span className="text-xs text-slate-500">Posição #{proximoLider.lider.ordem}</span>
                          </div>
                        </div>
                        <UserCog className="w-10 h-10 text-blue-400" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm">Nenhum Líder Técnico com status "Permitido" disponível no rodízio. Solicite a um gestor que verifique os status.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Supervisor: selecionar líder */}
                {tipoAcionamento === 'supervisor' && isGestor && (
                  <div className="space-y-2">
                    <Label className="text-xs">Selecione o Líder Técnico</Label>
                    <Select value={liderSupervisorId} onValueChange={setLiderSupervisorId}>
                      <SelectTrigger><SelectValue placeholder="Selecionar líder (todos os status)..." /></SelectTrigger>
                      <SelectContent>
                        {lideresAtivos.map(l => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.colaborador_nome} — {STATUS_LABELS[l.status].label} (#{l.ordem})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-purple-600">⚠️ Esta ação será registrada como exceção de supervisor. O rodízio normal não será alterado.</p>
                  </div>
                )}

                {tipoAcionamento && (
                  <Button
                    className="w-full bg-violet-600 hover:bg-violet-700"
                    disabled={!canConfirm || acionarMutation.isPending}
                    onClick={handleConfirmar}
                  >
                    {acionarMutation.isPending ? 'Vinculando...' : 'Confirmar Acionamento'}
                    {!acionarMutation.isPending && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Histórico recente */}
          {acionamentos.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-500" />
                  Acionamentos Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {acionamentos.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                      <div>
                        <p className="font-medium text-slate-800">#{a.tratativa_id_interno || a.tratativa_id.slice(0, 8)} — {a.tratativa_nome_cliente || '—'}</p>
                        <p className="text-xs text-slate-500">Líder: {a.lider_tecnico_nome} • Posição #{a.lider_tecnico_ordem} • Por: {a.usuario_nome}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={TIPO_ACIONAMENTO_LABELS[a.tipo_acionamento]?.color || 'bg-slate-100 text-slate-700'}>
                          {TIPO_ACIONAMENTO_LABELS[a.tipo_acionamento]?.label || a.tipo_acionamento}
                        </Badge>
                        <span className="text-xs text-slate-400">{a.data_acionamento ? formatDateSP(a.data_acionamento, 'DD/MM HH:mm') : '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}