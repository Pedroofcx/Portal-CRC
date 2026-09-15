import React from 'react';
import { AlertTriangle, RefreshCw, Home, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const now = Date.now();
    const { lastErrorTime, errorCount } = this.state;
    
    // Detectar loop de erros (múltiplos erros em menos de 5 segundos)
    const isErrorLoop = lastErrorTime && (now - lastErrorTime) < 5000;
    const newErrorCount = isErrorLoop ? errorCount + 1 : 1;
    
    console.error('🚨 ErrorBoundary caught:', error, errorInfo);
    console.error('Error count:', newErrorCount);
    
    // Se houver muitos erros consecutivos, forçar reload completo
    if (newErrorCount >= 3) {
      console.error('🔥 Loop de erros detectado! Forçando reset completo...');
      this.forceSystemReset();
      return;
    }
    
    this.setState({ 
      error, 
      errorInfo,
      errorCount: newErrorCount,
      lastErrorTime: now
    });
    
    // Limpar localStorage corrompido que possa estar causando problemas
    this.cleanupCorruptedStorage();
  }

  cleanupCorruptedStorage = () => {
    try {
      // Preservar TODOS os dados críticos do usuário — nunca apagar confirmações de avisos
      const storage = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) storage[key] = localStorage.getItem(key);
      }

      // Remover apenas chaves de UI temporária que possam estar corrompidas
      const temporaryPrefixes = ['__rq_', '_tmp_'];
      Object.keys(storage).forEach(key => {
        if (temporaryPrefixes.some(p => key.startsWith(p))) {
          localStorage.removeItem(key);
        }
      });

      console.log('✅ Storage de UI temporária limpo após erro — dados do usuário preservados');
    } catch (e) {
      console.error('Erro ao limpar storage:', e);
    }
  };

  forceSystemReset = () => {
    try {
      // Limpar apenas cache temporário, nunca dados do usuário
      sessionStorage.clear();
      this.cleanupCorruptedStorage();
      
      // Limpar cache do React Query
      if (window.queryClient) {
        window.queryClient.clear();
      }
      
      console.log('🔄 Reset completo do sistema...');
      
      // Reload forçado
      setTimeout(() => {
        window.location.href = '/';
        window.location.reload();
      }, 500);
    } catch (e) {
      console.error('Erro no reset:', e);
      window.location.reload();
    }
  };

  handleReset = () => {
    console.log('🔄 Resetando ErrorBoundary...');
    
    // Limpar estado do erro
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null
    });
    
    // Limpar possível estado corrompido
    this.cleanupCorruptedStorage();
    
    // Navegar de forma segura
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  };

  handleReload = () => {
    console.log('🔄 Recarregando aplicação...');
    this.cleanupCorruptedStorage();
    window.location.reload();
  };

  handleSafeMode = () => {
    console.log('🛡️ Ativando modo seguro...');
    
    // Reset completo incluindo cache
    this.forceSystemReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
          <Card className="max-w-lg w-full border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Ops! Algo deu errado
              </h1>
              <p className="text-slate-600 mb-6">
                Ocorreu um erro inesperado. Não se preocupe, seus dados estão seguros.
              </p>
              
              {this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700 mb-2 p-3 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                    Ver detalhes técnicos
                  </summary>
                  <div className="mt-2 p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs font-mono text-red-700 break-all whitespace-pre-wrap">
                      {this.state.error.toString()}
                    </p>
                  </div>
                </details>
              )}

              <div className="flex gap-3 justify-center flex-col sm:flex-row">
                <Button 
                  onClick={this.handleReset}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  <Home className="w-4 h-4" />
                  Voltar ao Dashboard
                </Button>
                <Button 
                  onClick={this.handleReload}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recarregar Página
                </Button>
              </div>

              {this.state.errorCount > 1 && (
                <div className="mt-4">
                  <Button 
                    onClick={this.handleSafeMode}
                    variant="destructive"
                    className="gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Modo Seguro (Reset Completo)
                  </Button>
                  <p className="text-xs text-amber-600 mt-2">
                    Erros consecutivos detectados. Use o Modo Seguro se o problema persistir.
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-500 mt-6">
                Se o erro persistir, entre em contato com o suporte técnico.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;