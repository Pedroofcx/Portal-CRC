import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Avisos } from "@/components/ui/sonner"
import { ThemeProvider } from 'next-themes'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Login from './pages/Login';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const RelatorioJornadaDiretoria = lazy(() => import('./pages/RelatorioJornadaDiretoria'));

/** Mesmo spinner da checagem de login, pro load de cada página não "piscar" diferente. */
const CarregandoPagina = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-border border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // A tela de login é renderizada no lugar do app. Redirecionar para uma
      // rota /login daria laço infinito: sem sessão, o app voltaria a pedir
      // login a cada carregamento.
      return <Login />;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<CarregandoPagina />}>
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        <Route
          path="/RelatorioJornadaDiretoria"
          element={
            <LayoutWrapper currentPageName="RelatorioJornadaDiretoria">
              <RelatorioJornadaDiretoria />
            </LayoutWrapper>
          }
        />
        {/* Quem já está logado e abre /login (por favorito, ou pelo "Sair" de
            outra aba) vai para o início, e não para "Página não encontrada".
            Sem sessão, este trecho nem é alcançado: a tela de entrada é
            renderizada lá em cima, no lugar do app inteiro. */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {

  // O ErrorBoundary aqui na raiz é o que garante que qualquer falha apareça na
  // TELA. O outro, dentro do Layout, só cobre o que vem depois do login — uma
  // falha no AuthProvider ou na conexão com o banco escapava dele e o usuário
  // via só uma página em branco, com a explicação escondida no console.
  return (
    <ErrorBoundary>
      {/* Tema claro (padrão) ou escuro, escolhido por cada pessoa. A classe "dark" no <html> liga o bloco .dark de src/index.css. */}
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="portal_crc_tema">
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          {/* Os avisos do `sonner` (toast.success / toast.error), usados em 42
              arquivos, só aparecem com este componente montado — e ele nunca
              esteve: "Salvo", "Erro ao salvar", "Bônus lançado" eram invisíveis. */}
          <Avisos position="bottom-right" richColors closeButton />
        </QueryClientProvider>
      </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App