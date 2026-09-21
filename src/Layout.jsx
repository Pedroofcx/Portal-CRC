import db from '@/api/db';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import SequenciaBoasVindas from '@/components/boas-vindas/SequenciaBoasVindas';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import BuscaGlobal from '@/components/ui/BuscaGlobal';
import MenuUsuario from '@/components/ui/MenuUsuario';
import TrocarSenhaDialog from '@/components/conta/TrocarSenhaDialog';
import {
  LayoutDashboard as Home,
  Users,
  ClipboardList,
  MessageSquare,
  BarChart3,
  BookOpen,
  FileText,
  Bell,
  Calendar,
  Settings,
  Menu,
  Search,
  Star,
  TrendingUp,
  ClipboardCheck,
  Eye,
  Map,
  Palmtree,
  Clock,
  ShieldCheck,
  Wrench,
  PanelLeft,
  PanelLeftClose
} from 'lucide-react';
import { Button } from '@/components/ui/button';


import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const menuItems = [
  { 
    section: 'Principal',
    items: [
      { name: 'Dashboard', page: 'Dashboard', icon: Home },
      { name: 'Como Funciona', page: 'ComoFunciona', icon: BookOpen },
    ]
  },
  { 
    section: 'Gestão',
    items: [
      { name: 'Colaboradores', page: 'Cadastro', icon: Users, gestorOnly: true },
      { name: 'Observações', page: 'Observacoes', icon: MessageSquare, gestorOnly: true },
      { name: 'Jornada do Cliente', page: 'JornadaCliente', icon: Map, gestorOnly: true },
      { name: 'Plano Setorial', page: 'PlanoSetorial', icon: TrendingUp, gestorOnly: true },
      { name: 'ORÁCULO CRC', page: 'Oraculo', icon: Eye, gestorOnly: true },
    ]
  },
  { 
    section: 'Operações',
    items: [
      { name: 'Tratativas CRC', page: 'Tratativas', icon: ClipboardList },
      { name: 'Apuração', page: 'Apuracao', icon: Search, gestorOnly: true },
      { name: 'Ferramentas Operacionais', page: 'FerramentasOperacionais', icon: Wrench },
    ]
  },
  { 
    section: 'Recursos',
    items: [
      { name: 'POP', page: 'POP', icon: FileText },
      { name: 'Escalas', page: 'Escalas', icon: Calendar },
      { name: 'Turnos', page: 'Turnos', icon: Clock },
      { name: 'Gestão de Férias', page: 'GestaoFerias', icon: Palmtree, gestorOnly: true },
    ]
  },
  { 
    section: 'Comunicação',
    items: [
      { name: 'Avisos', page: 'Avisos', icon: Bell },
      { name: 'Pesquisas', page: 'Pesquisas', icon: ClipboardCheck, gestorOnly: true },
      { name: 'Hansei', page: 'Hansei', icon: TrendingUp },
    ]
  },
  { 
    section: 'Admin',
    items: [
      { name: 'Relatórios', page: 'Relatorios', icon: BarChart3, gestorOnly: true },
      { name: 'Auditoria de Pontuação', page: 'AuditoriaPontuacao', icon: ShieldCheck, gestorOnly: true },
      { name: 'Configurações', page: 'Configuracoes', icon: Settings, gestorOnly: true },
    ]
  }
];

function Sidebar({ _user, colaborador, currentPageName, onNavigate, isMobile = false, permissoesModulo = [], recolhido = false, onAlternar }) {
  const isGestor = colaborador?.papel === 'gestor';
  const isFI = colaborador?.is_facilitador_interno;

  const podeVerModulo = (itemPage) => {
    const permissao = permissoesModulo.find(p => p.modulo_rota === itemPage);
    if (!permissao) return true; // Se não há permissão configurada, permite
    
    // Verifica se é exceção individual
    if (permissao.colaboradores_excecao?.includes(colaborador?.id)) {
      return true; // Exceção sempre tem acesso
    }
    
    // Verifica pela regra de perfil
    if (isGestor) return permissao.visivel_para_gestor;
    return permissao.visivel_para_agente;
  };

  return (
    <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-3">
        <Link
          to={createPageUrl('Dashboard')}
          className="flex min-w-0 flex-1 items-center gap-2.5"
          title={recolhido ? 'Portal CRC' : undefined}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-base font-bold text-sidebar-primary-foreground">
            C
          </div>
          {!recolhido && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">Portal CRC</p>
              <p className="truncate text-xs text-sidebar-foreground/55">Central de Relacionamento</p>
            </div>
          )}
        </Link>
        {!isMobile && (
          <button
            type="button"
            onClick={onAlternar}
            aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
            title={recolhido ? 'Expandir menu' : 'Recolher menu'}
            className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {recolhido ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* FI Card */}
      {isFI && !recolhido && (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded border-l-2 border-sidebar-primary bg-sidebar-accent px-3 py-2">
          <Star className="h-4 w-4 shrink-0 text-sidebar-primary" aria-hidden="true" />
          <span className="text-sm font-medium text-sidebar-accent-foreground">Você é o Facilitador Interno</span>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {menuItems.map((section) => {
            const visibleItems = section.items.filter(item => {
              if (item.gestorOnly && !isGestor) return false;
              if (!podeVerModulo(item.page)) return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.section}>
                {recolhido ? (
                  <div className="mx-3 mb-2 border-t border-sidebar-border" aria-hidden="true" />
                ) : (
                  <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/75">
                    {section.section}
                  </p>
                )}
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const isActive = currentPageName === item.page;
                    return (
                      <Link
                        key={item.page}
                        to={createPageUrl(item.page)}
                        onClick={onNavigate}
                        aria-current={isActive ? 'page' : undefined}
                        title={recolhido ? item.name : undefined}
                        className={`
                          flex items-center gap-3 rounded-lg py-2 transition-colors
                          ${recolhido ? 'justify-center px-0' : 'px-3'}
                          ${isActive
                            ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                          }
                        `}
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                        {!recolhido && <span className="truncate text-sm">{item.name}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Menu recolhido: preferência de quem usa, lembrada entre sessões.
  // Em navegador anônimo ou com armazenamento bloqueado, o acesso falha —
  // por isso o try/catch: a preferência é conveniência, não pode derrubar a tela.
  const [menuRecolhido, setMenuRecolhido] = useState(() => {
    try { return localStorage.getItem('portalcrc_menu_recolhido') === '1'; }
    catch { return false; }
  });

  const alternarMenu = () => {
    setMenuRecolhido((atual) => {
      const proximo = !atual;
      try { localStorage.setItem('portalcrc_menu_recolhido', proximo ? '1' : '0'); } catch { /* sem armazenamento */ }
      return proximo;
    });
  };
  const [showWelcome, setShowWelcome] = useState(false);
  // Liga a entrada em cascata do conteúdo logo depois das boas-vindas, e só
  // nesse momento: navegar entre telas continua sem animação.
  const [cascata, setCascata] = useState(false);
  const _navigate = useNavigate();
  const queryClient = useQueryClient();

  // Expor queryClient globalmente para ErrorBoundary
  useEffect(() => {
    window.queryClient = queryClient;
    return () => {
      delete window.queryClient;
    };
  }, [queryClient]);

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: colaboradores = [], isLoading: loadingColaboradores } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
    enabled: !!user,
  });

  const { data: permissoesModulo = [], isLoading: loadingPermissoes } = useQuery({
    queryKey: ['permissoes-modulo'],
    queryFn: () => db.entities.PermissaoModulo.list(),
    enabled: !!user,
  });

  const colaborador = React.useMemo(() => 
    colaboradores.find(c => c.email === user?.email),
    [colaboradores, user]
  );

  // Aguardar carregamento completo antes de renderizar
  const isLoading = loadingUser || (user && loadingColaboradores) || (user && loadingPermissoes);

  // Check FI expiration - COM CLEANUP
  useEffect(() => {
    let mounted = true;
    
    if (mounted && colaborador?.is_facilitador_interno && colaborador?.fi_expiracao) {
      const expDate = new Date(colaborador.fi_expiracao);
      if (expDate < new Date()) {
        console.log('FI expirado');
      }
    }
    
    return () => {
      mounted = false;
    };
  }, [colaborador?.is_facilitador_interno, colaborador?.fi_expiracao]);

  // Mostrar tela de boas-vindas uma vez a cada 24h usando localStorage - COM CLEANUP
  useEffect(() => {
    if (!user) return;
    
    let mounted = true;
    const lastShown = localStorage.getItem('welcome_last_shown');
    const now = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (!lastShown || (now - parseInt(lastShown)) > oneDayMs) {
      const timer = setTimeout(() => {
        if (mounted) {
          setShowWelcome(true);
          localStorage.setItem('welcome_last_shown', now.toString());
        }
      }, 500);
      
      return () => {
        mounted = false;
        clearTimeout(timer);
      };
    }
    
    return () => {
      mounted = false;
    };
  }, [user?.email]);

  // Cleanup ao desmontar Layout - CRITICAL
  useEffect(() => {
    return () => {
      setShowWelcome(false);
    };
  }, []);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    setCascata(true);
    setTimeout(() => setCascata(false), 2500);
  };

  // Mostrar loading enquanto carrega dados essenciais
  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/40 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando Portal CRC...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {/* Espera o cadastro carregar: o nome e o resumo do dia vêm dele. */}
      {showWelcome && user && colaborador && (
        <SequenciaBoasVindas colaborador={colaborador} aoConcluir={handleWelcomeComplete} />
      )}
      
      <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden transition-[width] duration-150 lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block ${menuRecolhido ? 'lg:w-16' : 'lg:w-64'}`}
      >
        <Sidebar
          user={user}
          colaborador={colaborador}
          currentPageName={currentPageName}
          permissoesModulo={permissoesModulo}
          recolhido={menuRecolhido}
          onAlternar={alternarMenu}
        />
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="lg:hidden">
        <div className="fixed left-0 right-0 top-0 z-40 border-b border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <Sidebar 
                  user={user} 
                  colaborador={colaborador} 
                  currentPageName={currentPageName}
                  isMobile
                  onNavigate={() => setSidebarOpen(false)}
                  permissoesModulo={permissoesModulo}
                />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">C</span>
              </div>
              <span className="font-semibold text-foreground">Portal CRC</span>
            </div>
            <MenuUsuario user={user} colaborador={colaborador} compacto />
          </div>
        </div>
      </div>

      {/* Main Content - Wrapped in nested ErrorBoundary for page isolation */}
      <main className={`transition-[padding] duration-150 ${menuRecolhido ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <div className="min-h-screen pt-16 lg:pt-0">
          <div className={`hidden items-center justify-between gap-6 border-b border-border bg-card px-8 py-2.5 lg:flex ${cascata ? 'entrada-cascata-topo' : ''}`}>
            <BuscaGlobal />
            <MenuUsuario user={user} colaborador={colaborador} />
          </div>
          <div className={`p-4 lg:p-8 ${cascata ? 'entrada-cascata' : ''}`}>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>

            {/*
              * Primeiro acesso com senha provisória. Fica no Layout, e não no
              * MenuUsuario, porque o menu existe em duas cópias (celular e
              * computador) e o diálogo obrigatório tem que aparecer uma vez só.
              */}
            <TrocarSenhaDialog
              aberto={Boolean(user?.trocar_senha)}
              obrigatoria
              aoConcluir={() => queryClient.invalidateQueries({ queryKey: ['currentUser'] })}
            />
          </div>
        </div>
      </main>
    </div>
    </ErrorBoundary>
  );
}