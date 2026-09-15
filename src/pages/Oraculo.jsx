const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import OraculoWizard from '@/components/oraculo/OraculoWizard';
import { 
  Eye, 
  Plus, 
  Sparkles, 
  TrendingUp, 
  Users,
  Calendar,
  Filter,
  BarChart3
} from 'lucide-react';
import { formatDateSP, getCurrentTrimester } from '@/components/utils/helpers';
import { toast } from 'sonner';

export default function OraculoPage() {
  const [showWizard, setShowWizard] = useState(false);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState(null);
  const [filtroColaborador, setFiltroColaborador] = useState('todos');
  const queryClient = useQueryClient();

  // Dados do usuário
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me()
  });

  const { data: currentColaborador } = useQuery({
    queryKey: ['currentColaborador', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const colaboradores = await db.entities.Colaborador.list();
      return colaboradores.find(c => c.email === user.email);
    },
    enabled: !!user?.email
  });

  // Verificar se é gestor
  const isGestor = currentColaborador?.papel === 'gestor';

  // Buscar dados
  const { data: colaboradores = [], isLoading: loadingColaboradores } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => db.entities.Colaborador.list()
  });

  const { data: lancamentos = [], isLoading: loadingLancamentos } = useQuery({
    queryKey: ['oraculoLancamentos'],
    queryFn: () => db.entities.OraculoLancamento.list('-data_lancamento')
  });

  const { data: palavrasDicionario = [], isLoading: loadingPalavras } = useQuery({
    queryKey: ['oraculoPalavras'],
    queryFn: () => db.entities.OraculoPalavra.list()
  });

  const { data: pontuacoes = [] } = useQuery({
    queryKey: ['pontuacoes'],
    queryFn: () => db.entities.Pontuacao.list()
  });

  const { data: apuracoes = [] } = useQuery({
    queryKey: ['apuracoes'],
    queryFn: () => db.entities.Apuracao.list()
  });

  const { data: tratativas = [] } = useQuery({
    queryKey: ['tratativas'],
    queryFn: () => db.entities.Tratativa.list()
  });

  // Mutation para criar lançamento
  const createLancamentoMutation = useMutation({
    mutationFn: (lancamento) => db.entities.OraculoLancamento.create(lancamento),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oraculoLancamentos'] });
      toast.success('Lançamento registrado com sucesso!');
      setShowWizard(false);
      setColaboradorSelecionado(null);
    }
  });

  // Gerar contexto do colaborador
  const gerarContexto = (colaboradorId) => {
    const pontuacao = pontuacoes.find(p => 
      p.colaborador_id === colaboradorId && 
      p.periodo_trimestre === getCurrentTrimester()
    );
    
    const apuracaoRecente = apuracoes
      .filter(a => a.colaborador_id === colaboradorId)
      .sort((a, b) => new Date(b.data_apuracao) - new Date(a.data_apuracao))[0];
    
    const tratativasColaborador = tratativas.filter(t => t.agente_responsavel_id === colaboradorId);
    
    const sinais = [];
    if (apuracaoRecente?.satisfacao_media > 95) {
      sinais.push('CSAT acima de 95% no último período');
    }
    if (pontuacao?.total_pontos > 20) {
      sinais.push('Performance destacada no trimestre');
    }
    if (tratativasColaborador.filter(t => t.encerrado_no_sla).length > 5) {
      sinais.push('Boa consistência no cumprimento de SLA');
    }

    return {
      csat_recente: apuracaoRecente?.satisfacao_media || null,
      tratativas_periodo: tratativasColaborador.length,
      pontos_trimestre: pontuacao?.total_pontos || 0,
      sinais_recentes: sinais
    };
  };

  const handleNovoLancamento = (colaborador) => {
    setColaboradorSelecionado(colaborador);
    setShowWizard(true);
  };

  const handleCompletarLancamento = (data) => {
    const contexto = gerarContexto(colaboradorSelecionado.id);
    
    const lancamento = {
      colaborador_id: colaboradorSelecionado.id,
      colaborador_nome: colaboradorSelecionado.nome_completo,
      gestor_id: currentColaborador.id,
      gestor_nome: currentColaborador.nome_completo,
      pergunta_gerada: data.pergunta_gerada,
      palavras_chave: data.palavras_selecionadas,
      soft_skills: data.soft_skills,
      hard_skills: data.hard_skills,
      texto_livre: data.texto_livre,
      contexto_performance: contexto,
      data_lancamento: new Date().toISOString()
    };

    createLancamentoMutation.mutate(lancamento);
  };

  // Consolidação por colaborador
  const consolidacaoPorColaborador = React.useMemo(() => {
    const consolidacao = {};
    
    lancamentos.forEach(lanc => {
      if (!consolidacao[lanc.colaborador_id]) {
        consolidacao[lanc.colaborador_id] = {
          colaborador_nome: lanc.colaborador_nome,
          total_lancamentos: 0,
          palavras_recorrentes: {},
          media_soft_skills: {},
          media_hard_skills: {}
        };
      }
      
      const cons = consolidacao[lanc.colaborador_id];
      cons.total_lancamentos++;
      
      // Contar palavras
      lanc.palavras_chave?.forEach(p => {
        cons.palavras_recorrentes[p.palavra] = (cons.palavras_recorrentes[p.palavra] || 0) + 1;
      });
      
      // Média de skills
      Object.entries(lanc.soft_skills || {}).forEach(([skill, valor]) => {
        if (!cons.media_soft_skills[skill]) cons.media_soft_skills[skill] = [];
        cons.media_soft_skills[skill].push(valor);
      });
      
      Object.entries(lanc.hard_skills || {}).forEach(([skill, valor]) => {
        if (!cons.media_hard_skills[skill]) cons.media_hard_skills[skill] = [];
        cons.media_hard_skills[skill].push(valor);
      });
    });
    
    // Calcular médias
    Object.values(consolidacao).forEach(cons => {
      Object.keys(cons.media_soft_skills).forEach(skill => {
        const valores = cons.media_soft_skills[skill];
        cons.media_soft_skills[skill] = valores.reduce((a, b) => a + b, 0) / valores.length;
      });
      Object.keys(cons.media_hard_skills).forEach(skill => {
        const valores = cons.media_hard_skills[skill];
        cons.media_hard_skills[skill] = valores.reduce((a, b) => a + b, 0) / valores.length;
      });
    });
    
    return consolidacao;
  }, [lancamentos]);

  if (!isGestor) {
    return (
      <div className="min-h-screen p-6 bg-slate-50">
        <EmptyState
          icon={Eye}
          title="Acesso Restrito"
          description="O módulo ORÁCULO CRC é exclusivo para gestores."
        />
      </div>
    );
  }

  if (loadingColaboradores || loadingLancamentos || loadingPalavras) {
    return <LoadingSpinner text="Carregando ORÁCULO CRC..." />;
  }

  if (showWizard && colaboradorSelecionado) {
    return (
      <div className="min-h-screen p-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title="Novo Lançamento - ORÁCULO CRC"
            subtitle={`Leitura ativa de ${colaboradorSelecionado.nome_completo}`}
            icon={Sparkles}
          />
          <OraculoWizard
            colaborador={colaboradorSelecionado}
            contexto={gerarContexto(colaboradorSelecionado.id)}
            palavrasDicionario={palavrasDicionario}
            onComplete={handleCompletarLancamento}
            onCancel={() => {
              setShowWizard(false);
              setColaboradorSelecionado(null);
            }}
          />
        </div>
      </div>
    );
  }

  const colaboradoresFiltrados = filtroColaborador === 'todos' 
    ? colaboradores 
    : colaboradores.filter(c => c.id === filtroColaborador);

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <PageHeader
        title="ORÁCULO CRC"
        subtitle="Leitura Ativa de Pessoas - Módulo Exclusivo Gestores"
        icon={Eye}
      />

      <Tabs defaultValue="equipe" className="mt-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="equipe">
            <Users className="w-4 h-4 mr-2" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="historico">
            <Calendar className="w-4 h-4 mr-2" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="consolidacao">
            <BarChart3 className="w-4 h-4 mr-2" />
            Consolidação
          </TabsTrigger>
        </TabsList>

        {/* Tab Equipe */}
        <TabsContent value="equipe">
          <div className="grid gap-4 mt-6">
            {colaboradores.filter(c => c.papel === 'agente').map(colaborador => {
              const lancamentosColaborador = lancamentos.filter(l => l.colaborador_id === colaborador.id);
              const ultimoLancamento = lancamentosColaborador[0];
              
              return (
                <Card key={colaborador.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{colaborador.nome_completo}</h3>
                        <p className="text-sm text-slate-600">{colaborador.cargo_atual}</p>
                        
                        {ultimoLancamento && (
                          <div className="mt-3 text-sm text-slate-500">
                            Último lançamento: {formatDateSP(ultimoLancamento.data_lancamento, 'DD/MM/YYYY')}
                          </div>
                        )}
                        
                        {lancamentosColaborador.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {Object.entries(
                              consolidacaoPorColaborador[colaborador.id]?.palavras_recorrentes || {}
                            )
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 5)
                              .map(([palavra, count]) => (
                                <Badge key={palavra} variant="outline" className="text-xs">
                                  {palavra} ({count}x)
                                </Badge>
                              ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleNovoLancamento(colaborador)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Novo Lançamento
                        </Button>
                        {lancamentosColaborador.length > 0 && (
                          <Badge className="bg-slate-200 text-slate-700 justify-center">
                            {lancamentosColaborador.length} lançamentos
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {colaboradores.filter(c => c.papel === 'agente').length === 0 && (
            <EmptyState
              icon={Users}
              title="Nenhum agente encontrado"
              description="Não há agentes cadastrados para lançamento."
            />
          )}
        </TabsContent>

        {/* Tab Histórico */}
        <TabsContent value="historico">
          <div className="space-y-4 mt-6">
            {lancamentos.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Nenhum lançamento ainda"
                description="Comece criando o primeiro lançamento na aba Equipe."
              />
            ) : (
              lancamentos.map(lanc => (
                <Card key={lanc.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{lanc.colaborador_nome}</CardTitle>
                        <p className="text-sm text-slate-600">
                          {formatDateSP(lanc.data_lancamento, 'DD/MM/YYYY HH:mm')} • 
                          Por {lanc.gestor_nome}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {lanc.pergunta_gerada && (
                      <div className="p-3 bg-purple-50 rounded-lg text-sm italic">
                        "{lanc.pergunta_gerada}"
                      </div>
                    )}
                    
                    <div>
                      <h4 className="text-xs font-semibold text-slate-600 mb-2">PALAVRAS-CHAVE</h4>
                      <div className="flex flex-wrap gap-1">
                        {lanc.palavras_chave?.map((p, idx) => (
                          <Badge 
                            key={idx}
                            className={p.origem === 'manual' ? 'bg-amber-600' : 'bg-green-600'}
                          >
                            {p.palavra}
                            {p.origem === 'manual' && ' *'}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {lanc.texto_livre && (
                      <div className="p-3 bg-slate-50 rounded text-sm">
                        {lanc.texto_livre}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab Consolidação */}
        <TabsContent value="consolidacao">
          <div className="space-y-4 mt-6">
            {Object.keys(consolidacaoPorColaborador).length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="Sem dados consolidados"
                description="Ainda não há lançamentos suficientes para consolidação."
              />
            ) : (
              Object.entries(consolidacaoPorColaborador).map(([colabId, dados]) => (
                <Card key={colabId}>
                  <CardHeader>
                    <CardTitle>{dados.colaborador_nome}</CardTitle>
                    <p className="text-sm text-slate-600">
                      {dados.total_lancamentos} lançamento(s) registrado(s)
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Palavras recorrentes */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Palavras Recorrentes</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(dados.palavras_recorrentes)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 10)
                          .map(([palavra, count]) => (
                            <Badge key={palavra} className="bg-blue-600">
                              {palavra} ({count}x)
                            </Badge>
                          ))}
                      </div>
                    </div>

                    {/* Médias de Skills */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Soft Skills (Média)</h4>
                        {Object.entries(dados.media_soft_skills).map(([skill, media]) => (
                          <div key={skill} className="flex justify-between text-sm mb-1">
                            <span>{skill}</span>
                            <span className="font-medium text-amber-600">{media.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Hard Skills (Média)</h4>
                        {Object.entries(dados.media_hard_skills).map(([skill, media]) => (
                          <div key={skill} className="flex justify-between text-sm mb-1">
                            <span>{skill}</span>
                            <span className="font-medium text-amber-600">{media.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}