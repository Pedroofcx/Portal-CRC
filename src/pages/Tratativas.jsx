const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDateSP, tipoTratativaLabels, prioridadeLabels, statusLabels, getSLAByType } from '@/components/utils/helpers';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ClipboardList,
  Plus,
  Filter,
  ExternalLink,
  Eye,
  Archive,
  ShieldCheck
} from 'lucide-react';
import ImportExportCSV from '@/components/tratativas/ImportExportCSV';
import AdminBulkActions from '@/components/tratativas/AdminBulkActions';
import DadosComerciaisForm from '@/components/tratativas/DadosComerciaisForm';

export default function Tratativas() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterPrioridade, setFilterPrioridade] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCnpj, setFilterCnpj] = useState('');
  const [formData, setFormData] = useState({
    link_zendesk: '',
    link_intranet: '',
    id_base_cliente: '',
    nome_cliente: '',
    cnpj_cliente: '',
    tipo_tratativa: '',
    prioridade: '',
    categoria: '',
    motivo_id: '',
    submotivos: [],
    // Campos específicos Contestação de Compra
    numero_case_contestacao: '',
    motivo_contestacao: '',
    valor_contestado_inicial: '',
    prazo_sla_dias: '',
    // Dados Comerciais do Cliente
    plano_cliente: '',
    modalidade_plano: '',
    valor_contratacao_plano_atual: '',
    data_primeira_contratacao: '',
    data_contratacao_plano_atual: '',
    segmento_cliente: ''
  });
  const [clienteRecorrente, setClienteRecorrente] = useState(false);
  const [numeroOcorrencias, setNumeroOcorrencias] = useState(0);

  const queryClient = useQueryClient();

  // Ler parâmetros da URL para navegação inteligente do Dashboard
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('status');
    if (statusParam) {
      if (statusParam === 'critica') {
        setFilterPrioridade('critica');
      } else {
        setFilterStatus(statusParam);
      }
    }
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: tratativas = [], isLoading } = useQuery({
    queryKey: ['tratativas'],
    queryFn: () => db.entities.Tratativa.list('-created_date', 300),
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const { data: motivos = [] } = useQuery({
    queryKey: ['motivos'],
    queryFn: () => db.entities.MotivoTratativa.filter({ ativo: true }),
    staleTime: 120000,
    retry: 2
  });

  const { data: tiposTratativa = [] } = useQuery({
    queryKey: ['tipos-tratativa'],
    queryFn: () => db.entities.TipoTratativa.filter({ ativa: true }),
  });

  const colaborador = colaboradores.find(c => c.email === user?.email);
  const isGestor = colaborador?.papel === 'gestor';

  // Estado para exibir/ocultar excluídas (gestor e agentes)
  const [mostrarExcluidas, setMostrarExcluidas] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const isAdmin = user?.role === 'admin' || isGestor;

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTratativas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTratativas.map(t => t.id)));
    }
  };

  // Filtrar tratativas - excluir as com status "excluida" por padrão
  let filteredTratativas = isGestor 
    ? tratativas 
    : tratativas.filter(t => t.agente_responsavel_id === colaborador?.id || t.created_by === user?.email);

  // Filtrar excluídas (padrão: não mostrar)
  if (!mostrarExcluidas) {
    filteredTratativas = filteredTratativas.filter(t => t.status !== 'excluida');
  }

  if (filterStatus !== 'all') {
    filteredTratativas = filteredTratativas.filter(t => t.status === filterStatus);
  }
  if (filterTipo !== 'all') {
    filteredTratativas = filteredTratativas.filter(t => t.tipo_tratativa === filterTipo);
  }
  if (filterPrioridade !== 'all') {
    filteredTratativas = filteredTratativas.filter(t => t.prioridade === filterPrioridade && !['encerrada','aguardando_confirmacao_reabertura','excluida'].includes(t.status));
  }
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredTratativas = filteredTratativas.filter(t => 
      t.nome_cliente?.toLowerCase().includes(term) ||
      t.id_base_cliente?.toLowerCase().includes(term) ||
      t.id_interno?.toLowerCase().includes(term) ||
      t.id?.toLowerCase().includes(term)
    );
  }
  if (filterCnpj) {
    const cnpjTerm = filterCnpj.replace(/\D/g, '');
    filteredTratativas = filteredTratativas.filter(t => {
      const cnpj = (t.cnpj_cliente || '').replace(/\D/g, '');
      return cnpj.includes(cnpjTerm);
    });
  }

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Para Contestação de Compra, usar prazo_sla_dias convertido em horas
      let sla;
      if (data.tipo_tratativa === 'contestacao' && data.prazo_sla_dias) {
        const diasSLA = parseInt(data.prazo_sla_dias);
        sla = diasSLA * 24; // converter dias para horas
      } else {
        sla = getSLAByType(data.tipo_tratativa);
      }
      const now = new Date().toISOString();
      
      // Gerar ID interno TRT-XXXX - usar tratativas já carregadas em cache
      const todasTratativas = tratativas;
      const numerosExistentes = todasTratativas
        .filter(t => t.id_interno)
        .map(t => {
          const match = t.id_interno.match(/TRT-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        });
      const proximoNumero = numerosExistentes.length > 0 
        ? Math.max(...numerosExistentes) + 1 
        : 1;
      const id_interno = `TRT-${proximoNumero.toString().padStart(4, '0')}`;
      
      // Garantir tipos corretos para campos numéricos
      const tratativaData = {
        ...data,
        id_interno,
        status: data.tipo_tratativa === 'contestacao' ? 'em_andamento' : 'registrada',
        sla_atribuido: parseInt(sla),
        data_registro: now,
        agente_responsavel_id: colaborador?.id,
        agente_responsavel_nome: colaborador?.nome_completo || user?.full_name,
        // Garantir que valores numéricos sejam salvos corretamente
        valor_contestado_inicial: data.valor_contestado_inicial ? parseFloat(data.valor_contestado_inicial) : undefined,
        prazo_sla_dias: data.prazo_sla_dias ? parseInt(data.prazo_sla_dias) : undefined,
        historico_estados: [{
          estado_anterior: null,
          estado_novo: data.tipo_tratativa === 'contestacao' ? 'em_andamento' : 'registrada',
          data_mudanca: now,
          usuario: user?.full_name,
          observacao: data.tipo_tratativa === 'contestacao' 
            ? 'Contestação de Compra iniciada automaticamente' 
            : 'Tratativa registrada'
        }]
      };

      // Se for contestação, iniciar automaticamente e incluir data de início
      if (data.tipo_tratativa === 'contestacao') {
        tratativaData.data_inicio_tratativa = now;
      }

      return db.entities.Tratativa.create(tratativaData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tratativas']);
      toast.success('Tratativa registrada com sucesso');
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Erro ao registrar tratativa'),
  });

  const resetForm = () => {
    setFormData({
      link_zendesk: '',
      link_intranet: '',
      id_base_cliente: '',
      nome_cliente: '',
      cnpj_cliente: '',
      tipo_tratativa: '',
      prioridade: '',
      categoria: '',
      motivo_id: '',
      submotivos: [],
      numero_case_contestacao: '',
      motivo_contestacao: '',
      categoria_contestacao: '',
      valor_contestado_inicial: '',
      prazo_sla_dias: '',
      plano_cliente: '',
      modalidade_plano: '',
      valor_contratacao_plano_atual: '',
      data_primeira_contratacao: '',
      data_contratacao_plano_atual: '',
      segmento_cliente: ''
    });
    setClienteRecorrente(false);
    setNumeroOcorrencias(0);
  };

  const categoriaContestacaoLabels = {
    erro_cobranca: 'Erro de Cobrança',
    fraude: 'Fraude',
    cancelamento_compra: 'Cancelamento de Compra',
    erro_operacional: 'Erro Operacional',
    outros: 'Outros'
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validações específicas com mensagens claras
    if (!formData.link_zendesk?.trim()) {
      toast.error('Link do Zendesk é obrigatório');
      return;
    }
    if (!formData.link_intranet?.trim()) {
      toast.error('Link da Intranet é obrigatório');
      return;
    }
    if (!formData.id_base_cliente?.trim()) {
      toast.error('ID da Base do Cliente é obrigatório');
      return;
    }
    if (!formData.nome_cliente?.trim()) {
      toast.error('Nome do Cliente é obrigatório');
      return;
    }
    if (!formData.tipo_tratativa) {
      toast.error('Selecione o Tipo de Tratativa');
      return;
    }
    if (!formData.prioridade) {
      toast.error('Selecione a Prioridade');
      return;
    }
    if (!formData.motivo_id) {
      toast.error('Selecione o Motivo Principal');
      return;
    }
    if (formData.submotivos.length === 0) {
      toast.error('Selecione pelo menos 1 submotivo');
      return;
    }

    // Validações obrigatórias — Dados Comerciais do Cliente
    if (!formData.plano_cliente) {
      toast.error('Selecione o Plano do Cliente');
      return;
    }
    if (!formData.modalidade_plano) {
      toast.error('Selecione a Modalidade do Plano');
      return;
    }
    if (!formData.valor_contratacao_plano_atual || parseFloat(formData.valor_contratacao_plano_atual) <= 0) {
      toast.error('Valor da Contratação do Plano Atual é obrigatório e deve ser maior que zero');
      return;
    }
    if (!formData.data_primeira_contratacao) {
      toast.error('Data da Primeira Contratação é obrigatória');
      return;
    }
    if (!formData.data_contratacao_plano_atual) {
      toast.error('Data da Contratação do Plano Atual é obrigatória');
      return;
    }

    // Validações específicas para Contestação de Compra
    if (formData.tipo_tratativa === 'contestacao') {
      if (!formData.numero_case_contestacao?.trim()) {
        toast.error('Número do Case é obrigatório para Contestação de Compra');
        return;
      }
      if (!formData.motivo_contestacao?.trim()) {
        toast.error('Motivo da Contestação é obrigatório');
        return;
      }
      if (formData.motivo_contestacao.length > 150) {
        toast.error('Motivo da Contestação deve ter no máximo 150 caracteres');
        return;
      }
      if (!formData.valor_contestado_inicial || parseFloat(formData.valor_contestado_inicial) <= 0) {
        toast.error('Valor Contestado é obrigatório e deve ser maior que zero');
        return;
      }
      if (!formData.prazo_sla_dias || parseInt(formData.prazo_sla_dias) <= 0) {
        toast.error('Selecione o prazo de resolução');
        return;
      }
    }

    const motivoSelecionado = motivos.find(m => m.id === formData.motivo_id);
    
    createMutation.mutate({
      ...formData,
      motivo_nome: motivoSelecionado?.motivo || '',
      cliente_recorrente: clienteRecorrente,
      numero_ocorrencias: numeroOcorrencias
    });
  };

  // Verificar recorrência do cliente
  const verificarRecorrencia = async (nomeCliente) => {
    if (!nomeCliente || nomeCliente.length < 3) {
      setClienteRecorrente(false);
      setNumeroOcorrencias(0);
      return;
    }

    const nomeNormalizado = nomeCliente.trim().toLowerCase();
    
    // Buscar tratativas com o mesmo nome (normalizado)
    const tratativasDoCliente = tratativas.filter(t => 
      t.nome_cliente?.trim().toLowerCase() === nomeNormalizado
    );

    if (tratativasDoCliente.length > 0) {
      setClienteRecorrente(true);
      setNumeroOcorrencias(tratativasDoCliente.length);
    } else {
      setClienteRecorrente(false);
      setNumeroOcorrencias(0);
    }
  };

  // Contadores por status
  const countByStatus = (status) => filteredTratativas.filter(t => t.status === status).length;

  const adminColumns = isAdmin ? [
    {
      header: (
        <input
          type="checkbox"
          className="w-4 h-4 cursor-pointer accent-blue-600"
          checked={filteredTratativas.length > 0 && selectedIds.size === filteredTratativas.length}
          onChange={toggleSelectAll}
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          className="w-4 h-4 cursor-pointer accent-blue-600"
          checked={selectedIds.has(row.id)}
          onChange={(e) => { e.stopPropagation(); toggleSelect(row.id); }}
          onClick={(e) => e.stopPropagation()}
        />
      )
    }
  ] : [];

  const columns = [
    {
      header: 'ID',
      render: (row) => (
        <div className="space-y-1">
          <Badge variant="outline" className="font-mono text-xs">
            {row.id_interno || 'TRT-????'}
          </Badge>
        </div>
      )
    },
    {
      header: 'Cliente',
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-900">{row.nome_cliente || '-'}</span>
            {row.cliente_recorrente && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-300 flex items-center gap-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Recorrente ({row.numero_ocorrencias}x)
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500">ID Base: {row.id_base_cliente || '-'}</p>
          {row.cnpj_cliente && (
            <p className="text-xs text-slate-400 font-mono">CNPJ: {row.cnpj_cliente}</p>
          )}
        </div>
      )
    },
    {
      header: 'Ticket',
      render: (row) => (
        <div className="flex items-center gap-2">
          <a 
            href={row.link_zendesk} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            Zendesk
          </a>
        </div>
      )
    },
    {
      header: 'Tipo',
      render: (row) => {
        const tipo = tiposTratativa.find(t => t.chave === row.tipo_tratativa);
        return (
          <Badge variant="outline">
            {tipo?.nome || tipoTratativaLabels[row.tipo_tratativa] || row.tipo_tratativa}
          </Badge>
        );
      }
    },
    {
      header: 'Motivo',
      render: (row) => (
        <div>
          <div className="font-medium">{row.motivo_nome || '-'}</div>
          {row.submotivos && row.submotivos.length > 0 && (
            <div className="text-xs text-slate-500 mt-1">
              {row.submotivos.slice(0, 2).join(', ')}{row.submotivos.length > 2 ? '...' : ''}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Prioridade',
      render: (row) => <StatusBadge status={row.prioridade} />
    },
    {
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Agente',
      render: (row) => row.agente_responsavel_nome || '-'
    },
    {
      header: 'Data',
      render: (row) => formatDateSP(row.data_registro || row.created_date, 'DD/MM/YYYY HH:mm')
    },
    {
      header: '',
      render: (row) => (
        <Link to={createPageUrl(`TratativaDetalhe?id=${row.id}`)}>
          <Button variant="ghost" size="icon">
            <Eye className="w-4 h-4" />
          </Button>
        </Link>
      )
    }
  ];

  const allColumns = [...adminColumns, ...columns];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Tratativas CRC"
        subtitle="Gestão de reclamações e contestações"
        icon={ClipboardList}
        actions={
          <div className="flex items-center gap-2">
            <ImportExportCSV tratativas={filteredTratativas} />
            <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nova Tratativa
            </Button>
          </div>
        }
      />

      {/* Stats por Status */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        {['registrada', 'tratativa_iniciada', 'em_andamento', 'dependencia_externa', 'aguardando_confirmacao_reabertura', 'encerrada'].map(status => (
          <Card 
            key={status}
            className={`p-4 cursor-pointer transition-all ${filterStatus === status ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
          >
            <p className="text-2xl font-bold">{countByStatus(status)}</p>
            <p className="text-xs text-slate-500 line-clamp-2">{statusLabels[status]}</p>
          </Card>
        ))}
      </div>

      {/* Busca e Filtros */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Buscar por TRT-XXXX, nome do cliente ou ID da base..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Input
              placeholder="Filtrar por CNPJ..."
              value={filterCnpj}
              onChange={(e) => setFilterCnpj(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Filtros:</span>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {tiposTratativa.map(tipo => (
                <SelectItem key={tipo.id} value={tipo.chave}>{tipo.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterStatus !== 'all' || filterTipo !== 'all' || filterPrioridade !== 'all' || searchTerm || filterCnpj) && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => { setFilterStatus('all'); setFilterTipo('all'); setFilterPrioridade('all'); setSearchTerm(''); setFilterCnpj(''); }}
          >
            Limpar filtros
          </Button>
          )}
          <Button
            variant={mostrarExcluidas ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMostrarExcluidas(!mostrarExcluidas)}
            className="ml-auto"
          >
            <Archive className="w-4 h-4 mr-2" />
            {mostrarExcluidas ? 'Ocultar Excluídas' : 'Mostrar Excluídas'}
          </Button>
          </div>
          </div>
          </Card>

      {isAdmin && selectedIds.size > 0 && (
        <AdminBulkActions
          selectedIds={selectedIds}
          tratativas={tratativas}
          onClearSelection={() => setSelectedIds(new Set())}
          currentUser={user}
        />
      )}

      <DataTable
        columns={allColumns}
        data={filteredTratativas}
        isLoading={isLoading}
        emptyIcon={ClipboardList}
        emptyTitle="Nenhuma tratativa encontrada"
        emptyDescription="Registre a primeira tratativa clicando no botão acima."
        emptyAction={() => setDialogOpen(true)}
        emptyActionLabel="Nova Tratativa"
      />

      {/* Dialog de Nova Tratativa */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open && Object.values(formData).some(v => v && (Array.isArray(v) ? v.length > 0 : v !== ''))) {
          if (!confirm('Você tem alterações não salvas. Deseja realmente sair?')) {
            return;
          }
        }
        setDialogOpen(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" aria-describedby="nova-tratativa-description">
          <DialogHeader>
            <DialogTitle>Nova Tratativa</DialogTitle>
            <p id="nova-tratativa-description" className="text-sm text-slate-500">
              Preencha os campos abaixo para registrar uma nova tratativa
            </p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-1">
            <div className="space-y-4 pb-4">
            <div>
              <Label>Link do Zendesk *</Label>
              <Input
                value={formData.link_zendesk}
                onChange={(e) => setFormData({ ...formData, link_zendesk: e.target.value })}
                placeholder="https://zendesk.com/ticket/..."
              />
            </div>
            <div>
              <Label>Link da Intranet *</Label>
              <Input
                value={formData.link_intranet}
                onChange={(e) => setFormData({ ...formData, link_intranet: e.target.value })}
                placeholder="https://intranet.com/..."
              />
            </div>
            <div>
              <Label>ID da Base do Cliente *</Label>
              <Input
                value={formData.id_base_cliente}
                onChange={(e) => setFormData({ ...formData, id_base_cliente: e.target.value })}
                placeholder="Ex: CLI-12345"
              />
            </div>
            <div>
              <Label>Nome do Cliente *</Label>
              <Input
                value={formData.nome_cliente}
                onChange={(e) => {
                  const valor = e.target.value;
                  setFormData({ ...formData, nome_cliente: valor });
                  verificarRecorrencia(valor);
                }}
                placeholder="Nome completo do cliente"
              />
            </div>
            <div>
              <Label>CNPJ do Cliente</Label>
              <Input
                value={formData.cnpj_cliente}
                onChange={(e) => setFormData({ ...formData, cnpj_cliente: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
              {clienteRecorrente && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  <p className="text-xs text-amber-800">
                    <strong>Cliente Recorrente!</strong> Este cliente já possui {numeroOcorrencias} tratativa{numeroOcorrencias > 1 ? 's' : ''} registrada{numeroOcorrencias > 1 ? 's' : ''}.
                  </p>
                </div>
              )}
            </div>

            {/* Dados Comerciais do Cliente */}
            <DadosComerciaisForm formData={formData} setFormData={setFormData} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Tratativa *</Label>
                <Select
                  value={formData.tipo_tratativa || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_tratativa: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposTratativa.map(tipo => (
                      <SelectItem key={tipo.id} value={tipo.chave}>{tipo.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade *</Label>
                <Select
                  value={formData.prioridade || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, prioridade: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(prioridadeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Motivo e Submotivos */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-4">
              <div>
                <Label>Motivo Principal * (apenas 1)</Label>
                <Select
                  value={formData.motivo_id || ''}
                  onValueChange={(value) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      motivo_id: value,
                      submotivos: []
                    }));
                  }}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione o motivo principal" />
                  </SelectTrigger>
                  <SelectContent>
                    {motivos.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.motivo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.motivo_id && (
                <div>
                  <Label>Submotivos * (até 3)</Label>
                  <p className="text-xs text-amber-700 mb-2">
                    Selecione até 3 submotivos relacionados ao motivo principal
                  </p>
                  <div className="space-y-2">
                    {motivos.find(m => m.id === formData.motivo_id)?.submotivos?.map((sub, i) => {
                      const isSelected = formData.submotivos.includes(sub);
                      const canSelect = formData.submotivos.length < 3;
                      
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setFormData({
                                ...formData,
                                submotivos: formData.submotivos.filter(s => s !== sub)
                              });
                            } else if (canSelect) {
                              setFormData({
                                ...formData,
                                submotivos: [...formData.submotivos, sub]
                              });
                            }
                          }}
                          className={`w-full text-left p-2 border rounded-lg transition-all ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                              : !canSelect 
                                ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed' 
                                : 'border-slate-200 hover:border-blue-300'
                          }`}
                          disabled={!isSelected && !canSelect}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{sub}</span>
                            {isSelected && <Badge className="bg-blue-600">✓</Badge>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {formData.submotivos.length}/3 selecionados
                  </p>
                  </div>
                  )}
                  </div>

                  {/* Campos específicos para Contestação de Compra */}
                  {formData.tipo_tratativa === 'contestacao' && (
                  <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg space-y-4">
                  <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                  📋 Dados da Contestação de Compra
                  </h4>

                  <div>
                  <Label>Número do Case *</Label>
                  <Input
                   value={formData.numero_case_contestacao}
                   onChange={(e) => setFormData({ ...formData, numero_case_contestacao: e.target.value })}
                   placeholder="Ex: CASE-2024-001"
                   className="mt-1"
                  />
                  </div>

                  <div>
                  <Label>Categoria da Contestação *</Label>
                  <Select
                    value={formData.categoria_contestacao || ''}
                    onValueChange={(value) => setFormData({ ...formData, categoria_contestacao: value })}
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="erro_cobranca">Erro de Cobrança</SelectItem>
                      <SelectItem value="fraude">Fraude</SelectItem>
                      <SelectItem value="cancelamento_compra">Cancelamento de Compra</SelectItem>
                      <SelectItem value="erro_operacional">Erro Operacional</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>

                  <div>
                  <Label>Motivo da Contestação * (máx. 150 caracteres)</Label>
                  <Textarea
                   value={formData.motivo_contestacao}
                   onChange={(e) => setFormData({ ...formData, motivo_contestacao: e.target.value })}
                   placeholder="Descreva objetivamente a situação..."
                   maxLength={150}
                   rows={2}
                   className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">{formData.motivo_contestacao?.length || 0}/150 caracteres</p>
                  </div>

                  <div>
                  <Label>Valor Contestado (R$) *</Label>
                  <Input
                   type="number"
                   step="0.01"
                   min="0.01"
                   value={formData.valor_contestado_inicial}
                   onChange={(e) => {
                     const valor = parseFloat(e.target.value);
                     if (valor < 0 || isNaN(valor)) return;
                     setFormData({ ...formData, valor_contestado_inicial: valor || '' });
                   }}
                   placeholder="0.00"
                   className="mt-1"
                  />
                  <p className="text-xs text-purple-700 mt-1">
                   ℹ️ Este valor pode ser alterado durante o encerramento
                  </p>
                  </div>

                  <div>
                  <Label>Prazo de Resolução (SLA) *</Label>
                  <Select
                   value={formData.prazo_sla_dias ? String(formData.prazo_sla_dias) : ''}
                   onValueChange={(value) => setFormData({ ...formData, prazo_sla_dias: parseInt(value) })}
                  >
                   <SelectTrigger className="mt-1">
                     <SelectValue placeholder="Selecione o prazo" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="2">2 dias (48 horas)</SelectItem>
                     <SelectItem value="3">3 dias (72 horas)</SelectItem>
                     <SelectItem value="5">5 dias (120 horas)</SelectItem>
                     <SelectItem value="7">7 dias (168 horas)</SelectItem>
                     <SelectItem value="10">10 dias (240 horas)</SelectItem>
                     <SelectItem value="15">15 dias (360 horas)</SelectItem>
                   </SelectContent>
                  </Select>
                  {formData.prazo_sla_dias && (
                   <p className="text-xs text-purple-700 mt-1">
                     ⏱️ SLA: {formData.prazo_sla_dias * 24} horas
                   </p>
                  )}
                  </div>

                  <div className="p-3 bg-white border border-purple-200 rounded-lg">
                  <p className="text-xs text-purple-800">
                   <strong>Atenção:</strong> Ao criar esta contestação, ela será iniciada automaticamente com status "Em Andamento" e o contador de SLA começará imediatamente.
                  </p>
                  </div>
                  </div>
                  )}

                  {formData.tipo_tratativa && formData.tipo_tratativa !== 'contestacao' && (() => {
                  const tipoSelecionado = tiposTratativa.find(t => t.chave === formData.tipo_tratativa);
                  const sla = tipoSelecionado?.sla_horas || getSLAByType(formData.tipo_tratativa);
                  return (
                  <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  SLA automático: <strong>{sla} horas</strong>
                  </div>
                  );
                  })()}
            </div>
          </form>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrar'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}