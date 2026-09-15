import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * RouteGuard - Proteção de rotas com validação de usuário
 * Previne navegação para rotas sem dados necessários
 */
export function RouteGuard({ 
  children, 
  requireUser = true,
  requireColaborador = true,
  allowedRoles = null,
  user,
  colaborador,
  isLoading = false
}) {
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = React.useState(false);

  // CRITICAL: Aguardar carregamento
  if (isLoading) {
    return <LoadingSpinner text="Verificando permissões..." />;
  }

  // Verificação 1: Usuário necessário
  if (requireUser && !user) {
    if (!redirecting) {
      console.warn('RouteGuard: Usuário não encontrado, redirecionando...');
      setRedirecting(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    }
    return <LoadingSpinner text="Redirecionando..." />;
  }

  // Verificação 2: Colaborador necessário
  if (requireColaborador && !colaborador) {
    return (
      <div className="text-center py-16">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
        <p className="text-slate-600 mb-4">
          Você precisa estar cadastrado como colaborador para acessar esta página.
        </p>
        <Button 
          onClick={() => navigate(createPageUrl('Dashboard'))}
          className="bg-blue-600"
        >
          Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  // Verificação 3: Papéis permitidos
  if (allowedRoles && colaborador && !allowedRoles.includes(colaborador.papel)) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sem Permissão</h2>
        <p className="text-slate-600 mb-4">
          Você não tem permissão para acessar esta página.
        </p>
        <Button 
          onClick={() => navigate(createPageUrl('Dashboard'))}
          className="bg-blue-600"
        >
          Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  // Tudo OK - renderizar children
  return <>{children}</>;
}

export default RouteGuard;