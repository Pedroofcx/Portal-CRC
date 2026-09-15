const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import WelcomeScreen from '@/components/ui/WelcomeScreen';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
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
  LogOut,
  Menu,
  X,
  ChevronDown,
  Target,
  Award,
  Search,
  GraduationCap,
  Star,
  TrendingUp,
  ClipboardCheck,
  Eye,
  Map,
  Palmtree,
  Clock,
  ShieldCheck,
  Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const menuItems = [
  { 
    section: '📊 Principal',
    items: [
      { name: 'Dashboard', page: 'Dashboard', icon: Home },
      { name: 'Como Funciona', page: 'ComoFunciona', icon: BookOpen },
    ]
  },
  { 
    section: '👥 Gestão',
    items: [
      { name: 'Colaboradores', page: 'Cadastro', icon: Users, gestorOnly: true },
      { name: 'Observações', page: 'Observacoes', icon: MessageSquare, gestorOnly: true },
      { name: 'Jornada do Cliente', page: 'JornadaCliente', icon: Map, gestorOnly: true },
      { name: 'Plano Setorial', page: 'PlanoSetorial', icon: TrendingUp, gestorOnly: true },
      { name: 'ORÁCULO CRC', page: 'Oraculo', icon: Eye, gestorOnly: true },
    ]
  },
  { 
    section: '🎯 Operações',
    items: [
      { name: 'Tratativas CRC', page: 'Tratativas', icon: ClipboardList },
      { name: 'Apuração', page: 'Apuracao', icon: Search, gestorOnly: true },
      { name: 'Ferramentas Operacionais', page: 'FerramentasOperacionais', icon: Wrench },
    ]
  },
  { 
    section: '📚 Recursos',
    items: [
      { name: 'Universidade CRC', page: 'Universidade', icon: GraduationCap },
      { name: 'POP', page: 'POP', icon: FileText },
      { name: 'Escalas', page: 'Escalas', icon: Calendar },
      { name: 'Turnos', page: 'Turnos', icon: Clock },
      { name: 'Home Office Escolha', page: 'HomeOfficeEscolha', icon: Home },
      { name: 'Gestão de Férias', page: 'GestaoFerias', icon: Palmtree, gestorOnly: true },
    ]
  },
  { 
    section: '🔔 Comunicação',
    items: [
      { name: 'Avisos', page: 'Avisos', icon: Bell },
      { name: 'Pesquisas', page: 'Pesquisas', icon: ClipboardCheck, gestorOnly: true },
      { name: 'Hansei', page: 'Hansei', icon: TrendingUp },
    ]
  },
  { 
    section: '⚙️ Admin',
    items: [
      { name: 'Relatórios', page: 'Relatorios', icon: BarChart3, gestorOnly: true },
      { name: 'Auditoria de Pontuação', page: 'AuditoriaPontuacao', icon: ShieldCheck, gestorOnly: true },
      { name: 'Configurações', page: 'Configuracoes', icon: Settings, gestorOnly: true },
    ]
  }
];

function Sidebar({ user, colaborador, currentPageName, onNavigate, isMobile = false, permissoesModulo = [] }) {
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
    <div className="flex flex-col h-full bg-slate-900">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight">Portal CRC</h1>
            <p className="text-slate-500 text-xs">Central de Relacionamento</p>
          </div>
        </Link>
      </div>

      {/* FI Card */}
      {isFI && (
        <div className="mx-4 mt-4 p-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 text-sm font-medium">Você é o Facilitador Interno</span>
          </div>
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
                <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {section.section}
                </p>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const isActive = currentPageName === item.page;
                    return (
                      <Link
                        key={item.page}
                        to={createPageUrl(item.page)}
                        onClick={onNavigate}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                          ${isActive 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }
                        `}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 transition-colors">
              <Avatar className="h-9 w-9">
                <AvatarImage src={colaborador?.foto_url} />
                <AvatarFallback className="bg-blue-600 text-white text-sm">
                  {user?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white truncate">{user?.full_name || 'Usuário'}</p>
                <p className="text-xs text-slate-500 capitalize">{colaborador?.papel || 'Agente'}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link to={createPageUrl('MinhaPerformance')} className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                Minha Performance
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => db.auth.logout()} className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();
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
    queryKey: ['colaboradores'],
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
  };

  // Mostrar loading enquanto carrega dados essenciais
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando Portal CRC...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {showWelcome && user && (
        <WelcomeScreen 
          userName={user.full_name?.split(' ')[0] || 'Usuário'} 
          onComplete={handleWelcomeComplete}
        />
      )}
      
      <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64">
        <Sidebar 
          user={user} 
          colaborador={colaborador} 
          currentPageName={currentPageName}
          permissoesModulo={permissoesModulo}
        />
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="lg:hidden">
        <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3">
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
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="font-bold text-slate-900">Portal CRC</span>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarImage src={colaborador?.foto_url} />
              <AvatarFallback className="bg-blue-600 text-white text-xs">
                {user?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Main Content - Wrapped in nested ErrorBoundary for page isolation */}
      <main className="lg:pl-64">
        <div className="min-h-screen pt-16 lg:pt-0">
          <div className="p-4 lg:p-8">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
    </ErrorBoundary>
  );
}