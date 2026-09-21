import db from '@/api/db';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Headset, CheckCircle2, AlertCircle, ArrowRight, History } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDateSP } from '@/components/utils/helpers';
import { findNextN2, getPosicaoAtualN2, STATUS_N2_LABELS, TIPO_N2_LABELS } from './rodizioN2Utils';
import CardsAcompanhamento from '@/components/rodizio/CardsAcompanhamento';
import FilaVisualizacao from '@/components/rodizio/FilaVisualizacao';
import ListaResumida from '@/components/ui/ListaResumida';

const TIPO_TRATATIVA_LABELS = {
  reclamacao_interna: 'Reclamação Interna',
  reclame_aqui: 'Reclame Aqui',
  google_meu_negocio: 'Google Meu Negócio',
  contestacao: 'Contestação',
};

export default function ApoioN2Tool() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tratativaId, setTratativaId] = useState('');
  const [tipoAcionamento, setTipoAcionamento] = useState('');
  const [n2SupervisorId, setN2SupervisorId] = useState('');
  const [sucesso, setSucesso] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores'], queryFn: () => db.entities.Colaborador.list() });
  const { data: tratativas = [] } = useQuery({ queryKey: ['tratativas-n2'], queryFn: () => db.entities.Tratativa.list('-created_date', 200) });
  const { data: agentesN2 = [] } = useQuery({ queryKey: ['agentes-n2'], queryFn: () => db.entities.AgenteN2.list() });
  const { data: configuracoes = [] } = useQuery({ queryKey: ['configuracoes'], queryFn: () => db.entities.Configuracao.list() });
  const { data: acionamentos = [] } = useQuery({ queryKey: ['acionamentos-n2'], queryFn: () => db.entities.AcionamentoN2.list('-data_acionamento', 50) });

  const colaborador = useMemo(() => colaboradores.find(c => c.email === user?.email), [colaboradores, user]);
  const isGestor = colaborador?.papel === 'gestor' || user?.role === 'admin';

  const tratativaSelecionada = useMemo(() => tratativas.find(t => t.id === tratativaId), [tratativas, tratativaId]);

  const posicaoAtual = getPosicaoAtualN2(configuracoes);
  const proximoN2 = useMemo(() => findNextN2(agentesN2, posicaoAtual), [agentesN2, posicaoAtual]);

  const agentesAtivos = useMemo(() => agentesN2.filter(a => a.ativo !== false).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)), [agentesN2]);

  const acionamentosCicloN2 = useMemo(() => {
    const n = new Date();
    return (acionamentos || []).filter(a => {
      if (!a.data_acionamento) return false;
      const d = new Date(a.data_acionamento);
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    });
  }, [acionamentos]);

  const acionamentosPorN2 = useMemo(() => {
    const counts = {};
    acionamentosCicloN2.forEach(a => { counts[a.agente_n2_id] = (counts[a.agente_n2_id] || 0) + 1; });
    return counts;
  }, [acionamentosCicloN2]);

  const totalAtivosN2 = useMemo(() => agentesAtivos.filter(a => a.status === 'permitido').length, [agentesAtivos]);
  const naoAcionadosN2 = useMemo(() => agentesAtivos.filter(a => a.status === 'permitido' && !acionamentosPorN2[a.id]).length, [agentesAtivos, acionamentosPorN2]);
  const ultimoAcionadoN2 = acionamentos?.[0] || null;

  const filaDataN2 = useMemo(() => agentesAtivos.map(a => ({
    id: a.id, nome: a.colaborador_nome, status: a.status, ordem: a.ordem,
    countAcionamentos: acionamentosPorN2[a.id] || 0,
    ultimoAcionamento: (acionamentos || []).find(ac => ac.agente_n2_id === a.id)?.data_acionamento || null,
    isProximo: proximoN2?.agente?.id === a.id,
  })), [agentesAtivos, acionamentosPorN2, acionamentos, proximoN2]);

  // Priorizar tratativas de PROCON, GMN e RA no topo
  const tratativasOrdenadas = useMemo(() => {
    const prioridade = ['reclame_aqui', 'google_meu_negocio', 'contestacao'];
    return [...tratativas].sort((a, b) => {
      const aPrior = prioridade.includes(a.tipo_tratativa) ? 0 : 1;
      const bPrior = prioridade.includes(b.tipo_tratativa) ? 0 : 1;
      return aPrior - bPrior;
    });
  }, [tratativas]);

  const acionarMutation = useMutation({
    mutationFn: async ({ tratativa, agente, tipo, statusMomento }) => {
      const now = new Date().toISOString();
      await db.entities.AcionamentoN2.create({
        tratativa_id: tratativa.id,
        tratativa_id_interno: tratativa.id_interno || '',
        tratativa_nome_cliente: tratativa.nome_cliente || '',
        tratativa_tipo: TIPO_TRATATIVA_LABELS[tratativa.tipo_tratativa] || tratativa.tipo_tratativa || '',
        agente_n2_id: agente.id,
        agente_n2_nome: agente.colaborador_nome,
        agente_n2_ordem: agente.ordem,
        tipo_acionamento: tipo,
        usuario_id: colaborador?.id || user?.id || '',
        usuario_nome: user?.full_name || '—',
        status_n2_momento: statusMomento,
        data_acionamento: now,
      });
      await db.entities.Tratativa.update(tratativa.id, {
        n2_id: agente.id,
        n2_nome: agente.colaborador_nome,
        tipo_acionamento_n2: tipo,
        data_acionamento_n2: now,
        usuario_acionamento_n2: user?.full_name || '—',
      });
      if (tipo === 'rodizio' && proximoN2) {
        const conf = configuracoes.find(c => c.chave === 'rodizio_n2_posicao');
        if (conf) {
          await db.entities.Configuracao.update(conf.id, { valor: String(proximoN2.proximaPosicao) });
        } else {
          await db.entities.Configuracao.create({
            chave: 'rodizio_n2_posicao',
            valor: String(proximoN2.proximaPosicao),
            tipo: 'numero',
            categoria: 'geral',
            descricao: 'Posição atual do rodízio de Agentes N2',
          });
        }
      }
      if (tipo === 'supervisor') {
        await db.entities.LogAuditoria.create({
          acao: 'criar',
          modulo: 'Apoio N2',
          entidade: 'AcionamentoN2',
          entidade_id: tratativa.id,
          usuario_id: colaborador?.id || user?.id || '',
          usuario_nome: user?.full_name || '—',
          usuario_papel: colaborador?.papel || user?.role || '—',
          dados_novos: JSON.stringify({ agente: agente.colaborador_nome, tipo: 'supervisor', status: statusMomento }),
          data_hora: now,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['acionamentos-n2'] });
      queryClient.invalidateQueries({ queryKey: ['tratativas-n2'] });
      queryClient.invalidateQueries({ queryKey: ['tratativas'] });
      queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
      setSucesso({
        tratativa: variables.tratativa.id_interno || variables.tratativa.id.slice(0, 8),
        agente: variables.agente.colaborador_nome,
        tipo: variables.tipo,
        data: new Date().toLocaleString('pt-BR'),
      });
      setTratativaId('');
      setTipoAcionamento('');
      setN2SupervisorId('');
      toast({ title: '✓ Apoio N2 acionado com sucesso!', description: 'O acionamento foi registrado.' });
    },
    onError: () => {
      toast({ title: 'Erro ao acionar N2', description: 'Tente novamente.', variant: 'destructive' });
    },
  });

  const handleConfirmar = () => {
    if (!tratativaSelecionada) return;
    if (tipoAcionamento === 'rodizio' && proximoN2) {
      acionarMutation.mutate({ tratativa: tratativaSelecionada, agente: proximoN2.agente, tipo: 'rodizio', statusMomento: 'permitido' });
    } else if (tipoAcionamento === 'supervisor' && n2SupervisorId) {
      const agente = agentesAtivos.find(a => a.id === n2SupervisorId);
      if (agente) {
        acionarMutation.mutate({ tratativa: tratativaSelecionada, agente, tipo: 'supervisor', statusMomento: agente.status });
      }
    }
  };

  const canConfirm = tratativaSelecionada && (
    (tipoAcionamento === 'rodizio' && proximoN2) ||
    (tipoAcionamento === 'supervisor' && n2SupervisorId && isGestor)
  );

  return (
    <div className="space-y-6">
      <CardsAcompanhamento
        titulo="Apoio N2"
        icon={Headset}
        ultimoAcionado={ultimoAcionadoN2 ? { nome: ultimoAcionadoN2.agente_n2_nome, data: ultimoAcionadoN2.data_acionamento, tipo: ultimoAcionadoN2.tipo_acionamento } : null}
        proximo={proximoN2 ? { nome: proximoN2.agente.colaborador_nome, ordem: proximoN2.agente.ordem, status: proximoN2.agente.status } : null}
        totalCadastrados={agentesN2.length}
        totalAtivos={totalAtivosN2}
        totalAcionamentosCiclo={acionamentosCicloN2.length}
        acionamentosPorPessoa={agentesAtivos.map(a => ({ nome: a.colaborador_nome, count: acionamentosPorN2[a.id] || 0, ordem: a.ordem })).sort((a, b) => b.count - a.count)}
        naoAcionadosCount={naoAcionadosN2}
        statusLabels={STATUS_N2_LABELS}
      />
      <FilaVisualizacao titulo="Apoio N2" participantes={filaDataN2} statusLabels={STATUS_N2_LABELS} />

      <div className="p-4 bg-info-soft border border-info/25 rounded-xl">
        <div className="flex items-start gap-3">
          <Headset className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-primary">Apoio N2 — Time Especializado</p>
            <p className="text-xs text-primary mt-0.5">Acione o Time N2 para apoio especializado em tratativas de PROCON, Google Meu Negócio e Reclame Aqui.</p>
          </div>
        </div>
      </div>

      {sucesso && (
        <Card className="border-success/25 bg-success-soft">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-success">✓ Apoio N2 acionado com sucesso.</p>
                <div className="mt-2 space-y-0.5 text-sm text-success">
                  <p><strong>Tratativa:</strong> #{sucesso.tratativa}</p>
                  <p><strong>Agente N2:</strong> {sucesso.agente}</p>
                  <p><strong>Tipo de acionamento:</strong> {TIPO_N2_LABELS[sucesso.tipo].label}</p>
                  <p><strong>Data/hora:</strong> {sucesso.data}</p>
                </div>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setSucesso(null)}>Novo acionamento</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!sucesso && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-info-soft text-primary flex items-center justify-center text-xs font-bold">1</span>
                Selecionar Tratativa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={tratativaId} onValueChange={v => { setTratativaId(v); setTipoAcionamento(''); setN2SupervisorId(''); }}>
                <SelectTrigger><SelectValue placeholder="Buscar tratativa..." /></SelectTrigger>
                <SelectContent>
                  {tratativasOrdenadas.slice(0, 100).map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.id_interno ? `#${t.id_interno}` : `#${t.id.slice(0, 8)}`} — {t.nome_cliente || 'Sem nome'} ({TIPO_TRATATIVA_LABELS[t.tipo_tratativa] || t.tipo_tratativa || '—'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {tratativaSelecionada && (
                <div className="p-4 bg-muted rounded-xl border border-border space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Número</p>
                      <p className="font-semibold text-foreground">#{tratativaSelecionada.id_interno || tratativaSelecionada.id.slice(0, 8)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="font-semibold text-foreground">{tratativaSelecionada.nome_cliente || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tipo / Canal</p>
                      <Badge className="bg-info-soft text-primary border-info/25">{TIPO_TRATATIVA_LABELS[tratativaSelecionada.tipo_tratativa] || tratativaSelecionada.tipo_tratativa || '—'}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="font-semibold text-foreground capitalize">{tratativaSelecionada.status?.replace(/_/g, ' ') || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Agente responsável</p>
                      <p className="font-semibold text-foreground">{tratativaSelecionada.agente_responsavel_nome || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="font-semibold text-foreground">{tratativaSelecionada.data_registro ? formatDateSP(tratativaSelecionada.data_registro, 'DD/MM/YYYY') : '—'}</p>
                    </div>
                  </div>
                  {tratativaSelecionada.n2_nome && (
                    <div className="pt-2 mt-2 border-t border-border">
                      <p className="text-xs text-warning">Esta tratativa já possui N2 vinculado: <strong>{tratativaSelecionada.n2_nome}</strong> ({TIPO_N2_LABELS[tratativaSelecionada.tipo_acionamento_n2]?.label || '—'}). Um novo acionamento irá substituir.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {tratativaSelecionada && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-info-soft text-primary flex items-center justify-center text-xs font-bold">2</span>
                  Como será realizado o acionamento?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoAcionamento('rodizio')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${tipoAcionamento === 'rodizio' ? 'border-primary/40 bg-info-soft' : 'border-border bg-card hover:border-border'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-4 h-4 rounded-full border-2 ${tipoAcionamento === 'rodizio' ? 'border-primary/40 bg-primary' : 'border-border'}`} />
                      <span className="font-semibold text-sm text-foreground">Seguir rodízio</span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">O sistema identifica automaticamente o próximo N2 elegível.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => isGestor ? setTipoAcionamento('supervisor') : toast({ title: 'Sem permissão', description: 'Apenas supervisores/gestores podem usar esta opção.', variant: 'destructive' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${tipoAcionamento === 'supervisor' ? 'border-primary/40 bg-info-soft' : 'border-border bg-card hover:border-border'} ${!isGestor ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-4 h-4 rounded-full border-2 ${tipoAcionamento === 'supervisor' ? 'border-primary/40 bg-primary' : 'border-border'}`} />
                      <span className="font-semibold text-sm text-foreground">Supervisor realizou a escolha</span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">Permite selecionar qualquer N2, inclusive bloqueado ou em férias.</p>
                    {!isGestor && <p className="text-xs text-destructive ml-6 mt-1">Exige perfil de supervisor/gestor.</p>}
                  </button>
                </div>

                {tipoAcionamento === 'rodizio' && (
                  <div className="p-4 bg-info-soft border border-info/25 rounded-xl">
                    {proximoN2 ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-primary mb-1">Próximo Agente N2</p>
                          <p className="text-lg font-bold text-foreground">{proximoN2.agente.colaborador_nome}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={STATUS_N2_LABELS[proximoN2.agente.status].color}>Status: {STATUS_N2_LABELS[proximoN2.agente.status].label}</Badge>
                            <span className="text-xs text-muted-foreground">Posição #{proximoN2.agente.ordem}</span>
                          </div>
                        </div>
                        <Headset className="w-10 h-10 text-primary" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-warning">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm">Nenhum Agente N2 com status "Permitido" disponível no rodízio. Solicite a um gestor que verifique os status.</p>
                      </div>
                    )}
                  </div>
                )}

                {tipoAcionamento === 'supervisor' && isGestor && (
                  <div className="space-y-2">
                    <Label className="text-xs">Selecione o Agente N2</Label>
                    <Select value={n2SupervisorId} onValueChange={setN2SupervisorId}>
                      <SelectTrigger><SelectValue placeholder="Selecionar N2 (todos os status)..." /></SelectTrigger>
                      <SelectContent>
                        {agentesAtivos.map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.colaborador_nome} — {STATUS_N2_LABELS[a.status].label} (#{a.ordem})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-primary">Esta ação será registrada como exceção de supervisor. O rodízio normal não será alterado.</p>
                  </div>
                )}

                {tipoAcionamento && (
                  <Button
                    className="w-full bg-primary hover:bg-primary"
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

          {acionamentos.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <History className="w-4 h-4 text-muted-foreground" />
                  Acionamentos N2 Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ListaResumida
                  className="space-y-2"
                  limite={5}
                  rotulo="acionamentos"
                  itens={acionamentos}
                  renderItem={a => (
                    <div key={a.id} className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
                      <div>
                        <p className="font-medium text-foreground">#{a.tratativa_id_interno || a.tratativa_id.slice(0, 8)} — {a.tratativa_nome_cliente || '—'}</p>
                        <p className="text-xs text-muted-foreground">N2: {a.agente_n2_nome} • Posição #{a.agente_n2_ordem} • Por: {a.usuario_nome} {a.tratativa_tipo ? `• ${a.tratativa_tipo}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={TIPO_N2_LABELS[a.tipo_acionamento]?.color || 'bg-muted text-foreground'}>
                          {TIPO_N2_LABELS[a.tipo_acionamento]?.label || a.tipo_acionamento}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{a.data_acionamento ? formatDateSP(a.data_acionamento, 'DD/MM HH:mm') : '—'}</span>
                      </div>
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}