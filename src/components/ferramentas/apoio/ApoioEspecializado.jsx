import db from '@/api/db';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import { LifeBuoy } from 'lucide-react';
import { LIMITE_MENSAL_MINUTOS, getMesReferencia } from './constants';
import PainelSaldoApoio from './PainelSaldoApoio';
import FormularioApoioDialog from './FormularioApoioDialog';
import HistoricoApoio from './HistoricoApoio';

export default function ApoioEspecializado() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores'], queryFn: () => db.entities.Colaborador.list() });
  const { data: tratativas = [] } = useQuery({ queryKey: ['tratativas-apoio'], queryFn: () => db.entities.Tratativa.list('-created_date', 200) });
  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['solicitacoes-apoio'],
    queryFn: () => db.entities.SolicitacaoApoio.list('-created_date', 500),
  });

  const colaborador = useMemo(() => colaboradores.find(c => c.email === user?.email), [colaboradores, user]);
  const isGestor = colaborador?.papel === 'gestor' || user?.role === 'admin';
  const mesAtual = getMesReferencia();

  // Saldo global: todas as solicitações do mês atual que NÃO estão canceladas
  const utilizadoMinutos = useMemo(() => {
    return solicitacoes
      .filter(s => s.mes_referencia === mesAtual && s.status !== 'cancelada')
      .reduce((sum, s) => sum + (s.minutos_solicitados || 0), 0);
  }, [solicitacoes, mesAtual]);

  const disponivelMinutos = LIMITE_MENSAL_MINUTOS - utilizadoMinutos;

  const totalSolicitacoesMes = useMemo(() => {
    return solicitacoes.filter(s => s.mes_referencia === mesAtual && s.status !== 'cancelada').length;
  }, [solicitacoes, mesAtual]);

  const ultimaSolicitacao = useMemo(() => {
    const doMes = solicitacoes.filter(s => s.mes_referencia === mesAtual);
    if (doMes.length === 0) return null;
    const sorted = [...doMes].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    const data = sorted[0]?.data_solicitacao || sorted[0]?.created_date;
    return data ? new Date(data).toLocaleDateString('pt-BR') : null;
  }, [solicitacoes, mesAtual]);

  const criarMutation = useMutation({
    mutationFn: (dados) => db.entities.SolicitacaoApoio.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-apoio'] });
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-apoio-dashboard'] });
      setDialogOpen(false);
      toast({ title: '✅ Solicitação criada com sucesso!', description: 'A solicitação foi registrada e o consumo de horas foi atualizado.' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar solicitação', description: 'Tente novamente.', variant: 'destructive' });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ solicitacao, novoStatus, userName }) => {
      const historico = [...(solicitacao.historico_status || []), { status: novoStatus, data: new Date().toISOString(), usuario: userName }];
      return db.entities.SolicitacaoApoio.update(solicitacao.id, { status: novoStatus, historico_status: historico });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-apoio'] });
      toast({ title: 'Status atualizado!' });
    },
  });

  const handleSubmit = (dados) => {
    // Revalidação de saldo no momento da criação (proteção contra race condition)
    if ((dados.minutos_solicitados || 0) > disponivelMinutos) {
      toast({ title: 'Saldo insuficiente', description: 'O saldo disponível foi consumido por outra solicitação. Tente novamente.', variant: 'destructive' });
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-apoio'] });
      return;
    }
    criarMutation.mutate({ ...dados, operador_id: colaborador?.id || '' });
  };

  const handleStatusChange = (solicitacao, novoStatus) => {
    if (solicitacao.status === novoStatus) return;
    statusMutation.mutate({ solicitacao, novoStatus, userName: user?.full_name || '—' });
  };

  // Agentes veem apenas suas próprias; gestores veem todas
  const solicitacoesVisiveis = isGestor
    ? solicitacoes
    : solicitacoes.filter(s => s.operador_id === colaborador?.id || s.operador_nome === user?.full_name);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl text-white shadow-lg shadow-violet-500/20">
          <LifeBuoy className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Solicitação de Apoio Especializado</h2>
          <p className="text-slate-500 text-sm mt-0.5">Solicite apoio do time de Implantação — Treinamento, Consultoria ou Implantação</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <PainelSaldoApoio
            utilizadoMinutos={utilizadoMinutos}
            totalSolicitacoesMes={totalSolicitacoesMes}
            ultimaSolicitacao={ultimaSolicitacao}
            onNovaSolicitacao={() => {
              queryClient.invalidateQueries({ queryKey: ['solicitacoes-apoio'] });
              setDialogOpen(true);
            }}
          />
          <HistoricoApoio
            solicitacoes={solicitacoesVisiveis}
            onStatusChange={handleStatusChange}
          />
        </>
      )}

      <FormularioApoioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        disponivelMinutos={disponivelMinutos}
        user={user}
        isGestor={isGestor}
        tratativas={tratativas}
        isSubmitting={criarMutation.isPending}
      />
    </div>
  );
}