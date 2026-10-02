import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { formatDateSP } from '@/components/utils/helpers';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Settings, Trash2, Save, Download, Shield, Target, Tag, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import RankingTrimestral from '@/components/dashboard/RankingTrimestral';
import ConfigSkills from './ConfigSkills';
import ConfigTiposObservacao from './ConfigTiposObservacao';
import ConfigElegibilidade from './ConfigElegibilidade.jsx';
import ConfigTiposTratativa from './ConfigTiposTratativa';
import ConfigCategoriasTratativa from './ConfigCategoriasTratativa';
import DocumentacaoTecnica from '@/components/documentacao/DocumentacaoTecnica';
import LiderTecnicoConfig from '@/components/lider-tecnico/LiderTecnicoConfig';
import AgenteN2Config from '@/components/apoio-n2/AgenteN2Config';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ListaResumida from '@/components/ui/ListaResumida';
import { usePermissoes } from '@/hooks/usePermissoes';
import { PERMISSOES_DE_CONFIGURACAO } from '@/lib/permissoesPaginas';

export default function Configuracoes() {
  const [metas, setMetas] = useState({
    csat_minimo: '',
    performance_minimo: '',
    avaliacao_cx_minimo: ''
  });
  const [rankingVisivel, setRankingVisivel] = useState(true);
  const [_backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteModulo, setDeleteModulo] = useState('');

  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradoresAcesso = [] } = useQuery({ queryKey: ['colaboradores', "list()"], queryFn: () => db.entities.Colaborador.list() });
  const eu = colaboradoresAcesso.find((c) => c.email === user?.email);
  const { temAlguma } = usePermissoes();
  const isGestor = eu?.papel === 'gestor' || temAlguma(PERMISSOES_DE_CONFIGURACAO);

  const { data: configuracoes = [], isLoading } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => db.entities.Configuracao.list(),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['logs'],
    queryFn: () => db.entities.LogAuditoria.list('-data_hora', 50),
  });

  // Carregar configurações existentes
  React.useEffect(() => {
    const metasConfig = configuracoes.find(c => c.chave === 'metas_performance');
    if (metasConfig) {
      try {
        setMetas(JSON.parse(metasConfig.valor));
      } catch {
        setMetas({ csat_minimo: '85', performance_minimo: '95', avaliacao_cx_minimo: '4.2' });
      }
    }
    const rankingConf = configuracoes.find(c => c.chave === 'ranking_visivel_agentes');
    if (rankingConf) {
      setRankingVisivel(rankingConf.valor !== 'false');
    }
  }, [configuracoes]);

  const handleToggleRanking = (checked) => {
    setRankingVisivel(checked);
    salvarConfigMutation.mutate({
      chave: 'ranking_visivel_agentes',
      valor: checked ? 'true' : 'false',
      tipo: 'boolean',
      categoria: 'ranking',
      descricao: 'Define se o ranking trimestral é visível para os agentes'
    });
  };

  const salvarConfigMutation = useMutation({
    mutationFn: async ({ chave, valor, tipo, categoria, descricao }) => {
      const existe = configuracoes.find(c => c.chave === chave);
      if (existe) {
        return db.entities.Configuracao.update(existe.id, { valor, tipo, categoria, descricao });
      } else {
        return db.entities.Configuracao.create({ chave, valor, tipo, categoria, descricao });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['configuracoes']);
      toast.success('Configuração salva');
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const handleSalvarMetas = () => {
    salvarConfigMutation.mutate({
      chave: 'metas_performance',
      valor: JSON.stringify(metas),
      tipo: 'json',
      categoria: 'metas',
      descricao: 'Metas de performance configuradas'
    });
  };

  const handleBackup = async (tipo) => {
    try {
      let dados = {};
      
      if (tipo === 'completo') {
        const [tratativas, colaboradores, pontuacoes, observacoes, pdis, pops, avisos] = await Promise.all([
          db.entities.Tratativa.list(),
          db.entities.Colaborador.list(),
          db.entities.Pontuacao.list(),
          db.entities.Observacao.list(),
          db.entities.PDI.list(),
          db.entities.POP.list(),
          db.entities.Aviso.list(),
        ]);
        
        dados = {
          tratativas,
          colaboradores,
          pontuacoes,
          observacoes,
          pdis,
          pops,
          avisos,
          configuracoes,
          data_backup: new Date().toISOString()
        };
      } else {
        // Backup só de configurações
        dados = {
          configuracoes,
          metas,
          data_backup: new Date().toISOString()
        };
      }

      const json = JSON.stringify(dados, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${tipo}_${Date.now()}.json`;
      a.click();
      toast.success('Backup realizado');
      setBackupDialogOpen(false);
    } catch (_error) {
      toast.error('Erro ao gerar backup');
    }
  };

  const handleDeleteData = async (modulo) => {
    try {
      if (modulo === 'todos') {
        // Deletar todos os dados
        const [tratativas, pontuacoes, observacoes, pdis, apuracoes, escalas] = await Promise.all([
          db.entities.Tratativa.list(),
          db.entities.Pontuacao.list(),
          db.entities.Observacao.list(),
          db.entities.PDI.list(),
          db.entities.Apuracao.list(),
          db.entities.EscalaAtribuicao.list(),
        ]);

        const deletePromises = [];
        tratativas.forEach(t => deletePromises.push(db.entities.Tratativa.delete(t.id)));
        pontuacoes.forEach(p => deletePromises.push(db.entities.Pontuacao.delete(p.id)));
        observacoes.forEach(o => deletePromises.push(db.entities.Observacao.delete(o.id)));
        pdis.forEach(p => deletePromises.push(db.entities.PDI.delete(p.id)));
        apuracoes.forEach(a => deletePromises.push(db.entities.Apuracao.delete(a.id)));
        escalas.forEach(e => deletePromises.push(db.entities.EscalaAtribuicao.delete(e.id)));

        await Promise.all(deletePromises);
      } else {
        // Deletar módulo específico
        let dados = [];
        let entityName = '';

        switch(modulo) {
          case 'tratativas':
            dados = await db.entities.Tratativa.list();
            entityName = 'Tratativa';
            break;
          case 'apuracoes':
            dados = await db.entities.Apuracao.list();
            entityName = 'Apuracao';
            break;
          case 'observacoes':
            dados = await db.entities.Observacao.list();
            entityName = 'Observacao';
            break;
          case 'pdis':
            dados = await db.entities.PDI.list();
            entityName = 'PDI';
            break;
          case 'escalas':
            dados = await db.entities.EscalaAtribuicao.list();
            entityName = 'EscalaAtribuicao';
            break;
          case 'pontuacoes':
            dados = await db.entities.Pontuacao.list();
            entityName = 'Pontuacao';
            break;
        }

        const deletePromises = dados.map(item => db.entities[entityName].delete(item.id));
        await Promise.all(deletePromises);
      }

      queryClient.invalidateQueries();
      toast.success('Dados excluídos com sucesso');
      setDeleteDialogOpen(false);
      setDeleteModulo('');
    } catch (error) {
      toast.error('Erro ao excluir dados');
      console.error(error);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isGestor) {
    return (
      <div className="py-16 text-center">
        <h2 className="mb-2 text-xl font-semibold">Acesso restrito</h2>
        <p className="text-muted-foreground">Configurações é uma área da gestão.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações Gerais"
        subtitle="Gerenciamento e governança do sistema"
        icon={Settings}
      />

      <Tabs defaultValue="tipos-tratativa">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="tipos-tratativa">Tipos Tratativa</TabsTrigger>
          <TabsTrigger value="categorias-tratativa">Categorias Tratativa</TabsTrigger>
          <TabsTrigger value="motivos-jornada">Motivos & Jornada</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="tipos">Tipos Observação</TabsTrigger>
          <TabsTrigger value="elegibilidade">Elegibilidade</TabsTrigger>
          <TabsTrigger value="lideres-tecnicos">Líderes Técnicos</TabsTrigger>
          <TabsTrigger value="agentes-n2">Agentes N2</TabsTrigger>
          <TabsTrigger value="permissoes">Permissões de Módulos</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="metas">Metas</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="exclusao">Exclusão de Dados</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="documentacao">Documentação Técnica</TabsTrigger>
        </TabsList>

        {/* TIPOS DE TRATATIVA */}
        <TabsContent value="tipos-tratativa" className="mt-6">
          <ConfigTiposTratativa />
        </TabsContent>

        {/* CATEGORIAS DE TRATATIVA */}
        <TabsContent value="categorias-tratativa" className="mt-6">
          <ConfigCategoriasTratativa />
        </TabsContent>

        {/* MOTIVOS & JORNADA */}
        <TabsContent value="motivos-jornada" className="mt-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <Tag className="w-10 h-10 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Motivos & Submotivos</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure os motivos principais e submotivos das tratativas
                </p>
                <Link to={createPageUrl('ConfigMotivosJornada')}>
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    Gerenciar Motivos
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <Target className="w-10 h-10 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Etapas da Jornada</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Defina as etapas que o cliente percorre
                </p>
                <Link to={createPageUrl('ConfigEtapasJornada')}>
                  <Button className="w-full bg-primary hover:bg-primary">
                    Gerenciar Etapas
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SKILLS */}
        <TabsContent value="skills" className="mt-6">
          <ConfigSkills />
        </TabsContent>

        {/* TIPOS DE OBSERVAÇÃO */}
        <TabsContent value="tipos" className="mt-6">
          <ConfigTiposObservacao />
        </TabsContent>

        {/* ELEGIBILIDADE */}
        <TabsContent value="elegibilidade" className="mt-6">
          <ConfigElegibilidade />
        </TabsContent>

        {/* LÍDERES TÉCNICOS */}
        <TabsContent value="lideres-tecnicos" className="mt-6">
          <LiderTecnicoConfig />
        </TabsContent>

        {/* AGENTES N2 */}
        <TabsContent value="agentes-n2" className="mt-6">
          <AgenteN2Config />
        </TabsContent>

        {/* PERMISSÕES DE MÓDULOS */}
        <TabsContent value="permissoes" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <Shield className="w-10 h-10 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Permissões de Visualização de Módulos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure quais módulos cada perfil (agente/gestor) pode visualizar e defina exceções individuais
              </p>
              <Link to={createPageUrl('ConfigPermissoes')}>
                <Button className="w-full bg-primary hover:bg-primary/90">
                  Gerenciar Permissões
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RANKING */}
        <TabsContent value="ranking" className="mt-6">
          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Controle do Ranking Trimestral
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure a visibilidade do ranking para os agentes no Dashboard
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    {rankingVisivel
                      ? <Eye className="w-5 h-5 text-success" />
                      : <EyeOff className="w-5 h-5 text-muted-foreground" />
                    }
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        Ranking visível para agentes
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {rankingVisivel
                          ? 'Os agentes podem ver o ranking no Dashboard'
                          : 'O ranking está oculto para os agentes'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={rankingVisivel}
                    onCheckedChange={handleToggleRanking}
                  />
                </div>
                <div className="mt-4 p-3 bg-info-soft rounded-lg border border-primary/25 text-xs text-primary">
                  O gestor sempre vê o ranking completo, independente desta configuração.
                </div>
              </CardContent>
            </Card>

            {/* Preview do ranking */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Prévia do ranking atual:</p>
              <RankingTrimestral visivel={true} />
            </div>
          </div>
        </TabsContent>

        {/* METAS */}
        <TabsContent value="metas" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Metas de Performance
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure as metas mínimas de desempenho
                  </p>
                </div>
                <Button onClick={handleSalvarMetas} className="bg-primary hover:bg-primary/90">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-6">
                <div>
                  <Label>CSAT Mínimo (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={metas.csat_minimo}
                    onChange={(e) => setMetas({ ...metas, csat_minimo: e.target.value })}
                    placeholder="85"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Meta mínima de satisfação do cliente</p>
                </div>
                <div>
                  <Label>Performance Mínima (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={metas.performance_minimo}
                    onChange={(e) => setMetas({ ...metas, performance_minimo: e.target.value })}
                    placeholder="95"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Meta mínima de performance</p>
                </div>
                <div>
                  <Label>Avaliação CX Mínima</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={metas.avaliacao_cx_minimo}
                    onChange={(e) => setMetas({ ...metas, avaliacao_cx_minimo: e.target.value })}
                    placeholder="4.2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Nota mínima CX (1-5)</p>
                </div>
              </div>

              <div className="p-4 bg-info-soft rounded-lg border border-info/25">
                <p className="text-sm text-primary">
                  <strong>Dica:</strong> Essas metas são usadas como referência nos relatórios e análises de performance.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXCLUSÃO DE DADOS */}
        <TabsContent value="exclusao" className="mt-6">
          <Card className="border-0 shadow-sm border-destructive/25">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                Exclusão de Dados do Sistema
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>ATENÇÃO:</strong> Esta ação é irreversível. Recomenda-se fazer backup antes de excluir dados.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => { setDeleteModulo('tratativas'); setDeleteDialogOpen(true); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Tratativas
                </Button>
                <Button 
                  variant="outline" 
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => { setDeleteModulo('apuracoes'); setDeleteDialogOpen(true); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Apurações
                </Button>
                <Button 
                  variant="outline" 
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => { setDeleteModulo('observacoes'); setDeleteDialogOpen(true); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Observações
                </Button>
                <Button 
                  variant="outline" 
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => { setDeleteModulo('pdis'); setDeleteDialogOpen(true); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir PDIs
                </Button>
                <Button 
                  variant="outline" 
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => { setDeleteModulo('escalas'); setDeleteDialogOpen(true); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Escalas
                </Button>
                <Button 
                  variant="outline" 
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => { setDeleteModulo('pontuacoes'); setDeleteDialogOpen(true); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Pontuações
                </Button>
              </div>
              <div className="pt-4 border-t">
                <Button 
                  variant="destructive" 
                  className="w-full bg-destructive hover:bg-destructive/90"
                  onClick={() => { setDeleteModulo('todos'); setDeleteDialogOpen(true); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir TODOS os Dados do Sistema
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BACKUP */}
        <TabsContent value="backup" className="mt-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Backup Completo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Exporta todos os dados do sistema incluindo tratativas, colaboradores, pontuações, etc.
                </p>
                <Button onClick={() => handleBackup('completo')} className="w-full bg-primary hover:bg-primary/90">
                  <Download className="w-4 h-4 mr-2" />
                  Gerar Backup Completo
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Backup de Configurações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Exporta apenas as configurações do sistema (categorias, metas, etc.)
                </p>
                <Button onClick={() => handleBackup('configuracoes')} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Gerar Backup Configurações
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm mt-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Política de Backup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Backups são exportados em formato JSON</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Recomenda-se realizar backup completo semanalmente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Os arquivos são salvos localmente no seu computador</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Para restaurar, entre em contato com o suporte técnico</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOGS */}
        <TabsContent value="logs" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Últimas 50 Ações do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum log registrado</p>
              ) : (
                <ListaResumida
                  className="space-y-2"
                  limite={8}
                  rotulo="registros"
                  itens={logs}
                  renderItem={(log) => (
                    <div key={log.id} className="p-3 bg-muted rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {log.acao}
                          </Badge>
                          <span className="font-medium">{log.usuario_nome}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {log.data_hora ? formatDateSP(log.data_hora) : '-'}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1">
                        {log.modulo} {log.entidade ? `• ${log.entidade}` : ''}
                      </p>
                    </div>
                  )}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTAÇÃO TÉCNICA */}
        <TabsContent value="documentacao" className="mt-6">
          <DocumentacaoTecnica />
        </TabsContent>
      </Tabs>

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir ${deleteModulo === 'todos' ? 'TODOS OS DADOS' : `os dados de ${deleteModulo}`}? Esta ação não pode ser desfeita.`}
        onConfirm={() => handleDeleteData(deleteModulo)}
        confirmLabel="Sim, Excluir"
        variant="danger"
      />
    </div>
  );
}