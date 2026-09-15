import db from '@/api/db';
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calculator, History, Settings, Save, RefreshCw, Wrench, DollarSign, FileText, AlertCircle, Link2, LifeBuoy, UserCog, Headset } from 'lucide-react';
import ApoioEspecializado from '@/components/ferramentas/apoio/ApoioEspecializado';
import LiderTecnicoTool from '@/components/lider-tecnico/LiderTecnicoTool';
import ApoioN2Tool from '@/components/apoio-n2/ApoioN2Tool';
import { useToast } from '@/components/ui/use-toast';
import ImpostosPanel from '@/components/ferramentas/ImpostosPanel';
import ResultadoCards from '@/components/ferramentas/ResultadoCards';
import MemoriaCalculo from '@/components/ferramentas/MemoriaCalculo';
import HistoricoEstornos from '@/components/ferramentas/HistoricoEstornos';
import ExportacaoEstorno from '@/components/ferramentas/ExportacaoEstorno';
import { DEFAULT_CONFIG, TIPO_ESTORNO_OPTIONS, TIPOS_PLANO, CLASSIFICACAO_PLANO_OPTIONS, getDiasContrato, calcularEstorno, formatarInputBRL, parseBRL, fmtBRL } from '@/components/ferramentas/calculos';

const FORM_VAZIO = {
  ticket_zendesk: '', tratativa_id: '', tratativa_id_interno: '',
  nome_cliente: '', documento_cliente: '', operador_nome: '',
  data_solicitacao: new Date().toISOString().split('T')[0],
  tipo_estorno: '', classificacao_plano: '', valor_nota_fiscal: '',
  tipo_plano: 'anual',
  meses_usados: '', dias_adicionais: '',
  observacao_operacional: '',
};

export default function FerramentasOperacionais() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('calculadora');
  const [ferramentaAtiva, setFerramentaAtiva] = useState('estorno');
  const [form, setForm] = useState(FORM_VAZIO);
  const [configAtiva, setConfigAtiva] = useState({ ...DEFAULT_CONFIG });
  const [configEditada, setConfigEditada] = useState({ ...DEFAULT_CONFIG });
  const [aplicarMulta, setAplicarMulta] = useState(true);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores'], queryFn: () => db.entities.Colaborador.list() });
  const { data: tratativas = [] } = useQuery({ queryKey: ['tratativas-select'], queryFn: () => db.entities.Tratativa.list('-created_date', 100) });
  const { data: configs = [] } = useQuery({ queryKey: ['config-estorno'], queryFn: () => db.entities.ConfigEstorno.list() });
  const { data: historico = [] } = useQuery({ queryKey: ['estornos-historico'], queryFn: () => db.entities.EstornoParcial.list('-created_date', 300) });

  const colaborador = useMemo(() => colaboradores.find(c => c.email === user?.email), [colaboradores, user]);
  const isAdmin = colaborador?.papel === 'gestor' || user?.role === 'admin';

  useEffect(() => {
    const ativa = configs.find(c => c.ativa);
    if (ativa) {
      const c = { iss: ativa.iss, pis: ativa.pis, cofins: ativa.cofins, irpj: ativa.irpj, csll: ativa.csll, comissao_vendedor: ativa.comissao_vendedor, multa_contratual: ativa.multa_contratual };
      setConfigAtiva(c);
      setConfigEditada(c);
    }
  }, [configs]);

  useEffect(() => {
    if (user?.full_name) setForm(f => ({ ...f, operador_nome: f.operador_nome || user.full_name }));
  }, [user]);

  const onChange = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mesesUsados = parseInt(form.meses_usados) || 0;
  const diasAdicionais = parseInt(form.dias_adicionais) || 0;
  const diasContrato = getDiasContrato(form.tipo_plano);
  const planoAtual = TIPOS_PLANO.find(p => p.value === form.tipo_plano) || TIPOS_PLANO[3];

  // Validação: tempo usado não pode exceder o contrato
  const diasTotaisUsados = mesesUsados * 30 + diasAdicionais;
  const tempoExcedido = diasTotaisUsados > diasContrato;

  const resultado = useMemo(() => {
    try {
      return calcularEstorno(
        form.valor_nota_fiscal,
        configAtiva,
        form.meses_usados,
        form.dias_adicionais,
        form.tipo_plano,
        aplicarMulta
      );
    } catch {
      return null;
    }
  }, [form.valor_nota_fiscal, form.meses_usados, form.dias_adicionais, form.tipo_plano, configAtiva, aplicarMulta]);

  const salvarMutation = useMutation({
    mutationFn: (dados) => db.entities.EstornoParcial.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estornos-historico'] });
      toast({ title: 'Cálculo salvo!', description: 'Registrado no histórico com sucesso.' });
    },
  });

  const excluirMutation = useMutation({
    mutationFn: (id) => db.entities.EstornoParcial.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estornos-historico'] });
      toast({ title: 'Excluído', description: 'Cálculo removido do histórico.' });
    },
  });

  const salvarConfigMutation = useMutation({
    mutationFn: async (novaConfig) => {
      const ativa = configs.find(c => c.ativa);
      const novoLog = Object.keys(DEFAULT_CONFIG)
        .filter(k => configAtiva[k] !== novaConfig[k])
        .map(k => ({ data: new Date().toISOString(), usuario: user?.full_name || '—', campo: k, valor_anterior: configAtiva[k], valor_novo: novaConfig[k] }));

      if (ativa) {
        return db.entities.ConfigEstorno.update(ativa.id, { ...novaConfig, atualizado_por_nome: user?.full_name, log_alteracoes: [...(ativa.log_alteracoes || []), ...novoLog] });
      }
      return db.entities.ConfigEstorno.create({ nome: 'Config Padrão', ...novaConfig, ativa: true, atualizado_por_nome: user?.full_name, log_alteracoes: novoLog });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-estorno'] });
      setConfigAtiva({ ...configEditada });
      toast({ title: 'Configuração salva!', description: 'Percentuais atualizados.' });
    },
  });

  const handleSalvar = () => {
    if (!form.nome_cliente || !form.valor_nota_fiscal || !form.tipo_estorno) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha: cliente, valor da NF e tipo de estorno.', variant: 'destructive' });
      return;
    }
    const seq = `EST-${String(historico.length + 1).padStart(4, '0')}`;
    salvarMutation.mutate({
      numero_calculo: seq,
      ...form,
      valor_nota_fiscal: parseBRL(form.valor_nota_fiscal),
      tempo_uso_dias_convertido: diasTotaisUsados,
      percentuais_snapshot: { ...configAtiva },
      resultado,
      status: 'finalizado',
    });
  };

  const handleCarregarHistorico = (c) => {
    setForm({
      ticket_zendesk: c.ticket_zendesk || '',
      tratativa_id: c.tratativa_id || '',
      tratativa_id_interno: c.tratativa_id_interno || '',
      nome_cliente: c.nome_cliente || '',
      documento_cliente: c.documento_cliente || '',
      operador_nome: c.operador_nome || '',
      data_solicitacao: c.data_solicitacao || '',
      tipo_estorno: c.tipo_estorno || '',
      classificacao_plano: c.classificacao_plano || '',
      valor_nota_fiscal: c.valor_nota_fiscal ? formatarInputBRL(Math.round(c.valor_nota_fiscal * 100)) : '',
      tipo_plano: c.tipo_plano || 'anual',
      meses_usados: c.meses_usados?.toString() || '',
      dias_adicionais: c.dias_adicionais?.toString() || '',
      observacao_operacional: c.observacao_operacional || '',
    });
    if (c.percentuais_snapshot) setConfigAtiva({ ...DEFAULT_CONFIG, ...c.percentuais_snapshot });
    setTab('calculadora');
    toast({ title: 'Cálculo carregado', description: 'Dados do histórico carregados na calculadora.' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl text-white shadow-lg shadow-violet-500/20">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ferramentas Operacionais</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Processos automatizados — sem planilhas, com rastreabilidade total</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        <button
          onClick={() => setFerramentaAtiva('estorno')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0 transition-all ${
            ferramentaAtiva === 'estorno'
              ? 'bg-primary text-white shadow'
              : 'bg-card border border-border text-muted-foreground hover:border-violet-300'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Cálculo de Estorno Parcial
        </button>
        <button
          onClick={() => setFerramentaAtiva('apoio')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0 transition-all ${
            ferramentaAtiva === 'apoio'
              ? 'bg-primary text-white shadow'
              : 'bg-card border border-border text-muted-foreground hover:border-violet-300'
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          Solicitação de Apoio Especializado
        </button>
        <button
          onClick={() => setFerramentaAtiva('lider')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0 transition-all ${
            ferramentaAtiva === 'lider'
              ? 'bg-primary text-white shadow'
              : 'bg-card border border-border text-muted-foreground hover:border-violet-300'
          }`}
        >
          <UserCog className="w-4 h-4" />
          Líder Técnico
        </button>
        <button
          onClick={() => setFerramentaAtiva('n2')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0 transition-all ${
            ferramentaAtiva === 'n2'
              ? 'bg-primary text-white shadow'
              : 'bg-card border border-border text-muted-foreground hover:border-violet-300'
          }`}
        >
          <Headset className="w-4 h-4" />
          Apoio N2
        </button>
      </div>

      {ferramentaAtiva === 'apoio' && <ApoioEspecializado />}
      {ferramentaAtiva === 'lider' && <LiderTecnicoTool />}
      {ferramentaAtiva === 'n2' && <ApoioN2Tool />}
      {ferramentaAtiva === 'estorno' && (
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="calculadora" className="gap-2 data-[state=active]:bg-card">
            <Calculator className="w-4 h-4" /> Calculadora
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2 data-[state=active]:bg-card">
            <History className="w-4 h-4" /> Histórico
            {historico.length > 0 && <Badge className="ml-1 text-xs h-5">{historico.length}</Badge>}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" className="gap-2 data-[state=active]:bg-card">
              <Settings className="w-4 h-4" /> Configurações Admin
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="calculadora" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-5">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Bloco 1 — Identificação da Solicitação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ticket Zendesk</Label>
                      <Input placeholder="#123456" value={form.ticket_zendesk} onChange={e => onChange('ticket_zendesk', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo de Estorno <span className="text-destructive">*</span></Label>
                      <Select value={form.tipo_estorno} onValueChange={v => onChange('tipo_estorno', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {TIPO_ESTORNO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome do Cliente <span className="text-destructive">*</span></Label>
                      <Input placeholder="Nome completo" value={form.nome_cliente} onChange={e => onChange('nome_cliente', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">CPF / CNPJ</Label>
                      <Input placeholder="000.000.000-00" value={form.documento_cliente} onChange={e => onChange('documento_cliente', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Operador Responsável</Label>
                      <Input placeholder="Nome do operador" value={form.operador_nome} onChange={e => onChange('operador_nome', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data da Solicitação</Label>
                      <Input type="date" value={form.data_solicitacao} onChange={e => onChange('data_solicitacao', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> Vincular à Tratativa CRC (opcional)</Label>
                    <Select value={form.tratativa_id || ''} onValueChange={v => {
                      const t = tratativas.find(x => x.id === v);
                      onChange('tratativa_id', v);
                      onChange('tratativa_id_interno', t?.id_interno || '');
                      if (t?.nome_cliente && !form.nome_cliente) onChange('nome_cliente', t.nome_cliente);
                    }}>
                      <SelectTrigger><SelectValue placeholder="Buscar tratativa no portal..." /></SelectTrigger>
                      <SelectContent>
                        {tratativas.slice(0, 60).map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.id_interno || t.id.slice(0, 8)} — {t.nome_cliente}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.tratativa_id_interno && (
                      <p className="text-xs text-primary">✓ Vinculado: {form.tratativa_id_interno}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-success" />
                    Bloco 2 — Dados Financeiros
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Valor da NF com máscara BRL */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor Total da Nota Fiscal <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold pointer-events-none">R$</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0,00"
                        value={form.valor_nota_fiscal}
                        onChange={e => {
                          const fmt = formatarInputBRL(e.target.value);
                          onChange('valor_nota_fiscal', fmt);
                        }}
                        className="font-mono text-base pl-9"
                      />
                    </div>
                    {form.valor_nota_fiscal && (
                      <p className="text-xs text-success font-medium">
                        {fmtBRL(parseBRL(form.valor_nota_fiscal))}
                      </p>
                    )}
                  </div>

                  {/* Classificação do plano */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Classificação do Plano</Label>
                    <Select value={form.classificacao_plano} onValueChange={v => onChange('classificacao_plano', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione a classificação..." /></SelectTrigger>
                      <SelectContent>
                        {CLASSIFICACAO_PLANO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tipo de plano */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo de Plano Contratado</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {TIPOS_PLANO.map(p => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => onChange('tipo_plano', p.value)}
                          className={`py-2 px-1 rounded-lg text-xs font-semibold border-2 transition-all ${
                            form.tipo_plano === p.value
                              ? 'border-violet-500 bg-info-soft text-primary'
                              : 'border-border bg-card text-muted-foreground hover:border-border'
                          }`}
                        >
                          <div>{p.label}</div>
                          <div className="text-[10px] font-normal opacity-70">{p.dias} dias</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tempo utilizado */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tempo Efetivamente Utilizado</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number" min="0"
                            placeholder="0"
                            value={form.meses_usados}
                            onChange={e => onChange('meses_usados', e.target.value)}
                            className="font-mono"
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">meses</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number" min="0" max="29"
                            placeholder="0"
                            value={form.dias_adicionais}
                            onChange={e => onChange('dias_adicionais', e.target.value)}
                            className="font-mono"
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">dias</span>
                        </div>
                      </div>
                    </div>
                    {(mesesUsados > 0 || diasAdicionais > 0) && (
                      <p className={`text-xs mt-1 ${tempoExcedido ? 'text-destructive font-semibold' : 'text-primary'}`}>
                        {tempoExcedido
                          ? `${diasTotaisUsados} dias excedem o contrato (${diasContrato} dias)`
                          : `≡ ${diasTotaisUsados} dias totais de uso (contrato: ${diasContrato} dias)`}
                      </p>
                    )}
                  </div>

                  {/* Preview proporcional — base única em dias */}
                  {resultado?.uso_proporcional_detalhe?.valor > 0 && (
                    <div className="p-3 bg-info-soft border border-info/25 rounded-lg space-y-1">
                      <p className="text-xs font-semibold text-primary">Cálculo Proporcional — Plano {planoAtual?.label} ({resultado.uso_proporcional_detalhe.mesesContrato} meses)</p>
                      <p className="text-xs text-primary">
                        Valor mensal: {fmtBRL(resultado.uso_proporcional_detalhe.valorMensal)}/mês
                        {' '}= {fmtBRL(parseBRL(form.valor_nota_fiscal))} ÷ {resultado.uso_proporcional_detalhe.mesesContrato}
                      </p>
                      {mesesUsados > 0 && (
                        <p className="text-xs text-primary">
                          {mesesUsados} meses × {fmtBRL(resultado.uso_proporcional_detalhe.valorMensal)} = {fmtBRL(resultado.uso_proporcional_detalhe.valorMeses)}
                        </p>
                      )}
                      {diasAdicionais > 0 && (
                        <p className="text-xs text-primary">
                          {diasAdicionais} dias × {fmtBRL(resultado.uso_proporcional_detalhe.valorDiario)}/dia = {fmtBRL(resultado.uso_proporcional_detalhe.valorDias)}
                        </p>
                      )}
                      <p className="text-sm font-bold text-primary">
                        Total uso do sistema: {fmtBRL(resultado.uso_proporcional_detalhe.valor)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    Bloco 3 — Impostos e Descontos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ImpostosPanel config={configAtiva} onChange={() => {}} isAdmin={false} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Observação Operacional
                  </Label>
                  <Textarea
                    rows={4}
                    placeholder='Ex: "Cliente utilizou parcialmente o sistema durante 42 dias."'
                    value={form.observacao_operacional}
                    onChange={e => onChange('observacao_operacional', e.target.value)}
                    className="resize-none text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Aparecerá no PDF exportado.</p>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="lg:sticky lg:top-6 space-y-4">
                <Card className="border-2 border-violet-100">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-primary" />
                      Resultado em Tempo Real
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {resultado ? (
                      <>
                        <ResultadoCards
                          resultado={resultado}
                          valorNotaStr={form.valor_nota_fiscal}
                          aplicarMulta={aplicarMulta}
                          onToggleMulta={setAplicarMulta}
                        />
                        <div className="pt-3 border-t border-border space-y-3">
                          <ExportacaoEstorno
                            form={form}
                            config={configAtiva}
                            resultado={resultado}
                            aplicarMulta={aplicarMulta}
                          />
                          <Button
                            className="w-full gap-2 bg-primary hover:bg-violet-700 text-white"
                            onClick={handleSalvar}
                            disabled={salvarMutation.isPending}
                          >
                            <Save className="w-4 h-4" />
                            {salvarMutation.isPending ? 'Salvando...' : 'Salvar Cálculo'}
                          </Button>
                          <Button variant="outline" className="w-full gap-2" onClick={() => setForm({ ...FORM_VAZIO, operador_nome: user?.full_name || '' })}>
                            <RefreshCw className="w-4 h-4" /> Novo Cálculo
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                        <Calculator className="w-14 h-14 mb-3 opacity-20" />
                        <p className="text-sm text-muted-foreground">Digite o valor da nota fiscal</p>
                        <p className="text-xs text-muted-foreground">O resultado aparece automaticamente</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {resultado && (
                   <MemoriaCalculo
                     resultado={resultado}
                     config={configAtiva}
                     valorNota={form.valor_nota_fiscal}
                     aplicarMulta={aplicarMulta}
                     classificacaoPlano={form.classificacao_plano}
                   />
                 )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Histórico de Cálculos
                <Badge variant="outline">{historico.length} registros</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HistoricoEstornos
                calculos={historico}
                isAdmin={isAdmin}
                onVer={handleCarregarHistorico}
                onExcluir={(c) => {
                  if (window.confirm(`Excluir o cálculo ${c.numero_calculo || c.id.slice(0, 8)}?`)) {
                    excluirMutation.mutate(c.id);
                  }
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin" className="mt-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary" />
                    Configurar Percentuais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ImpostosPanel config={configEditada} onChange={(k, v) => setConfigEditada(c => ({ ...c, [k]: v }))} isAdmin />
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button
                      className="gap-2 bg-primary hover:bg-violet-700 text-white"
                      onClick={() => salvarConfigMutation.mutate(configEditada)}
                      disabled={salvarConfigMutation.isPending}
                    >
                      <Save className="w-4 h-4" />
                      {salvarConfigMutation.isPending ? 'Salvando...' : 'Salvar Configuração'}
                    </Button>
                    <Button variant="outline" onClick={() => setConfigEditada({ ...configAtiva })}>Cancelar</Button>
                  </div>
                  <div className="p-3 bg-warning-soft border border-warning/25 rounded-lg flex gap-2 text-sm text-warning">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>Alterações afetam apenas cálculos <strong>futuros</strong>. Registros anteriores preservam os percentuais originais.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="w-4 h-4 text-muted-foreground" />
                    Log de Alterações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const logs = configs.flatMap(c => c.log_alteracoes || []).sort((a, b) => new Date(b.data) - new Date(a.data));
                    if (!logs.length) return <p className="text-sm text-muted-foreground text-center py-8">Nenhuma alteração registrada ainda.</p>;
                    return (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {logs.map((l, i) => (
                          <div key={i} className="flex items-start gap-3 text-xs p-2.5 rounded-lg bg-muted border border-border">
                            <div className="flex-1">
                              <span className="font-semibold text-foreground">{l.campo?.toUpperCase()}</span>
                              <span className="text-muted-foreground"> de</span>
                              <span className="text-destructive font-medium">{l.valor_anterior}%</span>
                              <span className="text-muted-foreground"> →</span>
                              <span className="text-success font-medium">{l.valor_novo}%</span>
                            </div>
                            <div className="text-right text-muted-foreground shrink-0">
                              <p className="font-medium text-muted-foreground">{l.usuario}</p>
                              <p>{l.data ? new Date(l.data).toLocaleDateString('pt-BR') : '—'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
      )}
    </div>
  );
}