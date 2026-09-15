import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { formatDateSP } from '@/components/utils/helpers';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ApuracaoWizard from '@/components/apuracao/ApuracaoWizard';
import { calcularTelefone, calcularChat, calcularCX } from '@/components/apuracao/calculosApuracao';
import { toast } from 'sonner';
import {
  Search,
  Upload,
  FileSpreadsheet,
  Phone,
  MessageSquare,
  Star,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Pencil
} from 'lucide-react';
import RelatoriosApuracao from './RelatoriosApuracao';

const STEPS = [
  { label: 'Tipo & Canal' },
  { label: 'Modo & Período' },
  { label: 'Upload' },
  { label: 'Mapeamento' },
  { label: 'Resultado' }
];

export default function Apuracao() {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Step 1
  const [tipoApuracao, setTipoApuracao] = useState('');
  
  // Step 2
  const [modo, setModo] = useState('');
  const [ano, setAno] = useState('');
  const [mes, setMes] = useState('');
  const [intervalo, setIntervalo] = useState('');
  
  // Step 3
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dadosExtraidos, setDadosExtraidos] = useState([]);
  const [colunas, setColunas] = useState([]);
  
  // Step 4
  const [mapeamento, setMapeamento] = useState({});
  
  // Step 5
  const [resultados, setResultados] = useState(null);
  const [resultadosEditaveis, setResultadosEditaveis] = useState({});
  const [modoEdicao, setModoEdicao] = useState(false);
  const [vinculacoes, setVinculacoes] = useState({});

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: apuracoes = [] } = useQuery({
    queryKey: ['apuracoes'],
    queryFn: () => db.entities.Apuracao.list('-created_date', 50),
  });

  const colaborador = colaboradores.find(c => c.email === user?.email);

  const saveMutation = useMutation({
    mutationFn: async (apuracoes) => {
      return db.entities.Apuracao.bulkCreate(apuracoes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['apuracoes']);
      toast.success('Apuração salva com sucesso');
      resetWizard();
    },
    onError: () => toast.error('Erro ao salvar apuração'),
  });

  if (!user || !colaborador) {
    return <LoadingSpinner text="Carregando dados..." />;
  }

  const resetWizard = () => {
    setCurrentStep(0);
    setTipoApuracao('');
    setModo('');
    setAno('');
    setMes('');
    setIntervalo('');
    setDadosExtraidos([]);
    setColunas([]);
    setMapeamento({});
    setResultados(null);
    setResultadosEditaveis({});
    setModoEdicao(false);
    setVinculacoes({});
  };

  // STEP 1: Tipo e Canal
  const canProceedStep1 = () => {
    return tipoApuracao !== '';
  };

  // STEP 2: Modo e Período
  const canProceedStep2 = () => {
    return modo !== '' && ano !== '' && mes !== '' && intervalo !== '';
  };

  // STEP 3: Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar se é CSV
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Apenas arquivos CSV são aceitos');
      return;
    }

    setUploadingFile(true);
    try {
      // Ler arquivo como texto
      const text = await file.text();
      const linhas = text.split('\n').filter(linha => linha.trim());
      
      if (linhas.length < 2) {
        toast.error('Planilha vazia ou inválida');
        setUploadingFile(false);
        return;
      }

      // Primeira linha = cabeçalho
      const cabecalho = linhas[0].split(/[,;]/);
      const colunasDetectadas = cabecalho
        .map(col => col.trim().replace(/["\r]/g, ''))
        .filter(col => col.length > 0);

      // Linhas restantes = dados
      const dados = [];
      for (let i = 1; i < linhas.length; i++) {
        const valores = linhas[i].split(/[,;]/);
        const row = {};
        colunasDetectadas.forEach((col, idx) => {
          row[col] = valores[idx]?.trim().replace(/["\r]/g, '') || '';
        });
        dados.push(row);
      }

      if (dados.length === 0) {
        toast.error('Nenhum dado encontrado na planilha');
        setUploadingFile(false);
        return;
      }

      setDadosExtraidos(dados);
      setColunas(colunasDetectadas);
      toast.success(`${dados.length} linhas extraídas. ${colunasDetectadas.length} colunas detectadas.`);
    } catch (error) {
      console.error('Erro ao processar CSV:', error);
      toast.error('Erro ao processar planilha CSV');
    } finally {
      setUploadingFile(false);
    }
  };

  const canProceedStep3 = () => {
    return dadosExtraidos.length > 0 && colunas.length > 0;
  };

  // STEP 4: Mapeamento
  const getCamposObrigatorios = () => {
    if (tipoApuracao === 'telefone') {
      return [
        { key: 'agente', label: 'Agente' },
        { key: 'data', label: 'Data' },
        { key: 'origem', label: 'Ligação de Origem' },
        { key: 'status', label: 'Status da Ligação' },
        { key: 'fcr', label: 'FCR (1=resolvido, 2=não resolvido)' },
        { key: 'csat', label: 'CSAT (1-5)' }
      ];
    } else if (tipoApuracao === 'chat') {
      return [
        { key: 'agente', label: 'Agente' },
        { key: 'ticket', label: 'ID do Ticket' },
        { key: 'data', label: 'Data' },
        { key: 'bom', label: 'Satisfação Boa (0 ou 1)' },
        { key: 'ruim', label: 'Satisfação Ruim (0 ou 1)' }
      ];
    } else if (tipoApuracao === 'cx') {
      return [
        { key: 'agente', label: 'Agente' },
        { key: 'data', label: 'Data' },
        { key: 'empatia', label: 'Empatia' },
        { key: 'cordialidade', label: 'Cordialidade' },
        { key: 'comunicacao', label: 'Comunicação' },
        { key: 'escrita', label: 'Escrita/Fala' },
        { key: 'profissionalismo', label: 'Profissionalismo' },
        { key: 'resolucao', label: 'Resolução' },
        { key: 'observacao', label: 'Observação' }
      ];
    }
    return [];
  };

  const canProceedStep4 = () => {
    const camposObrigatorios = getCamposObrigatorios();
    return camposObrigatorios.every(campo => mapeamento[campo.key]);
  };

  // STEP 5: Calcular
  const calcularResultados = () => {
    let resultadosCalculo;

    if (tipoApuracao === 'telefone') {
      resultadosCalculo = calcularTelefone(dadosExtraidos, mapeamento);
    } else if (tipoApuracao === 'chat') {
      resultadosCalculo = calcularChat(dadosExtraidos, mapeamento);
    } else if (tipoApuracao === 'cx') {
      resultadosCalculo = calcularCX(dadosExtraidos, mapeamento);
    }

    setResultados(resultadosCalculo);

    // Inicializar campos editáveis (só telefone tem edição por enquanto)
    if (tipoApuracao === 'telefone' && resultadosCalculo) {
      const editaveis = {};
      Object.keys(resultadosCalculo).forEach(agente => {
        const r = resultadosCalculo[agente];
        editaveis[agente] = {
          totalLigacoes: r.totalLigacoes,
          totalAtendidas: r.totalAtendidas,
          totalTransferencias: r.totalTransferencias,
          totalAvaliadas: r.totalAvaliadas,
          totalPositivas: r.totalPositivas,
          totalNegativas: r.totalNegativas,
          nota4: r.nota4,
          nota5: r.nota5,
          confirmado: false
        };
      });
      setResultadosEditaveis(editaveis);
    }

    setCurrentStep(4);
  };

  // Atualizar campo editável e recalcular métricas derivadas
  const atualizarCampoEditavel = (agente, campo, valor) => {
    setResultadosEditaveis(prev => ({
      ...prev,
      [agente]: { ...prev[agente], [campo]: parseInt(valor) || 0 }
    }));
  };

  const salvarApuracao = () => {
    if (!resultados) return;

    // Validar vinculações
    const naoVinculados = Object.keys(resultados).filter(nomeAgente => !vinculacoes[nomeAgente]);
    if (naoVinculados.length > 0) {
      toast.error('Vincule todos os agentes antes de salvar');
      return;
    }

    // Verificar se todos confirmaram edição (modo telefone)
    if (tipoApuracao === 'telefone' && modoEdicao) {
      const naoConfirmados = Object.keys(resultadosEditaveis).filter(a => !resultadosEditaveis[a].confirmado);
      if (naoConfirmados.length > 0) {
        toast.error('Confirme os dados de todos os agentes antes de salvar');
        return;
      }
    }

    const periodoInicio = `${ano}-${mes.padStart(2, '0')}-01`;
    const ultimoDia = new Date(ano, parseInt(mes), 0).getDate();
    const periodoFim = `${ano}-${mes.padStart(2, '0')}-${ultimoDia}`;

    const apuracoes = Object.keys(resultados).map(nomeAgente => {
      const colaboradorId = vinculacoes[nomeAgente];
      const colab = colaboradores.find(c => c.id === colaboradorId);
      const r = resultados[nomeAgente];
      // Usar dados editáveis se confirmados, senão usar calculados
      const editado = modoEdicao && resultadosEditaveis[nomeAgente]?.confirmado
        ? resultadosEditaveis[nomeAgente]
        : null;

      let apuracao = {
        colaborador_id: colaboradorId,
        colaborador_nome: colab?.nome_completo || nomeAgente,
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        modo,
        tipo_apuracao: tipoApuracao,
        intervalo,
        historico_detalhado: r.historico || r.avaliacoes || [],
        data_apuracao: new Date().toISOString(),
        apurado_por_id: colaborador?.id,
        apurado_por_nome: user?.full_name
      };

      // NOVO: Estrutura dados_por_data (EIXO DE ANÁLISE)
      if (r.porData) {
        const dadosPorData = [];
        Object.keys(r.porData).forEach(data => {
          const dia = r.porData[data];
          const registro = { data };
          
          if (tipoApuracao === 'telefone') {
            registro.telefone = {
              total_ligacoes: dia.total_ligacoes || 0,
              total_atendidas: dia.total_atendidas || 0,
              total_sem_transferencia: dia.total_sem_transferencia || 0,
              total_avaliadas: dia.total_avaliadas || 0,
              total_positivas: dia.total_positivas || 0,
              total_negativas: dia.total_negativas || 0,
              nota4: dia.nota4 || 0,
              nota5: dia.nota5 || 0,
              performance: dia.performance || 0,
              csat: dia.csat || 0,
              percentual_avaliados: dia.percentual_avaliados || 0,
              transferencias: dia.transferencias || 0
            };
          } else if (tipoApuracao === 'chat') {
            registro.chat = {
              total_chats: dia.total_chats || 0,
              total_avaliados: dia.total_avaliados || 0,
              total_positivos: dia.total_positivos || 0,
              percentual_avaliados: dia.percentual_avaliados || 0,
              csat: dia.csat || 0
            };
          }
          
          dadosPorData.push(registro);
        });
        
        apuracao.dados_por_data = dadosPorData;
      }

      // Estrutura agregada para compatibilidade com dashboard e relatórios
      if (tipoApuracao === 'telefone') {
        const totalLig = editado?.totalLigacoes ?? r.totalLigacoes;
        const totalAt = editado?.totalAtendidas ?? r.totalAtendidas;
        const totalTransf = editado?.totalTransferencias ?? r.totalTransferencias;
        const totalAval = editado?.totalAvaliadas ?? r.totalAvaliadas;
        const totalPos = editado?.totalPositivas ?? r.totalPositivas;
        const totalNeg = editado?.totalNegativas ?? r.totalNegativas;
        const n4 = editado?.nota4 ?? r.nota4;
        const n5 = editado?.nota5 ?? r.nota5;
        const semTransf = totalAt - totalTransf;
        const csat = totalAval > 0 ? (totalPos / totalAval) * 100 : 0;
        const perc = semTransf > 0 ? (totalAval / semTransf) * 100 : 0;
        const perf = totalLig > 0 ? (totalAt / totalLig) * 100 : 0;

        apuracao.canal_telefone = {
          csat,
          fcr: csat,
          performance: perf,
          avaliados: totalAval,
          total_atendimentos: totalAt,
          total_ligacoes: totalLig,
          total_positivas: totalPos,
          total_negativas: totalNeg,
          nota4: n4,
          nota5: n5,
          transferencias: totalTransf,
          percentual_avaliados: perc
        };
        apuracao.satisfacao_media = csat;
        apuracao.percentual_avaliados = perc;
      } else if (tipoApuracao === 'chat') {
        apuracao.canal_chat = {
          csat: r.csatPercentual,
          avaliados: r.totalAvaliados,
          total_positivos: r.totalPositivos,
          total_atendimentos: r.totalChats,
          percentual_avaliados: r.percentualAvaliados
        };
        apuracao.satisfacao_media = r.csatPercentual;
        apuracao.percentual_avaliados = r.percentualAvaliados;
      } else if (tipoApuracao === 'cx') {
        apuracao.avaliacao_cx = {
          nota_media: r.mediaCX,
          total_avaliacoes: r.totalAvaliacoes
        };
      }

      return apuracao;
    });

    saveMutation.mutate(apuracoes);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Apuração CRC"
        subtitle="Sistema de Apuração de Indicadores"
        icon={Search}
      />

      <Tabs defaultValue="apuracao" className="space-y-4">
        <TabsList>
          <TabsTrigger value="apuracao">
            <Upload className="w-4 h-4 mr-2" />
            Nova Apuração
          </TabsTrigger>
          <TabsTrigger value="relatorios">
            <BarChart3 className="w-4 h-4 mr-2" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apuracao" className="space-y-6">
          <ApuracaoWizard currentStep={currentStep} steps={STEPS} />

      {/* STEP 0: Tipo e Canal */}
      {currentStep === 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Etapa 1: Selecione o Tipo de Apuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <button
                onClick={() => setTipoApuracao('telefone')}
                className={`p-6 border-2 rounded-lg transition-all ${
                  tipoApuracao === 'telefone' 
                    ? 'border-primary/40 bg-info-soft' 
                    : 'border-border hover:border-border'
                }`}
              >
                <Phone className="w-8 h-8 mx-auto mb-3 text-success" />
                <p className="font-medium">Telefone</p>
                <p className="text-xs text-muted-foreground mt-1">Atendimento Telefônico</p>
              </button>

              <button
                onClick={() => setTipoApuracao('chat')}
                className={`p-6 border-2 rounded-lg transition-all ${
                  tipoApuracao === 'chat' 
                    ? 'border-primary/40 bg-info-soft' 
                    : 'border-border hover:border-border'
                }`}
              >
                <MessageSquare className="w-8 h-8 mx-auto mb-3 text-primary" />
                <p className="font-medium">Chat Zendesk</p>
                <p className="text-xs text-muted-foreground mt-1">Atendimento Chat</p>
              </button>

              <button
                onClick={() => setTipoApuracao('cx')}
                className={`p-6 border-2 rounded-lg transition-all ${
                  tipoApuracao === 'cx' 
                    ? 'border-primary/40 bg-info-soft' 
                    : 'border-border hover:border-border'
                }`}
              >
                <Star className="w-8 h-8 mx-auto mb-3 text-warning" />
                <p className="font-medium">Avaliação CX</p>
                <p className="text-xs text-muted-foreground mt-1">Planilha CX</p>
              </button>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => setCurrentStep(1)}
                disabled={!canProceedStep1()}
                className="bg-primary hover:bg-primary/90"
              >
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 1: Modo e Período */}
      {currentStep === 1 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Etapa 2: Modo e Período</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Modo de Apuração *</Label>
              <Select value={modo} onValueChange={setModo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incremental">
                    Incremental (soma novos dados ao período)
                  </SelectItem>
                  <SelectItem value="completo">
                    Completo (recalcula todo o período)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Ano *</Label>
                <Select value={ano} onValueChange={setAno}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Mês *</Label>
                <Select value={mes} onValueChange={setMes}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Janeiro</SelectItem>
                    <SelectItem value="2">Fevereiro</SelectItem>
                    <SelectItem value="3">Março</SelectItem>
                    <SelectItem value="4">Abril</SelectItem>
                    <SelectItem value="5">Maio</SelectItem>
                    <SelectItem value="6">Junho</SelectItem>
                    <SelectItem value="7">Julho</SelectItem>
                    <SelectItem value="8">Agosto</SelectItem>
                    <SelectItem value="9">Setembro</SelectItem>
                    <SelectItem value="10">Outubro</SelectItem>
                    <SelectItem value="11">Novembro</SelectItem>
                    <SelectItem value="12">Dezembro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Intervalo *</Label>
                <Select value={intervalo} onValueChange={setIntervalo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Intervalo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="total">Total do Mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!canProceedStep2()}
                className="bg-primary hover:bg-primary/90"
              >
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Upload */}
      {currentStep === 2 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Etapa 3: Upload da Planilha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {dadosExtraidos.length === 0 ? (
              <div>
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/40 hover:bg-info-soft transition-all">
                    <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-base font-medium mb-2">Clique para fazer upload da planilha CSV</p>
                    <p className="text-sm text-muted-foreground">Apenas formato CSV é aceito</p>
                    <p className="text-xs text-muted-foreground mt-2">Separadores aceitos: vírgula (,) ou ponto-e-vírgula (;)</p>
                  </div>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                  />
                </Label>
                {uploadingFile && (
                  <div className="text-center mt-6">
                    <LoadingSpinner text="Processando planilha..." />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-success-soft border border-success/25 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <div>
                      <p className="font-medium text-success">
                        {dadosExtraidos.length} linhas e {colunas.length} colunas detectadas
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-muted">
                  <p className="text-sm font-medium mb-2">Colunas detectadas:</p>
                  <div className="flex flex-wrap gap-2">
                    {colunas.map((col, idx) => (
                      <Badge key={idx} variant="outline">{col}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                disabled={!canProceedStep3()}
                className="bg-primary hover:bg-primary/90"
              >
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Mapeamento */}
      {currentStep === 3 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Etapa 4: Mapeamento de Colunas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-warning-soft border border-warning/25 rounded-lg">
              <p className="text-sm text-warning">
                <strong>Importante:</strong> Mapeie cada campo lógico para a coluna correspondente na planilha.
              </p>
            </div>

            <div className="space-y-4">
              {getCamposObrigatorios().map(campo => (
                <div key={campo.key}>
                  <Label>{campo.label} *</Label>
                  <Select
                    value={mapeamento[campo.key] || ''}
                    onValueChange={(value) => setMapeamento({ ...mapeamento, [campo.key]: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      {colunas.filter(col => col && col.length > 0).map(col => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={calcularResultados}
                disabled={!canProceedStep4()}
                className="bg-primary hover:bg-primary/90"
              >
                Calcular
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Resultados */}
      {currentStep === 4 && resultados && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Etapa 5: Resultados da Apuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-success-soft border border-success/25 rounded-lg">
              <p className="text-sm font-medium text-success">
                ✓ Apuração calculada para {Object.keys(resultados).length} agentes — {dadosExtraidos.length} registros importados
              </p>
              {tipoApuracao === 'telefone' && (
                <Button
                  size="sm"
                  variant={modoEdicao ? 'default' : 'outline'}
                  onClick={() => setModoEdicao(!modoEdicao)}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  {modoEdicao ? 'Modo Edição: ON' : 'Editar Dados'}
                </Button>
              )}
            </div>

            {/* Alertas de consistência */}
            {tipoApuracao === 'telefone' && Object.keys(resultados).some(a => !resultados[a].validacao?.ok) && (
              <div className="p-4 bg-destructive/10 border border-destructive/25 rounded-lg space-y-2">
                <p className="text-sm font-bold text-destructive">Alertas de Inconsistência</p>
                {Object.keys(resultados).map(agente => {
                  const v = resultados[agente].validacao;
                  if (!v || v.ok) return null;
                  return v.alertas.map((alerta, i) => (
                    <p key={`${agente}-${i}`} className="text-xs text-destructive">• <strong>{agente}:</strong> {alerta}</p>
                  ));
                })}
              </div>
            )}

            {/* Painel de resumo/validação por agente (telefone) */}
            {tipoApuracao === 'telefone' && (
              <div className="grid md:grid-cols-2 gap-4">
                {Object.keys(resultados).map(agente => {
                  const r = resultados[agente];
                  const v = r.validacao?.resumo;
                  const ed = resultadosEditaveis[agente];
                  return (
                    <div key={agente} className="border rounded-lg overflow-hidden">
                      <div className={`px-4 py-2 text-sm font-semibold text-white flex items-center justify-between ${r.validacao?.ok ? 'bg-muted' : 'bg-warning'}`}>
                        <span>{agente}</span>
                        {!r.validacao?.ok && <span className="text-xs bg-warning px-2 py-0.5 rounded">Verificar</span>}
                      </div>
                      <div className="p-3 bg-muted grid grid-cols-4 gap-2 text-xs text-center">
                        <div><p className="text-muted-foreground">Importados</p><p className="font-bold">{v?.registros_importados}</p></div>
                        <div><p className="text-muted-foreground">Ligações</p><p className="font-bold">{v?.total_ligacoes}</p></div>
                        <div><p className="text-muted-foreground">c/ Transf.</p><p className="font-bold text-warning">{v?.total_transferencias}</p></div>
                        <div><p className="text-muted-foreground">s/ Transf.</p><p className="font-bold">{v?.total_sem_transferencia}</p></div>
                        <div><p className="text-muted-foreground">Atendidas</p><p className="font-bold">{v?.total_atendidas}</p></div>
                        <div><p className="text-muted-foreground">Avaliadas</p><p className="font-bold">{v?.total_avaliadas}</p></div>
                        <div><p className="text-muted-foreground">Positivas</p><p className="font-bold text-success">{v?.total_positivas}</p></div>
                        <div><p className="text-muted-foreground">Negativas</p><p className="font-bold text-destructive">{v?.total_negativas}</p></div>
                        <div><p className="text-muted-foreground">Nota 4</p><p className="font-bold">{v?.nota4}</p></div>
                        <div><p className="text-muted-foreground">Nota 5</p><p className="font-bold">{v?.nota5}</p></div>
                        <div><p className="text-muted-foreground">CSAT</p><p className="font-bold text-primary">{r.csatPercentual?.toFixed(1)}%</p></div>
                        <div><p className="text-muted-foreground">Perf.</p><p className="font-bold text-success">{r.performance?.toFixed(1)}%</p></div>
                      </div>
                      {/* Campos editáveis */}
                      {modoEdicao && ed && (
                        <div className="p-3 border-t bg-card space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Ajuste manual dos valores:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: 'totalLigacoes', label: 'Total Lig.' },
                              { key: 'totalAtendidas', label: 'Atendidas' },
                              { key: 'totalTransferencias', label: 'Transf.' },
                              { key: 'totalAvaliadas', label: 'Avaliadas' },
                              { key: 'totalPositivas', label: 'Positivas' },
                              { key: 'nota4', label: 'Nota 4' },
                              { key: 'nota5', label: 'Nota 5' },
                            ].map(({ key, label }) => (
                              <div key={key} className="flex items-center gap-1">
                                <label className="text-xs text-muted-foreground w-16 flex-shrink-0">{label}</label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={ed[key]}
                                  onChange={e => atualizarCampoEditavel(agente, key, e.target.value)}
                                  className="h-7 text-xs"
                                  disabled={ed.confirmado}
                                />
                              </div>
                            ))}
                          </div>
                          <Button
                            size="sm"
                            className={`w-full mt-2 ${ed.confirmado ? 'bg-success' : 'bg-primary'}`}
                            onClick={() => setResultadosEditaveis(prev => ({
                              ...prev,
                              [agente]: { ...prev[agente], confirmado: !prev[agente].confirmado }
                            }))}
                          >
                            {ed.confirmado ? '✓ Confirmado — Clique para editar' : 'Confirmar dados'}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TELEFONE: exibe vinculação + tabela semanal por agente */}
            {tipoApuracao === 'telefone' ? (
              <div className="space-y-6">
                {/* Vinculação de agentes — resumo */}
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium">Nome na Planilha</th>
                        <th className="text-left p-3 font-medium">Vincular Agente *</th>
                        <th className="text-center p-3 font-medium">Total Lig.</th>
                        <th className="text-center p-3 font-medium">Atendidas</th>
                        <th className="text-center p-3 font-medium">Avaliadas</th>
                        <th className="text-center p-3 font-medium">Nota 4</th>
                        <th className="text-center p-3 font-medium">Nota 5</th>
                        <th className="text-center p-3 font-medium">Positivas</th>
                        <th className="text-center p-3 font-medium">Transf.</th>
                        <th className="text-center p-3 font-medium">CSAT %</th>
                        <th className="text-center p-3 font-medium">% Aval.</th>
                        <th className="text-center p-3 font-medium">Perf. %</th>
                        <th className="text-center p-3 font-medium">Semanas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(resultados).map(agente => {
                        const r = resultados[agente];
                        return (
                          <tr key={agente} className="border-t hover:bg-muted">
                            <td className="p-3 font-medium whitespace-nowrap">{agente}</td>
                            <td className="p-3 min-w-[180px]">
                              <Select
                                value={vinculacoes[agente] || ''}
                                onValueChange={(value) => setVinculacoes({ ...vinculacoes, [agente]: value })}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Selecionar agente" />
                                </SelectTrigger>
                                <SelectContent>
                                  {colaboradores.filter(c => c.ativo !== false && c.papel === 'agente').map(colab => (
                                    <SelectItem key={colab.id} value={colab.id}>{colab.nome_completo}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="text-center p-3">{r.totalLigacoes}</td>
                            <td className="text-center p-3">{r.totalAtendidas}</td>
                            <td className="text-center p-3">{r.totalAvaliadas}</td>
                            <td className="text-center p-3">{r.nota4 || 0}</td>
                            <td className="text-center p-3">{r.nota5 || 0}</td>
                            <td className="text-center p-3">{r.totalPositivas}</td>
                            <td className="text-center p-3">
                              <Badge variant="outline" className="bg-warning-soft text-warning">{r.totalTransferencias}</Badge>
                            </td>
                            <td className="text-center p-3 font-semibold text-primary">{r.csatPercentual.toFixed(1)}%</td>
                            <td className="text-center p-3 font-semibold text-warning">{r.percentualAvaliados.toFixed(1)}%</td>
                            <td className="text-center p-3 font-semibold text-success">{r.performance.toFixed(1)}%</td>
                            <td className="text-center p-3">{r.consolidadoSemanal?.length || 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tabela semanal por agente */}
                {Object.keys(resultados).map(agente => {
                  const r = resultados[agente];
                  const semanas = r.consolidadoSemanal || [];
                  if (semanas.length === 0) return null;
                  return (
                    <div key={agente} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted text-white px-4 py-2 text-sm font-semibold">{agente} — Consolidação Semanal</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-3 font-medium">Período</th>
                              <th className="text-center p-3 font-medium">Ligações</th>
                              <th className="text-center p-3 font-medium">Atendidas</th>
                              <th className="text-center p-3 font-medium">Avaliadas</th>
                              <th className="text-center p-3 font-medium">Nota 4</th>
                              <th className="text-center p-3 font-medium">Nota 5</th>
                              <th className="text-center p-3 font-medium">Positivas</th>
                              <th className="text-center p-3 font-medium">Transf.</th>
                              <th className="text-center p-3 font-medium">CSAT %</th>
                              <th className="text-center p-3 font-medium">% Aval.</th>
                              <th className="text-center p-3 font-medium">Perf. %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {semanas.map((s, idx) => (
                              <tr key={idx} className="border-t hover:bg-muted">
                                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{s.rotulo}</td>
                                <td className="text-center p-3">{s.total_ligacoes}</td>
                                <td className="text-center p-3">{s.total_atendidas}</td>
                                <td className="text-center p-3">{s.total_avaliadas}</td>
                                <td className="text-center p-3">{s.nota4 || 0}</td>
                                <td className="text-center p-3">{s.nota5 || 0}</td>
                                <td className="text-center p-3">{s.total_positivas}</td>
                                <td className="text-center p-3">
                                  <Badge variant="outline" className="bg-warning-soft text-warning">{s.transferencias || 0}</Badge>
                                </td>
                                <td className="text-center p-3 font-semibold text-primary">{s.csat.toFixed(1)}%</td>
                                <td className="text-center p-3 font-semibold text-warning">{s.percentual_avaliados.toFixed(1)}%</td>
                                <td className="text-center p-3 font-semibold text-success">{s.performance.toFixed(1)}%</td>
                              </tr>
                            ))}
                            <tr className="border-t-2 border-border bg-muted font-bold">
                              <td className="p-3 text-foreground">Média Mensal</td>
                              <td className="text-center p-3 text-muted-foreground">{r.totalLigacoes}</td>
                              <td className="text-center p-3 text-muted-foreground">{r.totalAtendidas}</td>
                              <td className="text-center p-3 text-muted-foreground">{r.totalAvaliadas}</td>
                              <td className="text-center p-3 text-muted-foreground">{r.nota4 || 0}</td>
                              <td className="text-center p-3 text-muted-foreground">{r.nota5 || 0}</td>
                              <td className="text-center p-3 text-muted-foreground">{r.totalPositivas}</td>
                              <td className="text-center p-3 text-muted-foreground">{r.totalTransferencias}</td>
                              <td className="text-center p-3 text-primary">{r.csatPercentual.toFixed(1)}%</td>
                              <td className="text-center p-3 text-warning">{r.percentualAvaliados.toFixed(1)}%</td>
                              <td className="text-center p-3 text-success">{r.performance.toFixed(1)}%</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : tipoApuracao === 'chat' ? (
              <div className="space-y-6">
                {/* Vinculação + resumo */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium">Nome na Planilha</th>
                        <th className="text-left p-3 font-medium">Vincular Agente *</th>
                        <th className="text-center p-3 font-medium">CSAT Médio</th>
                        <th className="text-center p-3 font-medium">% Avaliados Médio</th>
                        <th className="text-center p-3 font-medium">Semanas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(resultados).map(agente => {
                        const r = resultados[agente];
                        return (
                          <tr key={agente} className="border-t hover:bg-muted">
                            <td className="p-3 font-medium">{agente}</td>
                            <td className="p-3">
                              <Select
                                value={vinculacoes[agente] || ''}
                                onValueChange={(value) => setVinculacoes({ ...vinculacoes, [agente]: value })}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Selecionar agente" />
                                </SelectTrigger>
                                <SelectContent>
                                  {colaboradores.filter(c => c.ativo !== false && c.papel === 'agente').map(colab => (
                                    <SelectItem key={colab.id} value={colab.id}>{colab.nome_completo}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="text-center p-3 font-semibold text-primary">{r.csatPercentual.toFixed(1)}%</td>
                            <td className="text-center p-3 font-semibold text-warning">{r.percentualAvaliados.toFixed(1)}%</td>
                            <td className="text-center p-3">{r.consolidadoSemanal?.length || 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tabela semanal por agente */}
                {Object.keys(resultados).map(agente => {
                  const r = resultados[agente];
                  const semanas = r.consolidadoSemanal || [];
                  if (semanas.length === 0) return null;
                  return (
                    <div key={agente} className="border rounded-lg overflow-hidden">
                      <div className="bg-primary text-white px-4 py-2 text-sm font-semibold">{agente} — Consolidação Semanal (Chat)</div>
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-3 font-medium">Semana</th>
                            <th className="text-center p-3 font-medium">Total Chats</th>
                            <th className="text-center p-3 font-medium">Avaliados</th>
                            <th className="text-center p-3 font-medium">Positivos</th>
                            <th className="text-center p-3 font-medium">CSAT %</th>
                            <th className="text-center p-3 font-medium">% Avaliados</th>
                          </tr>
                        </thead>
                        <tbody>
                          {semanas.map((s, idx) => (
                            <tr key={idx} className="border-t hover:bg-muted">
                              <td className="p-3 text-xs text-muted-foreground">{s.rotulo}</td>
                              <td className="text-center p-3">{s.total_chats}</td>
                              <td className="text-center p-3">{s.total_avaliados}</td>
                              <td className="text-center p-3">{s.total_positivos}</td>
                              <td className="text-center p-3 font-semibold text-primary">{s.csat.toFixed(1)}%</td>
                              <td className="text-center p-3 font-semibold text-warning">{s.percentual_avaliados.toFixed(1)}%</td>
                            </tr>
                          ))}
                          {/* Linha de consolidação mensal */}
                          <tr className="border-t-2 border-border bg-muted font-bold">
                            <td className="p-3 text-foreground">Média Mensal</td>
                            <td className="text-center p-3 text-muted-foreground">—</td>
                            <td className="text-center p-3 text-muted-foreground">—</td>
                            <td className="text-center p-3 text-muted-foreground">—</td>
                            <td className="text-center p-3 text-primary">{r.csatPercentual.toFixed(1)}%</td>
                            <td className="text-center p-3 text-warning">{r.percentualAvaliados.toFixed(1)}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium">Nome na Planilha</th>
                    <th className="text-left p-3 font-medium">Vincular Agente *</th>
                    {tipoApuracao === 'cx' && (
                      <>
                        <th className="text-center p-3 font-medium">Média CX</th>
                        <th className="text-center p-3 font-medium">Total Avaliações</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(resultados).map(agente => {
                    const r = resultados[agente];
                    return (
                      <tr key={agente} className="border-t hover:bg-muted">
                        <td className="p-3 font-medium">{agente}</td>
                        <td className="p-3">
                          <Select
                            value={vinculacoes[agente] || ''}
                            onValueChange={(value) => setVinculacoes({ ...vinculacoes, [agente]: value })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecionar agente" />
                            </SelectTrigger>
                            <SelectContent>
                              {colaboradores.filter(c => c.ativo !== false && c.papel === 'agente').map(colab => (
                                <SelectItem key={colab.id} value={colab.id}>{colab.nome_completo}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        {tipoApuracao === 'cx' && (
                          <>
                            <td className="text-center p-3">{r.mediaCX.toFixed(2)}</td>
                            <td className="text-center p-3">{r.totalAvaliacoes}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={resetWizard}>
                Nova Apuração
              </Button>
              <Button
                onClick={salvarApuracao}
                disabled={saveMutation.isPending}
                className="bg-success hover:bg-success/90"
              >
                {saveMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Salvar Apuração
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Apurações (abaixo do wizard quando não em progresso) */}
      {currentStep === 0 && (
        <Card className="border-0 shadow-sm mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Apurações</CardTitle>
          </CardHeader>
          <CardContent>
            {apuracoes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma apuração registrada</p>
            ) : (
              <div className="space-y-3">
                {apuracoes.slice(0, 10).map(ap => (
                  <div key={ap.id} className="p-3 bg-muted rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {ap.tipo_apuracao === 'telefone' && <Phone className="w-4 h-4 text-success" />}
                        {ap.tipo_apuracao === 'chat' && <MessageSquare className="w-4 h-4 text-primary" />}
                        {ap.tipo_apuracao === 'cx' && <Star className="w-4 h-4 text-warning" />}
                        <span className="font-medium">{ap.colaborador_nome}</span>
                      </div>
                      <Badge variant="outline" className="capitalize">{ap.tipo_apuracao}</Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      {ap.canal_telefone && (
                        <>
                          <div><span className="text-muted-foreground">CSAT:</span> <span className="font-medium">{ap.canal_telefone.csat?.toFixed(1)}%</span></div>
                          <div><span className="text-muted-foreground">FCR:</span> <span className="font-medium">{ap.canal_telefone.fcr?.toFixed(1)}%</span></div>
                          <div><span className="text-muted-foreground">Performance:</span> <span className="font-medium">{ap.canal_telefone.performance?.toFixed(1)}%</span></div>
                        </>
                      )}
                      {ap.canal_chat && (
                        <>
                          <div><span className="text-muted-foreground">CSAT:</span> <span className="font-medium">{ap.canal_chat.csat?.toFixed(1)}%</span></div>
                          <div><span className="text-muted-foreground">Chats:</span> <span className="font-medium">{ap.canal_chat.total_atendimentos}</span></div>
                        </>
                      )}
                      {ap.avaliacao_cx && (
                        <>
                          <div><span className="text-muted-foreground">Média CX:</span> <span className="font-medium">{ap.avaliacao_cx.nota_media?.toFixed(2)}</span></div>
                          <div><span className="text-muted-foreground">Avaliações:</span> <span className="font-medium">{ap.avaliacao_cx.total_avaliacoes}</span></div>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Período: {formatDateSP(ap.periodo_inicio, 'DD/MM/YYYY')} - {formatDateSP(ap.periodo_fim, 'DD/MM/YYYY')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="relatorios">
          <RelatoriosApuracao />
        </TabsContent>
      </Tabs>
    </div>
  );
}