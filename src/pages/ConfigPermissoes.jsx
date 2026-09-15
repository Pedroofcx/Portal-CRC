import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, Users, Eye, EyeOff, Save } from 'lucide-react';
import { toast } from 'sonner';

const modulosDisponiveis = [
  { nome: 'Dashboard', rota: 'Dashboard', icone: 'LayoutDashboard', descricao: 'Visão geral e métricas' },
  { nome: 'Minha Performance', rota: 'MinhaPerformance', icone: 'Award', descricao: 'Desempenho individual' },
  { nome: 'Como Funciona', rota: 'ComoFunciona', icone: 'BookOpen', descricao: 'Manual do sistema' },
  { nome: 'Tratativas CRC', rota: 'Tratativas', icone: 'ClipboardList', descricao: 'Gestão de tratativas' },
  { nome: 'Colaboradores', rota: 'Cadastro', icone: 'Users', descricao: 'Gestão de equipe' },
  { nome: 'Observações', rota: 'Observacoes', icone: 'MessageSquare', descricao: 'Feedbacks e registros' },
  { nome: 'Jornada do Cliente', rota: 'JornadaCliente', icone: 'Map', descricao: 'Análise da jornada' },
  { nome: 'Plano Setorial', rota: 'PlanoSetorial', icone: 'TrendingUp', descricao: 'Planejamento estratégico' },
  { nome: 'ORÁCULO CRC', rota: 'Oraculo', icone: 'Eye', descricao: 'Predição e análise' },
  { nome: 'Apuração', rota: 'Apuracao', icone: 'Search', descricao: 'Apuração de métricas' },
  { nome: 'Universidade CRC', rota: 'Universidade', icone: 'GraduationCap', descricao: 'Treinamentos' },
  { nome: 'POP', rota: 'POP', icone: 'FileText', descricao: 'Procedimentos operacionais' },
  { nome: 'Escalas', rota: 'Escalas', icone: 'Calendar', descricao: 'Escalas de trabalho' },
  { nome: 'Home Office Escolha', rota: 'HomeOfficeEscolha', icone: 'Home', descricao: 'Escolha de dias home office' },
  { nome: 'Férias', rota: 'Ferias', icone: 'Palmtree', descricao: 'Solicitação de férias' },
  { nome: 'Gestão de Férias', rota: 'GestaoFerias', icone: 'Users', descricao: 'Gestão de férias (gestor)' },
  { nome: 'Avisos', rota: 'Avisos', icone: 'Bell', descricao: 'Avisos e comunicados' },
  { nome: 'Pesquisas', rota: 'Pesquisas', icone: 'ClipboardCheck', descricao: 'Pesquisas internas' },
  { nome: 'Hansei', rota: 'Hansei', icone: 'TrendingUp', descricao: 'Envio de resultados de desempenho' },
  { nome: 'Relatórios', rota: 'Relatorios', icone: 'BarChart3', descricao: 'Relatórios gerenciais' },
  { nome: 'Configurações', rota: 'Configuracoes', icone: 'Settings', descricao: 'Configurações do sistema' },
];

export default function ConfigPermissoes() {
  const [selectedColaboradores, setSelectedColaboradores] = useState([]);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: permissoes = [], isLoading } = useQuery({
    queryKey: ['permissoes-modulo'],
    queryFn: () => db.entities.PermissaoModulo.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.PermissaoModulo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['permissoes-modulo']);
      toast.success('Permissão criada');
    },
    onError: () => toast.error('Erro ao criar permissão'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.PermissaoModulo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['permissoes-modulo']);
      toast.success('Permissão atualizada');
    },
    onError: () => toast.error('Erro ao atualizar permissão'),
  });

  const inicializarModulos = () => {
    modulosDisponiveis.forEach((modulo, index) => {
      const jaExiste = permissoes.find(p => p.modulo_rota === modulo.rota);
      if (!jaExiste) {
        createMutation.mutate({
          modulo_nome: modulo.nome,
          modulo_rota: modulo.rota,
          visivel_para_agente: true,
          visivel_para_gestor: true,
          colaboradores_excecao: [],
          ordem: index + 1,
          icone: modulo.icone,
          ativo: true
        });
      }
    });
  };

  const handleToggleVisibilidade = (permissaoId, tipo) => {
    const permissao = permissoes.find(p => p.id === permissaoId);
    if (!permissao) return;

    const updateData = tipo === 'agente' 
      ? { visivel_para_agente: !permissao.visivel_para_agente }
      : { visivel_para_gestor: !permissao.visivel_para_gestor };

    updateMutation.mutate({ id: permissaoId, data: updateData });
  };

  const handleToggleExcecao = (permissaoId, colaboradorId) => {
    const permissao = permissoes.find(p => p.id === permissaoId);
    if (!permissao) return;

    const atual = permissao.colaboradores_excecao || [];
    const nova = atual.includes(colaboradorId)
      ? atual.filter(id => id !== colaboradorId)
      : [...atual, colaboradorId];

    updateMutation.mutate({ 
      id: permissaoId, 
      data: { colaboradores_excecao: nova }
    });
  };

  const colaboradorAtual = colaboradores.find(c => c.email === user?.email);
  const isGestor = colaboradorAtual?.papel === 'gestor';

  if (!isGestor) {
    return (
      <div className="text-center py-16">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">Apenas gestores podem configurar permissões.</p>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner text="Carregando permissões..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Permissões de Módulos"
        subtitle="Configure quais módulos cada perfil pode visualizar"
        icon={Shield}
        backTo="Configuracoes"
        actions={
          permissoes.length === 0 && (
            <Button onClick={inicializarModulos} className="bg-primary hover:bg-primary/90">
              Inicializar Módulos
            </Button>
          )
        }
      />

      {permissoes.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Nenhuma permissão configurada ainda</p>
            <Button onClick={inicializarModulos} className="bg-primary hover:bg-primary/90">
              Inicializar Módulos com Permissões Padrão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {permissoes.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map(permissao => (
            <Card key={permissao.id} className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{permissao.modulo_nome}</CardTitle>
                  <Badge variant="outline">{permissao.modulo_rota}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Visibilidade por Perfil */}
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      {permissao.visivel_para_agente ? (
                        <Eye className="w-5 h-5 text-success" />
                      ) : (
                        <EyeOff className="w-5 h-5 text-muted-foreground" />
                      )}
                      <Label className="font-medium">Visível para Agentes</Label>
                    </div>
                    <Switch
                      checked={permissao.visivel_para_agente}
                      onCheckedChange={() => handleToggleVisibilidade(permissao.id, 'agente')}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      {permissao.visivel_para_gestor ? (
                        <Eye className="w-5 h-5 text-primary" />
                      ) : (
                        <EyeOff className="w-5 h-5 text-muted-foreground" />
                      )}
                      <Label className="font-medium">Visível para Gestores</Label>
                    </div>
                    <Switch
                      checked={permissao.visivel_para_gestor}
                      onCheckedChange={() => handleToggleVisibilidade(permissao.id, 'gestor')}
                    />
                  </div>
                </div>

                {/* Exceções Individuais */}
                <div className="p-4 bg-warning-soft border border-warning/25 rounded-lg">
                  <Label className="font-medium text-warning mb-3 block">
                    Exceções Individuais (sobrescreve regra do perfil)
                  </Label>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {colaboradores.filter(c => c.ativo !== false && c.papel === 'agente').map(colab => {
                      const isExcecao = permissao.colaboradores_excecao?.includes(colab.id);
                      return (
                        <div 
                          key={colab.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                            isExcecao ? 'bg-info-soft border-info/30' : 'bg-card border-border hover:border-info/25'
                          }`}
                          onClick={() => handleToggleExcecao(permissao.id, colab.id)}
                        >
                          <Checkbox 
                            checked={isExcecao}
                            onCheckedChange={() => handleToggleExcecao(permissao.id, colab.id)}
                          />
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={colab.foto_url} />
                            <AvatarFallback className="bg-info-soft text-primary text-xs">
                              {colab.nome_completo?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm flex-1 truncate">{colab.nome_completo}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-warning mt-2">
                    {permissao.colaboradores_excecao?.length || 0} colaborador(es) com acesso especial
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}