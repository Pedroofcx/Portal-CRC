import React from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { AlertCircle } from 'lucide-react';

/**
 * SafeRoute - Wrapper seguro para rotas
 * Isola erros de renderização e previne colapso da aplicação
 */
export function SafeRoute({ children, fallback, loadingText = "Carregando..." }) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    // Simular carregamento inicial para evitar flash
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    // Reset error state quando a rota muda
    setHasError(false);
  }, [children]);

  if (isLoading) {
    return <LoadingSpinner text={loadingText} />;
  }

  if (hasError) {
    return fallback || (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao Carregar Página</h2>
        <p className="text-slate-600">Tente navegar para outra seção.</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}

export default SafeRoute;