import db from '@/api/db';
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { formatDateSP, tipoTratativaLabels, statusLabels, calculateTratativaPoints, calcularDiasRestantesReabertura, calcularCustoOperacional, formatBRL } from '@/components/utils/helpers';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import LinhaDoTempo from '@/components/tratativas/LinhaDoTempo';
import RegistrarNota from '@/components/tratativas/RegistrarNota';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ClipboardList,
  Play,
  Pause,
  CheckCircle,
  Clock,
  ExternalLink,
  History,
  Award,
  AlertTriangle,
  MapPin,
  Trash2,
  Snowflake
} from 'lucide-react';
import TimerReobertura from '@/components/tratativas/TimerReobertura';
import CongelamentoSLA from '@/components/tratativas/CongelamentoSLA';
import DesfechoContestacao from '@/components/tratativas/DesfechoContestacao';
import MonetizacaoAtritoForm from '@/components/tratativas/MonetizacaoAtritoForm';
import CustoOperacionalCard from '@/components/tratativas/CustoOperacionalCard';
import PerfilComercialCliente from '@/components/jornada/PerfilComercialCliente';

// Finite State Machine - estados permitidos
const FSM_TRANSITIONS = {
  registrada: ['tratativa_iniciada'],
  tratativa_iniciada: ['em_andamento', 'dependencia_externa', 'encerrada'],
  em_andamento: ['dependencia_externa', 'encerrada'],
  dependencia_externa: ['em_andamento', 'encerrada'],
  aguardando_financeiro: [], // Gerenciado pelos handlers de congelamento
  encerrada: ['aguardando_confirmacao_reabertura'],
  aguardando_confirmacao_reabertura: []
};

// Labels para todos os status incluindo novo
const _STATUS_LABELS_EXTRA = {
  aguardando_financeiro: 'Aguardando Retorno Financeiro'
};

/**
 * Detalhe da tratativa.
 *
 * Serve a dois contextos:
 *   - rota própria (/TratativaDetalhe?id=...), para link direto e para a
 *     busca global;
 *   - painel da direita no master-detail da tela de Tratativas.
 *
 * `idExterno` vem do painel; sem ele, o id continua saindo da URL, então a
 * rota antiga segue funcionando sem alteração.
 *
 * `embutido` esconde o cabeçalho de página: dentro do painel ele seria um
 * segundo título competindo com o da tela, e o "Voltar" não faria sentido —
 * não há para onde voltar quando a lista está ao lado.
 */
export default function TratativaDetalhe({ idExterno = null, embutido = false }) {
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, title: '', description: '' });
  const [dialogExclusao, setDialogExclusao] = useState(false);
  const [justificativaExclusao, setJustificativaExclusao] = useState('');
  const [solucaoForm, setSolucaoForm] = useState({
    descricao_solucao: '',
    solucao_replicavel: false,
    nota_reclame_aqui: '',
    voltaria_fazer_negocio: false,
    categoria_reclame_aqui: '',
    situacao_comentario_google: '',
    tipo_resolucao_contestacao: '',
    valor_contestacao: '',
    valor_recuperado: '',
    reavaliacao_positiva_google: false,
    exclusao_avaliacao_negativa_google: false,
    etapa_jornada_id: '',
    causa_primaria: '',
    manter_motivo: true,
    // Devolução Financeira (null = não respondido ainda, obrigatório)
    houve_devolucao_financeira: null,
    valor_devolvido_cliente: '',
    // Monetização de atritos (apenas gestor, opcional)
    teve_churn: false,
    valor_perda_receita: '',
    // Contestação de Compra
    status_resolucao_contestacao: '',
    status_final_contestacao: '',
    resolvemos_contestacao: false,
    conta_bloqueada_contestacao: false,
    valor_contestado_final: '',
    motivo_reducao_acordo: ''
  });

  const [_diasRestantes, setDiasRestantes] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const tratativaId = idExterno || urlParams.get('id');

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: etapasJornada = [] } = useQuery({
    queryKey: ['etapas-jornada'],
    queryFn: () => db.entities.EtapaJornada.filter({ ativa: true }),
  });

  const { data: _motivos = [] } = useQuery({
    queryKey: ['motivos'],
    queryFn: () => db.entities.MotivoTratativa.filter({ ativo: true }),
  });

  const { data: tratativa, isLoading } = useQuery({
    queryKey: ['tratativa', tratativaId],
    queryFn: () => db.entities.Tratativa.filter({ id: tratativaId }),
    select: (data) => data[0],
    enabled: !!tratativaId,
  });

  const colaborador = colaboradores.find(c => c.email === user?.email);
  const isGestor = colaborador?.papel === 'gestor';

  // Atualizar contagem de dias para reabertura
  useEffect(() => {
    if (tratativa?.status === 'encerrada' && 
        tratativa?.tipo_tratativa === 'reclamacao_interna' && 
        tratativa?.data_encerramento &&
        !tratativa?.status_reabertura) {
      
      const calcular = () => {
        const resultado = calcularDiasRestantesReabertura(tratativa.data_encerramento);
        setDiasRestantes(resultado);
      };

      calcular();
      const interval = setInterval(calcular, 60000); // Atualiza a cada minuto
      return () => clearInterval(interval);
    }
  }, [tratativa]);

  const updateMutation = useMutation({
    mutationFn: ({ data }) => db.entities.Tratativa.update(tratativaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tratativa', tratativaId]);
      queryClient.invalidateQueries(['tratativas']);
      toast.success('Tratativa atualizada');
      setConfirmDialog({ open: false, action: null, title: '', description: '' });
    },
    onError: () => toast.error('Erro ao atualizar tratativa'),
  });

  /**
   * Registra uma nota livre no histórico.
   *
   * Mantém o estado atual nos dois campos: é isso que distingue uma nota de
   * uma transição, sem exigir coluna nova no banco.
   *
   * Ressalva conhecida: a gravação é ler-alterar-escrever sobre o array
   * inteiro. Se duas pessoas registrarem na MESMA tratativa no mesmo
   * instante, uma nota pode se perder. Com 10 usuários e tratativas
   * atribuídas a um agente, a chance é remota — e a solução correta é mover
   * o append para o servidor, o que acontece na Fase 04.
   */
  const registrarNota = (texto) => {
    const historico = [...(tratativa.historico_estados || []), {
      estado_anterior: tratativa.status,
      estado_novo: tratativa.status,
      data_mudanca: new Date().toISOString(),
      usuario: user?.full_name,
      observacao: texto,
    }];
    updateMutation.mutate({ data: { historico_estados: historico } });
  };

  if (isLoading) {
    return <LoadingSpinner text="Carregando tratativa..." />;
  }

  if (!tratativa) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Tratativa não encontrada</h2>
        <p className="text-muted-foreground">O registro solicitado não existe ou foi removido.</p>
      </div>
    );
  }

  const canTransitionTo = (newStatus) => {
    return FSM_TRANSITIONS[tratativa.status]?.includes(newStatus);
  };

  const handleStatusChange = (newStatus) => {
    const now = new Date().toISOString();
    const historico = [...(tratativa.historico_estados || []), {
      estado_anterior: tratativa.status,
      estado_novo: newStatus,
      data_mudanca: now,
      usuario: user?.full_name,
      observacao: `Status alterado para ${statusLabels[newStatus]}`
    }];

    let updateData = {
      status: newStatus,
      historico_estados: historico
    };

    // Se iniciando tratativa, registra data de início
    if (newStatus === 'tratativa_iniciada' && !tratativa.data_inicio_tratativa) {
      updateData.data_inicio_tratativa = now;
    }

    // Se encerrando, calcula tempo total
    if (newStatus === 'encerrada') {
      updateData.data_encerramento = now;
      if (tratativa.data_inicio_tratativa) {
        const inicio = new Date(tratativa.data_inicio_tratativa);
        const fim = new Date(now);
        const diffMinutes = Math.round((fim - inicio) / 60000);
        updateData.tempo_total_minutos = parseInt(diffMinutes);
        
        // Verifica se encerrou no SLA
        const slaMinutes = parseInt(tratativa.sla_atribuido || 24) * 60;
        updateData.encerrado_no_sla = diffMinutes <= slaMinutes;
      }

      // Se for reclamação interna, muda para aguardando confirmação de reabertura
      if (tratativa.tipo_tratativa === 'reclamacao_interna') {
        updateData.status = 'aguardando_confirmacao_reabertura';
        updateData.status_reabertura = 'aguardando';
      }
    }

    updateMutation.mutate({ data: updateData });
  };

  const handleEncerrar = () => {
    // Validar campos obrigatórios
    if (!solucaoForm.etapa_jornada_id || !solucaoForm.causa_primaria) {
      toast.error('Preencha a etapa da jornada e a causa primária');
      return;
    }

    // Devolução financeira OBRIGATÓRIA para reclamação interna, reclame aqui e google
    const tiposComEstorno = ['reclamacao_interna', 'reclame_aqui', 'google_meu_negocio'];
    if (tiposComEstorno.includes(tratativa.tipo_tratativa)) {
      if (solucaoForm.houve_devolucao_financeira === null) {
        toast.error('Para encerrar a tratativa é necessário informar se houve devolução de valor ao cliente.');
        return;
      }
      if (solucaoForm.houve_devolucao_financeira === true) {
        if (!solucaoForm.valor_devolvido_cliente || parseFloat(solucaoForm.valor_devolvido_cliente) <= 0) {
          toast.error('Informe o valor devolvido ao cliente (R$).');
          return;
        }
      }
    }

    // Validações específicas para Contestação de Compra
    if (tratativa.tipo_tratativa === 'contestacao') {
      if (!solucaoForm.status_resolucao_contestacao) {
        toast.error('Selecione o Status da Resolução');
        return;
      }
      if (!solucaoForm.status_final_contestacao) {
        toast.error('Selecione o Status Final');
        return;
      }
      if (solucaoForm.status_resolucao_contestacao === 'acordo') {
        if (!solucaoForm.motivo_reducao_acordo || !solucaoForm.motivo_reducao_acordo.trim()) {
          toast.error('Informe o Motivo da Redução (obrigatório para Acordo)');
          return;
        }
        if (solucaoForm.motivo_reducao_acordo.length > 50) {
          toast.error('Motivo da Redução deve ter no máximo 50 caracteres');
          return;
        }
      }
    }

    const now = new Date().toISOString();
    const historico = [...(tratativa.historico_estados || []), {
      estado_anterior: tratativa.status,
      estado_novo: 'encerrada',
      data_mudanca: now,
      usuario: user?.full_name,
      observacao: tratativa.tipo_tratativa === 'contestacao' && solucaoForm.status_resolucao_contestacao === 'acordo'
        ? `Tratativa encerrada — Acordo (2,5 pts aplicados). Motivo da redução: ${solucaoForm.motivo_reducao_acordo}`
        : 'Tratativa encerrada'
    }];

    let updateData = {
      status: 'encerrada',
      historico_estados: historico,
      data_encerramento: now,
      descricao_solucao: solucaoForm.descricao_solucao,
      solucao_replicavel: solucaoForm.solucao_replicavel,
      etapa_jornada_id: solucaoForm.etapa_jornada_id,
      etapa_jornada_nome: solucaoForm.etapa_jornada_nome || etapasJornada.find(e => e.id === solucaoForm.etapa_jornada_id)?.nome,
      causa_primaria: solucaoForm.causa_primaria,
      motivo_confirmado: solucaoForm.manter_motivo
    };

    // Devolução Financeira (obrigatório para reclamação interna, reclame aqui, google)
    if (['reclamacao_interna', 'reclame_aqui', 'google_meu_negocio'].includes(tratativa.tipo_tratativa)) {
      updateData.houve_devolucao_financeira = solucaoForm.houve_devolucao_financeira === true;
      updateData.valor_devolvido_cliente = solucaoForm.houve_devolucao_financeira === true && solucaoForm.valor_devolvido_cliente
        ? parseFloat(solucaoForm.valor_devolvido_cliente)
        : null;
    }

    // Campos específicos por tipo
    if (tratativa.tipo_tratativa === 'reclame_aqui') {
      updateData.nota_reclame_aqui = solucaoForm.nota_reclame_aqui ? parseFloat(solucaoForm.nota_reclame_aqui) : null;
      updateData.voltaria_fazer_negocio = solucaoForm.voltaria_fazer_negocio;
      if (solucaoForm.categoria_reclame_aqui) updateData.categoria_reclame_aqui = solucaoForm.categoria_reclame_aqui;
    }
    if (tratativa.tipo_tratativa === 'contestacao') {
      updateData.status_resolucao_contestacao = solucaoForm.status_resolucao_contestacao;
      updateData.status_final_contestacao = solucaoForm.status_final_contestacao;
      updateData.resolvemos_contestacao = solucaoForm.resolvemos_contestacao;
      updateData.conta_bloqueada_contestacao = solucaoForm.conta_bloqueada_contestacao;
      updateData.motivo_reducao_acordo = solucaoForm.status_resolucao_contestacao === 'acordo'
        ? solucaoForm.motivo_reducao_acordo.trim()
        : '';
      // Garantir que valor_contestado_final seja numérico
      updateData.valor_contestado_final = solucaoForm.valor_contestado_final 
        ? parseFloat(solucaoForm.valor_contestado_final) 
        : parseFloat(tratativa.valor_contestado_inicial);
    }
    if (tratativa.tipo_tratativa === 'google_meu_negocio') {
      updateData.reavaliacao_positiva_google = solucaoForm.reavaliacao_positiva_google;
      updateData.exclusao_avaliacao_negativa_google = solucaoForm.exclusao_avaliacao_negativa_google;
      if (solucaoForm.situacao_comentario_google) updateData.situacao_comentario_google = solucaoForm.situacao_comentario_google;
    }

    // Calcula tempo total
    if (tratativa.data_inicio_tratativa) {
      const inicio = new Date(tratativa.data_inicio_tratativa);
      const fim = new Date(now);
      const diffMinutes = Math.round((fim - inicio) / 60000);
      updateData.tempo_total_minutos = parseInt(diffMinutes);
      const slaMinutes = parseInt(tratativa.sla_atribuido || 24) * 60;
      updateData.encerrado_no_sla = diffMinutes <= slaMinutes;
    }

    // Se for reclamação interna, encerra mas muda para aguardando confirmação
    if (tratativa.tipo_tratativa === 'reclamacao_interna') {
      updateData.status = 'aguardando_confirmacao_reabertura';
      updateData.status_reabertura = 'aguardando';
    }

    // Monetização de atritos (opcional, apenas gestor preenche — zero trabalho extra pro agente)
    if (isGestor) {
      updateData.teve_churn = solucaoForm.teve_churn;
      updateData.valor_perda_receita = solucaoForm.valor_perda_receita ? parseFloat(solucaoForm.valor_perda_receita) : 0;
    }

    updateMutation.mutate(
      { data: updateData },
      {
        onSuccess: async () => {
          // Cálculo automático de pontuação ao encerrar
          const tratativaAtualizada = { ...tratativa, ...updateData, id: tratativaId };
          await calcularEAtribuirPontuacao(tratativaAtualizada);
          // Custo operacional só é definitivo quando o status final é "encerrada"
          // (reclamação interna só chega nesse estado depois da confirmação de reabertura)
          if (updateData.status === 'encerrada') {
            await aplicarCustoOperacional(tratativaAtualizada);
          }
        }
      }
    );
  };

  const handleConfirmarReabertura = (houveReabertura) => {
    const now = new Date().toISOString();
    const historico = [...(tratativa.historico_estados || []), {
      estado_anterior: tratativa.status,
      estado_novo: 'encerrada',
      data_mudanca: now,
      usuario: user?.full_name,
      observacao: houveReabertura ? 'Cliente reabriu a reclamação' : 'Confirmado: sem reabertura em 7 dias'
    }];

    const updateData = {
      status: 'encerrada',
      status_reabertura: houveReabertura ? 'cliente_reabriu' : 'nao_houve',
      houve_reabertura: houveReabertura,
      data_confirmacao_reabertura: now,
      historico_estados: historico
    };

    updateMutation.mutate(
      { data: updateData },
      {
        onSuccess: async () => {
          const tratativaAtualizada = { ...tratativa, ...updateData, id: tratativaId };
          await aplicarCustoOperacional(tratativaAtualizada);
        }
      }
    );
  };

  // ── Custo operacional automático ao atingir o status definitivo "encerrada" ──
  const aplicarCustoOperacional = async (tratativaAtualizada) => {
    if (tratativaAtualizada.custo_operacional_reais) return; // já calculado, evita reprocessar
    if (!tratativaAtualizada.agente_responsavel_id) return;
    const agente = colaboradores.find(c => c.id === tratativaAtualizada.agente_responsavel_id);
    if (!agente) return;

    const custo = calcularCustoOperacional(tratativaAtualizada, agente);
    try {
      await db.entities.Tratativa.update(tratativaAtualizada.id, { custo_operacional_reais: custo });
      queryClient.invalidateQueries(['tratativa', tratativaId]);
    } catch (e) {
      console.error('Erro ao calcular custo operacional:', e);
    }
  };

  const isEncerrada = tratativa.status === 'encerrada';
  const isAguardandoReabertura = tratativa.status === 'aguardando_confirmacao_reabertura';
  const isExcluida = tratativa.status === 'excluida';
  const isAguardandoFinanceiro = tratativa.status === 'aguardando_financeiro';

  // ── Congelamento de SLA (contestações) ──────────────────────────────────
  const handleCongelarSLA = (dataDefesa) => {
    const now = new Date().toISOString();
    // Calcula tempo ativo até o momento
    let tempoAtivoMinutos = 0;
    if (tratativa.data_inicio_tratativa) {
      tempoAtivoMinutos = Math.round((new Date(now) - new Date(tratativa.data_inicio_tratativa)) / 60000);
    }

    const historico = [...(tratativa.historico_estados || []), {
      estado_anterior: tratativa.status,
      estado_novo: 'aguardando_financeiro',
      data_mudanca: now,
      usuario: user?.full_name,
      observacao: `SLA congelado — defesa enviada em ${dataDefesa}`
    }];

    updateMutation.mutate({
      data: {
        status: 'aguardando_financeiro',
        historico_estados: historico,
        congelamento_sla: {
          ativo: true,
          data_congelamento: now,
          data_envio_defesa: dataDefesa,
          tempo_ativo_antes_minutos: tempoAtivoMinutos,
          congelado_por_nome: user?.full_name || colaborador?.nome_completo
        }
      }
    });
  };

  const handleDescongelarSLA = () => {
    const now = new Date().toISOString();
    const congelamento = tratativa.congelamento_sla || {};
    const tempoCongeladoMin = congelamento.data_congelamento
      ? Math.round((new Date(now) - new Date(congelamento.data_congelamento)) / 60000)
      : 0;

    const historico = [...(tratativa.historico_estados || []), {
      estado_anterior: 'aguardando_financeiro',
      estado_novo: 'em_andamento',
      data_mudanca: now,
      usuario: user?.full_name,
      observacao: `SLA reativado — retorno do setor financeiro recebido. Tempo congelado: ${Math.round(tempoCongeladoMin / 60)}h`
    }];

    updateMutation.mutate({
      data: {
        status: 'em_andamento',
        historico_estados: historico,
        congelamento_sla: {
          ...congelamento,
          ativo: false,
          data_descongelamento: now,
          tempo_total_congelado_minutos: tempoCongeladoMin,
          descongelado_por_nome: user?.full_name || colaborador?.nome_completo
        }
      }
    });
  };

  // ── Desfecho final da contestação ────────────────────────────────────────
  const handleSalvarDesfecho = ({ resultado, descricao_outros }) => {
    const now = new Date().toISOString();
    const historico = [...(tratativa.historico_estados || []), {
      estado_anterior: tratativa.status,
      estado_novo: tratativa.status,
      data_mudanca: now,
      usuario: user?.full_name,
      observacao: `Desfecho registrado: ${resultado}`
    }];

    updateMutation.mutate({
      data: {
        historico_estados: historico,
        desfecho_contestacao: {
          resultado,
          descricao_outros: descricao_outros || '',
          data_desfecho: now,
          registrado_por: user?.full_name || colaborador?.nome_completo
        }
      }
    });
  };

  // ── Cálculo automático de pontuação ao alterar status via admin ──────────
  const calcularEAtribuirPontuacao = async (tratativaAtualizada) => {
    if (!tratativaAtualizada.agente_responsavel_id) return;
    if (tratativaAtualizada.pontuacao_calculada) return; // já calculada

    const { pontos, detalhes } = calculateTratativaPoints(tratativaAtualizada);
    if (pontos <= 0) return;

    const trimestre = (() => {
      const d = new Date();
      return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
    })();

    try {
      const existentes = await db.entities.Pontuacao.filter({
        colaborador_id: tratativaAtualizada.agente_responsavel_id,
        periodo_trimestre: trimestre
      });

      const novoDetalhe = {
        tipo: tratativaAtualizada.tipo_tratativa,
        pontos,
        descricao: detalhes.map(d => d.tipo).join(', '),
        data: new Date().toISOString(),
        tratativa_id: tratativaAtualizada.id
      };

      if (existentes.length > 0) {
        const atual = existentes[0];
        // Evita duplicidade verificando se já existe esta tratativa no detalhamento
        const jaExiste = (atual.detalhamento || []).some(d => d.tratativa_id === tratativaAtualizada.id);
        if (!jaExiste) {
          await db.entities.Pontuacao.update(atual.id, {
            total_pontos: (atual.total_pontos || 0) + pontos,
            detalhamento: [...(atual.detalhamento || []), novoDetalhe]
          });
        }
      } else {
        await db.entities.Pontuacao.create({
          colaborador_id: tratativaAtualizada.agente_responsavel_id,
          colaborador_nome: tratativaAtualizada.agente_responsavel_nome,
          periodo_trimestre: trimestre,
          total_pontos: pontos,
          detalhamento: [novoDetalhe]
        });
      }

      // Marca como calculada
      await db.entities.Tratativa.update(tratativaAtualizada.id, { pontuacao_calculada: true });
    } catch (e) {
      console.error('Erro ao calcular pontuação:', e);
    }
  };

  const handleExcluir = () => {
    if (!justificativaExclusao || justificativaExclusao.trim().length < 10) {
      toast.error('Justificativa deve ter pelo menos 10 caracteres');
      return;
    }

    const now = new Date().toISOString();
    const historico = [...(tratativa.historico_estados || []), {
      estado_anterior: tratativa.status,
      estado_novo: 'excluida',
      data_mudanca: now,
      usuario: user?.full_name,
      observacao: `Excluída - Motivo: ${justificativaExclusao}`
    }];

    updateMutation.mutate({ 
      data: {
        status: 'excluida',
        excluida: true,
        justificativa_exclusao: justificativaExclusao,
        data_exclusao: now,
        excluida_por_id: colaborador?.id || user?.id,
        excluida_por_nome: colaborador?.nome_completo || user?.full_name,
        historico_estados: historico
      }
    });
    setDialogExclusao(false);
    setJustificativaExclusao('');
  };

  // Calcular pontuação (preview)
  const pontosPreview = isEncerrada ? calculateTratativaPoints(tratativa) : null;

  return (
    <div className="space-y-6">
      {!embutido && (
      <PageHeader 
        title="Detalhe da Tratativa"
        subtitle={tratativa.id_interno || `#${tratativa.id?.substring(0, 8)}`}
        icon={ClipboardList}
        backTo="Tratativas"
        actions={
          !isExcluida && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setDialogExclusao(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Tratativa
            </Button>
          )
        }
      />
      )}

      {/* Alerta de Tratativa Excluída */}
      {isExcluida && (
        <Card className="border-0 shadow-sm bg-destructive/10 border-destructive/25">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-destructive">Tratativa Excluída</p>
                <p className="text-sm text-destructive mt-1">
                  Esta tratativa foi excluída em {formatDateSP(tratativa.data_exclusao)} por {tratativa.excluida_por_nome}
                </p>
                {tratativa.justificativa_exclusao && (
                  <div className="mt-3 p-3 bg-card rounded border border-destructive/25">
                    <p className="text-xs font-medium text-destructive mb-1">Justificativa:</p>
                    <p className="text-sm text-foreground">{tratativa.justificativa_exclusao}</p>
                  </div>
                )}
                <p className="text-xs text-destructive mt-3">
                  Tratativas excluídas não podem ser editadas e não aparecem em indicadores operacionais
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Perfil Comercial do Cliente — contexto comercial da ocorrência */}
      <PerfilComercialCliente tratativa={tratativa} />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Informações</CardTitle>
                <div className="flex items-center gap-2">
                  <StatusBadge status={tratativa.prioridade} />
                  <StatusBadge status={tratativa.status} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Link Zendesk</Label>
                  <a 
                    href={tratativa.link_zendesk}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir ticket
                  </a>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Link Intranet</Label>
                  <a 
                    href={tratativa.link_intranet}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir intranet
                  </a>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">ID da Base</Label>
                  <p className="font-medium">{tratativa.id_base_cliente || '-'}</p>
                </div>
                {tratativa.nome_cliente && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Nome do Cliente</Label>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{tratativa.nome_cliente}</p>
                      {tratativa.cliente_recorrente && (
                        <Badge className="bg-warning-soft text-warning border-warning/30 flex items-center gap-1">
                          <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
                          Recorrente ({tratativa.numero_ocorrencias}x)
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground text-xs">Tipo de Tratativa</Label>
                  <p className="font-medium">{tipoTratativaLabels[tratativa.tipo_tratativa]}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">SLA</Label>
                  <p className="font-medium">{tratativa.sla_atribuido || 24} horas</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Agente Responsável</Label>
                  <p className="font-medium">{tratativa.agente_responsavel_nome || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Data de Registro</Label>
                  <p className="font-medium">{formatDateSP(tratativa.data_registro || tratativa.created_date)}</p>
                </div>
                {tratativa.motivo_nome && (
                  <>
                    <div>
                      <Label className="text-muted-foreground text-xs">Motivo</Label>
                      <p className="font-medium">{tratativa.motivo_nome}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Submotivos</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tratativa.submotivos?.map((sub, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{sub}</Badge>
                        )) || <span className="text-muted-foreground">-</span>}
                      </div>
                    </div>
                  </>
                )}
                {tratativa.etapa_jornada_nome && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Etapa da Jornada</Label>
                    <Badge className="bg-info-soft text-primary mt-1">
                      <MapPin className="w-3 h-3 mr-1" />
                      {tratativa.etapa_jornada_nome}
                    </Badge>
                  </div>
                )}
                {tratativa.causa_primaria && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Causa Primária</Label>
                    <p className="font-medium capitalize">{tratativa.causa_primaria.replace('_', ' ')}</p>
                  </div>
                )}

                {/* Devolução Financeira */}
                {tratativa.tipo_tratativa !== 'contestacao' && tratativa.houve_devolucao_financeira !== undefined && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Devolução Financeira</Label>
                    {tratativa.houve_devolucao_financeira ? (
                      <div className="mt-1 p-3 bg-critical-soft border border-critical/25 rounded-lg flex items-center gap-3">
                        <span className="text-critical text-sm">Houve devolução:</span>
                        <span className="font-bold text-critical text-lg">
                          {formatBRL(tratativa.valor_devolvido_cliente)}
                        </span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="mt-1 text-muted-foreground">Sem devolução</Badge>
                    )}
                  </div>
                )}

                {/* Campos específicos Contestação de Compra */}
                {tratativa.tipo_tratativa === 'contestacao' && (
                  <>
                    {tratativa.numero_case_contestacao && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Número do Case</Label>
                        <p className="font-medium">{tratativa.numero_case_contestacao}</p>
                      </div>
                    )}
                    {tratativa.motivo_contestacao && (
                      <div className="col-span-2">
                        <Label className="text-muted-foreground text-xs">Motivo da Contestação</Label>
                        <p className="font-medium">{tratativa.motivo_contestacao}</p>
                      </div>
                    )}
                    {tratativa.valor_contestado_inicial !== undefined && (
                     <div>
                       <Label className="text-muted-foreground text-xs">Valor Contestado Inicial</Label>
                       <p className="font-medium">{formatBRL(tratativa.valor_contestado_inicial)}</p>
                     </div>
                    )}
                    {tratativa.prazo_sla_dias && (
                     <div>
                       <Label className="text-muted-foreground text-xs">Prazo Definido</Label>
                       <p className="font-medium">{parseInt(tratativa.prazo_sla_dias)} dias ({parseInt(tratativa.prazo_sla_dias) * 24}h)</p>
                     </div>
                    )}
                    {tratativa.status_resolucao_contestacao && (
                       <div>
                         <Label className="text-muted-foreground text-xs">Status da Resolução</Label>
                         <Badge variant="outline" className="capitalize">
                           {tratativa.status_resolucao_contestacao.replace('_', ' ')}
                         </Badge>
                       </div>
                    )}
                    {tratativa.motivo_reducao_acordo && (
                      <div className="col-span-2">
                        <Label className="text-muted-foreground text-xs">Motivo da Redução (Acordo)</Label>
                        <p className="font-medium">{tratativa.motivo_reducao_acordo}</p>
                      </div>
                    )}
                    </>
                    )}
              </div>

              {tratativa.data_inicio_tratativa && (
                <div className="p-3 bg-info-soft rounded-lg">
                  <div className="flex items-center gap-2 text-primary">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      Iniciada em {formatDateSP(tratativa.data_inicio_tratativa)}
                    </span>
                  </div>
                </div>
              )}

              {tratativa.data_encerramento && (
                <div className="p-3 bg-success-soft rounded-lg">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">
                      Encerrada em {formatDateSP(tratativa.data_encerramento)}
                      {tratativa.tempo_total_minutos && (
                        <span className="ml-2">
                          • Tempo total: {Math.floor(tratativa.tempo_total_minutos / 60)}h {tratativa.tempo_total_minutos % 60}min
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Painel de tempo ativo vs congelado — contestações */}
              {tratativa.congelamento_sla?.data_congelamento && (
                <div className="p-3 bg-info-soft border border-info/25 rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-info flex items-center gap-1">
                    <Snowflake className="w-3.5 h-3.5" />
                    Histórico de SLA
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Tempo ativo antes do congelamento</span>
                      <p className="font-medium">
                        {(() => { const m = tratativa.congelamento_sla.tempo_ativo_antes_minutos || 0; return `${Math.floor(m/60)}h ${m%60}min`; })()}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tempo congelado</span>
                      <p className="font-medium text-info">
                        {(() => {
                          const m = tratativa.congelamento_sla.tempo_total_congelado_minutos ||
                            (tratativa.congelamento_sla.ativo ? Math.round((new Date() - new Date(tratativa.congelamento_sla.data_congelamento)) / 60000) : 0);
                          return `${Math.floor(m/60)}h ${m%60}min`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timer de Reabertura — componente dedicado */}
          <TimerReobertura
            tratativa={tratativa}
            onConfirmar={(houveReabertura) => setConfirmDialog({
              open: true,
              action: () => handleConfirmarReabertura(houveReabertura),
              title: houveReabertura ? 'Cliente Reabriu a Reclamação' : 'Confirmar: Sem Reabertura',
              description: houveReabertura
                ? 'Confirma que o cliente abriu um novo ticket relacionado a esta tratativa? Você não receberá o ponto de "Sem reabertura em 7 dias".'
                : 'Confirma que não houve reabertura nos últimos 7 dias? Você receberá +1 ponto adicional na pontuação desta tratativa.'
            })}
            isLoading={updateMutation.isPending}
          />

          {/* Congelamento de SLA — apenas contestações */}
          <CongelamentoSLA
            tratativa={tratativa}
            user={user}
            onCongelar={handleCongelarSLA}
            onDescongelar={handleDescongelarSLA}
            isLoading={updateMutation.isPending}
          />

          {/* Desfecho final — após retorno do financeiro */}
          <DesfechoContestacao
            tratativa={tratativa}
            onSalvar={handleSalvarDesfecho}
            isLoading={updateMutation.isPending}
          />

          {/* Ações de Status (FSM) */}
          {!isEncerrada && !isAguardandoReabertura && !isExcluida && !isAguardandoFinanceiro && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {tratativa.status === 'registrada' && canTransitionTo('tratativa_iniciada') && (
                    <Button 
                      onClick={() => handleStatusChange('tratativa_iniciada')}
                      className="bg-primary hover:bg-primary/90"
                      disabled={updateMutation.isPending}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {updateMutation.isPending ? 'Iniciando...' : 'Iniciar Tratativa'}
                    </Button>
                  )}

                  {canTransitionTo('em_andamento') && (
                    <Button 
                      variant="outline"
                      onClick={() => handleStatusChange('em_andamento')}
                      disabled={updateMutation.isPending}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {updateMutation.isPending ? 'Atualizando...' : 'Marcar Em Andamento'}
                    </Button>
                  )}

                  {canTransitionTo('dependencia_externa') && (
                    <Button 
                      variant="outline"
                      onClick={() => handleStatusChange('dependencia_externa')}
                      disabled={updateMutation.isPending}
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      {updateMutation.isPending ? 'Atualizando...' : 'Dependência Externa'}
                    </Button>
                  )}
                </div>

                {canTransitionTo('encerrada') && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="font-medium">Encerrar Tratativa</h4>
                      
                      <div>
                        <Label>Descrição da Solução</Label>
                        <Textarea
                          value={solucaoForm.descricao_solucao}
                          onChange={(e) => setSolucaoForm({ ...solucaoForm, descricao_solucao: e.target.value })}
                          placeholder="Descreva a solução aplicada..."
                          rows={3}
                        />
                      </div>

                      <div className="p-4 bg-info-soft border border-info/25 rounded-lg">
                        <div className="flex items-start gap-3 mb-2">
                          <Switch
                            checked={solucaoForm.solucao_replicavel}
                            onCheckedChange={(checked) => setSolucaoForm({ ...solucaoForm, solucao_replicavel: checked })}
                          />
                          <div className="flex-1">
                            <Label className="font-medium">Solução Replicável Documentada (+0,5 pts)</Label>
                            <p className="text-xs text-primary mt-1">
                              Marque se a solução pode ser replicada em outras tratativas E foi corretamente documentada, incluindo processos, fluxos e solução aplicada. Este item pode ser auditado pelo gestor.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Devolução Financeira OBRIGATÓRIA para reclamação interna, reclame aqui, google */}
                      {['reclamacao_interna', 'reclame_aqui', 'google_meu_negocio'].includes(tratativa.tipo_tratativa) && (
                        <div className={`p-4 border rounded-lg space-y-3 ${solucaoForm.houve_devolucao_financeira === null ? 'bg-warning-soft border-warning/30' : 'bg-critical-soft border-critical/25'}`}>
                          <h5 className="font-medium text-sm text-critical flex items-center gap-2">
                            Devolução / Estorno ao Cliente
                            <Badge className="bg-destructive/10 text-destructive text-xs">Obrigatório</Badge>
                          </h5>
                          <p className="text-xs text-muted-foreground">Para encerrar a tratativa é necessário informar se houve devolução de valor ao cliente.</p>
                          <div className="flex gap-3">
                            <Button
                              type="button"
                              size="sm"
                              variant={solucaoForm.houve_devolucao_financeira === true ? 'default' : 'outline'}
                              className={solucaoForm.houve_devolucao_financeira === true ? 'bg-critical hover:bg-critical' : ''}
                              onClick={() => setSolucaoForm({ ...solucaoForm, houve_devolucao_financeira: true })}
                            >
                              Sim
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={solucaoForm.houve_devolucao_financeira === false ? 'default' : 'outline'}
                              className={solucaoForm.houve_devolucao_financeira === false ? 'bg-muted hover:bg-muted' : ''}
                              onClick={() => setSolucaoForm({ ...solucaoForm, houve_devolucao_financeira: false, valor_devolvido_cliente: '' })}
                            >
                              Não
                            </Button>
                          </div>
                          {solucaoForm.houve_devolucao_financeira === true && (
                            <div>
                              <Label>Valor estornado ao cliente (R$) *</Label>
                              <CurrencyInput
                                value={solucaoForm.valor_devolvido_cliente || 0}
                                onChange={(num) => setSolucaoForm({ ...solucaoForm, valor_devolvido_cliente: num })}
                                className="mt-1 max-w-xs"
                              />
                              <p className="text-xs text-critical mt-1">
                                Este valor será registrado nos indicadores financeiros da gestão.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Campos específicos por tipo */}
                      {tratativa.tipo_tratativa === 'reclame_aqui' && (
                        <div className="p-4 bg-muted rounded-lg space-y-4">
                          <h5 className="font-medium text-sm">Dados do Reclame Aqui</h5>
                          <div>
                            <Label>Categoria da Reclamação</Label>
                            <Input
                              value={solucaoForm.categoria_reclame_aqui}
                              onChange={(e) => setSolucaoForm({ ...solucaoForm, categoria_reclame_aqui: e.target.value })}
                              placeholder="Ex: Entrega, Produto, Atendimento..."
                              className="mt-1"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Nota recebida (7-10)</Label>
                              <Input
                                type="number"
                                min="7"
                                max="10"
                                value={solucaoForm.nota_reclame_aqui}
                                onChange={(e) => setSolucaoForm({ ...solucaoForm, nota_reclame_aqui: e.target.value })}
                              />
                            </div>
                            <div className="flex items-center gap-3 pt-6">
                              <Switch
                                checked={solucaoForm.voltaria_fazer_negocio}
                                onCheckedChange={(checked) => setSolucaoForm({ ...solucaoForm, voltaria_fazer_negocio: checked })}
                              />
                              <Label>Voltaria a fazer negócio</Label>
                            </div>
                          </div>
                        </div>
                      )}

                      {tratativa.tipo_tratativa === 'contestacao' && (
                        <div className="p-4 bg-info-soft border border-info/25 rounded-lg space-y-4">
                          <h5 className="font-medium text-sm text-primary">Encerramento Contestação de Compra</h5>
                          
                          <div>
                            <Label>Status da Resolução *</Label>
                            <Select
                              value={solucaoForm.status_resolucao_contestacao}
                              onValueChange={(value) => setSolucaoForm({ ...solucaoForm, status_resolucao_contestacao: value })}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="acordo">Acordo</SelectItem>
                                <SelectItem value="cancelou_contestacao">Cancelou a contestação</SelectItem>
                                <SelectItem value="contestou_prazo_cancelamento">Contestou no prazo de cancelamento</SelectItem>
                                <SelectItem value="contestou_pagamento_duplicidade">Contestou pagamento em duplicidade</SelectItem>
                                <SelectItem value="pagou">Pagou</SelectItem>
                                <SelectItem value="sem_acordo">Sem acordo</SelectItem>
                                <SelectItem value="sem_contato">Sem contato</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Status Final da Tratativa *</Label>
                            <Select
                              value={solucaoForm.status_final_contestacao}
                              onValueChange={(value) => setSolucaoForm({ ...solucaoForm, status_final_contestacao: value })}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="finalizada">Finalizada</SelectItem>
                                <SelectItem value="cancelada">Cancelada</SelectItem>
                                <SelectItem value="defesa_enviada">Defesa enviada</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Valor Contestado Final (R$)</Label>
                            <CurrencyInput
                              value={solucaoForm.valor_contestado_final || tratativa.valor_contestado_inicial || 0}
                              onChange={(num) => setSolucaoForm({ ...solucaoForm, valor_contestado_final: num })}
                            />
                            <p className="text-xs text-primary mt-1">
                              Valor inicial: {formatBRL(tratativa.valor_contestado_inicial)}
                            </p>
                          </div>

                          {solucaoForm.status_resolucao_contestacao === 'acordo' && (
                            <div className="p-3 bg-warning-soft border border-warning/30 rounded-lg space-y-2">
                              <Label>Motivo da Redução * (máx. 50 caracteres)</Label>
                              <Input
                                value={solucaoForm.motivo_reducao_acordo}
                                onChange={(e) => setSolucaoForm({ ...solucaoForm, motivo_reducao_acordo: e.target.value.slice(0, 50) })}
                                placeholder="Informe o motivo da redução aplicada"
                                maxLength={50}
                                className="mt-1"
                              />
                              <p className="text-xs text-warning">{(solucaoForm.motivo_reducao_acordo || '').length}/50 caracteres — obrigatório para concluir o Acordo</p>
                              <div className="flex flex-wrap gap-1.5">
                                {['Redução para manutenção do contrato', 'Desconto aplicado por falha operacional', 'Ajuste comercial autorizado', 'Redução por custo de aplicativo', 'Adequação do plano contratado', 'Revisão financeira aprovada'].map(s => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setSolucaoForm({ ...solucaoForm, motivo_reducao_acordo: s.slice(0, 50) })}
                                    className="text-xs px-2 py-1 bg-card border border-warning/25 rounded-full hover:bg-warning-soft text-warning"
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={solucaoForm.resolvemos_contestacao}
                                onCheckedChange={(checked) => setSolucaoForm({ ...solucaoForm, resolvemos_contestacao: checked })}
                              />
                              <Label>Resolvemos? *</Label>
                            </div>

                            <div className="flex items-center gap-3">
                              <Switch
                                checked={solucaoForm.conta_bloqueada_contestacao}
                                onCheckedChange={(checked) => setSolucaoForm({ ...solucaoForm, conta_bloqueada_contestacao: checked })}
                              />
                              <Label>Conta Bloqueada? *</Label>
                            </div>
                          </div>
                        </div>
                      )}

                      {tratativa.tipo_tratativa === 'google_meu_negocio' && (
                        <div className="p-4 bg-muted rounded-lg space-y-3">
                          <h5 className="font-medium text-sm">Resultado Google Meu Negócio</h5>
                          <div>
                            <Label>Situação do Comentário *</Label>
                            <Select
                              value={solucaoForm.situacao_comentario_google}
                              onValueChange={(value) => setSolucaoForm({ ...solucaoForm, situacao_comentario_google: value })}
                            >
                              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a situação" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="comentario_mantido">Comentário Mantido</SelectItem>
                                <SelectItem value="comentario_editado">Comentário Editado</SelectItem>
                                <SelectItem value="comentario_excluido">Comentário Excluído</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={solucaoForm.reavaliacao_positiva_google}
                              onCheckedChange={(checked) => setSolucaoForm({ ...solucaoForm, reavaliacao_positiva_google: checked })}
                            />
                            <Label>Reavaliação positiva (+2 pts)</Label>
                          </div>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={solucaoForm.exclusao_avaliacao_negativa_google}
                              onCheckedChange={(checked) => setSolucaoForm({ ...solucaoForm, exclusao_avaliacao_negativa_google: checked })}
                            />
                            <Label>Exclusão de avaliação negativa (+1 pt)</Label>
                          </div>
                        </div>
                      )}

                      {/* Monetização de Atrito — opcional, apenas gestor */}
                      {isGestor && (
                        <MonetizacaoAtritoForm
                          form={solucaoForm}
                          onChange={setSolucaoForm}
                        />
                      )}

                      {/* Confirmação de Motivo/Submotivo */}
                      <div className="p-4 bg-info-soft border border-info/25 rounded-lg space-y-3">
                        <h5 className="font-medium text-sm">Confirmação de Motivo e Submotivos</h5>
                        <div className="p-3 bg-card rounded border">
                          <p className="text-xs text-muted-foreground mb-1">Motivo registrado</p>
                          <p className="font-medium">{tratativa.motivo_nome || 'Não definido'}</p>
                          {tratativa.submotivos?.length > 0 && (
                            <>
                              <p className="text-xs text-muted-foreground mt-2 mb-1">Submotivos</p>
                              <div className="flex flex-wrap gap-1">
                                {tratativa.submotivos.map((sub, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">{sub}</Badge>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={solucaoForm.manter_motivo}
                            onCheckedChange={(checked) => setSolucaoForm({ ...solucaoForm, manter_motivo: checked })}
                          />
                          <Label>Manter informações de motivo/submotivo</Label>
                        </div>
                        {!solucaoForm.manter_motivo && (
                          <p className="text-xs text-warning">
                            Após encerrar, você poderá editar motivo e submotivos
                          </p>
                        )}
                      </div>

                      {/* Etapa da Jornada */}
                      <div>
                        <Label>Etapa da Jornada Impactada *</Label>
                        <Select
                          value={solucaoForm.etapa_jornada_id}
                          onValueChange={(value) => {
                            const etapa = etapasJornada.find(e => e.id === value);
                            setSolucaoForm({ 
                              ...solucaoForm, 
                              etapa_jornada_id: value,
                              etapa_jornada_nome: etapa?.nome || ''
                            });
                          }}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione a etapa" />
                          </SelectTrigger>
                          <SelectContent>
                            {etapasJornada.map(etapa => (
                              <SelectItem key={etapa.id} value={etapa.id}>
                                {etapa.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Causa Primária */}
                      <div>
                        <Label>Causa Primária (Origem Raiz) *</Label>
                        <Select
                          value={solucaoForm.causa_primaria}
                          onValueChange={(value) => setSolucaoForm({ ...solucaoForm, causa_primaria: value })}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione a causa" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="processo">Processo</SelectItem>
                            <SelectItem value="produto_sistema">Produto / Sistema</SelectItem>
                            <SelectItem value="comunicacao">Comunicação</SelectItem>
                            <SelectItem value="expectativa_cliente">Expectativa do Cliente</SelectItem>
                            <SelectItem value="operacao_interna">Operação Interna</SelectItem>
                            <SelectItem value="terceiro">Terceiro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        onClick={() => setConfirmDialog({
                          open: true,
                          action: 'encerrar',
                          title: 'Encerrar Tratativa',
                          description: 'Tem certeza que deseja encerrar esta tratativa? Esta ação é definitiva e não pode ser desfeita.'
                        })}
                        className="bg-success hover:bg-success/90"
                        disabled={updateMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {updateMutation.isPending ? 'Encerrando...' : 'Encerrar Tratativa'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Solução (se encerrada) */}
          {isEncerrada && tratativa.descricao_solucao && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Solução Aplicada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground">{tratativa.descricao_solucao}</p>
                {tratativa.solucao_replicavel && (
                  <Badge className="mt-3 bg-info-soft text-primary">Solução Replicável</Badge>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Impacto Financeiro — restrito a gestores */}
          {isGestor && <CustoOperacionalCard tratativa={tratativa} />}

          {/* Pontuação */}
          {isEncerrada && pontosPreview && (
            <Card className="border-0 shadow-sm bg-warning text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-warning flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Pontuação Gerada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold mb-3">{pontosPreview.pontos.toFixed(1)}</div>
                <div className="space-y-1">
                  {pontosPreview.detalhes.map((d, i) => (
                    <div key={i} className="text-sm text-warning flex justify-between">
                      <span>{d.tipo}</span>
                      <span>+{d.pontos}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Registro e linha do tempo.
              A regra pede que o campo de registro seja o elemento de maior
              destaque da área de ação — por isso ele vem ANTES do histórico,
              e não no fim da página. */}
          <Card className="border shadow-none">
            <CardContent className="pt-6">
              <RegistrarNota
                onRegistrar={registrarNota}
                salvando={updateMutation.isPending}
                desabilitado={isExcluida}
              />
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="w-4 h-4" aria-hidden="true" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LinhaDoTempo entradas={tratativa.historico_estados} />
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel="Confirmar"
        onConfirm={confirmDialog.action === 'encerrar' ? handleEncerrar : confirmDialog.action}
        variant="warning"
      />

      {/* Dialog de Exclusão com Justificativa */}
      <Dialog open={dialogExclusao} onOpenChange={setDialogExclusao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Excluir Tratativa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-warning-soft border border-warning/25 rounded-lg">
              <p className="text-sm text-warning">
                <strong>Atenção:</strong> Esta ação não pode ser desfeita facilmente. A tratativa será marcada como excluída e não aparecerá mais em fluxos operacionais nem indicadores.
              </p>
            </div>
            
            <div>
              <Label className="text-base font-medium">Justificativa Obrigatória *</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Informe o motivo da exclusão desta tratativa (mínimo 10 caracteres)
              </p>
              <Textarea
                value={justificativaExclusao}
                onChange={(e) => setJustificativaExclusao(e.target.value)}
                placeholder="Ex: Duplicidade de registro, erro de cadastro, tratativa criada por engano..."
                rows={4}
                className={justificativaExclusao.length > 0 && justificativaExclusao.length < 10 ? 'border-destructive/30' : ''}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {justificativaExclusao.length} caracteres
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDialogExclusao(false);
                  setJustificativaExclusao('');
                }}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive"
                onClick={handleExcluir}
                disabled={updateMutation.isPending || justificativaExclusao.trim().length < 10}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}