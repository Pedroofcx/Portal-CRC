import db from '@/api/db';
import React from 'react';
import { useQuery } from '@tanstack/react-query';

import PageHeader from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen,
  LayoutDashboard,
  ClipboardList,
  Users,
  MessageSquare,
  Map,
  TrendingUp,
  Eye,
  Search,
  FileText,
  Calendar,
  Palmtree,
  Bell,
  ClipboardCheck,
  BarChart3,
  Settings,
  Award,
  ChevronRight,
  CheckCircle,
  Target
} from 'lucide-react';

const modulosGestor = [
  {
    icon: LayoutDashboard,
    nome: 'Dashboard',
    descricao: 'Visão geral consolidada da operação',
    comoUsar: [
      'Visualize métricas em tempo real: tratativas abertas, encerradas, críticas e no SLA',
      'Acompanhe pontuações trimestrais e ranking da equipe',
      'Receba alertas de avisos pendentes e pesquisas não respondidas',
      'Acesse ações rápidas para criar tratativas ou observações',
      'Veja frases motivacionais e o quadro de anotações pessoais'
    ]
  },
  {
    icon: Users,
    nome: 'Colaboradores',
    descricao: 'Gestão completa da equipe',
    comoUsar: [
      'Cadastre colaboradores com nome, e-mail, cargo, salário, equipe e foto',
      'Gerencie papéis: agente, gestor ou facilitador interno (FI) com data de expiração',
      'Registre histórico de cargos e promoções com salários anteriores',
      'Visualize perfil completo com PDI ativo, observações e pontuação',
      'Ative ou desative colaboradores sem excluir o histórico'
    ]
  },
  {
    icon: MessageSquare,
    nome: 'Observações',
    descricao: 'Feedbacks estruturados sobre colaboradores',
    comoUsar: [
      'Crie observações positivas, de melhoria, alertas ou neutras',
      'Selecione tipo customizável (elogio, feedback, alerta, etc.)',
      'Use IA para gerar análise SWOT e avaliação de soft/hard skills automaticamente',
      'Defina visibilidade: apenas gestor, apenas agente ou ambos',
      'Acompanhe o histórico completo por colaborador'
    ]
  },
  {
    icon: Map,
    nome: 'Jornada do Cliente',
    descricao: 'Mapeamento visual end-to-end da experiência do cliente',
    comoUsar: [
      'Crie fluxos visuais com etapas da jornada do cliente',
      'Relacione motivos de disputa a etapas específicas da jornada',
      'Identifique pontos de fricção e oportunidades de melhoria',
      'Configure e nomeie etapas personalizadas pelo menu de Configurações'
    ]
  },
  {
    icon: TrendingUp,
    nome: 'Plano Setorial',
    descricao: 'Planejamento e monitoramento estratégico do setor',
    comoUsar: [
      'Defina objetivos estratégicos com indicadores e prazos',
      'Crie ações específicas com responsáveis e acompanhamento de status',
      'Monitore progresso: pendente, em andamento ou concluído',
      'Vincule ações ao plano setorial para visão integrada'
    ]
  },
  {
    icon: Eye,
    nome: 'ORÁCULO CRC',
    descricao: 'Inteligência preditiva e registro de tendências',
    comoUsar: [
      'Registre palavras-chave e padrões emergentes observados nas tratativas',
      'Lance insights e previsões com base em dados históricos',
      'Documente tendências para antecipação de problemas',
      'Use como ferramenta de análise preditiva e planejamento proativo'
    ]
  },
  {
    icon: Search,
    nome: 'Apuração',
    descricao: 'Apuração semanal de performance por canal (Telefone, Chat e CX)',
    comoUsar: [
      'Selecione colaborador, período e canal (telefone, chat ou CX)',
      'Faça upload do arquivo de dados — o sistema segmenta automaticamente por semanas (seg–sex)',
      'Visualize resultados semana a semana: CSAT, % Avaliados e Performance',
      'A consolidação mensal é a média das semanas apuradas',
      'Salve os resultados no banco para consulta e comparação futura',
      'Acesse o histórico completo em Relatórios de Apuração'
    ]
  },
  {
    icon: ClipboardCheck,
    nome: 'Pesquisas',
    descricao: 'Criação e gestão de pesquisas internas e de satisfação',
    comoUsar: [
      'Crie pesquisas CSAT, NPS, CES, Clima Organizacional ou personalizadas',
      'Configure agendamento automático: único, semanal, quinzenal ou mensal',
      'Defina prazos de resposta, lembretes automáticos e confirmação de leitura obrigatória',
      'Publique para toda a equipe e acompanhe respostas em tempo real',
      'Visualize resultados com gráficos e análises por pergunta'
    ]
  },
  {
    icon: BarChart3,
    nome: 'Relatórios',
    descricao: 'Análises detalhadas, exportações e relatórios de apuração',
    comoUsar: [
      'Filtre tratativas por período, tipo, status, prioridade ou agente',
      'Visualize gráficos de volume, tendências e motivos mais frequentes',
      'Exporte dados completos em CSV para análises externas',
      'Acesse relatórios de apuração consolidados por colaborador e mês',
      'Analise métricas de SLA, taxa de resolução e soluções replicáveis'
    ]
  },
  {
    icon: Palmtree,
    nome: 'Gestão de Férias',
    descricao: 'Controle e aprovação de férias da equipe',
    comoUsar: [
      'Visualize solicitações pendentes de toda a equipe com alertas de SLA',
      'Aprove, recuse ou sugira novas datas para as férias',
      'Consulte saldo de férias de cada colaborador (aquisitivo e concessivo)',
      'Verifique conflitos e staff crítico automaticamente',
      'Monitore colaboradores com férias vencendo'
    ]
  },
  {
    icon: Settings,
    nome: 'Configurações',
    descricao: 'Personalize todos os parâmetros do sistema',
    comoUsar: [
      'Gerencie motivos de tratativas e seus submotivos',
      'Defina tipos de tratativas customizados com SLAs específicos',
      'Configure etapas da jornada do cliente',
      'Gerencie skills, tipos de observação e elegibilidade para premiações',
      'Controle permissões de módulos por perfil ou colaborador individualmente'
    ]
  }
];

const modulosAgente = [
  {
    icon: LayoutDashboard,
    nome: 'Dashboard',
    descricao: 'Sua central de trabalho pessoal',
    comoUsar: [
      'Veja suas tratativas ativas, recentes e indicadores pessoais',
      'Acompanhe sua pontuação trimestral e posição no ranking',
      'Leia avisos importantes — os urgentes aparecem como popup bloqueante',
      'Responda pesquisas obrigatórias diretamente pelo dashboard',
      'Acesse seu PDI ativo, feedbacks recebidos e anotações pessoais'
    ]
  },
  {
    icon: Award,
    nome: 'Minha Performance',
    descricao: 'Acompanhe seu desempenho detalhado',
    comoUsar: [
      'Visualize pontuação trimestral com breakdown por tipo de tratativa',
      'Acompanhe resultados de apuração: CSAT, % Avaliados e Performance semanal',
      'Confira seu PDI ativo, metas e progresso',
      'Leia feedbacks, observações e histórico de reconhecimentos da gestão',
      'Compare sua evolução ao longo dos trimestres'
    ]
  },
  {
    icon: ClipboardList,
    nome: 'Tratativas CRC',
    descricao: 'Registre e gerencie reclamações e contestações',
    comoUsar: [
      'Crie nova tratativa preenchendo todos os campos obrigatórios',
      'Selecione tipo: Reclamação Interna, Reclame Aqui, Google Meu Negócio ou Contestação de Compra',
      'Defina motivo principal e até 3 submotivos',
      'Atualize o status seguindo o fluxo: registrada → em andamento → encerrada',
      'Ao encerrar, registre a solução e se ela é replicável para a equipe',
      'Para Contestação de Compra: informe número do case, valor contestado, prazo SLA e resultado'
    ]
  },
  {
    icon: FileText,
    nome: 'POP',
    descricao: 'Procedimentos Operacionais Padrão',
    comoUsar: [
      'Busque POPs por palavra-chave ou categoria',
      'Leia procedimentos detalhados para cada situação de atendimento',
      'Confirme leitura dos POPs obrigatórios',
      'Use como guia durante atendimentos complexos'
    ]
  },
  {
    icon: Calendar,
    nome: 'Escalas',
    descricao: 'Calendário de escalas e eventos da equipe',
    comoUsar: [
      'Visualize o calendário mensal com todas as escalas da equipe',
      'Confira quem está presencial, home office ou em treinamento',
      'Veja eventos especiais, reuniões obrigatórias e feriados',
      'Planeje-se com base na disponibilidade da equipe'
    ]
  },
  {
    icon: Palmtree,
    nome: 'Férias',
    descricao: 'Solicite e acompanhe suas férias',
    comoUsar: [
      'Consulte saldo disponível por período aquisitivo',
      'Solicite férias escolhendo as datas desejadas',
      'Fragmente em até 3 períodos conforme a CLT',
      'Opte por vender até 10 dias (abono pecuniário)',
      'Acompanhe o status da solicitação em tempo real'
    ]
  },
  {
    icon: Bell,
    nome: 'Avisos',
    descricao: 'Comunicados e informações importantes',
    comoUsar: [
      'Leia todos os avisos publicados pela gestão',
      'Confirme leitura de avisos obrigatórios para liberar o sistema',
      'Avisos urgentes aparecem como popup bloqueante ao entrar',
      'Mantenha-se atualizado sobre mudanças, eventos e comunicados'
    ]
  },
  {
    icon: TrendingUp,
    nome: 'Hansei',
    descricao: 'Reflexão e feedback sobre seu desempenho',
    comoUsar: [
      'Receba envios do gestor com seus dados consolidados de performance',
      'Visualize métricas detalhadas do período analisado',
      'Registre seu comentário e sentimento sobre os resultados',
      'Use como momento de reflexão para identificar pontos de melhoria'
    ]
  }
];

const modulosComuns = [
  {
    icon: ClipboardList,
    nome: 'Tratativas CRC',
    categoria: 'Operacional',
    resumo: 'Registro e gestão de reclamações, Reclame Aqui, Google e Contestações de Compra'
  },
  {
    icon: FileText,
    nome: 'POP',
    categoria: 'Documentação',
    resumo: 'Procedimentos Operacionais Padrão — guia de referência durante atendimentos'
  },
  {
    icon: Calendar,
    nome: 'Escalas',
    categoria: 'Logística',
    resumo: 'Calendário de escalas, turnos, home office e eventos especiais da equipe'
  },
  {
    icon: Palmtree,
    nome: 'Férias',
    categoria: 'Gestão Pessoal',
    resumo: 'Agentes solicitam; gestores aprovam, recusam ou sugerem novas datas'
  },
  {
    icon: Bell,
    nome: 'Avisos',
    categoria: 'Comunicação',
    resumo: 'Comunicados internos com confirmação de leitura e popup bloqueante para urgentes'
  },
  {
    icon: TrendingUp,
    nome: 'Hansei',
    categoria: 'Feedback',
    resumo: 'Ciclo de reflexão periódica: gestor envia dados, agente comenta e registra sentimento'
  }
];

export default function ComoFunciona() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const colaborador = colaboradores.find(c => c.email === user?.email);
  const isGestor = colaborador?.papel === 'gestor';

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Como Funciona"
        subtitle="Guia completo de uso do Portal CRC"
        icon={BookOpen}
      />

      <Card className="border border-info/25 shadow-none bg-info-soft">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div>
              <h3 className="font-bold text-lg mb-2 text-foreground">Boas-vindas ao Guia do Portal CRC</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Este guia apresenta todos os módulos do sistema e como utilizá-los de forma eficiente. 
                {isGestor 
                  ? ' Como gestor, você tem acesso a módulos administrativos e de análise da equipe.'
                  : ' Como agente, você tem acesso a ferramentas operacionais e de desenvolvimento pessoal.'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={isGestor ? "gestor" : "agente"} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gestor">
            <Users className="w-4 h-4 mr-2" />
            Módulos Gestor
          </TabsTrigger>
          <TabsTrigger value="agente">
            <Target className="w-4 h-4 mr-2" />
            Módulos Agente
          </TabsTrigger>
          <TabsTrigger value="comum">
            <CheckCircle className="w-4 h-4 mr-2" />
            Módulos Comuns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gestor" className="space-y-4">
          <div className="grid gap-4">
            {modulosGestor.map((modulo, index) => {
              return (
                <Card key={index} className="border-0 shadow-sm hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-foreground">
                          {modulo.nome}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{modulo.descricao}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">Gestor</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground mb-3">Como usar:</p>
                      {modulo.comoUsar.map((passo, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground">{passo}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="agente" className="space-y-4">
          <div className="grid gap-4">
            {modulosAgente.map((modulo, index) => {
              return (
                <Card key={index} className="border-0 shadow-sm hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-foreground">
                          {modulo.nome}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{modulo.descricao}</p>
                      </div>
                      <Badge variant="outline" className="text-xs bg-success-soft text-success border-success/25">
                        Agente
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground mb-3">Como usar:</p>
                      {modulo.comoUsar.map((passo, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground">{passo}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="comum" className="space-y-4">
          <Card className="border-0 shadow-sm bg-info-soft">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-primary mb-1">Módulos Compartilhados</p>
                  <p className="text-sm text-primary">
                    Estes módulos estão disponíveis tanto para gestores quanto para agentes, 
                    mas podem ter funcionalidades diferentes conforme o perfil.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {modulosComuns.map((modulo, index) => {
              return (
                <Card key={index} className="border-0 shadow-sm hover:shadow-sm transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{modulo.nome}</h3>
                          <Badge variant="outline" className="text-xs">{modulo.categoria}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{modulo.resumo}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Card className="border-0 shadow-sm bg-warning-soft">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div>
              <h3 className="font-semibold text-warning mb-2">Dica Importante</h3>
              <p className="text-sm text-warning leading-relaxed">
                Explore cada módulo com calma e familiarize-se com as funcionalidades. 
                Em caso de dúvidas, consulte seu gestor ou facilitador interno. 
                Pesquisas e avisos obrigatórios devem ser respondidos prontamente para manter o sistema atualizado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}